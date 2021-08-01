global.console = {
  log: jest.fn(),
  error: jest.fn(),
  warn: console.warn,
  info: console.info,
  debug: console.debug,
};
