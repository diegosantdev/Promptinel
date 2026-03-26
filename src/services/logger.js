import fs from 'fs';
import path from 'path';

export class Logger {
  constructor(options = {}) {
    this.logDir = options.logDir || '.promptinel/logs';
    this.level = options.level || 'info';
    this.verbose = options.verbose || false;
    this.debugMode = options.debug || false;
    
    this.levels = {
      error: 0,
      warn: 1,
      info: 2,
      debug: 3
    };
    
    this._ensureLogDir();
  }

  _ensureLogDir() {
    try {
      if (!fs.existsSync(this.logDir)) {
        fs.mkdirSync(this.logDir, { recursive: true });
      }
    } catch (err) {
    }
  }

  _getLogFilePath() {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this.logDir, `promptinel-${date}.log`);
  }

  _shouldLog(level) {
    return this.levels[level] <= this.levels[this.level];
  }

  _formatLogEntry(level, message, metadata = {}) {
    const timestamp = new Date().toISOString();
    const metaStr = Object.keys(metadata).length > 0 
      ? ` ${JSON.stringify(metadata)}` 
      : '';
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}\n`;
  }

  _writeLog(level, message, metadata = {}) {
    if (!this._shouldLog(level)) {
      return;
    }

    const logEntry = this._formatLogEntry(level, message, metadata);
    const logFile = this._getLogFilePath();

    try {
      fs.appendFileSync(logFile, logEntry, 'utf8');
    } catch (err) {
      console.error('Failed to write log:', err.message);
    }
  }

  _formatUserError(error, context) {
    let message = `Error: ${context}`;
    
    if (error.message) {
      message += `\n  ${error.message}`;
    }
    
    if (this.debugMode && error.stack) {
      message += `\n\nStack trace:\n${error.stack}`;
    }
    
    return message;
  }

  error(message, metadata = {}) {
    this._writeLog('error', message, metadata);
    
    if (metadata.error instanceof Error) {
      console.error(this._formatUserError(metadata.error, message));
    } else {
      console.error(`Error: ${message}`);
    }
  }

  warn(message, metadata = {}) {
    this._writeLog('warn', message, metadata);
    
    if (this.verbose) {
      console.warn(`Warning: ${message}`);
    }
  }

  info(message, metadata = {}) {
    this._writeLog('info', message, metadata);
    
    if (this.verbose) {
      console.log(`Info: ${message}`);
    }
  }

  debug(message, metadata = {}) {
    this._writeLog('debug', message, metadata);
    
    if (this.debugMode) {
      console.log(`Debug: ${message}`);
    }
  }

  logApiFailure(provider, model, error) {
    this.error('API call failed', {
      provider,
      model,
      error: error.message,
      stack: error.stack
    });
  }

  logFileFailure(operation, filePath, error) {
    this.error('File operation failed', {
      operation,
      filePath,
      error: error.message,
      stack: error.stack
    });
  }

  logSuccess(operation, metadata = {}) {
    this.info(`Operation successful: ${operation}`, metadata);
  }

  getLogFiles() {
    if (!fs.existsSync(this.logDir)) {
      return [];
    }

    return fs.readdirSync(this.logDir)
      .filter(file => file.startsWith('promptinel-') && file.endsWith('.log'))
      .map(file => path.join(this.logDir, file));
  }

  cleanupOldLogs(daysToKeep = 30) {
    const files = this.getLogFiles();
    const now = Date.now();
    const maxAge = daysToKeep * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const file of files) {
      try {
        const stats = fs.statSync(file);
        const age = now - stats.mtimeMs;

        if (age > maxAge) {
          fs.unlinkSync(file);
          deletedCount++;
          this.info(`Deleted old log file: ${file}`);
        }
      } catch (err) {
        this.warn(`Failed to delete log file: ${file}`, { error: err.message });
      }
    }

    return deletedCount;
  }
}
