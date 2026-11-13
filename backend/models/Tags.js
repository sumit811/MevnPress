const mongoose = require('mongoose');
const slugify = require('slugify');

const tagSchema = new mongoose.Schema({
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
    slug: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true
    },
    description: {
        type: String,
      trim: true
    }
    }, {
      timestamps: true
});

tagSchema.pre('validate', function () {
  if ((this.isModified('name') || !this.slug) && this.name) {
    this.slug = slugify(this.slug || this.name, { lower: true, strict: true, trim: true });
  }
});

module.exports = mongoose.model('Tags', tagSchema);