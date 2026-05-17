const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ensure uploads directory exists (multer fails if it doesn't)
const uploadDir = path.join(process.cwd(), 'uploads', 'content');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('✅ Created uploads/content directory');
}

const {
  getContent,
  getContentItem,
  createContent,
  updateContent,
  deleteContent,
  uploadFile,
  syncContentToAIIndex,
  removeContentFromAIIndex,
  getContentStats,
  addChapter,
  addSubtopic,
  getChapters,
  getPublishedContentForStudent
} = require('../controllers/content');
const { validateContent, validate } = require('../middleware/validation');

const router = express.Router();

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1E9) + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10485760 // 10MB default
  },
  fileFilter: function (req, file, cb) {
    // Allow specific file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|ppt|pptx|mp4|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// Specific routes BEFORE /:id to avoid 'upload' matching as id
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large (max 10MB)' });
      }
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    next();
  });
}, uploadFile);
router.get('/stats/overview', getContentStats);
router.post('/chapters', addChapter);
router.post('/subtopics', addSubtopic);
router.get('/chapters/:classId', getChapters);
router.get('/student', getPublishedContentForStudent);
router.post('/:id/ai-sync', syncContentToAIIndex);
router.delete('/:id/ai-sync', removeContentFromAIIndex);

router.route('/')
  .get(getContent)
  .post(validateContent, validate, createContent);

router.route('/:id')
  .get(getContentItem)
  .put(updateContent)
  .delete(deleteContent);

module.exports = router;
