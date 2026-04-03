// Test setup - Mock Prisma client and external deps
process.env.NODE_ENV = 'test';

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    newsSource: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    news: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    fetchLog: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

jest.mock('node-fetch', () => {
  const mockFetch: any = jest.fn();
  return { __esModule: true, default: mockFetch };
});

jest.mock('node-cron', () => ({
  validate: jest.fn().mockReturnValue(true),
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));
