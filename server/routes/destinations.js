const express = require('express');
const { getDestinations } = require('../services/data');

const router = express.Router();

router.get('/', (req, res) => {
  const q = (req.query.q || '').trim().toLowerCase();
  const category = (req.query.category || '').trim().toLowerCase();

  let results = getDestinations();
  if (q) {
    results = results.filter((d) =>
      d.name.toLowerCase().includes(q) ||
      (d.area || '').toLowerCase().includes(q) ||
      (d.tags || []).some((t) => t.includes(q))
    );
  }
  if (category) {
    results = results.filter((d) => (d.category || '').toLowerCase() === category);
  }

  res.json({ count: results.length, destinations: results });
});

module.exports = router;
