const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    minlength: 3,
    maxlength: 30,
    match: /^[a-z0-9._-]+$/,
    unique: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    unique: true
  },
  password: {
    type: String,
    select: false
  },
  firstName: {
    type: String,
    trim: true,
    maxlength: 50,
    default: ''
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: 50,
    default: ''
  },
  role: {
    type: String,
    enum: ['Administrator', 'Editor', 'Author', 'Contributor', 'Subscriber'],
    default: 'Subscriber',
    required: true
  }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);