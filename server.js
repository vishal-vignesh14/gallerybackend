const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const dotenv = require('dotenv');
const Image = require('./models/Image');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// Cloudinary config
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Cloudinary storage config
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'gallery',
    allowed_formats: ['jpg', 'png', 'jpeg'],
  },
});
const upload = multer({ storage });

// Upload endpoint
app.post('/upload', upload.array('images', 10), async (req, res) => {
  try {
    const uploads = await Promise.all(
      req.files.map(file => new Image({ url: file.path }).save())
    );
    res.json(uploads);
  } catch (err) {
    res.status(500).json({ error: 'Upload failed', details: err.message });
  }
});


// Fetch all images
app.get('/images', async (req, res) => {
  const images = await Image.find().sort({ uploadedAt: -1 });
  res.json(images);
});

// ✅ Delete Image
app.delete('/images/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const image = await Image.findById(id);
    if (!image) return res.status(404).json({ error: 'Image not found' });

    // Extract Cloudinary public ID
    const segments = image.url.split('/');
    const publicId = 'gallery/' + segments[segments.length - 1].split('.')[0];

    await cloudinary.uploader.destroy(publicId); // Delete from Cloudinary
    await Image.findByIdAndDelete(id); // Delete from DB

    res.json({ message: 'Image deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});

// Connect MongoDB & Start Server
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(3000, () => console.log('✅ Server running at http://localhost:3000'));
  })
  .catch(err => console.error('❌ MongoDB Error:', err));
