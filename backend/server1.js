// backend/server.js
import express from 'express';
import cors from 'cors';
import fs from 'fs/promises'; // Use promises API
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 🔄 Serve local GeoJSON file
app.get('/api/geojson', async (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'hari.json'); // Adjust path if needed
    const fileData = await fs.readFile(filePath, 'utf8');
    const jsonData = JSON.parse(fileData);

    res.json(jsonData);
  } catch (error) {
    console.error('Error reading hari.json:', error.message);
    res.status(500).json({ error: 'Failed to load GeoJSON data' });
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});