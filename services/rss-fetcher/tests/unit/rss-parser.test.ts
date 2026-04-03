/**
 * Unit tests for RSS Fetcher core logic
 * All external dependencies are mocked inline.
 */

// --- Mocks must come before imports ---

const mockFindUnique = jest.fn();
const mockFindMany = jest.fn();
const mockCreate = jest.fn();
const mockUpdate = jest.fn();

jest.mock('../../src/lib/prisma', () => ({
  prisma: {
    newsSource: { findUnique: mockFindUnique, findMany: mockFindMany, update: mockUpdate },
    news: { findUnique: mockFindUnique, findMany: mockFindMany, create: mockCreate, update: mockUpdate },
    fetchLog: { create: mockCreate, findMany: mockFindMany },
    $connect: jest.fn(),
    $disconnect: jest.fn(),
  },
}));

const mockAnalyzeNews = jest.fn().mockResolvedValue({
  aiSummary: 'Test AI summary',
  keywords: ['AI', 'test'],
  sentiment: 'positive',
  category: 'technology',
  qualityScore: 0.8,
});

jest.mock('../../src/lib/ai-client', () => ({
  analyzeNews: mockAnalyzeNews,
  analyzeNewsBatch: jest.fn().mockResolvedValue(new Map()),
}));

jest.mock('rss-parser', () => ({
  __esModule: true,
  default: class MockParser {
    constructor(opts?: any) {}
    async parseURL(url: string) {
      return {
        title: 'Test Feed',
        link: 'https://example.com',
        items: [
          { title: 'Test Article 1', link: 'https://example.com/article1', contentSnippet: 'Summary 1', pubDate: '2024-01-01T00:00:00Z', creator: 'Author', categories: ['AI'] },
          { title: 'Test Article 2', link: 'https://example.com/article2', contentSnippet: 'Summary 2', pubDate: '2024-01-02T00:00:00Z' },
        ],
      };
    }
  },
}));

// --- Imports ---

import { fetchRSSFeed, fetchAllRSS } from '../../src/lib/rss-fetcher';

// Suppress console during tests
beforeAll(() => { console.log = jest.fn() as any; console.error = jest.fn() as any; });

describe('RSS Fetcher - fetchRSSFeed', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('should throw error when source is not found', async () => {
    mockFindUnique.mockResolvedValue(null);
    await expect(fetchRSSFeed(999)).rejects.toThrow('News source with id 999 not found');
  });

  it('should return disabled result when source is not enabled', async () => {
    mockFindUnique.mockResolvedValue({ id: 1, name: 'Disabled Feed', url: 'https://example.com', type: 'rss', enabled: false, category: 'tech' });
    const result = await fetchRSSFeed(1);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Source is disabled');
  });

  it('should fetch and create new articles', async () => {
    let findUniqueCount = 0;
    mockFindUnique.mockImplementation(() => {
      findUniqueCount++;
      if (findUniqueCount === 1) return Promise.resolve({ id: 1, name: 'Test Feed', url: 'https://example.com', type: 'rss', enabled: true, category: 'tech' });
      return Promise.resolve(null); // no existing news by URL
    });
    mockFindMany.mockResolvedValue([]); // no recent news
    mockCreate.mockResolvedValue({ id: 1 });
    mockUpdate.mockResolvedValue({});

    const result = await fetchRSSFeed(1);
    expect(result.success).toBe(true);
    expect(result.itemsFetched).toBe(2);
    expect(result.itemsCreated).toBe(2);
    expect(mockAnalyzeNews).toHaveBeenCalledTimes(2);
  });

  it('should update existing articles when URL already exists', async () => {
    let findUniqueCount = 0;
    mockFindUnique.mockImplementation(() => {
      findUniqueCount++;
      if (findUniqueCount === 1) return Promise.resolve({ id: 1, name: 'Test Feed', url: 'https://example.com', type: 'rss', enabled: true, category: 'tech' });
      return Promise.resolve({ id: 10 }); // article exists
    });
    mockUpdate.mockResolvedValue({});

    const result = await fetchRSSFeed(1);
    expect(result.success).toBe(true);
    expect(result.itemsUpdated).toBe(2);
    expect(result.itemsCreated).toBe(0);
    expect(mockAnalyzeNews).not.toHaveBeenCalled();
  });

  it('should skip duplicates by title similarity', async () => {
    let findUniqueCount = 0;
    mockFindUnique.mockImplementation(() => {
      findUniqueCount++;
      if (findUniqueCount === 1) return Promise.resolve({ id: 1, name: 'Test Feed', url: 'https://example.com', type: 'rss', enabled: true, category: 'tech' });
      return Promise.resolve(null);
    });
    mockFindMany.mockResolvedValue([{ id: 100, title: 'Test Article 1', sourceId: 1 }]);
    mockCreate.mockResolvedValue({ id: 1 });
    mockUpdate.mockResolvedValue({});

    const result = await fetchRSSFeed(1);
    expect(result.itemsSkipped).toBe(1);
    expect(result.itemsCreated).toBe(1);
  });

  it('should handle fetch errors gracefully', async () => {
    mockFindUnique.mockResolvedValue({ id: 1, name: 'Bad Feed', url: 'https://bad.com', type: 'rss', enabled: true, category: 'tech' });
    mockUpdate.mockResolvedValue({});

    // Override parser to throw
    const Parser = require('rss-parser').default;
    const origParseURL = Parser.prototype.parseURL;
    Parser.prototype.parseURL = jest.fn().mockRejectedValue(new Error('Network error'));

    const result = await fetchRSSFeed(1);
    expect(result.success).toBe(false);
    expect(result.errorMessage).toBe('Network error');

    Parser.prototype.parseURL = origParseURL;
  });
});

describe('RSS Fetcher - fetchAllRSS', () => {
  beforeEach(() => { jest.clearAllMocks(); });

  it('should return empty array when no sources found', async () => {
    mockFindMany.mockResolvedValue([]);
    const results = await fetchAllRSS();
    expect(results).toEqual([]);
  });

  it('should fetch all enabled RSS sources', async () => {
    const sources = [
      { id: 1, name: 'Feed 1', type: 'rss', enabled: true, url: 'https://example.com/feed1', category: 'tech' },
      { id: 2, name: 'Feed 2', type: 'rss', enabled: true, url: 'https://example.com/feed2', category: 'tech' },
    ];

    // Use a smarter mock that inspects args
    mockFindMany.mockImplementation((args?: any) => {
      if (!args || args.where?.type === 'rss') return Promise.resolve(sources);
      return Promise.resolve([]); // duplicate check
    });

    // findUnique is used for both newsSource.findUnique and news.findUnique
    // newsSource.findUnique: { where: { id: N } }
    // news.findUnique: { where: { url: '...' } }
    mockFindUnique.mockImplementation((args?: any) => {
      if (args?.where?.id === 1) return Promise.resolve(sources[0]);
      if (args?.where?.id === 2) return Promise.resolve(sources[1]);
      // All URL checks return null (no existing news)
      return Promise.resolve(null);
    });
    mockCreate.mockResolvedValue({ id: 1 });
    mockUpdate.mockResolvedValue({});

    const results = await fetchAllRSS();
    expect(results).toHaveLength(2);
    expect(results.every(r => r.success)).toBe(true);
  });
});
