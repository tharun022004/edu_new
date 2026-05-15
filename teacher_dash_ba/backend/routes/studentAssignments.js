const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const {
  getStudentAssignments,
  getStudentAssignment,
  submitAssignment,
  uploadSubmissionFile
} = require('../controllers/assignments');

const router = express.Router();

const submissionUploadDir = path.join(process.cwd(), 'uploads', 'submissions');
if (!fs.existsSync(submissionUploadDir)) {
  fs.mkdirSync(submissionUploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, submissionUploadDir),
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE, 10) || 10485760 },
  fileFilter: (req, file, cb) => {
    const isPdf = file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf';
    if (isPdf) return cb(null, true);
    cb(new Error('Only PDF files are allowed for submission'));
  }
});

// IMPORTANT: More specific routes must come first
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large (max 10MB)' });
      }
      return res.status(400).json({ success: false, message: err.message });
    }
    if (err) {
      return res.status(400).json({ success: false, message: err.message || 'Upload failed' });
    }
    next();
  });
}, uploadSubmissionFile);

router.post('/submit/:assignmentId', submitAssignment);

router.get('/:studentEmail', getStudentAssignments);
router.get('/:studentEmail/:assignmentId', getStudentAssignment);

module.exports = router;
