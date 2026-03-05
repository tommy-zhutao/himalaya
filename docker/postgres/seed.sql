-- 种子数据
-- 创建默认管理员用户 (密码: admin123)
-- 注意：这是一个临时密码，生产环境请修改
INSERT INTO users (email, username, password_hash, role)
VALUES ('admin@newshub.com', 'admin', '$2b$10$rKZ8JqJq', 'admin')
ON CONFLICT (email) DO NOTHING;

-- 插入示例新闻源（RSS）
INSERT INTO news_sources (name, type, url, category, enabled) VALUES
  ('Hacker News', 'rss', 'https://hnrss.org/frontpage', 'technology', true),
  ('36氪科技', 'rss', 'https://36kr.com/feed', 'technology', true),
  ('钛媒体', 'rss', 'https://www.tmtpost.com/feed', 'technology', true)
ON CONFLICT (url) DO NOTHING;

-- 添加表注释
COMMENT ON TABLE users IS '用户表';
COMMENT ON TABLE user_favorites IS '用户收藏表';
COMMENT ON TABLE news_sources IS '新闻源配置表';
COMMENT ON TABLE news IS '新闻内容表';
COMMENT ON TABLE fetch_logs IS '抓取日志表';
COMMENT ON TABLE daily_stats IS '每日统计表';
