import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3001;

// Basic CORS setup
app.use(cors({
  origin: ['http://localhost:3000'],
  methods: ['GET'],
  allowedHeaders: ['Content-Type']
}));

app.use(express.json());

// Serve GeoJSON from hari.json
app.get('/api/sites', async (req, res) => {
  try {
    const filePath = path.join(__dirname, 'hari.json');
    const rawData = await fs.readFile(filePath, 'utf8');
    const geoData = JSON.parse(rawData);
    res.json(geoData);
  } catch (err) {
    console.error('🔥 Error loading GeoJSON:', err.message);
    res.status(500).send('Failed to load site data');
  }
});

// Root route
app.get('/', (req, res) => {
  res.send('🌍 Earthquake map backend is running!');
});

app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});