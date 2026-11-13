const mongoose = require('mongoose');
const slugify = require('slugify');

const categorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  slug: {
    type: String,
    lowercase: true,
    unique: true,
    trim: true
}
}, {
    timestamps: true // Automatically manages createdAt and updatedAt fields
});

categorySchema.pre('validate', function () {
  if (this.isModified('name') && !this.slug) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
});

// categorySchema.index({ slug: 1 }); // creating duplicte index

module.exports = mongoose.model('Category', categorySchema);