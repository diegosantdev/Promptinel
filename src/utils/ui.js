const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  
  black: '\x1b[30m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

export function color(text, colorName) {
  if (!colors[colorName]) return text;
  return `${colors[colorName]}${text}${colors.reset}`;
}

export function success(text) {
  return `${colors.green}✓${colors.reset} ${text}`;
}

export function error(text) {
  return `${colors.red}✗${colors.reset} ${text}`;
}

export function warning(text) {
  return `${colors.yellow}⚠${colors.reset} ${text}`;
}

export function info(text) {
  return `${colors.cyan}ℹ${colors.reset} ${text}`;
}

export function header(text) {
  return `\n${colors.bright}${colors.cyan}${text}${colors.reset}\n`;
}

export function divider(char = '─', length = 50) {
  return colors.gray + char.repeat(length) + colors.reset;
}

export function keyValue(key, value, indent = 2) {
  const spaces = ' '.repeat(indent);
  return `${spaces}${colors.dim}${key}:${colors.reset} ${value}`;
}

export function driftScore(score, threshold) {
  const scoreText = score.toFixed(3);
  if (score > threshold) {
    return `${colors.red}${scoreText}${colors.reset} ${colors.red}⚠ DRIFT${colors.reset}`;
  } else if (score > threshold * 0.7) {
    return `${colors.yellow}${scoreText}${colors.reset} ${colors.yellow}⚡ WARNING${colors.reset}`;
  } else {
    return `${colors.green}${scoreText}${colors.reset} ${colors.green}✓ OK${colors.reset}`;
  }
}

export function providerBadge(provider) {
  const badges = {
    mock: `${colors.gray}[MOCK]${colors.reset}`,
    openai: `${colors.green}[OPENAI]${colors.reset}`,
    anthropic: `${colors.cyan}[ANTHROPIC]${colors.reset}`,
    mistral: `${colors.yellow}[MISTRAL]${colors.reset}`,
    ollama: `${colors.blue}[OLLAMA]${colors.reset}`,
  };
  return badges[provider] || `[${provider.toUpperCase()}]`;
}

export function box(content, title = null) {
  const lines = content.split('\n');
  
  const cleanLines = lines.map(l => stripAnsi(l));
  const contentWidth = Math.max(...cleanLines.map(l => l.length));
  const titleWidth = title ? stripAnsi(title).length : 0;
  const maxWidth = Math.max(contentWidth, titleWidth);
  
  const width = Math.min(maxWidth + 4, 60);
  
  let output = '\n';
  output += colors.gray + '┌' + '─'.repeat(width - 2) + '┐' + colors.reset + '\n';
  
  if (title) {
    const titleClean = stripAnsi(title);
    const padding = Math.floor((width - titleClean.length - 4) / 2);
    output += colors.gray + '│' + colors.reset;
    output += ' '.repeat(padding) + colors.bright + title + colors.reset;
    output += ' '.repeat(width - padding - titleClean.length - 2);
    output += colors.gray + '│' + colors.reset + '\n';
    output += colors.gray + '├' + '─'.repeat(width - 2) + '┤' + colors.reset + '\n';
  }
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const cleanLine = cleanLines[i];
    const padding = Math.max(0, width - cleanLine.length - 2);
    
    output += colors.gray + '│' + colors.reset;
    output += ' ' + line + ' '.repeat(padding);
    output += colors.gray + '│' + colors.reset + '\n';
  }
  
  output += colors.gray + '└' + '─'.repeat(width - 2) + '┘' + colors.reset + '\n';
  
  return output;
}

export function driftExplanation(explanation) {
  if (!explanation) return '';
  
  return `\n${colors.bright}${colors.magenta}📝 BEHAVIOR CHANGE:${colors.reset}\n` +
         `${colors.dim}  ${explanation}${colors.reset}\n`;
}

export function silentUpdate(previousVersion, currentVersion) {
  return `\n${colors.bgYellow}${colors.bright} ⚠️ SILENT MODEL UPDATE DETECTED ${colors.reset}\n` +
         `${colors.yellow}  The provider updated the model version behind the alias.${colors.reset}\n` +
         `${colors.dim}  Previous: ${previousVersion}${colors.reset}\n` +
         `${colors.dim}  Current:  ${currentVersion}${colors.reset}\n`;
}

export function stripAnsi(str) {
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

export function spinner(text) {
  const frames = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
  let i = 0;
  
  return {
    start() {
      process.stdout.write(`${frames[i]} ${text}`);
      this.interval = setInterval(() => {
        i = (i + 1) % frames.length;
        process.stdout.write(`\r${frames[i]} ${text}`);
      }, 80);
    },
    stop(finalText = null) {
      if (this.interval) {
        clearInterval(this.interval);
        process.stdout.write('\r' + ' '.repeat(text.length + 2) + '\r');
        if (finalText) {
          console.log(finalText);
        }
      }
    }
  };
}

export function table(headers, rows) {
  const colWidths = headers.map((h, i) => {
    const maxContentWidth = Math.max(...rows.map(r => String(r[i] || '').length));
    return Math.max(h.length, maxContentWidth);
  });
  
  let output = '\n';
  
  output += colors.gray + '┌';
  output += colWidths.map(w => '─'.repeat(w + 2)).join('┬');
  output += '┐' + colors.reset + '\n';
  
  output += colors.gray + '│' + colors.reset;
  headers.forEach((h, i) => {
    output += ' ' + colors.bright + h.padEnd(colWidths[i]) + colors.reset + ' ';
    output += colors.gray + '│' + colors.reset;
  });
  output += '\n';
  
  output += colors.gray + '├';
  output += colWidths.map(w => '─'.repeat(w + 2)).join('┼');
  output += '┤' + colors.reset + '\n';
  
  rows.forEach(row => {
    output += colors.gray + '│' + colors.reset;
    row.forEach((cell, i) => {
      output += ' ' + String(cell || '').padEnd(colWidths[i]) + ' ';
      output += colors.gray + '│' + colors.reset;
    });
    output += '\n';
  });
  
  output += colors.gray + '└';
  output += colWidths.map(w => '─'.repeat(w + 2)).join('┴');
  output += '┘' + colors.reset + '\n';
  
  return output;
}
