-- 全文搜索触发器函数
CREATE OR REPLACE FUNCTION news_search_trigger() RETURNS trigger AS $$
BEGIN
  NEW.search_vector := 
    setweight(to_tsvector('chinese', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('chinese', coalesce(NEW.summary, '')), 'B') ||
    setweight(to_tsvector('chinese', coalesce(array_to_string(NEW.tags, ' '), '')), 'C');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER news_search_update
BEFORE INSERT OR UPDATE ON news
FOR EACH ROW EXECUTE FUNCTION news_search_trigger();

-- 全文搜索索引
CREATE INDEX idx_news_search ON news USING GIN(search_vector);
