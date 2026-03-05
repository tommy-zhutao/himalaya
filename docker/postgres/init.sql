-- AI News Hub Database Schema
-- Created: 2026-03-05

-- =====================================================
-- 用户相关
-- =====================================================

-- 用户表
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  preferences JSONB DEFAULT '{}'::jsonb,
  role VARCHAR(50) DEFAULT 'user' NOT NULL, -- 'user' | 'admin'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

-- 用户收藏表
CREATE TABLE user_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, news_id) -- 防止重复收藏
);

-- =====================================================
-- 新闻源配置
-- =====================================================

-- 新闻源表
CREATE TABLE news_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'rss' | 'api' | 'custom'
  url VARCHAR(500) NOT NULL,
  category VARCHAR(100),
  config JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  fetch_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 新闻内容
-- =====================================================

-- 新闻表
CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES news_sources(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  content TEXT, -- 完整内容（可选，有些 RSS 只有摘要）
  author VARCHAR(255),
  url VARCHAR(500) UNIQUE NOT NULL,
  image_url VARCHAR(500),
  category VARCHAR(100),
  tags JSONB DEFAULT '[]'::jsonb, -- ["AI", "科技", "LLM"]
  published_at TIMESTAMP WITH TIME ZONE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- 统计字段
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  
  -- 全文搜索向量
  search_vector tsvector
);

-- =====================================================
-- 抓取日志
-- =====================================================

-- 抓取日志表
CREATE TABLE fetch_logs (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES news_sources(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL, -- 'success' | 'failed' | 'partial'
  items_fetched INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER, -- 完成时间 - 开始时间
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 系统统计
-- =====================================================

-- 每日统计表
CREATE TABLE daily_stats (
  id SERIAL PRIMARY KEY,
  date DATE UNIQUE NOT NULL,
  total_news INTEGER DEFAULT 0,
  total_fetched INTEGER DEFAULT 0,
  active_users INTEGER DEFAULT 0,
  page_views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- 索引优化
-- =====================================================

-- 用户表索引
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

-- 新闻表索引
CREATE INDEX idx_news_published_at ON news(published_at DESC);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_source_id ON news(source_id);
CREATE INDEX idx_news_tags ON news USING GIN(tags);
CREATE INDEX idx_news_view_count ON news(view_count DESC);
CREATE INDEX idx_news_created_at ON news(created_at DESC);

-- 收藏表索引
CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_news_id ON user_favorites(news_id);

-- 新闻源表索引
CREATE INDEX idx_news_sources_type ON news_sources(type);
CREATE INDEX idx_news_sources_enabled ON news_sources(enabled);

-- 抓取日志表索引
CREATE INDEX idx_fetch_logs_source_id ON fetch_logs(source_id);
CREATE INDEX idx_fetch_logs_status ON fetch_logs(status);
CREATE INDEX idx_fetch_logs_started_at ON fetch_logs(started_at DESC);

-- 统计表索引
CREATE INDEX idx_daily_stats_date ON daily_stats(date DESC);

-- =====================================================
-- 全文搜索（使用 PostgreSQL tsvector）
-- =====================================================

-- 创建全文搜索触发器函数
CREATE OR REPLACE FUNCTION news_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := setweight(to_tsvector('chinese', coalesce(NEW.title, '')), 'A') ||
                        setweight(to_tsvector('chinese', coalesce(NEW.summary, '')), 'B') ||
                        setweight(to_tsvector('chinese', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER news_search_update
BEFORE INSERT OR
UPDATE ON news
FOR EACH ROW EXECUTE FUNCTION news_search_trigger();

-- 全文搜索索引
CREATE INDEX idx_news_search ON news USING GIN(search_vector);

-- =====================================================
-- 种子数据
-- =====================================================

-- 创建默认管理员用户 (密码: admin123)
-- bcrypt hash for 'admin123' (cost 10)
INSERT INTO users (email, username, password_hash, role)
VALUES ('admin@newshub.com', 'admin', '$2b$10$rKZ8JqJqJqJqJqJqJqJqJuJqJqJqJqJqJqJqJqJqJqJqJqJqJq', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 插入示例新闻源（RSS）
INSERT INTO news_sources (name, type, url, category, enabled) VALUES
  ('Hacker News', 'rss', 'https://hnrss.org/frontpage', 'technology', true),
  ('36氪科技', 'rss', 'https://36kr.com/feed', 'technology', true),
  ('钛媒体', 'rss', 'https://www.tmtpost.com/feed', 'technology', true)
ON CONFLICT (url) DO NOTHING;

COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE user_favorites IS '用户收藏表';
COMMENT ON TABLE news_sources IS '新闻源配置表';
COMMENT ON TABLE news IS '新闻内容表';
COMMENT ON TABLE fetch_logs IS '抓取日志表';
COMMENT ON TABLE daily_stats IS '每日统计表';
