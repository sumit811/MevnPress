const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/User');

const router = express.Router();
const editableFields = ['username', 'email', 'firstName', 'lastName', 'role'];

function getUserInput(body) {
  return Object.fromEntries(editableFields
    .filter((field) => body[field] !== undefined)
    .map((field) => [field, body[field]]));
}

function sendWriteError(error, res) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0];
    return res.status(409).json({ error: `A user with that ${field || 'value'} already exists` });
  }
  return res.status(400).json({ error: error.message });
}

router.get('/admin/users', async (req, res) => {
  try {
    const users = await User.find().sort({ username: 1 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/admin/users', async (req, res) => {
  try {
    const user = new User(getUserInput(req.body));
    await user.save();
    res.status(201).json(user);
  } catch (error) {
    sendWriteError(error, res);
  }
});

router.put('/admin/users/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const user = await User.findByIdAndUpdate(req.params.id, getUserInput(req.body), {
      new: true,
      runValidators: true
    });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    sendWriteError(error, res);
  }
});

router.delete('/admin/users/:id', async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({ error: 'Invalid user id' });
  }

  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;