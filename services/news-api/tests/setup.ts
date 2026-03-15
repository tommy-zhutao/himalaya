// Jest setup file
import { beforeAll, afterAll } from '@jest/globals';

// Set test environment
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/news_app_test';

// Mock Redis for tests
jest.mock('../src/cache/redis', () => ({
  initRedis: jest.fn(),
  closeRedis: jest.fn(),
  get: jest.fn().mockResolvedValue(null),
  set: jest.fn().mockResolvedValue(undefined),
  del: jest.fn().mockResolvedValue(undefined),
}));

// Global hooks
beforeAll(async () => {
  // Setup test database or other resources
  console.log('Setting up test environment...');
});

afterAll(async () => {
  // Cleanup
  console.log('Cleaning up test environment...');
});
