import { Logger } from './logger.js';

export class Notifier {
  constructor(config = {}) {
    this.config = config;
    this.logger = new Logger();
  }

  async notify(alert) {
    if (this.config.slackWebhook) {
      await this.notifySlack(alert);
    } else {
      this.notifyConsole(alert);
    }
  }

  async notifySlack(alert) {
    const severity = this.getSeverity(alert.driftScore, alert.threshold);
    const color = severity === 'high' ? 'danger' : severity === 'medium' ? 'warning' : '#36a64f';
    
    const message = {
      text: '🚨 Prompt Drift Detected',
      attachments: [{
        color,
        fields: [
          { title: 'Prompt ID', value: alert.promptId, short: true },
          { title: 'Drift Score', value: alert.driftScore.toFixed(3), short: true },
          { title: 'Threshold', value: alert.threshold.toFixed(3), short: true },
          { title: 'Severity', value: severity.toUpperCase(), short: true },
          { title: 'Baseline', value: alert.baselineId, short: true },
          { title: 'Current', value: alert.snapshotId, short: true },
          { title: 'Prompt', value: this.truncatePrompt(alert.prompt), short: false }
        ],
        footer: 'Promptinel',
        ts: Math.floor(alert.timestamp / 1000)
      }]
    };

    try {
      const response = await fetch(this.config.slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message)
      });

      if (!response.ok) {
        this.logger.error(`Slack notification failed (${response.status}): ${response.statusText}`);
        
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        const retryResponse = await fetch(this.config.slackWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message)
        });

        if (!retryResponse.ok) {
          this.logger.error(`Slack notification retry failed (${retryResponse.status}): ${retryResponse.statusText}`);
          console.log('Falling back to console notification');
          this.notifyConsole(alert);
        }
      }
    } catch (error) {
      this.logger.error(`Slack notification error: ${error.message}`);
      console.log('Falling back to console notification');
      this.notifyConsole(alert);
    }
  }

  notifyConsole(alert) {
    const severity = this.getSeverity(alert.driftScore, alert.threshold);
    const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
    
    console.log('\n' + '='.repeat(50));
    console.log(`${icon} DRIFT ALERT - ${severity.toUpperCase()}`);
    console.log('='.repeat(50));
    console.log(`Prompt ID:    ${alert.promptId}`);
    console.log(`Drift Score:  ${alert.driftScore.toFixed(3)} (threshold: ${alert.threshold.toFixed(3)})`);
    console.log(`Baseline:     ${alert.baselineId}`);
    console.log(`Current:      ${alert.snapshotId}`);
    console.log(`Time:         ${new Date(alert.timestamp).toISOString()}`);
    console.log(`Prompt:       ${this.truncatePrompt(alert.prompt, 40)}`);
    console.log('='.repeat(50) + '\n');
  }

  getSeverity(score, threshold) {
    const ratio = score / threshold;
    if (ratio >= 2) return 'high';
    if (ratio >= 1.5) return 'medium';
    return 'low';
  }

  truncatePrompt(prompt, maxLength = 200) {
    if (!prompt || typeof prompt !== 'string') return '';
    if (prompt.length <= maxLength) return prompt;
    return prompt.substring(0, maxLength) + '...';
  }
}
