import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Notifier } from '../../../src/services/notifier.js';

describe('Notifier', () => {
  let notifier;
  let originalFetch;
  let consoleLogSpy;
  let consoleErrorSpy;

  const mockAlert = {
    promptId: 'test-prompt',
    prompt: 'What is the capital of France?',
    driftScore: 0.45,
    threshold: 0.3,
    snapshotId: 'snap-123',
    baselineId: 'snap-100',
    timestamp: 1700000000000
  };

  beforeEach(() => {
    originalFetch = global.fetch;
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with empty config', () => {
      notifier = new Notifier();
      expect(notifier.config).toEqual({});
    });

    it('should initialize with provided config', () => {
      const config = { slackWebhook: 'https://hooks.slack.com/test' };
      notifier = new Notifier(config);
      expect(notifier.config).toEqual(config);
    });
  });

  describe('notify', () => {
    it('should call notifySlack when webhook is configured', async () => {
      notifier = new Notifier({ slackWebhook: 'https://hooks.slack.com/test' });
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await notifier.notify(mockAlert);

      expect(global.fetch).toHaveBeenCalledWith(
        'https://hooks.slack.com/test',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        })
      );
    });

    it('should call notifyConsole when webhook is not configured', async () => {
      notifier = new Notifier();
      const spy = vi.spyOn(notifier, 'notifyConsole');

      await notifier.notify(mockAlert);

      expect(spy).toHaveBeenCalledWith(mockAlert);
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('notifySlack', () => {
    beforeEach(() => {
      notifier = new Notifier({ slackWebhook: 'https://hooks.slack.com/test' });
    });

    it('should send formatted message to Slack', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await notifier.notifySlack(mockAlert);

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const callArgs = global.fetch.mock.calls[0];
      const body = JSON.parse(callArgs[1].body);

      expect(body.text).toBe('🚨 Prompt Drift Detected');
      expect(body.attachments).toHaveLength(1);
      expect(body.attachments[0].fields).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ title: 'Prompt ID', value: 'test-prompt' }),
          expect.objectContaining({ title: 'Drift Score', value: '0.450' }),
          expect.objectContaining({ title: 'Threshold', value: '0.300' })
        ])
      );
    });

    it('should use danger color for high severity', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      const highAlert = { ...mockAlert, driftScore: 0.6, threshold: 0.3 };
      await notifier.notifySlack(highAlert);

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.attachments[0].color).toBe('danger');
    });

    it('should use warning color for medium severity', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      const mediumAlert = { ...mockAlert, driftScore: 0.45, threshold: 0.3 };
      await notifier.notifySlack(mediumAlert);

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.attachments[0].color).toBe('warning');
    });

    it('should use green color for low severity', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      const lowAlert = { ...mockAlert, driftScore: 0.35, threshold: 0.3 };
      await notifier.notifySlack(lowAlert);

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.attachments[0].color).toBe('#36a64f');
    });

    it('should retry once on failure', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
        .mockResolvedValueOnce({ ok: true });

      await notifier.notifySlack(mockAlert);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slack notification failed')
      );
    });

    it('should fallback to console after retry fails', async () => {
      global.fetch = vi.fn()
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' })
        .mockResolvedValueOnce({ ok: false, status: 500, statusText: 'Server Error' });

      const consoleSpy = vi.spyOn(notifier, 'notifyConsole');

      await notifier.notifySlack(mockAlert);

      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(consoleSpy).toHaveBeenCalledWith(mockAlert);
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('Falling back to console notification')
      );
    });

    it('should fallback to console on network error', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const consoleSpy = vi.spyOn(notifier, 'notifyConsole');

      await notifier.notifySlack(mockAlert);

      expect(consoleSpy).toHaveBeenCalledWith(mockAlert);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Slack notification error')
      );
    });

    it('should truncate long prompts', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });
      
      const longPrompt = 'a'.repeat(300);
      const longAlert = { ...mockAlert, prompt: longPrompt };
      
      await notifier.notifySlack(longAlert);

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      const promptField = body.attachments[0].fields.find(f => f.title === 'Prompt');
      expect(promptField.value).toHaveLength(203);
      expect(promptField.value).toMatch(/\.\.\.$/);
    });

    it('should include timestamp in message', async () => {
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      await notifier.notifySlack(mockAlert);

      const body = JSON.parse(global.fetch.mock.calls[0][1].body);
      expect(body.attachments[0].ts).toBe(1700000000);
    });
  });

  describe('notifyConsole', () => {
    beforeEach(() => {
      notifier = new Notifier();
    });

    it('should log alert details to console', () => {
      notifier.notifyConsole(mockAlert);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DRIFT ALERT'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('test-prompt'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('0.450'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('snap-123'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('snap-100'));
    });

    it('should show high severity with red icon', () => {
      const highAlert = { ...mockAlert, driftScore: 0.6, threshold: 0.3 };
      notifier.notifyConsole(highAlert);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🔴'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DRIFT ALERT - HIGH'));
    });

    it('should show medium severity with yellow icon', () => {
      const mediumAlert = { ...mockAlert, driftScore: 0.45, threshold: 0.3 };
      notifier.notifyConsole(mediumAlert);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🟡'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DRIFT ALERT - MEDIUM'));
    });

    it('should show low severity with green icon', () => {
      const lowAlert = { ...mockAlert, driftScore: 0.35, threshold: 0.3 };
      notifier.notifyConsole(lowAlert);

      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('🟢'));
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('DRIFT ALERT - LOW'));
    });

    it('should format timestamp as ISO string', () => {
      notifier.notifyConsole(mockAlert);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('2023-11-14T22:13:20.000Z')
      );
    });

    it('should truncate long prompts', () => {
      const longPrompt = 'a'.repeat(300);
      const longAlert = { ...mockAlert, prompt: longPrompt };
      
      notifier.notifyConsole(longAlert);

      const promptLog = consoleLogSpy.mock.calls.find(call => 
        call[0].includes('Prompt:')
      );
      expect(promptLog[0]).toMatch(/\.\.\.$/);
      expect(promptLog[0].length).toBeLessThan(220);
    });
  });

  describe('getSeverity', () => {
    beforeEach(() => {
      notifier = new Notifier();
    });

    it('should return high for score >= 2x threshold', () => {
      expect(notifier.getSeverity(0.6, 0.3)).toBe('high');
      expect(notifier.getSeverity(0.8, 0.3)).toBe('high');
    });

    it('should return medium for score >= 1.5x threshold', () => {
      expect(notifier.getSeverity(0.45, 0.3)).toBe('medium');
      expect(notifier.getSeverity(0.5, 0.3)).toBe('medium');
    });

    it('should return low for score < 1.5x threshold', () => {
      expect(notifier.getSeverity(0.31, 0.3)).toBe('low');
      expect(notifier.getSeverity(0.4, 0.3)).toBe('low');
    });

    it('should handle edge cases', () => {
      expect(notifier.getSeverity(0.6, 0.3)).toBe('high');
      expect(notifier.getSeverity(0.45, 0.3)).toBe('medium');
    });
  });

  describe('truncatePrompt', () => {
    beforeEach(() => {
      notifier = new Notifier();
    });

    it('should not truncate short prompts', () => {
      const short = 'Short prompt';
      expect(notifier.truncatePrompt(short)).toBe(short);
    });

    it('should truncate long prompts at 200 characters', () => {
      const long = 'a'.repeat(300);
      const truncated = notifier.truncatePrompt(long);
      expect(truncated).toHaveLength(203);
      expect(truncated).toMatch(/\.\.\.$/);
    });

    it('should not truncate prompts exactly 200 characters', () => {
      const exact = 'a'.repeat(200);
      expect(notifier.truncatePrompt(exact)).toBe(exact);
    });
  });
});


  describe('webhook fallback', () => {
    it('should log to console when webhook not configured', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      const notifier = new Notifier();
      await notifier.notify({
        promptId: 'test',
        prompt: 'What is AI?',
        driftScore: 0.8,
        threshold: 0.5,
        snapshotId: 'snap_1',
        baselineId: 'snap_0',
        timestamp: Date.now()
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  describe('retry logic', () => {
    it('should retry on failure then log', async () => {
      let attempts = 0;
      global.fetch = vi.fn().mockImplementation(async () => {
        attempts++;
        if (attempts < 2) {
          return {
            ok: false,
            status: 500,
            statusText: 'Server Error'
          };
        }
        return {
          ok: true,
          json: async () => ({ ok: true })
        };
      });

      const notifier = new Notifier({ slackWebhook: 'https://hooks.slack.com/test' });
      await notifier.notify({
        promptId: 'test',
        prompt: 'What is AI?',
        driftScore: 0.8,
        threshold: 0.5,
        snapshotId: 'snap_1',
        baselineId: 'snap_0',
        timestamp: Date.now()
      });


      expect(attempts).toBe(2);
    });

    it('should log after max retries', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const notifier = new Notifier({ slackWebhook: 'https://hooks.slack.com/test' });
      await notifier.notify({
        promptId: 'test',
        prompt: 'What is AI?',
        driftScore: 0.8,
        threshold: 0.5,
        snapshotId: 'snap_1',
        baselineId: 'snap_0',
        timestamp: Date.now()
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });
