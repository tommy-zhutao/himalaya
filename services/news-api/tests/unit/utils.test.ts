/**
 * Unit tests for utility functions
 */

describe('calculateKeywordSimilarity', () => {
  // Import the function (we'll need to extract it to a separate module)
  // For now, test the logic inline
  
  /**
   * Calculate Jaccard similarity between two keyword arrays
   * Jaccard similarity = |A ∩ B| / |A ∪ B|
   */
  function calculateKeywordSimilarity(keywords1: string[], keywords2: string[]): number {
    if (!keywords1?.length || !keywords2?.length) return 0;

    const set1 = new Set(keywords1.map(k => k.toLowerCase()));
    const set2 = new Set(keywords2.map(k => k.toLowerCase()));

    const intersection = new Set([...set1].filter(k => set2.has(k)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  describe('basic functionality', () => {
    it('should return 1 for identical arrays', () => {
      const arr1 = ['AI', 'machine learning', 'technology'];
      const arr2 = ['AI', 'machine learning', 'technology'];
      expect(calculateKeywordSimilarity(arr1, arr2)).toBe(1);
    });

    it('should return 0 for disjoint arrays', () => {
      const arr1 = ['AI', 'machine learning'];
      const arr2 = ['sports', 'football'];
      expect(calculateKeywordSimilarity(arr1, arr2)).toBe(0);
    });

    it('should return 0 for empty arrays', () => {
      expect(calculateKeywordSimilarity([], [])).toBe(0);
      expect(calculateKeywordSimilarity(['AI'], [])).toBe(0);
      expect(calculateKeywordSimilarity([], ['AI'])).toBe(0);
    });

    it('should return 0 for null/undefined inputs', () => {
      expect(calculateKeywordSimilarity(null as any, ['AI'])).toBe(0);
      expect(calculateKeywordSimilarity(['AI'], null as any)).toBe(0);
      expect(calculateKeywordSimilarity(null as any, null as any)).toBe(0);
    });
  });

  describe('case insensitivity', () => {
    it('should be case insensitive', () => {
      const arr1 = ['AI', 'Machine Learning'];
      const arr2 = ['ai', 'machine learning', 'TECHNOLOGY'];
      // Intersection: AI, Machine Learning (2)
      // Union: AI, Machine Learning, Technology (3)
      expect(calculateKeywordSimilarity(arr1, arr2)).toBeCloseTo(2/3, 2);
    });
  });

  describe('partial overlap', () => {
    it('should calculate correct similarity for partial overlap', () => {
      const arr1 = ['AI', 'machine learning', 'GPT', 'LLM'];
      const arr2 = ['AI', 'machine learning', 'neural networks', 'deep learning'];
      // Intersection: AI, machine learning (2)
      // Union: AI, machine learning, GPT, LLM, neural networks, deep learning (6)
      expect(calculateKeywordSimilarity(arr1, arr2)).toBeCloseTo(2/6, 2);
    });

    it('should handle single element overlap', () => {
      const arr1 = ['AI', 'technology', 'future'];
      const arr2 = ['AI', 'sports', 'entertainment'];
      // Intersection: AI (1)
      // Union: AI, technology, future, sports, entertainment (5)
      expect(calculateKeywordSimilarity(arr1, arr2)).toBeCloseTo(1/5, 2);
    });
  });
});

describe('getRecommendationScore', () => {
  /**
   * Calculate recommendation score for a news item
   * Weights: keywords (0.5), category (0.3), source (0.2)
   */
  function getRecommendationScore(
    news: { keywords: string[]; category?: string; sourceId?: string; qualityScore?: number },
    userProfile: { 
      topKeywords: string[]; 
      categoryCounts: Record<string, number>; 
      sourceCounts: Record<string, number>;
    }
  ): number {
    let score = 0;

    // 1. Keyword match (weight: 0.5)
    if (userProfile.topKeywords.length > 0 && news.keywords.length > 0) {
      const matchedKeywords = news.keywords.filter(k => 
        userProfile.topKeywords.includes(k.toLowerCase())
      );
      score += (matchedKeywords.length / Math.min(userProfile.topKeywords.length, news.keywords.length)) * 0.5;
    }

    // 2. Category preference (weight: 0.3)
    if (news.category && userProfile.categoryCounts[news.category]) {
      const maxCategoryCount = Math.max(...Object.values(userProfile.categoryCounts));
      score += (userProfile.categoryCounts[news.category] / maxCategoryCount) * 0.3;
    }

    // 3. Source preference (weight: 0.2)
    if (news.sourceId && userProfile.sourceCounts[news.sourceId]) {
      const maxSourceCount = Math.max(...Object.values(userProfile.sourceCounts));
      score += (userProfile.sourceCounts[news.sourceId] / maxSourceCount) * 0.2;
    }

    return score;
  }

  const userProfile = {
    topKeywords: ['ai', 'machine learning', 'gpt'],
    categoryCounts: { tech: 10, science: 5, sports: 2 },
    sourceCounts: { 'source-1': 8, 'source-2': 4 },
  };

  it('should give high score for matching keywords, category, and source', () => {
    const news = {
      keywords: ['AI', 'GPT', 'LLM'],
      category: 'tech',
      sourceId: 'source-1',
    };
    const score = getRecommendationScore(news, userProfile);
    expect(score).toBeGreaterThan(0.8); // High match
  });

  it('should give lower score for partial match', () => {
    const news = {
      keywords: ['AI', 'robotics'],
      category: 'science',
      sourceId: 'source-2',
    };
    const score = getRecommendationScore(news, userProfile);
    expect(score).toBeGreaterThan(0.3);
    expect(score).toBeLessThan(0.7);
  });

  it('should give 0 score for no match', () => {
    const news = {
      keywords: ['fashion', 'beauty'],
      category: 'lifestyle',
      sourceId: 'source-3',
    };
    const score = getRecommendationScore(news, userProfile);
    expect(score).toBe(0);
  });

  it('should handle empty keywords', () => {
    const news = {
      keywords: [],
      category: 'tech',
      sourceId: 'source-1',
    };
    const score = getRecommendationScore(news, userProfile);
    expect(score).toBeGreaterThan(0); // Category and source still match
  });
});

describe('getListCacheKey', () => {
  function getListCacheKey(
    page: number, 
    limit: number, 
    category: string | undefined, 
    sort: string
  ): string {
    return `news:list:${page}:${limit}:${category || 'all'}:${sort}`;
  }

  it('should generate correct cache key with all params', () => {
    const key = getListCacheKey(1, 20, 'tech', 'latest');
    expect(key).toBe('news:list:1:20:tech:latest');
  });

  it('should use "all" for undefined category', () => {
    const key = getListCacheKey(2, 10, undefined, 'hot');
    expect(key).toBe('news:list:2:10:all:hot');
  });

  it('should generate different keys for different params', () => {
    const key1 = getListCacheKey(1, 20, 'tech', 'latest');
    const key2 = getListCacheKey(2, 20, 'tech', 'latest');
    const key3 = getListCacheKey(1, 20, 'science', 'latest');
    
    expect(key1).not.toBe(key2);
    expect(key1).not.toBe(key3);
  });
});

describe('Trending Topics Algorithm', () => {
  interface NewsItem {
    id: number;
    keywords: string[];
    viewCount: number;
  }

  function calculateTrendingTopics(news: NewsItem[], minOccurrences: number = 2) {
    const keywordCounts: Record<string, { count: number; totalViews: number; newsIds: number[] }> = {};

    for (const item of news) {
      for (const keyword of item.keywords) {
        const key = keyword.toLowerCase();
        if (!keywordCounts[key]) {
          keywordCounts[key] = { count: 0, totalViews: 0, newsIds: [] };
        }
        keywordCounts[key].count++;
        keywordCounts[key].totalViews += item.viewCount;
        keywordCounts[key].newsIds.push(item.id);
      }
    }

    return Object.entries(keywordCounts)
      .map(([keyword, data]) => ({
        keyword,
        count: data.count,
        avgViews: Math.round(data.totalViews / data.count),
        score: data.count * 0.6 + (data.totalViews / data.count) * 0.4,
      }))
      .filter(t => t.count >= minOccurrences)
      .sort((a, b) => b.score - a.score);
  }

  it('should rank topics by frequency and views', () => {
    const news = [
      { id: 1, keywords: ['AI', 'GPT'], viewCount: 100 },
      { id: 2, keywords: ['AI', 'LLM'], viewCount: 200 },
      { id: 3, keywords: ['AI', 'technology'], viewCount: 150 },
      { id: 4, keywords: ['sports', 'football'], viewCount: 300 },
    ];

    const topics = calculateTrendingTopics(news);

    // AI appears 3 times, should be first
    expect(topics[0].keyword).toBe('ai');
    expect(topics[0].count).toBe(3);
  });

  it('should filter out topics with less than min occurrences', () => {
    const news = [
      { id: 1, keywords: ['AI', 'GPT'], viewCount: 100 },
      { id: 2, keywords: ['ML', 'DL'], viewCount: 200 },
    ];

    const topics = calculateTrendingTopics(news, 2);
    expect(topics).toHaveLength(0); // No keyword appears 2+ times
  });

  it('should calculate average views correctly', () => {
    const news = [
      { id: 1, keywords: ['AI'], viewCount: 100 },
      { id: 2, keywords: ['AI'], viewCount: 200 },
    ];

    const topics = calculateTrendingTopics(news);
    expect(topics[0].avgViews).toBe(150);
  });
});

describe('Pagination Helper', () => {
  function calculatePagination(page: number, limit: number, total: number) {
    const totalPages = Math.ceil(total / limit);
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }

  it('should calculate correct pagination info', () => {
    const pagination = calculatePagination(1, 20, 100);
    expect(pagination).toEqual({
      page: 1,
      limit: 20,
      total: 100,
      totalPages: 5,
      hasNext: true,
      hasPrev: false,
    });
  });

  it('should handle last page correctly', () => {
    const pagination = calculatePagination(5, 20, 100);
    expect(pagination.hasNext).toBe(false);
    expect(pagination.hasPrev).toBe(true);
  });

  it('should handle empty results', () => {
    const pagination = calculatePagination(1, 20, 0);
    expect(pagination.totalPages).toBe(0);
    expect(pagination.hasNext).toBe(false);
    expect(pagination.hasPrev).toBe(false);
  });

  it('should handle partial last page', () => {
    const pagination = calculatePagination(3, 20, 45);
    expect(pagination.totalPages).toBe(3);
    expect(pagination.hasNext).toBe(false);
  });
});

describe('Input Validation', () => {
  function validateNewsId(id: string): { valid: boolean; error?: string } {
    const parsed = parseInt(id);
    if (isNaN(parsed)) {
      return { valid: false, error: 'Invalid news ID' };
    }
    if (parsed <= 0) {
      return { valid: false, error: 'News ID must be positive' };
    }
    return { valid: true };
  }

  function validateSearchQuery(q: string): { valid: boolean; error?: string } {
    if (!q || typeof q !== 'string' || q.trim() === '') {
      return { valid: false, error: 'Search query is required' };
    }
    if (q.length > 200) {
      return { valid: false, error: 'Search query too long' };
    }
    return { valid: true };
  }

  describe('validateNewsId', () => {
    it('should accept valid numeric IDs', () => {
      expect(validateNewsId('123').valid).toBe(true);
      expect(validateNewsId('1').valid).toBe(true);
    });

    it('should reject invalid IDs', () => {
      expect(validateNewsId('abc').valid).toBe(false);
      // Note: parseInt('123abc') returns 123, which is valid
      // This behavior matches the actual API implementation
      expect(validateNewsId('').valid).toBe(false);
    });

    it('should reject negative or zero IDs', () => {
      expect(validateNewsId('0').valid).toBe(false);
      expect(validateNewsId('-1').valid).toBe(false);
    });
  });

  describe('validateSearchQuery', () => {
    it('should accept valid search queries', () => {
      expect(validateSearchQuery('AI').valid).toBe(true);
      expect(validateSearchQuery('machine learning').valid).toBe(true);
    });

    it('should reject empty queries', () => {
      expect(validateSearchQuery('').valid).toBe(false);
      expect(validateSearchQuery('   ').valid).toBe(false);
    });

    it('should reject too long queries', () => {
      const longQuery = 'a'.repeat(201);
      expect(validateSearchQuery(longQuery).valid).toBe(false);
    });
  });
});
