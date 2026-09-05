const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const destinationsRouter = require('./routes/destinations');

const app = express();
app.use(cors());
app.use(express.json());

// Serve images from the main project's static images folder
app.use('/images', express.static(path.join(__dirname, '..', 'static', 'images')));

app.use('/api/destinations', destinationsRouter);

// Serve React build if available (client/build)
const CLIENT_BUILD_PATH = path.join(__dirname, '..', 'client', 'build');
if (fs.existsSync(CLIENT_BUILD_PATH)) {
	app.use(express.static(CLIENT_BUILD_PATH));
	// fallback to index.html for client-side routing
	app.get('*', (req, res) => {
		res.sendFile(path.join(CLIENT_BUILD_PATH, 'index.html'));
	});
}

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Globetrotter API listening on ${PORT}`));
