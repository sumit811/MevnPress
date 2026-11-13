const express = require('express');
const multer = require('multer');
const mongoose = require('mongoose');
const fs = require('fs/promises');
const path = require('path');
const { randomUUID } = require('crypto');
const Media = require('../models/Media');

const router = express.Router();
const uploadDirectory = path.join(__dirname, '..', 'uploads');
const allowedTypes = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav', 'application/pdf'
]);
const upload = multer({
  storage: multer.diskStorage({
    destination: async (req, file, callback) => {
      try {
        await fs.mkdir(uploadDirectory, { recursive: true });
        callback(null, uploadDirectory);
      } catch (error) {
        callback(error);
      }
    },
    filename: (req, file, callback) => callback(null, `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`)
  }),
  limits: { fileSize: 48 * 1024 * 1024 },
  fileFilter: (req, file, callback) => callback(allowedTypes.has(file.mimetype) ? null : new Error('Unsupported file type'), allowedTypes.has(file.mimetype))
});

router.get('/admin/media', async (req, res) => {
  try {
    const filter = {};
    if (req.query.search) filter.originalName = { $regex: req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
    const items = await Media.find(filter).sort({ createdAt: -1 }).limit(200);
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/media', (req, res) => {
  upload.single('file')(req, res, async (uploadError) => {
    if (uploadError) return res.status(uploadError.code === 'LIMIT_FILE_SIZE' ? 413 : 400).json({ error: uploadError.message });
    if (!req.file) return res.status(400).json({ error: 'Choose a supported file to upload' });
    try {
      const media = await Media.create({
        originalName: req.file.originalname,
        filename: req.file.filename,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: `/uploads/${req.file.filename}`
      });
      res.status(201).json(media);
    } catch (err) {
      await fs.unlink(req.file.path).catch(() => {});
      res.status(400).json({ error: err.message });
    }
  });
});

router.delete('/admin/media/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid media id' });
  try {
    const media = await Media.findByIdAndDelete(req.params.id);
    if (!media) return res.status(404).json({ error: 'Media not found' });
    await fs.unlink(path.join(uploadDirectory, path.basename(media.filename))).catch((error) => {
      if (error.code !== 'ENOENT') throw error;
    });
    res.json({ message: 'Media deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;