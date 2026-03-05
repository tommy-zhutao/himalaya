import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'news-api', timestamp: new Date().toISOString() });
});

// News routes
app.get('/api/news', (req, res) => {
  const { page = 1, limit = 20, category, sort } = req.query;
  res.json({
    news: [],
    page: parseInt(page as string),
    limit: parseInt(limit as string),
    total: 0,
    filters: { category, sort }
  });
});

// Get news by ID
app.get('/api/news/:id', (req, res) => {
  const { id } = req.params;
  res.json({ id, title: 'News Title', content: 'News content...' });
});

// Search news
app.get('/api/news/search', (req, res) => {
  const { q } = req.query;
  res.json({ results: [], query: q });
});

// Start server
app.listen(PORT, () => {
  console.log(`News API service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
