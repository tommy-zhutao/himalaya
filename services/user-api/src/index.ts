import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4002;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'user-api', timestamp: new Date().toISOString() });
});

// Auth routes
app.post('/api/auth/register', (req, res) => {
  res.json({ message: 'User registration endpoint' });
});

app.post('/api/auth/login', (req, res) => {
  res.json({ message: 'User login endpoint' });
});

app.post('/api/auth/refresh', (req, res) => {
  res.json({ message: 'Token refresh endpoint' });
});

// User routes
app.get('/api/users/me', (req, res) => {
  res.json({ message: 'Get current user endpoint' });
});

app.listen(PORT, () => {
  console.log(`User API service running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});
