const express = require('express');
const { nanoid } = require('nanoid');
const Url = require('../models/Url');

const router = express.Router();

// Utility function to validate URL
const isValidUrl = (urlString) => {
  try {
    new URL(urlString);
    return true;
  } catch (err) {
    return false;
  }
};

// POST /api/shorten - Create short URL
router.post('/api/shorten', async (req, res) => {
  const { url } = req.body;

  if (!url || !isValidUrl(url)) {
    return res.status(400).json({ error: 'Invalid original URL' });
  }

  try {
    let urlEntry = await Url.findOne({ originalUrl: url });

    if (urlEntry) {
      return res.json(urlEntry);
    }

    const shortUrl = nanoid(8);
    urlEntry = new Url({
      originalUrl: url,
      shortUrl,
      clicks: 0,
    });

    await urlEntry.save();
    res.status(201).json(urlEntry);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/stats/:shortUrl - Get URL stats
router.get('/api/stats/:shortUrl', async (req, res) => {
  try {
    const urlEntry = await Url.findOne({ shortUrl: req.params.shortUrl });

    if (urlEntry) {
      return res.json({
        originalUrl: urlEntry.originalUrl,
        shortUrl: urlEntry.shortUrl,
        clicks: urlEntry.clicks,
        createdAt: urlEntry.createdAt,
      });
    } else {
      return res.status(404).json({ error: 'No URL found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /:shortUrl - Redirect to original URL
router.get('/:shortUrl', async (req, res) => {
  try {
    const urlEntry = await Url.findOne({ shortUrl: req.params.shortUrl });

    if (urlEntry) {
      urlEntry.clicks++;
      await urlEntry.save();
      return res.redirect(urlEntry.originalUrl);
    } else {
      return res.status(404).json({ error: 'No URL found' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
