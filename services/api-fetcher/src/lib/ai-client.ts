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
        timeout: 15000,
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
