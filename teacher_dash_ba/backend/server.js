const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const { Server } = require('socket.io');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const classRoutes = require('./routes/classes');
const studentClassRoutes = require('./routes/studentClasses');
const assignmentRoutes = require('./routes/assignments');
const doubtRoutes = require('./routes/doubts');
const contentRoutes = require('./routes/content');
const studentContentRoutes = require('./routes/studentContent');
const dashboardRoutes = require('./routes/dashboard');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const { protect, authorize } = require('./middleware/auth');
const { protectSocket } = require('./middleware/auth');

const app = express();
const httpServer = http.createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
  frameguard: false
}));
app.use(compression());

// CORS configuration MUST be before rate limiter so rejected requests still get CORS headers
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-frontend-domain.com'] 
    : ['http://localhost:3000', 'http://localhost:5173','http://localhost:5174'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting (Disabled in development to prevent 429 errors during testing)
if (process.env.NODE_ENV === 'production') {
  const limiter = rateLimit({
    windowMs: (process.env.RATE_LIMIT_WINDOW || 15) * 60 * 1000, // 15 minutes
    max: process.env.RATE_LIMIT_MAX_REQUESTS || 1000, 
    message: 'Too many requests from this IP, please try again later.',
  });
  app.use('/api/', limiter);
}

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Static files
app.use('/uploads', express.static('uploads'));

// Database connection - Unified database
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/education_portal', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`✅ Teacher Backend - MongoDB Connected: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);
    
    // Force database creation in development mode
    if (process.env.NODE_ENV !== 'production') {
      await forceDatabaseCreation(conn.connection);
    }
  } catch (error) {
    console.error('❌ Teacher Backend - Database connection error:', error);
    process.exit(1);
  }
};

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
        const uniqueId = `__init_teacher_${Date.now()}__@temp.local`;
        const initDoc = await User.create({
          email: uniqueId,
          password: 'temp',
          name: 'Database Initialization',
          role: 'teacher',
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

// Connect to database
connectDB();

// Health check route
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// API routes
app.use('/api/auth', authRoutes);

// Teacher-only protected routes
app.use('/api/users', protect, authorize('teacher'), userRoutes);

// Student class routes (accessible to authenticated users, must come before teacher routes)
app.use('/api/classes', studentClassRoutes);

// Teacher class routes (teacher-only)
app.use('/api/classes', protect, authorize('teacher'), classRoutes);

// Student-facing assignment routes (no auth - verified by email)
app.use('/api/assignments/student', require('./routes/studentAssignments'));

// Teacher assignment routes (protected)
app.use('/api/assignments', protect, authorize('teacher'), assignmentRoutes);

app.use('/api/doubts', protect, authorize('teacher'), doubtRoutes);
// Student-facing doubt routes (no auth - verified by email)
app.use('/api/student-doubts', require('./routes/studentDoubts'));
// Standalone quiz routes
app.use('/api/standalone-quizzes', require('./routes/standaloneQuizzes'));
app.use('/api/student-quizzes', require('./routes/studentQuizzes'));
app.use('/api/content/student', studentContentRoutes);
app.use('/api/content', protect, authorize('teacher'), contentRoutes);
app.use('/api/teacher-notes', protect, authorize('teacher'), require('./routes/teacherNotes'));
app.use('/api/student-notes', require('./routes/studentNotes'));
app.use('/api/dashboard', protect, authorize('teacher'), dashboardRoutes);
app.use('/api/schedule', protect, authorize('teacher'), require('./routes/schedule'));
app.use('/api/attendance', protect, authorize('teacher'), require('./routes/attendance'));

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? ['https://your-frontend-domain.com'] 
      : ['http://localhost:3000', 'http://localhost:5173','http://localhost:5174'],
    credentials: true
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`👤 New client connected: ${socket.id}`);
  
  // Handle authentication
  socket.on('authenticate', async (token) => {
    try {
      const jwt = require('jsonwebtoken');
      const User = require('./models/User');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (user) {
        socket.userId = user._id;
        socket.join(`teacher_${user._id}`);
        socket.emit('authenticated', { success: true });
        console.log(`✅ Teacher authenticated: ${user.name}`);
      }
    } catch (error) {
      socket.emit('authenticated', { success: false });
    }
  });

  // Handle class updates
  socket.on('class_update', (data) => {
    socket.broadcast.to(`class_${data.classId}`).emit('class_updated', data);
  });

  // Handle doubt notifications
  socket.on('doubt_submitted', (data) => {
    socket.to(`teacher_${data.teacherId}`).emit('new_doubt', data);
  });

  // Handle student joining class
  socket.on('student_joined', (data) => {
    socket.broadcast.to(`class_${data.classId}`).emit('student_list_updated', data);
  });

  socket.on('disconnect', () => {
    console.log(`👋 Client disconnected: ${socket.id}`);
  });
});

// Middleware to attach io to requests
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Teacher Backend Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  console.log(`📡 Socket.IO enabled for real-time updates`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`❌ Error: ${err.message}`);
  httpServer.close(() => {
    process.exit(1);
  });
});

// Export app and io for use in other files
app.io = io;
module.exports = { app, io };