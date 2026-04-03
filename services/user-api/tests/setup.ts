// Test setup - Mock Prisma client and set test environment
process.env.NODE_ENV = 'test'
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing-only'

// Create mock functions
const mockFindUnique = jest.fn()
const mockCreate = jest.fn()
const mockUpdate = jest.fn()
const mockCount = jest.fn()
const mockFindMany = jest.fn()
const mockDelete = jest.fn()
const mockDeleteMany = jest.fn()

// Mock Prisma client before any imports
jest.mock('@prisma/client', () => {
  return {
    PrismaClient: jest.fn(() => ({
      user: {
        findUnique: mockFindUnique,
        create: mockCreate,
        update: mockUpdate,
        count: mockCount,
        findMany: mockFindMany,
        delete: mockDelete,
      },
      userFavorite: {
        findMany: mockFindMany,
        findUnique: mockFindUnique,
        create: mockCreate,
        delete: mockDelete,
        deleteMany: mockDeleteMany,
        count: mockCount,
      },
      news: {
        findUnique: mockFindUnique,
        findMany: mockFindMany,
        count: mockCount,
        update: mockUpdate,
        delete: mockDelete,
      },
      newsSource: {
        findUnique: mockFindUnique,
        findMany: mockFindMany,
        create: mockCreate,
        update: mockUpdate,
        delete: mockDelete,
      },
      fetchLog: {
        findMany: mockFindMany,
        findUnique: mockFindUnique,
        count: mockCount,
      },
      $connect: jest.fn(),
      $disconnect: jest.fn(),
    })),
  }
})

// Export mocks for use in tests
export const mocks = {
  findUnique: mockFindUnique,
  create: mockCreate,
  update: mockUpdate,
  count: mockCount,
  findMany: mockFindMany,
  delete: mockDelete,
  deleteMany: mockDeleteMany,
}
