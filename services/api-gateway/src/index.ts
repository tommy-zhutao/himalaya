import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/.well-known/health', (req, res) => {
  res.json({ status: 'ok', service: 'api-gateway', timestamp: new Date().toISOString() });
});

// Proxy routes to downstream services
app.all('/api/news/*', (req, res) => {
  res.json({ message: 'Proxied to News API' });
});

app.all('/api/users/*', (req, res) => {
  res.json({ message: 'Proxied to User API' });
});

app.all('/api/admin/*', (req, res) => {
  res.json({ message: 'Proxied to Admin API' });
});

app.all('/api/auth/*', (req, res) => {
  res.json({ message: 'Proxied to User API (auth)' });
});

app.listen(PORT, () => {
  console.log(`API Gateway running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/.well-known/health`);
});
