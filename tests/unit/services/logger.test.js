import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Logger } from '../../../src/services/logger.js';
import fs from 'fs';
import path from 'path';

describe('Logger', () => {
  const testLogDir = '.promptinel-test/logs';
  let logger;
  let consoleErrorSpy;
  let consoleWarnSpy;
  let consoleLogSpy;

  beforeEach(() => {
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }

    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

    logger = new Logger({ logDir: testLogDir });
  });

  afterEach(() => {
    if (fs.existsSync(testLogDir)) {
      fs.rmSync(testLogDir, { recursive: true, force: true });
    }

    consoleErrorSpy.mockRestore();
    consoleWarnSpy.mockRestore();
    consoleLogSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create log directory if it does not exist', () => {
      expect(fs.existsSync(testLogDir)).toBe(true);
    });

    it('should use default options', () => {
      expect(logger.logDir).toBe(testLogDir);
      expect(logger.level).toBe('info');
      expect(logger.verbose).toBe(false);
      expect(logger.debugMode).toBe(false);
    });

    it('should accept custom options', () => {
      const customLogger = new Logger({
        logDir: '.custom-logs',
        level: 'debug',
        verbose: true,
        debug: true
      });

      expect(customLogger.level).toBe('debug');
      expect(customLogger.verbose).toBe(true);
      expect(customLogger.debugMode).toBe(true);

      if (fs.existsSync('.custom-logs')) {
        fs.rmSync('.custom-logs', { recursive: true, force: true });
      }
    });
  });

  describe('log levels', () => {
    it('should write error logs', () => {
      logger.error('Test error');

      const logFiles = logger.getLogFiles();
      expect(logFiles.length).toBe(1);

      const content = fs.readFileSync(logFiles[0], 'utf8');
      expect(content).toContain('[ERROR]');
      expect(content).toContain('Test error');
    });

    it('should write warn logs', () => {
      logger.warn('Test warning');

      const logFiles = logger.getLogFiles();
      expect(logFiles.length).toBe(1);

      const content = fs.readFileSync(logFiles[0], 'utf8');
      expect(content).toContain('[WARN]');
      expect(content).toContain('Test warning');
    });

    it('should write info logs', () => {
      logger.info('Test info');

      const logFiles = logger.getLogFiles();
      expect(logFiles.length).toBe(1);

      const content = fs.readFileSync(logFiles[0], 'utf8');
      expect(content).toContain('[INFO]');
      expect(content).toContain('Test info');
    });

    it('should write debug logs when level is debug', () => {
      const debugLogger = new Logger({ logDir: testLogDir, level: 'debug' });
      debugLogger.debug('Test debug');

      const logFiles = debugLogger.getLogFiles();
      expect(logFiles.length).toBe(1);

      const content = fs.readFileSync(logFiles[0], 'utf8');
      expect(content).toContain('[DEBUG]');
      expect(content).toContain('Test debug');
    });

    it('should not write debug logs when level is info', () => {
      logger.debug('Test debug');

      const logFiles = logger.getLogFiles();
      if (logFiles.length > 0) {
        const content = fs.readFileSync(logFiles[0], 'utf8');
        expect(content).not.toContain('Test debug');
      }
    });
  });

  describe('metadata logging', () => {
    it('should include metadata in log entries', () => {
      logger.info('Test with metadata', { key: 'value', count: 42 });

      const logFiles = logger.getLogFiles();
      const content = fs.readFileSync(logFiles[0], 'utf8');

      expect(content).toContain('Test with metadata');
      expect(content).toContain('"key":"value"');
      expect(content).toContain('"count":42');
    });

    it('should handle empty metadata', () => {
      logger.info('Test without metadata');

      const logFiles = logger.getLogFiles();
      const content = fs.readFileSync(logFiles[0], 'utf8');

      expect(content).toContain('Test without metadata');
      expect(content).not.toContain('{}');
    });
  });

  describe('console output', () => {
    it('should always output errors to console', () => {
      logger.error('Test error');
      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should output warnings in verbose mode', () => {
      const verboseLogger = new Logger({ logDir: testLogDir, verbose: true });
      verboseLogger.warn('Test warning');
      expect(consoleWarnSpy).toHaveBeenCalled();
    });

    it('should not output warnings in non-verbose mode', () => {
      logger.warn('Test warning');
      expect(consoleWarnSpy).not.toHaveBeenCalled();
    });

    it('should output info in verbose mode', () => {
      const verboseLogger = new Logger({ logDir: testLogDir, verbose: true });
      verboseLogger.info('Test info');
      expect(consoleLogSpy).toHaveBeenCalled();
    });

    it('should not output info in non-verbose mode', () => {
      logger.info('Test info');
      expect(consoleLogSpy).not.toHaveBeenCalled();
    });

    it('should output debug in debug mode', () => {
      const debugLogger = new Logger({ logDir: testLogDir, debug: true, level: 'debug' });
      debugLogger.debug('Test debug');
      expect(consoleLogSpy).toHaveBeenCalled();
    });
  });

  describe('user-friendly error formatting', () => {
    it('should format errors without stack traces by default', () => {
      const error = new Error('Something went wrong');
      logger.error('Operation failed', { error });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('Error: Operation failed');
      expect(call).toContain('Something went wrong');
      expect(call).not.toContain('Stack trace:');
    });

    it('should include stack traces in debug mode', () => {
      const debugLogger = new Logger({ logDir: testLogDir, debug: true });
      const error = new Error('Something went wrong');
      debugLogger.error('Operation failed', { error });

      expect(consoleErrorSpy).toHaveBeenCalled();
      const call = consoleErrorSpy.mock.calls[0][0];
      expect(call).toContain('Stack trace:');
    });
  });

  describe('specialized logging methods', () => {
    it('should log API failures', () => {
      const error = new Error('Connection timeout');
      logger.logApiFailure('ollama', 'llama2', error);

      const logFiles = logger.getLogFiles();
      const content = fs.readFileSync(logFiles[0], 'utf8');

      expect(content).toContain('API call failed');
      expect(content).toContain('"provider":"ollama"');
      expect(content).toContain('"model":"llama2"');
      expect(content).toContain('Connection timeout');
    });

    it('should log file operation failures', () => {
      const error = new Error('Permission denied');
      logger.logFileFailure('write', '/path/to/file.json', error);

      const logFiles = logger.getLogFiles();
      const content = fs.readFileSync(logFiles[0], 'utf8');

      expect(content).toContain('File operation failed');
      expect(content).toContain('"operation":"write"');
      expect(content).toContain('"filePath":"/path/to/file.json"');
      expect(content).toContain('Permission denied');
    });

    it('should log successful operations', () => {
      logger.logSuccess('snapshot creation', { promptId: 'test-prompt' });

      const logFiles = logger.getLogFiles();
      const content = fs.readFileSync(logFiles[0], 'utf8');

      expect(content).toContain('Operation successful: snapshot creation');
      expect(content).toContain('"promptId":"test-prompt"');
    });
  });

  describe('daily log rotation', () => {
    it('should create log file with current date', () => {
      logger.info('Test message');

      const logFiles = logger.getLogFiles();
      expect(logFiles.length).toBe(1);

      const date = new Date().toISOString().split('T')[0];
      const expectedFileName = `promptinel-${date}.log`;
      expect(logFiles[0]).toContain(expectedFileName);
    });

    it('should append to existing log file on same day', () => {
      logger.info('First message');
      logger.info('Second message');

      const logFiles = logger.getLogFiles();
      expect(logFiles.length).toBe(1);

      const content = fs.readFileSync(logFiles[0], 'utf8');
      expect(content).toContain('First message');
      expect(content).toContain('Second message');
    });
  });

  describe('log file management', () => {
    it('should list all log files', () => {
      logger.info('Test message');

      const logFiles = logger.getLogFiles();
      expect(logFiles.length).toBe(1);
      expect(logFiles[0]).toContain('promptinel-');
      expect(logFiles[0]).toContain('.log');
    });

    it('should return empty array when log directory does not exist', () => {
      const newLogger = new Logger({ logDir: '.nonexistent-logs' });
      fs.rmSync('.nonexistent-logs', { recursive: true, force: true });

      const logFiles = newLogger.getLogFiles();
      expect(logFiles).toEqual([]);
    });

    it('should clean up old log files', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 35);
      const oldFileName = `promptinel-${oldDate.toISOString().split('T')[0]}.log`;
      const oldFilePath = path.join(testLogDir, oldFileName);

      fs.writeFileSync(oldFilePath, 'Old log content\n', 'utf8');
      
      fs.writeFileSync(oldFilePath, 'Old log content\n', 'utf8');
      
      const oldTime = Date.now() - (35 * 24 * 60 * 60 * 1000);
      fs.utimesSync(oldFilePath, new Date(oldTime), new Date(oldTime));

      logger.info('Current log');


      const deletedCount = logger.cleanupOldLogs(30);

      expect(deletedCount).toBe(1);
      expect(fs.existsSync(oldFilePath)).toBe(false);


      const logFiles = logger.getLogFiles();
      expect(logFiles.length).toBe(1);
    });

    it('should not delete recent log files', () => {
      logger.info('Recent log');

      const deletedCount = logger.cleanupOldLogs(30);

      expect(deletedCount).toBe(0);

      const logFiles = logger.getLogFiles();
      expect(logFiles.length).toBe(1);
    });
  });

  describe('error handling', () => {
    it('should handle file write failures gracefully', () => {
      const invalidLogger = new Logger({ logDir: '/invalid/path/that/cannot/be/created' });
      

      expect(() => {
        invalidLogger.error('Test error');
      }).not.toThrow();

      expect(consoleErrorSpy).toHaveBeenCalled();
    });
  });
});
