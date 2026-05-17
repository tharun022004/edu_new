const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const courseRoutes = require('./routes/courses');
const quizRoutes = require('./routes/quizzes');
const doubtRoutes = require('./routes/doubts');
const noteRoutes = require('./routes/notes');
const progressRoutes = require('./routes/progress');
const collectionRoutes = require('./routes/collections');
const dashboardRoutes = require('./routes/dashboard');
const videoRoutes = require('./routes/videos');
const assessmentRoutes = require('./routes/assessments');
const contentRoutes = require('./routes/content');
const classesRoutes = require('./routes/classes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { protect, authorize } = require('./middleware/auth');

const app = express();

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: false
}));
app.use(compression());

// CORS configuration (must be BEFORE rate limiter to set headers on preflight)
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:5175'
  ],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// Rate limiting - more lenient for content endpoints
const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 200, // limit each IP to 200 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// More lenient rate limiter for content endpoints (students may refresh frequently)
const contentLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute for content
  message: {
    error: 'Too many content requests. Please wait a moment and try again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/api/health';
  }
});

// Apply general limiter to all API routes
app.use('/api/', generalLimiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Database connection - Unified database
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/education_portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(async (conn) => {
  console.log('✅ Student Backend - Connected to MongoDB successfully');
  console.log(`📊 Database: ${conn.connection.name}`);
  
  // Force database creation in development mode
  if (process.env.NODE_ENV !== 'production') {
    await forceDatabaseCreation(conn.connection);
  }
})
.catch((error) => {
  console.error('❌ Student Backend - MongoDB connection error:', error);
  process.exit(1);
});

// Safe function to force database creation (development only)
const forceDatabaseCreation = async (connection) => {
  try {
    const User = require('./models/User');
    
    // Check if database already has data
    const userCount = await User.countDocuments();
    
    if (userCount === 0) {
      // Insert a temporary initialization document to force database creation
      // This document will be automatically cleaned up or can be manually removed
      console.log('🔧 Initializing education_portal database...');
      
      try {
        // Create a simple init document with unique email to avoid conflicts
        // This document will be immediately deleted (database is now created)
        const uniqueId = `__init_student_${Date.now()}__@temp.local`;
        const initDoc = await User.create({
          email: uniqueId,
          password: 'temp',
          fullName: 'Database Initialization',
          role: 'student',
          isActive: false
        });
        
        // Immediately delete it (database is now created)
        await User.deleteOne({ _id: initDoc._id });
        
        console.log('✅ Database "education_portal" created successfully');
        console.log('💡 You can now verify it in MongoDB Compass');
      } catch (createError) {
        // Handle race condition: another instance might have created it
        if (createError.code === 11000) {
          // Duplicate key - database already exists, another instance created it
          console.log('✅ Database "education_portal" already exists (created by another instance)');
        } else {
          throw createError;
        }
      }
    } else {
      console.log(`✅ Database "education_portal" already exists (${userCount} users found)`);
    }
  } catch (error) {
    // Non-critical error - database might already exist
    console.log('ℹ️  Database initialization check completed');
  }
};

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'EduPlatform API is running successfully!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API Routes
app.use('/api/auth', authRoutes);

// Student-only protected routes
app.use('/api/users', protect, authorize('student'), userRoutes);
app.use('/api/courses', protect, authorize('student'), courseRoutes);
app.use('/api/quizzes', protect, authorize('student'), quizRoutes);
app.use('/api/doubts', protect, authorize('student'), doubtRoutes);
app.use('/api/notes', protect, authorize('student'), noteRoutes);
app.use('/api/progress', protect, authorize('student'), progressRoutes);
app.use('/api/collections', protect, authorize('student'), collectionRoutes);
app.use('/api/dashboard', protect, authorize('student'), dashboardRoutes);
app.use('/api/videos', protect, authorize('student'), videoRoutes);
app.use('/api/assessments', assessmentRoutes); // protect & role middleware applied in the route file
app.use('/api/classes', protect, classesRoutes); // <-- Register classes routes with protect middleware
app.use('/api/schedule', protect, authorize('student'), require('./routes/schedule'));
app.use('/api/attendance', protect, authorize('student'), require('./routes/attendance'));
app.use('/api/goals', protect, authorize('student'), require('./routes/goals'));
// Apply more lenient rate limiter to content routes (student-only)
app.use('/api/content', protect, authorize('student'), contentLimiter, contentRoutes);

// Debug: Log all registered routes
if (process.env.NODE_ENV === 'development') {
  console.log('\n📋 Registered Routes:');
  assessmentRoutes.stack.forEach((r) => {
    if (r.route) {
      const methods = Object.keys(r.route.methods).join(', ').toUpperCase();
      console.log(`   ${methods.padEnd(7)} /api/assessments${r.route.path}`);
    }
  });
  console.log('');
}

// 404 handler - log all unmatched routes for debugging
app.use('*', (req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.originalUrl);
  console.log('📋 Available assessment routes:');
  assessmentRoutes.stack.forEach((r) => {
    if (r.route) {
      const methods = Object.keys(r.route.methods).join(', ').toUpperCase();
      console.log(`   ${methods.padEnd(7)} /api/assessments${r.route.path}`);
    }
  });
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
    method: req.method,
    path: req.path
  });
});

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Unhandled Rejection: ${err.message}`);
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`❌ Uncaught Exception: ${err.message}`);
  process.exit(1);
});

module.exports = app;