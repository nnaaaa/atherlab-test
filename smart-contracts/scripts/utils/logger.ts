import chalk from 'chalk';

const LOG_LEVELS = {
  DEBUG: 0,
  INFO: 1,
  SUCCESS: 2,
  WARN: 3,
  ERROR: 4,
} as const;

type LogLevel = keyof typeof LOG_LEVELS;

// Can be set via environment variable
const currentLogLevel = (process.env.LOG_LEVEL as LogLevel) || 'INFO';

const getTimestamp = () => {
  return new Date().toISOString().replace('T', ' ').substring(0, 19);
};

const log = (level: LogLevel, message: string, ...args: any[]) => {
  if (LOG_LEVELS[level] < LOG_LEVELS[currentLogLevel]) {
    return;
  }

  const timestamp = getTimestamp();
  const formattedArgs = args.length > 0 ? args : [''];

  switch (level) {
    case 'DEBUG':
      console.log(chalk.gray(`[${timestamp}] [DEBUG] ${message}`), ...formattedArgs);
      break;
    case 'INFO':
      console.log(chalk.blue(`[${timestamp}] [INFO] ${message}`), ...formattedArgs);
      break;
    case 'SUCCESS':
      console.log(chalk.green(`[${timestamp}] [SUCCESS] ${message}`), ...formattedArgs);
      break;
    case 'WARN':
      console.warn(chalk.yellow(`[${timestamp}] [WARN] ${message}`), ...formattedArgs);
      break;
    case 'ERROR':
      console.error(chalk.red(`[${timestamp}] [ERROR] ${message}`), ...formattedArgs);
      break;
  }
};

export const logger = {
  debug: (message: string, ...args: any[]) => log('DEBUG', message, ...args),
  info: (message: string, ...args: any[]) => log('INFO', message, ...args),
  success: (message: string, ...args: any[]) => log('SUCCESS', message, ...args),
  warn: (message: string, ...args: any[]) => log('WARN', message, ...args),
  error: (message: string, ...args: any[]) => log('ERROR', message, ...args),
};

export default logger; 