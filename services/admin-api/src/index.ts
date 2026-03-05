import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4003;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'admin-api', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`Admin API service running on port ${PORT}`);
});
