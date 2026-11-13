const express = require('express');
const mongoose = require('mongoose');
const Comment = require('../models/Comment');
const Post = require('../models/Post');

const router = express.Router();
const commentStatuses = ['pending', 'approved', 'spam'];

router.get('/admin/comments', async (req, res) => {
  const page = Number.parseInt(req.query.page, 10) || 1;
  const perPage = Number.parseInt(req.query.perPage, 10) || 20;
  const status = req.query.status;
  if (page < 1 || perPage < 1 || perPage > 100) {
    return res.status(400).json({ error: 'page and perPage must be positive; perPage cannot exceed 100' });
  }
  if (status && status !== 'all' && !commentStatuses.includes(status)) {
    return res.status(400).json({ error: 'status must be pending, approved, spam, or all' });
  }

  try {
    const filter = status && status !== 'all' ? { status } : {};
    const [items, total, pending, approved, spam] = await Promise.all([
      Comment.find(filter).populate('post', 'title').sort({ createdAt: -1 }).skip((page - 1) * perPage).limit(perPage),
      Comment.countDocuments(filter),
      Comment.countDocuments({ status: 'pending' }),
      Comment.countDocuments({ status: 'approved' }),
      Comment.countDocuments({ status: 'spam' })
    ]);
    res.json({ items, total, page, perPage, totalPages: Math.max(1, Math.ceil(total / perPage)), counts: { all: pending + approved + spam, pending, approved, spam } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/comments', async (req, res) => {
  const { post, authorName, authorEmail, content } = req.body;
  if (!mongoose.isValidObjectId(post)) return res.status(400).json({ error: 'A valid post is required' });
  try {
    const relatedPost = await Post.findOne({ _id: post, type: 'post', status: { $ne: 'trash' } });
    if (!relatedPost) return res.status(404).json({ error: 'Post not found' });
    const comment = await Comment.create({ post, authorName, authorEmail, content, status: 'approved' });
    res.status(201).json(await comment.populate('post', 'title'));
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/admin/comments/bulk', async (req, res) => {
  const { ids, action } = req.body;
  if (!Array.isArray(ids) || !ids.length || !ids.every(mongoose.isValidObjectId) || !['pending', 'approved', 'spam', 'delete'].includes(action)) {
    return res.status(400).json({ error: 'Valid comment IDs and a supported action are required' });
  }
  try {
    const result = action === 'delete'
      ? await Comment.deleteMany({ _id: { $in: ids } })
      : await Comment.updateMany({ _id: { $in: ids } }, { $set: { status: action } });
    res.json({ action, affected: action === 'delete' ? result.deletedCount : result.modifiedCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.patch('/admin/comments/:id', async (req, res) => {
  if (!commentStatuses.includes(req.body.status)) return res.status(400).json({ error: 'A valid comment status is required' });
  try {
    const comment = await Comment.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true, runValidators: true }).populate('post', 'title');
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    res.json(comment);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/admin/comments/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid comment id' });
  try {
    const comment = await Comment.findByIdAndDelete(req.params.id);
    if (!comment) return res.status(404).json({ error: 'Comment not found' });
    res.json({ message: 'Comment deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/posts/:postId/comments', async (req, res) => {
  const { authorName, authorEmail, content } = req.body;
  if (!mongoose.isValidObjectId(req.params.postId)) return res.status(404).json({ error: 'Post not found' });
  try {
    const post = await Post.findOne({ _id: req.params.postId, type: 'post', status: 'publish' });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    const comment = await Comment.create({ post: post._id, authorName, authorEmail, content, status: 'pending' });
    res.status(201).json({ message: 'Comment submitted for moderation', comment });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;