const express = require('express');
const cors = require('cors');
require('dotenv').config();

const connectDB = require('./db/config');
const blogRoutes = require('./routes/blogRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const userRoutes = require('./routes/userRoutes');
const commentRoutes = require('./routes/commentRoutes');
const mediaRoutes = require('./routes/mediaRoutes');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect to Local MongoDB
connectDB();

// API Routes
app.use('/api', blogRoutes);
app.use('/api', categoryRoutes);
app.use('/api', userRoutes);
app.use('/api', commentRoutes);
app.use('/api', mediaRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});