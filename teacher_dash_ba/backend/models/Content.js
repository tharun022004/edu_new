const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a content title'],
    trim: true,
    maxlength: [200, 'Title cannot be more than 200 characters']
  },
  description: {
    type: String,
    maxlength: [1000, 'Description cannot be more than 1000 characters']
  },
  extractedText: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['video', 'pdf', 'quiz', 'link', 'image', 'audio', 'presentation', 'assignment', 'chapter', 'subtopic', 'document'],
    required: true
  },
  class: {
    type: mongoose.Schema.ObjectId,
    ref: 'Class',
    required: true
  },
  teacher: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  chapter: {
    id: { 
      type: String,
      // CRITICAL: Ensure this is never confused with _id
      // This is a string identifier, NOT a MongoDB ObjectId
    },
    name: String,
    description: String
  },
  subtopic: {
    id: { 
      type: String,
      // CRITICAL: Ensure this is never confused with _id
      // This is a string identifier, NOT a MongoDB ObjectId
    },
    title: String,
    duration: String
  },
  file: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    url: String
  },
  link: {
    url: String,
    title: String,
    description: String
  },
  metadata: {
    duration: String, // for videos/audio
    pages: Number, // for PDFs
    fileSize: String,
    resolution: String, // for images/videos
    format: String
  },
  aiIndex: {
    status: {
      type: String,
      enum: ['not_requested', 'pending', 'indexed', 'failed'],
      default: 'not_requested'
    },
    chunks: { type: Number, default: 0 },
    textLength: { type: Number, default: 0 },
    lastSyncedAt: Date,
    error: String,
    sourceType: String
  },
  tags: [String],
  status: {
    type: String,
    enum: ['draft', 'published', 'archived'],
    default: 'draft'
  },
  visibility: {
    type: String,
    enum: ['public', 'class-only', 'private'],
    default: 'class-only'
  },
  stats: {
    views: { type: Number, default: 0 },
    downloads: { type: Number, default: 0 },
    likes: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  },
  interactions: [{
    student: {
      type: mongoose.Schema.ObjectId,
      ref: 'Student'
    },
    action: {
      type: String,
      enum: ['view', 'download', 'like', 'share', 'comment']
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    data: mongoose.Schema.Types.Mixed
  }],
  comments: [{
    author: String,
    message: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  // CRITICAL: Prevent Mongoose from trying to cast nested id fields as _id
  toJSON: { 
    virtuals: false,
    transform: function(doc, ret) {
      // Ensure chapter.id and subtopic.id are always strings, never ObjectIds
      if (ret.chapter && ret.chapter.id) {
        ret.chapter.id = String(ret.chapter.id);
      }
      if (ret.subtopic && ret.subtopic.id) {
        ret.subtopic.id = String(ret.subtopic.id);
      }
      // Remove _id if it's accidentally a string (shouldn't happen, but be safe)
      if (ret._id && typeof ret._id === 'string' && (ret._id.startsWith('chapter_') || ret._id.startsWith('subtopic_'))) {
        console.error('⚠️ WARNING: _id is a string identifier, this should not happen!');
        // Don't delete _id, but log the issue
      }
      return ret;
    }
  },
  toObject: { 
    virtuals: false,
    transform: function(doc, ret) {
      // Ensure chapter.id and subtopic.id are always strings
      if (ret.chapter && ret.chapter.id) {
        ret.chapter.id = String(ret.chapter.id);
      }
      if (ret.subtopic && ret.subtopic.id) {
        ret.subtopic.id = String(ret.subtopic.id);
      }
      return ret;
    }
  }
});

// CRITICAL: Add a pre-save hook to ensure chapter.id and subtopic.id are never used as _id
contentSchema.pre('save', function(next) {
  // Ensure chapter.id is a string, not an ObjectId
  if (this.chapter && this.chapter.id) {
    this.chapter.id = String(this.chapter.id);
    // If it looks like an ObjectId, prefix it
    if (this.chapter.id.length === 24 && /^[0-9a-fA-F]{24}$/.test(this.chapter.id) && !this.chapter.id.startsWith('chapter_')) {
      this.chapter.id = `chapter_${this.chapter.id}`;
    }
  }
  
  // Ensure subtopic.id is a string, not an ObjectId
  if (this.subtopic && this.subtopic.id) {
    this.subtopic.id = String(this.subtopic.id);
    // If it looks like an ObjectId, prefix it
    if (this.subtopic.id.length === 24 && /^[0-9a-fA-F]{24}$/.test(this.subtopic.id) && !this.subtopic.id.startsWith('subtopic_')) {
      this.subtopic.id = `subtopic_${this.subtopic.id}`;
    }
  }
  
  next();
});

// Index for better search performance
contentSchema.index({ title: 'text', description: 'text', tags: 'text' });
contentSchema.index({ class: 1, subject: 1, type: 1 });
contentSchema.index({ 'chapter.id': 1 }); // Index for chapter.id lookups
contentSchema.index({ 'subtopic.id': 1 }); // Index for subtopic.id lookups

module.exports = mongoose.model('Content', contentSchema);
