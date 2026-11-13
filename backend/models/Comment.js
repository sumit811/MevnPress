const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  post: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    required: true,
    index: true
  },
  authorName: { type: String, required: true, trim: true, maxlength: 120 },
  authorEmail: { type: String, trim: true, lowercase: true, maxlength: 254 },
  content: { type: String, required: true, trim: true, maxlength: 5000 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'spam'],
    default: 'pending'
  }
}, { timestamps: true });

module.exports = mongoose.model('Comment', commentSchema);