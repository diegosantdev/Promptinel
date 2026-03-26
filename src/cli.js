import readline from 'readline';
import { promises as fs } from 'fs';
import { MockProvider } from './providers/mock.js';
import { OllamaProvider } from './providers/ollama.js';
import { OpenAIProvider } from './providers/openai.js';
import { AnthropicProvider } from './providers/anthropic.js';
import { MistralProvider } from './providers/mistral.js';
import { Watchlist } from './services/watchlist.js';
import { Storage } from './services/storage.js';
import { Scorer } from './services/scorer.js';
import { Notifier } from './services/notifier.js';
import { Runner } from './services/runner.js';
import { Config } from './services/config.js';
import { isCI, getCIProvider } from './utils/ci.js';
import * as ui from './utils/ui.js';

export class CLI {
  constructor(options = {}) {
    this.config = options.config || new Config();
    
    this.providers = options.providers || new Map();
    if (!options.providers) {
      this.providers.set('mock', new MockProvider());
      this.providers.set('ollama', new OllamaProvider());
      if (process.env.OPENAI_API_KEY) {
        this.providers.set('openai', new OpenAIProvider());
      }
      if (process.env.ANTHROPIC_API_KEY) {
        this.providers.set('anthropic', new AnthropicProvider());
      }
      if (process.env.MISTRAL_API_KEY) {
        this.providers.set('mistral', new MistralProvider());
      }
    }
    
    this.watchlist = options.watchlist || new Watchlist();
    this.storage = options.storage || new Storage();
    this.scorer = options.scorer || new Scorer();
    
    const notifierConfig = {};
    const slackWebhook = this.config.getSlackWebhook();
    if (slackWebhook) {
      notifierConfig.slackWebhook = slackWebhook;
    }
    this.notifier = options.notifier || new Notifier(notifierConfig);
    
    this.isCI = isCI();
    if (this.isCI) {
      const provider = getCIProvider();
      console.log(`Running in CI environment: ${provider}`);
    }
    
    this.runner = options.runner || new Runner(this.providers, this.watchlist, this.storage, this.scorer, this.notifier);
  }

  showMockModeNotice(provider) {
    if (provider === 'mock') {
      console.log();
      console.log(ui.warning('Mock Mode: Using simulated responses'));
      console.log(ui.info('Configure a real provider for actual LLMs'));
      console.log();
    }
  }

  async prompt(question) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    return new Promise((resolve) => {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }

  async add() {
    console.log(ui.header('📝 Add New Prompt'));

    const availableProviders = Array.from(this.providers.keys());
    console.log(ui.info(`Available providers: ${availableProviders.map(p => ui.providerBadge(p)).join(' ')}`));
    console.log();

    const prompt = await this.prompt(ui.color('Prompt text: ', 'cyan'));
    if (!prompt.trim()) {
      throw new Error('Prompt text is required');
    }

    const provider = await this.prompt(ui.color(`Provider (${availableProviders.join('/')}): `, 'cyan')) || 'mock';
    if (!this.providers.has(provider)) {
      throw new Error(`Provider ${provider} not available`);
    }

    this.showMockModeNotice(provider);

    const providerInstance = this.providers.get(provider);
    const models = await providerInstance.listModels();
    console.log(ui.info(`Available models: ${models.slice(0, 5).join(', ')}${models.length > 5 ? '...' : ''}`));

    const model = await this.prompt(ui.color(`Model (${models[0]}): `, 'cyan')) || models[0];
    const thresholdInput = await this.prompt(ui.color('Drift threshold (0.3): ', 'cyan')) || '0.3';
    const threshold = parseFloat(thresholdInput);

    if (isNaN(threshold) || threshold < 0 || threshold > 1) {
      throw new Error('Threshold must be a number between 0 and 1');
    }

    const description = await this.prompt(ui.color('Description (optional): ', 'cyan')) || '';
    const tagsInput = await this.prompt(ui.color('Tags (comma-separated, optional): ', 'cyan')) || '';
    const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];

    const entry = {
      prompt,
      model,
      provider,
      threshold,
      description: description || undefined,
      tags: tags.length > 0 ? tags : undefined
    };

    await this.watchlist.add(entry);
    const entries = await this.watchlist.getAll();
    const added = entries[entries.length - 1];

    console.log('\n' + ui.success('Prompt added successfully!'));
    console.log(ui.keyValue('ID', ui.color(added.id, 'bright')));
    console.log(ui.keyValue('Provider', ui.providerBadge(added.provider)));
    console.log(ui.keyValue('Model', added.model));
    console.log(ui.keyValue('Threshold', added.threshold));
    if (added.description) {
      console.log(ui.keyValue('Description', added.description));
    }
    if (added.tags && added.tags.length > 0) {
      console.log(ui.keyValue('Tags', added.tags.join(', ')));
    }
    console.log(`\n${ui.info(`Run 'node bin/promptinel.js check ${added.id}' to test it`)}\n`);
  }

  async check(promptId) {
    try {
      console.log(ui.header('🔍 Executing Prompt'));
      console.log(ui.keyValue('Prompt ID', ui.color(promptId, 'bright')));
      console.log();

      const entry = await this.watchlist.get(promptId);
      if (entry) {
        this.showMockModeNotice(entry.provider);
      }

      const spin = ui.spinner('Executing prompt...');
      spin.start();
      
      const snapshot = await this.runner.executePrompt(promptId);
      
      spin.stop(ui.success('Execution complete!'));
      
      console.log();
      console.log(ui.divider());
      console.log(ui.keyValue('Snapshot ID', ui.color(snapshot.id, 'bright')));
      console.log(ui.keyValue('Provider', ui.providerBadge(snapshot.provider)));
      console.log(ui.keyValue('Model', snapshot.model));
      console.log(ui.keyValue('Timestamp', new Date(snapshot.timestamp).toISOString()));
      
      if (snapshot.silentUpdate) {
        console.log(ui.silentUpdate(snapshot.previousActualModel, snapshot.actualModel));
      }

      if (snapshot.driftExplanation) {
        console.log(ui.driftExplanation(snapshot.driftExplanation));
      }

      if (snapshot.driftScore !== undefined) {
        console.log();
        console.log(ui.keyValue('Drift Score', ui.driftScore(snapshot.driftScore, entry.threshold)));
        console.log(ui.keyValue('Baseline', snapshot.baselineId));
        console.log(ui.keyValue('Threshold', entry.threshold));
      }

      console.log();
      console.log(ui.divider());
      console.log(ui.color('\nOutput:', 'bright'));
      console.log(snapshot.output);
      console.log();
    } catch (error) {
      console.error('\n' + ui.error(error.message));
      throw error;
    }
  }

  async watch(options) {
    if (options.schedule) {
      console.log(ui.info(`Scheduling watchlist execution: ${options.schedule}`));
      this.runner.scheduleWatchlist(options.schedule);
      return;
    }

    try {
      console.log(ui.header('🔄 Watch Mode'));

      const entries = await this.watchlist.getAll();
      const hasMockProvider = entries.some(e => e.provider === 'mock');
      if (hasMockProvider) {
        this.showMockModeNotice('mock');
      }

      const spin = ui.spinner(`Executing ${entries.length} prompt(s)...`);
      spin.start();
      
      const snapshots = await this.runner.executeWatchlist();
      
      spin.stop();

      if (snapshots.length === 0) {
        console.log(ui.warning('Watchlist is empty. Add prompts with "promptinel add".\n'));
        return;
      }

      console.log(ui.success(`Executed ${snapshots.length} prompt(s)`));
      console.log();

      let hasDrift = false;
      const thresholdMap = new Map(entries.map(e => [e.id, e.threshold]));

      for (const snapshot of snapshots) {
        const threshold = thresholdMap.get(snapshot.promptId) ?? 0.3;
        const entry = entries.find(e => e.id === snapshot.promptId);
        
        console.log(ui.divider());
        console.log(ui.color(`📊 ${snapshot.promptId}`, 'bright'));
        if (entry?.description) {
          console.log(ui.keyValue('Description', entry.description));
        }
        console.log(ui.keyValue('Provider', ui.providerBadge(snapshot.provider)));
        console.log(ui.keyValue('Model', snapshot.model));
        
        if (snapshot.silentUpdate) {
          console.log(ui.silentUpdate(snapshot.previousActualModel, snapshot.actualModel));
        }

        if (snapshot.driftExplanation) {
          console.log(ui.driftExplanation(snapshot.driftExplanation));
        }

        console.log(ui.keyValue('Output', snapshot.output.substring(0, 100) + (snapshot.output.length > 100 ? '...' : '')));
        
        if (snapshot.driftScore !== undefined) {
          const isDrifted = snapshot.driftScore > threshold;
          console.log(ui.keyValue('Drift', ui.driftScore(snapshot.driftScore, threshold)));
          if (isDrifted) hasDrift = true;
        }
        console.log();
      }

      if (this.isCI && hasDrift) {
        console.log('⚠️  Drift detected in CI environment - exiting with code 1\n');
        throw new Error('DRIFT_DETECTED_IN_CI');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async diff(id1, id2, options = {}) {
    try {
      let snapshot1, snapshot2;
      
      if (!id2) {
        const promptId = id1;
        const entry = await this.watchlist.get(promptId);
        if (!entry) {
          throw new Error(`Prompt ${promptId} not found in watchlist`);
        }
        if (!entry.baselineId) {
          throw new Error(`No baseline set for prompt ${promptId}. Run 'baseline ${promptId} --latest' first.`);
        }
        
        const snapshots = await this.storage.getSnapshots(promptId, 1);
        if (snapshots.length === 0) {
          throw new Error(`No snapshots found for prompt ${promptId}`);
        }
        
        snapshot1 = await this.storage.getSnapshot(promptId, entry.baselineId);
        snapshot2 = snapshots[0];
      } else {
        const allEntries = await this.watchlist.getAll();
        
        for (const entry of allEntries) {
          const snapshots = await this.storage.getSnapshots(entry.id);
          
          if (!snapshot1) {
            snapshot1 = snapshots.find(s => s.id === id1);
          }
          if (!snapshot2) {
            snapshot2 = snapshots.find(s => s.id === id2);
          }
          
          if (snapshot1 && snapshot2) break;
        }

        if (!snapshot1) {
          throw new Error(`Snapshot ${id1} not found`);
        }

        if (!snapshot2) {
          throw new Error(`Snapshot ${id2} not found`);
        }
      }

      const provider = this.providers.get(snapshot1.provider);
      const driftScore = snapshot2.driftScore ?? await this.scorer.score(
        snapshot1.output,
        snapshot2.output,
        provider
      );

      if (options.format === 'json') {
        const result = {
          snapshot1: {
            id: snapshot1.id,
            promptId: snapshot1.promptId,
            timestamp: snapshot1.timestamp,
            output: snapshot1.output,
            model: snapshot1.model,
            provider: snapshot1.provider
          },
          snapshot2: {
            id: snapshot2.id,
            promptId: snapshot2.promptId,
            timestamp: snapshot2.timestamp,
            output: snapshot2.output,
            model: snapshot2.model,
            provider: snapshot2.provider
          },
          driftScore,
          comparison: {
            identical: driftScore === 0,
            similar: driftScore < 0.3,
            different: driftScore >= 0.3
          }
        };
        console.log(JSON.stringify(result, null, 2));
        return;
      }

      console.log('\n' + '='.repeat(80));
      console.log('🔍 SNAPSHOT COMPARISON');
      console.log('='.repeat(80));
      console.log('');
      
      console.log(`Snapshot 1: ${snapshot1.id}`);
      console.log(`  Prompt:    ${snapshot1.promptId}`);
      console.log(`  Time:      ${new Date(snapshot1.timestamp).toISOString()}`);
      console.log(`  Provider:  ${snapshot1.provider} / ${snapshot1.model}`);
      console.log('');
      
      console.log(`Snapshot 2: ${snapshot2.id}`);
      console.log(`  Prompt:    ${snapshot2.promptId}`);
      console.log(`  Time:      ${new Date(snapshot2.timestamp).toISOString()}`);
      console.log(`  Provider:  ${snapshot2.provider} / ${snapshot2.model}`);
      console.log('');
      
      console.log(`Drift Score: ${driftScore.toFixed(3)}`);
      
      if (driftScore === 0) {
        console.log(`Status:      ✅ IDENTICAL`);
      } else if (driftScore < 0.15) {
        console.log(`Status:      🟢 STABLE (minimal drift)`);
      } else if (driftScore < 0.35) {
        console.log(`Status:      🟡 WARNING (moderate drift)`);
      } else {
        console.log(`Status:      🔴 DRIFTED (significant drift)`);
      }

      if (snapshot2.silentUpdate) {
        console.log(ui.silentUpdate(snapshot2.previousActualModel, snapshot2.actualModel));
      }

      if (snapshot2.driftExplanation) {
        console.log(ui.driftExplanation(snapshot2.driftExplanation));
      }

      
      console.log('');
      console.log('='.repeat(80));
      console.log('OUTPUT COMPARISON');
      console.log('='.repeat(80));
      console.log('');

      this.displaySideBySide(snapshot1.output, snapshot2.output);

      console.log('');
      console.log('='.repeat(80));
      console.log('');
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  displaySideBySide(text1, text2) {
    const width = 38;
    const lines1 = this.wrapText(text1, width);
    const lines2 = this.wrapText(text2, width);
    const maxLines = Math.max(lines1.length, lines2.length);

    console.log('┌' + '─'.repeat(width) + '┬' + '─'.repeat(width) + '┐');
    console.log('│' + this.pad('SNAPSHOT 1', width) + '│' + this.pad('SNAPSHOT 2', width) + '│');
    console.log('├' + '─'.repeat(width) + '┼' + '─'.repeat(width) + '┤');

    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      const marker1 = line1 !== line2 && line1 && line2 ? '→ ' : '  ';
      const marker2 = line1 !== line2 && line1 && line2 ? '← ' : '  ';
      
      console.log(
        '│' + marker1 + this.pad(line1, width - 2) + 
        '│' + marker2 + this.pad(line2, width - 2) + '│'
      );
    }

    console.log('└' + '─'.repeat(width) + '┴' + '─'.repeat(width) + '┘');
  }

  wrapText(text, width) {
    const lines = [];
    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (paragraph.length === 0) {
        lines.push('');
        continue;
      }

      const words = paragraph.split(' ');
      let currentLine = '';

      for (const word of words) {
        if (currentLine.length + word.length + 1 <= width) {
          currentLine += (currentLine ? ' ' : '') + word;
        } else {
          if (currentLine) lines.push(currentLine);
          currentLine = word;
        }
      }

      if (currentLine) lines.push(currentLine);
    }

    return lines;
  }

  pad(text, width) {
    if (text.length >= width) {
      return text.substring(0, width);
    }
    return text + ' '.repeat(width - text.length);
  }

  async baseline(promptId, options) {
    try {
      let snapshotId;

      if (options.latest) {
        const snapshots = await this.storage.getSnapshots(promptId, 1);
        if (snapshots.length === 0) {
          throw new Error(`No snapshots found for prompt ${promptId}`);
        }
        snapshotId = snapshots[0].id;
      } else if (options.snapshot) {
        snapshotId = options.snapshot;
      } else {
        throw new Error('Specify --latest or --snapshot <id>');
      }

      await this.watchlist.updateBaseline(promptId, snapshotId);

      console.log(`\n✅ Baseline updated for prompt: ${promptId}`);
      console.log(`   Snapshot: ${snapshotId}\n`);
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async report(options) {
    try {
      let entries = await this.watchlist.getAll();

      if (options.tags) {
        const filterTags = options.tags.split(',').map(t => t.trim());
        entries = entries.filter(entry => {
          if (!entry.tags || entry.tags.length === 0) return false;
          return filterTags.some(tag => entry.tags.includes(tag));
        });
      }

      if (options.prompt) {
        entries = entries.filter(entry => entry.id === options.prompt);
      }

      const enriched = await Promise.all(entries.map(async entry => {
        const snapshots = await this.storage.getSnapshots(entry.id, 5);
        return { entry, snapshots };
      }));

      const format = (options.format || 'text').toLowerCase();

      let output = '';

      if (format === 'json') {
        const data = {
          generatedAt: new Date().toISOString(),
          totalPrompts: entries.length,
          prompts: enriched.map(({ entry, snapshots }) => ({
            id: entry.id,
            prompt: entry.prompt,
            provider: entry.provider,
            model: entry.model,
            threshold: entry.threshold,
            description: entry.description || null,
            tags: entry.tags || [],
            baselineId: entry.baselineId || null,
            snapshotCount: snapshots.length,
            latestDriftScore: snapshots[0]?.driftScore ?? null,
            snapshots: snapshots.map(s => ({
              id: s.id,
              timestamp: s.timestamp,
              driftScore: s.driftScore ?? null
            }))
          }))
        };
        output = JSON.stringify(data, null, 2);
        if (!options.output) console.log(output);

      } else if (format === 'csv') {
        const headers = ['id', 'prompt_preview', 'provider', 'model', 'threshold', 'tags', 'baseline_id', 'snapshot_count', 'latest_drift'];
        const escapeCSV = (val) => {
          if (val === null || val === undefined) return '';
          const str = String(val);
          return str.includes(',') || str.includes('"') || str.includes('\n')
            ? `"${str.replace(/"/g, '""')}"`
            : str;
        };
        const rows = enriched.map(({ entry, snapshots }) => [
          entry.id,
          entry.prompt.substring(0, 60).replace(/\n/g, ' '),
          entry.provider,
          entry.model,
          entry.threshold,
          (entry.tags || []).join(';'),
          entry.baselineId || '',
          snapshots.length,
          snapshots[0]?.driftScore?.toFixed(3) ?? ''
        ]);
        output = [headers, ...rows].map(row => row.map(escapeCSV).join(',')).join('\n');
        if (!options.output) console.log(output);

      } else {
        const lines = [];
        const log = (text) => lines.push(text);

        log(ui.header('📊 Drift Report'));
        
        if (entries.length === 0) {
          log(ui.warning('No prompts found matching filters.'));
          log();
        } else {
          log(ui.info(`Total prompts: ${entries.length}`));
          log();
          
          for (const { entry, snapshots } of enriched) {
            log(ui.divider());
            log(ui.color(`📝 ${entry.id}`, 'bright'));
            log(ui.keyValue('Prompt', entry.prompt.substring(0, 80) + (entry.prompt.length > 80 ? '...' : '')));
            log(ui.keyValue('Provider', ui.providerBadge(entry.provider) + ' / ' + entry.model));
            log(ui.keyValue('Threshold', entry.threshold));
            
            if (entry.description) {
              log(ui.keyValue('Description', entry.description));
            }
            if (entry.tags && entry.tags.length > 0) {
              log(ui.keyValue('Tags', entry.tags.map(t => ui.color(t, 'cyan')).join(', ')));
            }
            if (entry.baselineId) {
              log(ui.keyValue('Baseline', entry.baselineId));
            }
            
            log(ui.keyValue('Snapshots', snapshots.length));
            
            if (snapshots[0]?.driftScore !== undefined) {
              log(ui.keyValue('Latest drift', ui.driftScore(snapshots[0].driftScore, entry.threshold)));
            }
            log();
          }
        }
        output = lines.join('\n');
        if (!options.output) console.log(output);
      }

      if (options.output) {
        const pathMod = await import('path');
        const dir = pathMod.dirname(options.output);
        await fs.mkdir(dir, { recursive: true });
        await fs.writeFile(options.output, output);
        console.log(`\n✅ Report written to: ${options.output}\n`);
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async cleanup(options) {
    try {
      console.log('\n🧹 Cleaning up old snapshots...\n');

      const entries = await this.watchlist.getAll();

      if (entries.length === 0) {
        console.log('ℹ️  No prompts in watchlist.\n');
        return;
      }

      const retentionPolicy = this.config.getRetentionPolicy();
      
      const policy = {
        type: options.keepLast ? 'keep-last-n' : 
              options.keepDays ? 'keep-days-n' : 
              retentionPolicy.maxAgeDays ? 'keep-days-n' : 'keep-last-n',
        value: options.keepLast ? parseInt(options.keepLast) : 
               options.keepDays ? parseInt(options.keepDays) :
               retentionPolicy.maxAgeDays || retentionPolicy.maxSnapshots || 30
      };

      let totalDeleted = 0;

      for (const entry of entries) {
        const deleted = await this.storage.deleteOldSnapshots(
          entry.id,
          policy,
          entry.baselineId
        );

        if (deleted > 0) {
          console.log(`📝 ${entry.id}: Deleted ${deleted} snapshot(s)`);
          totalDeleted += deleted;
        }
      }

      if (totalDeleted === 0) {
        console.log('✅ No snapshots to delete.\n');
      } else {
        console.log(`\n✅ Cleanup complete! Deleted ${totalDeleted} snapshot(s) total.\n`);
        if (retentionPolicy.preserveBaselines) {
          console.log('ℹ️  Baseline snapshots were preserved.\n');
        }
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }

  async dashboard(options) {
    try {
      const rawPort = options.port ?? 3000;
      const port = Number.parseInt(String(rawPort), 10);
      if (!Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error(`Invalid port: ${rawPort}`);
      }
      
      console.log('\n🚀 Starting Promptinel Dashboard...\n');
      console.log(`   Dashboard will be available at: http://localhost:${port}`);
      console.log('   Press Ctrl+C to stop\n');

      const { spawn } = await import('child_process');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      const __filename = fileURLToPath(import.meta.url);
      const __dirname = path.dirname(__filename);
      const dashboardDir = path.join(__dirname, '..', 'dashboard');

      const npmCmd = process.platform === 'win32' ? 'npm.cmd' : 'npm';
      const nextProcess = spawn(npmCmd, ['run', 'dev', '--', '-p', port.toString()], {
        cwd: dashboardDir,
        stdio: 'inherit',
        shell: false
      });

      process.on('SIGINT', () => {
        console.log('\n\n👋 Stopping dashboard...\n');
        nextProcess.kill();
        process.exit(0);
      });

      nextProcess.on('exit', (code) => {
        if (code !== 0 && code !== null) {
          console.error(`\n❌ Dashboard exited with code ${code}\n`);
          process.exit(code);
        }
      });

    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
      throw error;
    }
  }
}
