// Test setup - mock external dependencies before any imports
process.env.NODE_ENV = 'test';
process.env.PORT = '0';
process.env.ZHIPU_API_KEY = 'test-api-key';
process.env.ZHIPU_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4';
process.env.ZHIPU_MODEL = 'glm-4';

// Mock ioredis
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

// Mock @prisma/client
jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({
    $connect: jest.fn().mockResolvedValue(undefined),
    $disconnect: jest.fn().mockResolvedValue(undefined),
    news: {
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      delete: jest.fn().mockResolvedValue({}),
    },
  })),
}));

// Suppress console output during tests
const originalConsole = console;
global.console = {
  ...originalConsole,
  log: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
};
