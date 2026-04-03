// Test setup - mock external dependencies before any imports
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-testing';
process.env.REDIS_URL = '';
process.env.PORT = '0'; // random port for tests

// Mock ioredis to avoid actual Redis connections
jest.mock('ioredis', () => {
  const mockRedis = {
    get: jest.fn().mockResolvedValue(null),
    setex: jest.fn().mockResolvedValue('OK'),
    incr: jest.fn().mockResolvedValue(1),
    del: jest.fn().mockResolvedValue(1),
    on: jest.fn(),
    quit: jest.fn().mockResolvedValue('OK'),
  };
  return {
    __esModule: true,
    default: jest.fn(() => mockRedis),
  };
});

// Suppress console output during tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
