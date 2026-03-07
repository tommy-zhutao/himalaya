-- AI News Hub Database Schema
-- Created: 2026-03-05

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(500),
  preferences JSONB DEFAULT '{}'::jsonb,
  role VARCHAR(50) DEFAULT 'user' NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE news_sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  url VARCHAR(500) UNIQUE NOT NULL,
  category VARCHAR(100),
  config JSONB DEFAULT '{}'::jsonb,
  enabled BOOLEAN DEFAULT true,
  last_fetched_at TIMESTAMP WITH TIME ZONE,
  fetch_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE news (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES news_sources(id) ON DELETE SET NULL,
  title VARCHAR(500) NOT NULL,
  summary TEXT,
  content TEXT,
  author VARCHAR(255),
  url VARCHAR(500) UNIQUE NOT NULL,
  image_url VARCHAR(500),
  category VARCHAR(100),
  tags JSONB DEFAULT '[]'::jsonb,
  published_at TIMESTAMP WITH TIME ZONE,
  fetched_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  share_count INTEGER DEFAULT 0,
  search_vector tsvector
);

CREATE TABLE user_favorites (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  news_id INTEGER REFERENCES news(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, news_id)
);

CREATE TABLE fetch_logs (
  id SERIAL PRIMARY KEY,
  source_id INTEGER REFERENCES news_sources(id) ON DELETE SET NULL,
  status VARCHAR(50) NOT NULL,
  items_fetched INTEGER DEFAULT 0,
  items_created INTEGER DEFAULT 0,
  items_updated INTEGER DEFAULT 0,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_seconds INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);

CREATE INDEX idx_news_published_at ON news(published_at DESC);
CREATE INDEX idx_news_category ON news(category);
CREATE INDEX idx_news_source_id ON news(source_id);
CREATE INDEX idx_news_tags ON news USING GIN(tags);
CREATE INDEX idx_news_view_count ON news(view_count DESC);
CREATE INDEX idx_news_created_at ON news(created_at DESC);

CREATE INDEX idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX idx_user_favorites_news_id ON user_favorites(news_id);

CREATE INDEX idx_news_sources_type ON news_sources(type);
CREATE INDEX idx_news_sources_enabled ON news_sources(enabled);

CREATE INDEX idx_fetch_logs_source_id ON fetch_logs(source_id);
CREATE INDEX idx_fetch_logs_status ON fetch_logs(status);
CREATE INDEX idx_fetch_logs_started_at ON fetch_logs(started_at DESC);

CREATE INDEX idx_daily_stats_date ON daily_stats(date DESC);

INSERT INTO users (email, username, password_hash, role)
VALUES ('admin@newshub.com', 'admin', '$2b$10$rKZ8Jq', 'admin')
ON CONFLICT (email) DO NOTHING;

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
