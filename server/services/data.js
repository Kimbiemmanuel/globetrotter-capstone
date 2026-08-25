const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', '..', 'data');
const DEST_FILE = path.join(DATA_DIR, 'destinations.json');

function readJson(filePath, fallback = []) {
  if (!fs.existsSync(filePath)) return fallback;
  const content = fs.readFileSync(filePath, 'utf-8').trim();
  return content ? JSON.parse(content) : fallback;
}

function getDestinations() {
  return readJson(DEST_FILE, []);
}

module.exports = { getDestinations, readJson, DATA_DIR };
