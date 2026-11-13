const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Post = require('../models/Post');
const Comment = require('../models/Comment');

const getTypeFilter = (type) => {
  if (type === undefined) return {};
  if (type === 'post' || type === 'page') return { type };
  return null;
};

// 1. GET all published posts (for the public Blog frontend)
router.get('/posts', async (req, res) => {
  const typeFilter = getTypeFilter(req.query.type);
  if (typeFilter === null) {
    return res.status(400).json({ error: 'type must be either post or page' });
  }

  try {
    const posts = await Post.find({ status: 'publish', ...typeFilter }).sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 2. GET all posts (for the Admin frontend dashboard - including drafts)
router.get('/admin/posts', async (req, res) => {
  const typeFilter = getTypeFilter(req.query.type);
  if (typeFilter === null) {
    return res.status(400).json({ error: 'type must be either post or page' });
  }

  const page = Number.parseInt(req.query.page, 10) || 1;
  const perPage = Number.parseInt(req.query.perPage, 10) || 20;
  const status = req.query.status;
  const date = req.query.date;
  const category = req.query.category;
  if (page < 1 || perPage < 1 || perPage > 100) {
    return res.status(400).json({ error: 'page and perPage must be positive; perPage cannot exceed 100' });
  }
  if (status && !['publish', 'draft', 'trash'].includes(status)) {
    return res.status(400).json({ error: 'status must be publish, draft, or trash' });
  }
  if (date && !/^\d{4}-\d{2}$/.test(date)) {
    return res.status(400).json({ error: 'date must use YYYY-MM format' });
  }

  try {
    const filter = { ...typeFilter };
    if (status) filter.status = status;
    if (req.query.search) {
      const escapedSearch = req.query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { title: { $regex: escapedSearch, $options: 'i' } },
        { slug: { $regex: escapedSearch, $options: 'i' } },
        { content: { $regex: escapedSearch, $options: 'i' } }
      ];
    }
    if (date) {
      const [year, month] = date.split('-').map(Number);
      filter.createdAt = {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1)
      };
    }
    if (category) filter.category = category;

    const countsFilter = { ...typeFilter };
    const [posts, total, allCount, publishedCount, draftCount, trashCount] = await Promise.all([
      Post.find(filter).sort({ updatedAt: -1 }).skip((page - 1) * perPage).limit(perPage),
      Post.countDocuments(filter),
      Post.countDocuments(countsFilter),
      Post.countDocuments({ ...countsFilter, status: 'publish' }),
      Post.countDocuments({ ...countsFilter, status: 'draft' }),
      Post.countDocuments({ ...countsFilter, status: 'trash' })
    ]);
    const commentCounts = await Comment.aggregate([
      { $match: { post: { $in: posts.map((post) => post._id) }, status: 'approved' } },
      { $group: { _id: '$post', count: { $sum: 1 } } }
    ]);
    const countByPost = new Map(commentCounts.map(({ _id, count }) => [_id.toString(), count]));
    const items = posts.map((post) => ({
      ...post.toObject(),
      commentsCount: countByPost.get(post._id.toString()) || 0
    }));

    res.json({
      items,
      total,
      page,
      perPage,
      totalPages: Math.max(1, Math.ceil(total / perPage)),
      counts: { all: allCount, publish: publishedCount, draft: draftCount, trash: trashCount }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/posts/:id', async (req, res) => {
  const typeFilter = getTypeFilter(req.query.type);
  if (typeFilter === null) {
    return res.status(400).json({ error: 'type must be either post or page' });
  }
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).json({ error: 'Post not found' });
  }

  try {
    const post = await Post.findOne({ _id: req.params.id, ...typeFilter });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 3. POST create a new blog post (from Admin dashboard)
router.post('/admin/posts', async (req, res) => {
  try {
    const newPost = new Post({ ...req.body, type: req.body.type || 'post' });
    const savedPost = await newPost.save();
    res.status(201).json(savedPost);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/admin/posts/bulk', async (req, res) => {
  const { ids, action, type } = req.body;
  const typeFilter = getTypeFilter(type);
  if (!Array.isArray(ids) || ids.length === 0 || !ids.every(mongoose.isValidObjectId)) {
    return res.status(400).json({ error: 'ids must be a non-empty array of valid record IDs' });
  }
  if (!typeFilter || !['trash', 'publish', 'draft', 'delete'].includes(action)) {
    return res.status(400).json({ error: 'A valid type and bulk action are required' });
  }

  try {
    const filter = { _id: { $in: ids }, ...typeFilter };
    if (action === 'delete') {
      const result = await Post.deleteMany(filter);
      return res.json({ action, affected: result.deletedCount });
    }

    const result = await Post.updateMany(filter, { $set: { status: action } });
    res.json({ action, affected: result.modifiedCount });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// 4. PUT/PATCH update an existing post or page
const updatePost = async (req, res) => {
  const typeFilter = getTypeFilter(req.query.type);
  if (typeFilter === null) {
    return res.status(400).json({ error: 'type must be either post or page' });
  }
  try {
    const updatedPost = await Post.findOneAndUpdate({ _id: req.params.id, ...typeFilter }, req.body, {
      new: true,
      runValidators: true
    });

    if (!updatedPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(updatedPost);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

router.put('/admin/posts/:id', updatePost);
router.patch('/admin/posts/:id', updatePost);

router.delete('/admin/posts/:id', async (req, res) => {
  const typeFilter = getTypeFilter(req.query.type);
  if (typeFilter === null) {
    return res.status(400).json({ error: 'type must be either post or page' });
  }
  try {
    const filter = { _id: req.params.id, ...typeFilter };
    const post = req.query.force === 'true'
      ? await Post.findOneAndDelete(filter)
      : await Post.findOneAndUpdate(filter, { status: 'trash' }, { new: true });

    if (!post) {
      return res.status(404).json({ error: 'Post not found' });
    }

    res.json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

module.exports = router;