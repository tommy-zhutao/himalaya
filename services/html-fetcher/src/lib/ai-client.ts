import axios from 'axios';

const AI_ANALYSIS_URL = process.env.AI_ANALYSIS_URL || 'http://localhost:4008';

export interface AIAnalysisResult {
  aiSummary: string;
  keywords: string[];
  sentiment: string;
  category: string;
  qualityScore: number;
}

/**
 * 调用 AI 分析服务分析单篇文章
 */
export async function analyzeNews(
  title: string,
  content: string,
  summary?: string
): Promise<AIAnalysisResult | null> {
  try {
    const response = await axios.post(
      `${AI_ANALYSIS_URL}/api/analyze`,
      {
        title,
        content: content || summary || '',
        summary,
      },
      {
        timeout: 15000, // 15秒超时
      }
    );

    if (response.data?.success) {
      return response.data.data;
    }

    return null;
  } catch (error: any) {
    console.error('AI analysis failed:', error.message);
    return null;
  }
}

/**
 * 批量分析文章
 */
export async function analyzeNewsBatch(
  articles: Array<{ id: number; title: string; content: string; summary?: string }>
): Promise<Map<number, AIAnalysisResult>> {
  const results = new Map<number, AIAnalysisResult>();

  if (articles.length === 0) {
    return results;
  }

  try {
    const response = await axios.post(
      `${AI_ANALYSIS_URL}/api/analyze/batch`,
      { articles },
      {
        timeout: 30000, // 30秒超时
      }
    );

    if (response.data?.success) {
      response.data.data.forEach((item: any) => {
        results.set(item.id, item.analysis);
      });
    }
  } catch (error: any) {
    console.error('Batch AI analysis failed:', error.message);
  }

  return results;
}
