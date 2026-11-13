const mongoose = require('mongoose');

const mediaSchema = new mongoose.Schema({
  originalName: { type: String, required: true, trim: true },
  filename: { type: String, required: true, unique: true },
  mimeType: { type: String, required: true },
  size: { type: Number, required: true },
  url: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('Media', mediaSchema);