import { generateSnapshotId } from './storage.js';
import cron from 'node-cron';
import { Logger } from './logger.js';

export class Runner {
  constructor(providers, watchlist, storage, scorer, notifier = null) {
    this.providers = providers;
    this.watchlist = watchlist;
    this.storage = storage;
    this.scorer = scorer;
    this.notifier = notifier;
    this.logger = new Logger();
  }

  async executePrompt(promptId) {
    const watchEntry = await this.watchlist.get(promptId);
    const provider = this.providers.get(watchEntry.provider);

    if (!provider) {
      throw new Error(`Provider ${watchEntry.provider} not available`);
    }

    const response = await provider.execute(
      watchEntry.prompt,
      watchEntry.model
    );

    const snapshot = {
      id: generateSnapshotId(),
      promptId,
      prompt: watchEntry.prompt,
      output: response.output,
      model: response.model,
      actualModel: response.actualModel,
      provider: response.provider,
      timestamp: response.timestamp,
      metadata: response.metadata
    };

    if (watchEntry.baselineId) {
      const baseline = await this.storage.getSnapshot(
        promptId,
        watchEntry.baselineId
      );

      if (baseline.actualModel && snapshot.actualModel && baseline.actualModel !== snapshot.actualModel) {
        snapshot.silentUpdate = true;
        snapshot.previousActualModel = baseline.actualModel;
        snapshot.currentActualModel = snapshot.actualModel;
      }

      snapshot.driftScore = await this.scorer.score(
        baseline.output,
        snapshot.output,
        provider
      );
      snapshot.baselineId = watchEntry.baselineId;

      if (snapshot.driftScore > watchEntry.threshold) {
        snapshot.driftExplanation = await this.scorer.explain(
          baseline.output,
          snapshot.output,
          provider,
          snapshot.model
        );
      }

      if (this.notifier && (snapshot.driftScore > watchEntry.threshold || snapshot.silentUpdate)) {
        await this.notifier.notify({
          promptId,
          prompt: watchEntry.prompt,
          driftScore: snapshot.driftScore,
          driftExplanation: snapshot.driftExplanation,
          threshold: watchEntry.threshold,
          snapshotId: snapshot.id,
          baselineId: watchEntry.baselineId,
          timestamp: snapshot.timestamp,
          silentUpdate: snapshot.silentUpdate
        });
      }
    }

    await this.storage.saveSnapshot(snapshot);
    return snapshot;
  }

  async executeWatchlist() {
    const entries = await this.watchlist.getAll();
    const snapshots = [];

    for (const entry of entries) {
      try {
        const snapshot = await this.executePrompt(entry.id);
        snapshots.push(snapshot);
      } catch (error) {
        this.logger.error(`Failed to execute prompt ${entry.id}: ${error.message}`);
      }
    }

    return snapshots;
  }

  scheduleWatchlist(cronExpression) {
    if (!cron.validate(cronExpression)) {
      throw new Error(`Invalid cron expression: "${cronExpression}". Example: "0 */6 * * *" for every 6 hours.`);
    }

    console.log(`\n⏰ Scheduling watchlist, cron: ${cronExpression}`);
    console.log('   Press Ctrl+C to stop\n');

    this._cronTask = cron.schedule(cronExpression, async () => {
      console.log(`\n🔄 [${new Date().toISOString()}] Running scheduled watchlist check...\n`);
      try {
        const snapshots = await this.executeWatchlist();
        const entries = await this.watchlist.getAll();
        const thresholdMap = new Map(entries.map(e => [e.id, e.threshold]));
        
        const drifted = snapshots.filter(s => {
          const threshold = thresholdMap.get(s.promptId) ?? 0.3;
          return s.driftScore !== undefined && s.driftScore > threshold;
        });
        console.log(`✅ Done. ${snapshots.length} prompt(s) checked, ${drifted.length} with drift.\n`);
      } catch (error) {
        this.logger.error(`❌ Scheduled run failed: ${error.message}`);
      }
    });
  }

  stopSchedule() {
    if (this._cronTask) {
      this._cronTask.stop();
      this._cronTask = null;
      console.log('⏹  Scheduled execution stopped.');
    }
  }
}
