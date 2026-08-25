const express = require('express');
const path = require('path');
const cors = require('cors');

const destinationsRouter = require('./routes/destinations');

const app = express();
app.use(cors());
app.use(express.json());

// Serve images from the main project's static images folder
app.use('/images', express.static(path.join(__dirname, '..', 'static', 'images')));

app.use('/api/destinations', destinationsRouter);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Globetrotter API listening on ${PORT}`));
