// backend/server.js
import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// 🔄 Proxy route to fetch live USGS GeoJSON
app.get('/api/geojson', async (req, res) => {
  try {
    const response = await axios.get(
      'https://developers.arcgis.com/documentation/mapping-and-location-services/mapping/data-layers/#display-data-from-a-geojson-file'
    );

    // Optional: filter or transform if needed
    const data = response.data;

    res.json(data);
  } catch (error) {
    console.error('Error fetching USGS data:', error.message);
    res.status(500).json({ error: 'Failed to fetch earthquake data' });
  }
});

// 🚀 Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});