-- 添加 AI 分析字段
ALTER TABLE news ADD COLUMN IF NOT EXISTS ai_summary TEXT;
ALTER TABLE news ADD COLUMN IF NOT EXISTS keywords JSONB DEFAULT '[]'::jsonb;
ALTER TABLE news ADD COLUMN IF NOT EXISTS sentiment VARCHAR(20);
ALTER TABLE news ADD COLUMN IF NOT EXISTS quality_score INTEGER;
ALTER TABLE news ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMP WITH TIME ZONE;

-- 添加索引
CREATE INDEX IF NOT EXISTS idx_news_sentiment ON news(sentiment);
CREATE INDEX IF NOT EXISTS idx_news_quality_score ON news(quality_score DESC);

COMMENT ON COLUMN news.ai_summary IS 'AI 生成的摘要';
COMMENT ON COLUMN news.keywords IS '提取的关键词（数组）';
COMMENT ON COLUMN news.sentiment IS '情感分析：positive/negative/neutral';
COMMENT ON COLUMN news.quality_score IS '质量评分（0-100）';
COMMENT ON COLUMN news.analyzed_at IS 'AI 分析时间戳';
