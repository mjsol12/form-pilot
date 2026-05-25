const LEVELS = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

export function createLogger({ level = process.env.LOG_LEVEL || 'info' } = {}) {
  const minimum = LEVELS[level] ?? LEVELS.info;

  function shouldLog(name) {
    return LEVELS[name] >= minimum;
  }

  function write(name, args) {
    if (!shouldLog(name)) {
      return;
    }

    const timestamp = new Date().toISOString();
    const line = `[${timestamp}] ${name.toUpperCase()}:`;

    if (name === 'error') {
      console.error(line, ...args);
      return;
    }

    console.log(line, ...args);
  }

  return {
    debug: (...args) => write('debug', args),
    info: (...args) => write('info', args),
    warn: (...args) => write('warn', args),
    error: (...args) => write('error', args)
  };
}
