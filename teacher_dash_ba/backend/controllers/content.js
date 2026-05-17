const Content = require('../models/Content');
const Class = require('../models/Class');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
const pdfParse = require('pdf-parse');
const axios = require('axios');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';
const MIN_AI_TEXT_LENGTH = 1;


// Helper function to map class subject to course category
const mapSubjectToCategory = (subject) => {
  const subjectLower = (subject || '').toLowerCase().trim();
  const mapping = {
    'mathematics': 'mathematics',
    'math': 'mathematics',
    'physics': 'physics',
    'chemistry': 'chemistry',
    'biology': 'biology',
    'english': 'english',
    'history': 'history',
    'computer science': 'computer-science',
    'cs': 'computer-science',
    'computer-science': 'computer-science'
  };
  
  // Try exact match first
  if (mapping[subjectLower]) {
    return mapping[subjectLower];
  }
  
  // Try partial match
  for (const [key, value] of Object.entries(mapping)) {
    if (subjectLower.includes(key) || key.includes(subjectLower)) {
      return value;
    }
  }
  
  // Default to mathematics if no match
  return 'mathematics';
};

// Cache for student database connection
let studentConnection = null;

// Helper function to get or create student database connection
const getStudentConnection = async () => {
  if (studentConnection && studentConnection.readyState === 1) {
    return studentConnection;
  }
  
  const studentDbUri = process.env.STUDENT_MONGODB_URI || 
                       process.env.MONGODB_URI?.replace('teacher_dashboard', 'student_dashboard') ||
                       'mongodb://localhost:27017/student_dashboard';
  
  studentConnection = mongoose.createConnection(studentDbUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  
  return studentConnection;
};

// Helper function to sync content to Course collection in student backend
const syncContentToCourse = async (contentData, classItem, teacherId) => {
  try {
    console.log('🔄 Syncing content to course:', {
      type: contentData.type,
      title: contentData.title,
      classId: classItem._id.toString(),
      subject: classItem.subject
    });
    
    // Map subject to category
    const category = mapSubjectToCategory(classItem.subject);
    
    // Get student database connection
    const studentConn = await getStudentConnection();
    
    // Define Course schema (matching student backend with unique IDs)
    const topicSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: String,
      duration: String,
      videoUrl: String,
      thumbnail: String,
      content: {
        notes: String,
        resources: [String],
        keyPoints: [String]
      },
      difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
      order: { type: Number, default: 0 },
      isCompleted: { type: Boolean, default: false },
      subtopicId: String // Unique identifier from Content collection
    }, { _id: false, timestamps: true });
    
    const moduleSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: String,
      topics: [topicSchema],
      order: { type: Number, default: 0 },
      estimatedDuration: String,
      chapterId: String // Unique identifier from Content collection
    }, { _id: false, timestamps: true });
    
    const courseSchema = new mongoose.Schema({
      name: { type: String, required: true, trim: true },
      description: { type: String, required: true },
      icon: { type: String, default: '📚' },
      color: { type: String, default: 'bg-blue-50' },
      iconColor: { type: String, default: 'text-blue-500' },
      borderColor: { type: String, default: 'border-blue-200' },
      category: { type: String, required: true },
      classId: String, // Link to teacher's class
      level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
      modules: [moduleSchema],
      instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      totalLessons: { type: Number, default: 0 },
      estimatedDuration: String,
      prerequisites: [String],
      learningOutcomes: [String],
      tags: [String],
      isPublished: { type: Boolean, default: true },
      enrollmentCount: { type: Number, default: 0 },
      rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
      }
    }, { timestamps: true });
    
    const Course = studentConn.models.Course || studentConn.model('Course', courseSchema);
    
    const classIdStr = classItem._id.toString();
    
    // Find or create course - improved matching logic
    // Priority: 1. classId + category, 2. category + instructor, 3. category + name, 4. category only
    let course = await Course.findOne({ 
      classId: classIdStr,
      category: category
    });
    
    if (!course) {
      course = await Course.findOne({ 
        category: category,
        instructor: teacherId 
      });
    }
    
    if (!course) {
      const courseName = classItem.subject || 'Course';
      course = await Course.findOne({ 
        category: category,
        name: { $regex: new RegExp(courseName, 'i') }
      });
    }
    
    if (!course) {
      course = await Course.findOne({ category: category });
    }
    
    // If still not found, create a new course
    if (!course) {
      course = await Course.create({
        name: classItem.subject || 'Course',
        description: `Course for ${classItem.subject || 'General'} - ${classItem.name || ''}`,
        category: category,
        classId: classIdStr, // Store classId for future matching
        instructor: teacherId,
        modules: []
      });
      console.log('✅ Created new course:', course._id, 'for class:', classIdStr);
    } else {
      // Update classId if not set (for existing courses)
      if (!course.classId) {
        course.classId = classIdStr;
        await course.save();
      }
    }
    
    // Now sync the content
    if (contentData.type === 'chapter') {
      // Sync chapter as module
      // CRITICAL: Use chapter.id if available (string identifier), otherwise use _id as string
      // Never use chapter.id as if it were _id
      const chapterId = contentData.chapter?.id 
        ? String(contentData.chapter.id) 
        : (contentData._id ? String(contentData._id) : null);
      const moduleName = contentData.chapter?.name || contentData.title;
      
      if (!chapterId) {
        console.warn('⚠️ Chapter has no ID, cannot sync');
        return;
      }
      
      // Find module by chapterId (unique identifier)
      let moduleIndex = course.modules.findIndex(m => m.chapterId === chapterId);
      
      if (moduleIndex >= 0) {
        // Update existing module
        course.modules[moduleIndex].name = moduleName;
        course.modules[moduleIndex].description = contentData.chapter?.description || contentData.description || '';
        console.log('✅ Updated existing module:', moduleName);
      } else {
        // Create new module
        course.modules.push({
          name: moduleName,
          description: contentData.chapter?.description || contentData.description || '',
          topics: [],
          order: course.modules.length,
          chapterId: chapterId // Store unique identifier
        });
        moduleIndex = course.modules.length - 1;
        console.log('✅ Created new module:', moduleName, 'with chapterId:', chapterId);
      }
      
      await course.save();
      console.log('✅ Synced chapter to course module:', moduleName);
      
    } else if (contentData.type === 'subtopic') {
      // Sync subtopic as topic within a module
      // CRITICAL: Ensure we're using the correct IDs - chapter.id is a string, not _id
      const chapterId = contentData.chapter?.id ? String(contentData.chapter.id) : null;
      // Use subtopic.id if available, otherwise fall back to _id (but ensure it's a string)
      const subtopicId = contentData.subtopic?.id 
        ? String(contentData.subtopic.id) 
        : (contentData._id ? String(contentData._id) : null);
      const subtopicName = contentData.subtopic?.title || contentData.title;
      
      if (!chapterId) {
        console.warn('⚠️ Subtopic has no chapter ID, cannot sync. contentData:', {
          hasChapter: !!contentData.chapter,
          chapterId: contentData.chapter?.id,
          _id: contentData._id
        });
        return;
      }
      
      // CRITICAL: Ensure chapterId is a string identifier, never an ObjectId
      if (chapterId && chapterId.length === 24 && /^[0-9a-fA-F]{24}$/.test(chapterId) && !chapterId.startsWith('chapter_')) {
        console.warn('⚠️ Chapter ID looks like ObjectId, this should not happen:', chapterId);
        // Don't proceed - this indicates a data inconsistency
        return;
      }
      
      // Find the module by chapterId (unique identifier)
      let moduleIndex = course.modules.findIndex(m => m.chapterId === chapterId);
      
      if (moduleIndex < 0) {
        // Module doesn't exist, try to find the chapter in Content collection
        // Fix: Only use _id query if chapterId is a valid ObjectId
      
        let chapterContent = null;
        
        // First try: Find by chapter.id field (primary method)
        chapterContent = await Content.findOne({
          type: 'chapter',
          class: classItem._id,
          'chapter.id': chapterId
        });
        
        // Second try: Find by MongoDB _id ONLY if chapterId is a valid ObjectId
        if (!chapterContent && mongoose.Types.ObjectId.isValid(chapterId)) {
          try {
            chapterContent = await Content.findOne({
              type: 'chapter',
              class: classItem._id,
              _id: chapterId
            });
          } catch (idError) {
            console.log('⚠️ Could not use chapterId as ObjectId in sync:', chapterId);
          }
        }
        
        if (chapterContent) {
          const moduleName = chapterContent.chapter?.name || chapterContent.title || 'Untitled Module';
          // Use the chapter's chapter.id for consistency
          const actualChapterId = chapterContent.chapter?.id || chapterContent._id.toString();
          // Create the module with the chapterId
          course.modules.push({
            name: moduleName,
            description: chapterContent.chapter?.description || chapterContent.description || '',
            topics: [],
            order: course.modules.length,
            chapterId: actualChapterId
          });
          moduleIndex = course.modules.length - 1;
          console.log('✅ Created missing module for subtopic:', moduleName);
        } else {
          console.warn('⚠️ Chapter not found for subtopic, cannot sync. chapterId:', chapterId);
          return;
        }
      }
      
      // Find topic by subtopicId (unique identifier)
      const existingTopicIndex = course.modules[moduleIndex].topics.findIndex(
        t => t.subtopicId === subtopicId
      );
      
      if (existingTopicIndex >= 0) {
        // Update existing topic
        course.modules[moduleIndex].topics[existingTopicIndex].name = subtopicName;
        course.modules[moduleIndex].topics[existingTopicIndex].description = contentData.description || '';
        course.modules[moduleIndex].topics[existingTopicIndex].duration = contentData.subtopic?.duration || '';
        console.log('✅ Updated existing topic:', subtopicName);
      } else {
        // Create new topic
        course.modules[moduleIndex].topics.push({
          name: subtopicName,
          description: contentData.description || '',
          duration: contentData.subtopic?.duration || '',
          order: course.modules[moduleIndex].topics.length,
          subtopicId: subtopicId // Store unique identifier
        });
        console.log('✅ Created new topic:', subtopicName, 'with subtopicId:', subtopicId);
      }
      
      await course.save();
      console.log('✅ Synced subtopic to course topic:', subtopicName);
    }
    
    // Update totalLessons
    const totalTopics = course.modules.reduce((total, module) => total + (module.topics?.length || 0), 0);
    course.totalLessons = totalTopics;
    await course.save();
    
    console.log('✅ Sync completed successfully');
    
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('⚠️ Error syncing content to course (non-fatal):', error.message);
    console.error('Error details:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
};

// Helper function to remove content from Course collection in student backend
const removeContentFromCourse = async (contentData, classItem, teacherId) => {
  try {
    console.log('🗑️ Removing content from course:', {
      type: contentData.type,
      title: contentData.title,
      classId: classItem._id.toString()
    });
    
    // Map subject to category
    const category = mapSubjectToCategory(classItem.subject);
    
    // Get student database connection
    const studentConn = await getStudentConnection();
    
    // Define Course schema (matching student backend with unique IDs)
    const topicSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: String,
      duration: String,
      videoUrl: String,
      thumbnail: String,
      content: {
        notes: String,
        resources: [String],
        keyPoints: [String]
      },
      difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
      order: { type: Number, default: 0 },
      isCompleted: { type: Boolean, default: false },
      subtopicId: String
    }, { _id: false, timestamps: true });
    
    const moduleSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: String,
      topics: [topicSchema],
      order: { type: Number, default: 0 },
      estimatedDuration: String,
      chapterId: String
    }, { _id: false, timestamps: true });
    
    const courseSchema = new mongoose.Schema({
      name: { type: String, required: true, trim: true },
      description: { type: String, required: true },
      icon: { type: String, default: '📚' },
      color: { type: String, default: 'bg-blue-50' },
      iconColor: { type: String, default: 'text-blue-500' },
      borderColor: { type: String, default: 'border-blue-200' },
      category: { type: String, required: true },
      classId: String,
      level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
      modules: [moduleSchema],
      instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      totalLessons: { type: Number, default: 0 },
      estimatedDuration: String,
      prerequisites: [String],
      learningOutcomes: [String],
      tags: [String],
      isPublished: { type: Boolean, default: true },
      enrollmentCount: { type: Number, default: 0 },
      rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
      }
    }, { timestamps: true });
    
    const Course = studentConn.models.Course || studentConn.model('Course', courseSchema);
    
    const classIdStr = classItem._id.toString();
    
    // Find course - improved matching logic
    let course = await Course.findOne({ 
      classId: classIdStr,
      category: category
    });
    
    if (!course) {
      course = await Course.findOne({ 
        category: category,
        instructor: teacherId 
      });
    }
    
    if (!course) {
      const courseName = classItem.subject || 'Course';
      course = await Course.findOne({ 
        category: category,
        name: { $regex: new RegExp(courseName, 'i') }
      });
    }
    
    if (!course) {
      course = await Course.findOne({ category: category });
    }
    
    if (!course) {
      console.log('⚠️ Course not found for removal, skipping');
      return;
    }
    
    // Remove the content using unique identifiers
    if (contentData.type === 'chapter') {
      // Remove module by chapterId
      const chapterId = contentData.chapter?.id || contentData._id.toString();
      const initialLength = course.modules.length;
      course.modules = course.modules.filter(m => m.chapterId !== chapterId);
      
      if (course.modules.length < initialLength) {
        console.log('✅ Removed chapter from course module:', contentData.chapter?.name || contentData.title);
      } else {
        console.log('⚠️ Module not found for removal (chapterId:', chapterId, ')');
      }
        
    } else if (contentData.type === 'subtopic') {
      // Remove topic by subtopicId
      const subtopicId = contentData.subtopic?.id || contentData._id.toString();
      const chapterId = contentData.chapter?.id;
      
      if (chapterId) {
        // Find module by chapterId
        const moduleIndex = course.modules.findIndex(m => m.chapterId === chapterId);
        
        if (moduleIndex >= 0) {
          const initialLength = course.modules[moduleIndex].topics.length;
          course.modules[moduleIndex].topics = course.modules[moduleIndex].topics.filter(
            t => t.subtopicId !== subtopicId
          );
          
          if (course.modules[moduleIndex].topics.length < initialLength) {
            console.log('✅ Removed subtopic from course topic:', contentData.subtopic?.title || contentData.title);
          } else {
            console.log('⚠️ Topic not found for removal (subtopicId:', subtopicId, ')');
          }
        } else {
          console.log('⚠️ Module not found for subtopic removal (chapterId:', chapterId, ')');
        }
      } else {
        console.warn('⚠️ Subtopic has no chapter ID, cannot remove');
      }
    }
    
    // Update totalLessons
    const totalTopics = course.modules.reduce((total, module) => total + (module.topics?.length || 0), 0);
    course.totalLessons = totalTopics;
    await course.save();
    
    console.log('✅ Removal completed successfully');
    
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('⚠️ Error removing content from course (non-fatal):', error.message);
    console.error('Error details:', error);
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
  }
};

// Helper function to fetch Course modules from student database and convert to Content format
const fetchCourseModulesAsContent = async (classItem, teacherId) => {
  try {
    if (!classItem || !classItem.subject) {
      return [];
    }

    const category = mapSubjectToCategory(classItem.subject);
    const studentConn = await getStudentConnection();
    
    // Define Course schema
    const topicSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: String,
      duration: String,
      videoUrl: String,
      thumbnail: String,
      content: {
        notes: String,
        resources: [String],
        keyPoints: [String]
      },
      difficulty: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
      order: { type: Number, default: 0 },
      isCompleted: { type: Boolean, default: false },
      subtopicId: String
    }, { _id: false, timestamps: true });
    
    const moduleSchema = new mongoose.Schema({
      name: { type: String, required: true },
      description: String,
      topics: [topicSchema],
      order: { type: Number, default: 0 },
      estimatedDuration: String,
      chapterId: String
    }, { _id: false, timestamps: true });
    
    const courseSchema = new mongoose.Schema({
      name: { type: String, required: true, trim: true },
      description: { type: String, required: true },
      icon: { type: String, default: '📚' },
      color: { type: String, default: 'bg-blue-50' },
      iconColor: { type: String, default: 'text-blue-500' },
      borderColor: { type: String, default: 'border-blue-200' },
      category: { type: String, required: true },
      classId: String,
      level: { type: String, enum: ['beginner', 'intermediate', 'advanced'], default: 'beginner' },
      modules: [moduleSchema],
      instructor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      totalLessons: { type: Number, default: 0 },
      estimatedDuration: String,
      prerequisites: [String],
      learningOutcomes: [String],
      tags: [String],
      isPublished: { type: Boolean, default: true },
      enrollmentCount: { type: Number, default: 0 },
      rating: {
        average: { type: Number, default: 0 },
        count: { type: Number, default: 0 }
      }
    }, { timestamps: true });
    
    const Course = studentConn.models.Course || studentConn.model('Course', courseSchema);
    
    const classIdStr = classItem._id.toString();
    
    // Find course by classId and category
    const course = await Course.findOne({
      classId: classIdStr,
      category: category
    });
    
    if (!course) {
      // Try alternative matching
      const altCourse = await Course.findOne({
        category: category,
        instructor: teacherId
      });
      
      if (!altCourse) {
        return [];
      }
      
      // Convert modules to content format
      const contentItems = [];
      altCourse.modules.forEach((module, moduleIndex) => {
        const chapterId = module.chapterId || `course_module_${moduleIndex}`;
        
        // Create chapter from module
        // IMPORTANT: Don't set _id to chapterId string - this causes ObjectId casting errors
        contentItems.push({
          // Don't set _id - use courseModuleId instead
          type: 'chapter',
          title: module.name,
          description: module.description || '',
          chapter: {
            id: chapterId, // String identifier, not _id
            name: module.name,
            description: module.description || ''
          },
          subject: classItem.subject,
          class: classItem._id,
          teacher: teacherId,
          status: 'published',
          createdAt: module.createdAt || new Date(),
          isCourseModule: true,
          source: 'course',
          courseModuleId: chapterId
        });
        
        // Create subtopics from topics
        if (module.topics && Array.isArray(module.topics)) {
          module.topics.forEach((topic, topicIndex) => {
            const subtopicId = topic.subtopicId || `course_topic_${topicIndex}`;
            contentItems.push({
              // Don't set _id to subtopicId string
              type: 'subtopic',
              title: topic.name,
              description: topic.description || '',
              chapter: {
                id: chapterId, // String identifier, not _id
                name: module.name
              },
              subtopic: {
                id: subtopicId, // String identifier, not _id
                title: topic.name,
                duration: topic.duration || ''
              },
              subject: classItem.subject,
              class: classItem._id,
              teacher: teacherId,
              status: 'published',
              createdAt: topic.createdAt || new Date(),
              isCourseModule: true,
              source: 'course',
              courseModuleId: subtopicId
            });
          });
        }
      });
      
      return contentItems;
    }
    
    // Convert modules to content format
    // Filter out dummy/sample data - only show modules that have chapterId (synced from Content)
    // or modules that were created after a certain date (to exclude seed data)
    const contentItems = [];
    const cutoffDate = new Date('2024-01-01'); // Adjust this date to filter out old dummy data
    
    course.modules.forEach((module, moduleIndex) => {
      // Skip modules that look like dummy/sample data
      // Only include modules that:
      // 1. Have a chapterId (synced from Content collection) OR
      // 2. Were created recently (not old seed data)
      const hasChapterId = module.chapterId && !module.chapterId.startsWith('course_module_');
      const isRecent = module.createdAt && new Date(module.createdAt) > cutoffDate;
      
      // Skip if it's clearly dummy data (no chapterId and old)
      if (!hasChapterId && (!isRecent || !module.createdAt)) {
        console.log('⚠️ Skipping dummy/sample module:', module.name);
        return; // Skip this module
      }
      
      const chapterId = module.chapterId || `course_module_${moduleIndex}`;
      
      // Create chapter from module
      // IMPORTANT: Don't set _id to chapterId string - this causes ObjectId casting errors
      contentItems.push({
        // Don't set _id - use courseModuleId instead to avoid ObjectId casting issues
        type: 'chapter',
        title: module.name,
        description: module.description || '',
        chapter: {
          id: chapterId, // This is the string identifier, not _id
          name: module.name,
          description: module.description || ''
        },
        subject: classItem.subject,
        class: classItem._id,
        teacher: teacherId,
        status: 'published',
        createdAt: module.createdAt || new Date(),
        isCourseModule: true,
        source: 'course',
        // Add a unique identifier that won't be confused with _id
        courseModuleId: chapterId
      });
      
      // Create subtopics from topics
      if (module.topics && Array.isArray(module.topics)) {
        module.topics.forEach((topic, topicIndex) => {
          // Skip dummy topics too
          const hasSubtopicId = topic.subtopicId && !topic.subtopicId.startsWith('course_topic_');
          const topicIsRecent = topic.createdAt && new Date(topic.createdAt) > cutoffDate;
          
          if (!hasSubtopicId && (!topicIsRecent || !topic.createdAt)) {
            console.log('⚠️ Skipping dummy/sample topic:', topic.name);
            return; // Skip this topic
          }
          
          const subtopicId = topic.subtopicId || `course_topic_${topicIndex}`;
          contentItems.push({
            // Don't set _id to subtopicId string
            type: 'subtopic',
            title: topic.name,
            description: topic.description || '',
            chapter: {
              id: chapterId, // String identifier, not _id
              name: module.name
            },
            subtopic: {
              id: subtopicId, // String identifier, not _id
              title: topic.name,
              duration: topic.duration || ''
            },
            subject: classItem.subject,
            class: classItem._id,
            teacher: teacherId,
            status: 'published',
            createdAt: topic.createdAt || new Date(),
            isCourseModule: true,
            source: 'course',
            // Add a unique identifier that won't be confused with _id
            courseModuleId: subtopicId
          });
        });
      }
    });
    
    console.log('📚 Fetched Course modules as content:', {
      courseId: course._id,
      modulesCount: course.modules.length,
      contentItemsCount: contentItems.length
    });
    
    return contentItems;
  } catch (error) {
    console.error('⚠️ Error fetching Course modules (non-fatal):', error.message);
    return [];
  }
};

// @desc    Get all content
// @route   GET /api/content
// @access  Private
exports.getContent = async (req, res, next) => {
  try {
    const { type, class: classParam, subject, status, includeShared } = req.query;

    const classIds = Array.isArray(classParam)
      ? classParam.filter(Boolean)
      : classParam
        ? [classParam]
        : [];

    const query = { teacher: req.user.id };
    if (type) query.type = type;
    
    // Fix: Handle multiple class IDs properly
    if (classIds.length === 1) {
      query.class = classIds[0];
    } else if (classIds.length > 1) {
      query.class = { $in: classIds };
    }
    
    if (subject) query.subject = subject;
    
    // Fix: Default to showing published content if no status specified
    // But also allow showing all if explicitly requested
    if (status) {
      if (status === 'all') {
        // Show all statuses
      } else {
        query.status = status;
      }
    } else {
      // Default: show published and draft (for teacher's own content)
      query.status = { $in: ['published', 'draft'] };
    }

    const ownedContent = await Content.find(query)
      .populate('class', 'name subject grade')
      .sort({ createdAt: -1 });
    
    // Also fetch Course modules from student database and merge
    let courseModulesContent = [];
    if (classIds.length > 0) {
      // Fetch Course modules for each class
      for (const classId of classIds) {
        try {
          const classItem = await Class.findById(classId);
          if (classItem && classItem.teacher.toString() === req.user.id) {
            const modules = await fetchCourseModulesAsContent(classItem, req.user.id);
            courseModulesContent = [...courseModulesContent, ...modules];
          }
        } catch (err) {
          console.error(`⚠️ Error fetching Course modules for class ${classId}:`, err.message);
        }
      }
    }
    
    console.log('📚 Content sources:', {
      contentCollection: ownedContent.length,
      courseModules: courseModulesContent.length,
      total: ownedContent.length + courseModulesContent.length
    });

    // Merge Content items with Course modules, avoiding duplicates
    // Use a Map to track items by their unique identifiers (chapterId/subtopicId)
    const contentMap = new Map();
    const contentByNameMap = new Map(); // For matching by name when IDs don't exist
    
    // First, add all Content collection items (these are the source of truth)
    ownedContent.forEach(item => {
      if (item.type === 'chapter') {
        const chapterId = item.chapter?.id || item._id.toString();
        const chapterName = item.chapter?.name || item.title;
        contentMap.set(`chapter_${chapterId}`, item);
        // Also index by name for fallback matching
        contentByNameMap.set(`chapter_${chapterName?.toLowerCase().trim()}`, item);
      } else if (item.type === 'subtopic') {
        const subtopicId = item.subtopic?.id || item._id.toString();
        const subtopicName = item.subtopic?.title || item.title;
        const chapterId = item.chapter?.id;
        contentMap.set(`subtopic_${subtopicId}`, item);
        // Also index by name and chapter for fallback matching
        if (chapterId && subtopicName) {
          contentByNameMap.set(`subtopic_${chapterId}_${subtopicName?.toLowerCase().trim()}`, item);
        }
      } else {
        // For other content types, use _id
        contentMap.set(`content_${item._id}`, item);
      }
    });
    
    // Then, add Course modules only if they don't already exist in Content collection
    courseModulesContent.forEach(item => {
      if (item.type === 'chapter') {
        const chapterId = item.chapter?.id || item._id.toString();
        const chapterName = item.chapter?.name || item.title;
        const key = `chapter_${chapterId}`;
        const nameKey = `chapter_${chapterName?.toLowerCase().trim()}`;
        
        // Check by ID first, then by name
        if (!contentMap.has(key) && !contentByNameMap.has(nameKey)) {
          contentMap.set(key, item);
          contentByNameMap.set(nameKey, item);
          console.log('➕ Adding Course module chapter:', item.title);
        } else {
          console.log('⏭️ Skipping duplicate chapter from Course:', item.title);
        }
      } else if (item.type === 'subtopic') {
        const subtopicId = item.subtopic?.id || item._id.toString();
        const subtopicName = item.subtopic?.title || item.title;
        const chapterId = item.chapter?.id;
        const key = `subtopic_${subtopicId}`;
        const nameKey = chapterId ? `subtopic_${chapterId}_${subtopicName?.toLowerCase().trim()}` : null;
        
        // Check by ID first, then by name
        if (!contentMap.has(key) && (!nameKey || !contentByNameMap.has(nameKey))) {
          contentMap.set(key, item);
          if (nameKey) {
            contentByNameMap.set(nameKey, item);
          }
          console.log('➕ Adding Course module subtopic:', item.title);
        } else {
          console.log('⏭️ Skipping duplicate subtopic from Course:', item.title);
        }
      }
    });
    
    // Convert map back to array
    let combinedContent = Array.from(contentMap.values());
    
    // Sort by creation date
    combinedContent.sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateB - dateA; // Newest first
    });
    
    console.log('✅ Merged content:', {
      total: combinedContent.length,
      chapters: combinedContent.filter(c => c.type === 'chapter').length,
      subtopics: combinedContent.filter(c => c.type === 'subtopic').length,
      fromContent: ownedContent.length,
      fromCourse: courseModulesContent.length,
      unique: combinedContent.length
    });

    if (includeShared === 'true') {
      const sharedQuery = {
        teacher: { $ne: req.user.id },
        status: status || 'published'
      };

      if (classIds.length > 0) {
        if (classIds.length === 1) {
          sharedQuery.class = classIds[0];
        } else {
          sharedQuery.class = { $in: classIds };
        }
      }

      if (subject) {
        sharedQuery.subject = subject;
      }

      const sharedContent = await Content.find(sharedQuery)
        .populate('class', 'name subject grade')
        .sort({ createdAt: -1 });

      // Add shared content, avoiding duplicates using the same unique identifier logic
      sharedContent.forEach(item => {
        if (item.type === 'chapter') {
          const chapterId = item.chapter?.id || item._id.toString();
          const key = `chapter_${chapterId}`;
          if (!contentMap.has(key)) {
            contentMap.set(key, item);
            combinedContent.push(item);
          }
        } else if (item.type === 'subtopic') {
          const subtopicId = item.subtopic?.id || item._id.toString();
          const key = `subtopic_${subtopicId}`;
          if (!contentMap.has(key)) {
            contentMap.set(key, item);
            combinedContent.push(item);
          }
        } else {
          // For other content types, check by _id
          const key = `content_${item._id}`;
          if (!contentMap.has(key)) {
            contentMap.set(key, item);
            combinedContent.push(item);
          }
        }
      });
    }

    res.status(200).json({
      success: true,
      count: combinedContent.length,
      data: combinedContent
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single content item
// @route   GET /api/content/:id
// @access  Private
exports.getContentItem = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id)
      .populate('class', 'name subject grade');

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Increment views
    content.stats.views += 1;
    await content.save();

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new content
// @route   POST /api/content
// @access  Private
exports.createContent = async (req, res, next) => {
  try {
    console.log('📝 Creating content:', {
      title: req.body.title,
      type: req.body.type,
      class: req.body.class,
      subject: req.body.subject,
      hasTeacher: !!req.user?.id
    });

    // Add teacher to req.body
    req.body.teacher = req.user.id;

    // Verify class belongs to teacher
    if (!req.body.class) {
      return res.status(400).json({
        success: false,
        message: 'Class ID is required'
      });
    }

    const classItem = await Class.findById(req.body.class);
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    if (classItem.teacher.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to create content for this class'
      });
    }

    // Ensure subject is set (use class subject if not provided)
    if (!req.body.subject || req.body.subject.trim() === '') {
      req.body.subject = classItem.subject || 'General';
    }

    // Ensure title is set and valid
    if (!req.body.title || req.body.title.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Title must be at least 2 characters long'
      });
    }

    // Trim string fields
    req.body.title = req.body.title.trim();
    req.body.subject = req.body.subject.trim();
    if (req.body.description) {
      req.body.description = req.body.description.trim();
    }

    console.log('✅ Validated data, creating content...');
    const requestedChapter = typeof req.body.chapter === 'string' ? req.body.chapter.trim() : '';
    const requestedTopic = typeof req.body.topic === 'string' ? req.body.topic.trim() : '';
    if (requestedChapter) {
      req.body.chapter = {
        id: `chapter_${requestedChapter.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        name: requestedChapter,
        description: req.body.chapterText || ''
      };
    }
    if (requestedTopic) {
      req.body.subtopic = {
        id: `subtopic_${requestedTopic.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
        title: requestedTopic
      };
    }

    const content = await Content.create(req.body);

    // Update class stats
    if (classItem.stats) {
      classItem.stats.totalContent = (classItem.stats.totalContent || 0) + 1;
    } else {
      classItem.stats = { totalContent: 1 };
    }
    await classItem.save();

    if (wantsAiIndexing(req.body.addToAi)) {
      const indexableText = buildIndexableText(req.body);
      const aiResult = await indexTextForAI({
        text: indexableText,
        subject: content.subject,
        chapter: content.chapter?.name || req.body.chapter || content.title,
        topic: content.subtopic?.title || req.body.topic || 'General',
        classId: content.class?.toString(),
        teacherId: req.user.id,
        sourceType: 'teacher-posted-content'
      });

      content.aiIndex = {
        status: aiResult.success ? 'indexed' : 'failed',
        chunks: aiResult.chunks || 0,
        textLength: aiResult.textLength || indexableText.length,
        lastSyncedAt: new Date(),
        error: aiResult.error,
        sourceType: 'teacher-posted-content'
      };
      await content.save();

      if (!aiResult.success) {
        return res.status(422).json({
          success: false,
          data: content,
          retryable: true,
          message: aiResult.error || 'Content was saved, but AI indexing failed. Please add more text or retry.'
        });
      }
    }

    console.log('✅ Content created successfully:', content._id);

    res.status(201).json({
      success: true,
      data: content,
      message: 'Content created successfully'
    });
  } catch (error) {
    console.error('❌ Error creating content:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during content creation',
      error: error.message
    });
  }
};

// @desc    Update content
// @route   PUT /api/content/:id
// @access  Private
exports.updateContent = async (req, res, next) => {
  try {
    let content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Make sure user is content teacher
    if (content.teacher.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to update this content'
      });
    }

    // Get class info before update for syncing
    const classItem = await Class.findById(content.class);
    
    content = await Content.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });

    // Sync updated content to Course collection (only for chapters and subtopics)
    if (content && (content.type === 'chapter' || content.type === 'subtopic') && classItem) {
      try {
        await syncContentToCourse(content, classItem, req.user.id);
      } catch (syncError) {
        console.error('⚠️ Failed to sync updated content to course (non-fatal):', syncError.message);
        // Don't fail the request if sync fails
      }
    }

    res.status(200).json({
      success: true,
      data: content,
      message: 'Content updated successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during content update',
      error: error.message
    });
  }
};

// @desc    Delete content
// @route   DELETE /api/content/:id
// @access  Private
exports.deleteContent = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);

    if (!content) {
      return res.status(404).json({
        success: false,
        message: 'Content not found'
      });
    }

    // Make sure user is content teacher
    if (content.teacher.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to delete this content'
      });
    }

    // Get class info before deletion for syncing
    const classItem = await Class.findById(content.class);

    // Delete file if exists
    if (content.file && content.file.path) {
      const filePath = path.join(__dirname, '..', content.file.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    // Remove from Course collection before deleting (only for chapters and subtopics)
    if ((content.type === 'chapter' || content.type === 'subtopic') && classItem) {
      try {
        await removeContentFromCourse(content, classItem, req.user.id);
      } catch (syncError) {
        console.error('⚠️ Failed to remove content from course (non-fatal):', syncError.message);
        // Don't fail the request if sync fails
      }
    }

    await content.deleteOne();

    res.status(200).json({
      success: true,
      message: 'Content deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during content deletion',
      error: error.message
    });
  }
};

// @desc    Upload file
// @route   POST /api/content/upload
// @access  Private
exports.uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Please upload a file'
      });
    }

    const fileData = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path,
      url: `/uploads/content/${req.file.filename}`
    };

    const subject = req.body.subject || 'General';
    const chapter = req.body.chapter || 'General';
    const topic = req.body.topic || 'General';
    const classId = req.body.class_id || '';
    const teacherId = req.user?.id || req.body.teacher_id || '';
    const isPdf = req.file.mimetype === 'application/pdf' || req.file.originalname.toLowerCase().endsWith('.pdf');
    const addToAi = req.body.addToAi === undefined ? isPdf : wantsAiIndexing(req.body.addToAi);

    // Extract text from PDF and send it to the AI knowledge base in the same request.
    let extractedText = null;
    let aiIndexed = false;
    let chunksStored = 0;
    
    if (isPdf) {
      try {
        console.log('📄 Extracting text from PDF:', req.file.originalname);
        
        // Read PDF file
        const pdfBuffer = fs.readFileSync(req.file.path);
        
        // Extract text from PDF
        const pdfData = await pdfParse(pdfBuffer);
        extractedText = pdfData.text;
        
        console.log(`✅ Extracted ${extractedText.length} characters from PDF`);
        fileData.extractedText = extractedText; // Store for later use
        fileData.textExtracted = true;

        const aiText = cleanText([
          extractedText,
          req.file.originalname,
          subject,
          chapter,
          topic
        ].filter(Boolean).join('\n\n'));

        if (addToAi && aiText) {
          try {
            const aiResponse = await axios.post(`${AI_SERVICE_URL}/upload-content`, {
              text: aiText,
              subject,
              chapter,
              topic,
              class_id: classId,
              teacher_id: teacherId,
              source_type: 'pdf-upload'
            });

            chunksStored = aiResponse.data?.chunks_stored || 0;
            aiIndexed = chunksStored > 0;
            fileData.aiIndexed = aiIndexed;
            fileData.chunksStored = chunksStored;
            fileData.aiTextLength = aiText.length;
            console.log(`✅ Added PDF to AI knowledge base (${chunksStored} chunks)`);
          } catch (aiError) {
            console.error('❌ Error adding PDF to AI knowledge base:', aiError.response?.data || aiError.message);
            fileData.aiIndexed = false;
            fileData.aiError = aiError.response?.data?.detail || aiError.message;
            fileData.aiTextLength = aiText.length;
          }
        }
      } catch (pdfError) {
        console.error('❌ Error extracting PDF text:', pdfError.message);
        fileData.extractionError = pdfError.message;
      }
    }

    if (!fileData.aiIndexed && extractedText && extractedText.trim() && !fileData.aiError) {
      fileData.aiIndexed = aiIndexed;
      fileData.chunksStored = chunksStored;
    }

    res.status(200).json({
      success: true,
      data: fileData,
      message: fileData.aiIndexed
        ? 'File uploaded and added to AI knowledge base successfully'
        : addToAi
          ? 'File uploaded successfully, but AI indexing was skipped or only partially completed.'
          : 'File uploaded successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during file upload',
      error: error.message
    });
  }
};

// @desc    Sync an existing content item to AI
// @route   POST /api/content/:id/ai-sync
// @access  Private
exports.syncContentToAIIndex = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }
    if (content.teacher.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to sync this content' });
    }

    const indexableText = buildIndexableText({
      ...content.toObject(),
      lessonText: req.body?.text,
      chapterText: content.chapter?.description,
      notes: content.metadata?.notes
    });

    const aiResult = await indexTextForAI({
      text: indexableText,
      subject: content.subject,
      chapter: content.chapter?.name || req.body?.chapter || content.title,
      topic: content.subtopic?.title || req.body?.topic || 'General',
      classId: content.class?.toString(),
      teacherId: req.user.id,
      sourceType: req.body?.sourceType || 'teacher-resync'
    });

    content.aiIndex = {
      status: aiResult.success ? 'indexed' : 'failed',
      chunks: aiResult.chunks || 0,
      textLength: aiResult.textLength || indexableText.length,
      lastSyncedAt: new Date(),
      error: aiResult.error,
      sourceType: req.body?.sourceType || 'teacher-resync'
    };
    await content.save();

    if (!aiResult.success) {
      return res.status(422).json({
        success: false,
        data: content,
        retryable: true,
        message: aiResult.error || 'AI indexing failed. Please retry after adding lesson text.'
      });
    }

    res.status(200).json({
      success: true,
      data: content,
      message: `Content indexed in AI (${aiResult.chunks} chunks)`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error during AI sync',
      error: error.message
    });
  }
};

// @desc    Remove an existing content item from AI
// @route   DELETE /api/content/:id/ai-sync
// @access  Private
exports.removeContentFromAIIndex = async (req, res, next) => {
  try {
    const content = await Content.findById(req.params.id);
    if (!content) {
      return res.status(404).json({ success: false, message: 'Content not found' });
    }
    if (content.teacher.toString() !== req.user.id) {
      return res.status(401).json({ success: false, message: 'Not authorized to remove this content from AI' });
    }

    const removed = await removeFromAI({
      subject: content.subject,
      chapter: content.chapter?.name || content.chapter || content.title,
      topic: content.subtopic?.title || req.body?.topic,
      classId: content.class?.toString(),
      teacherId: req.user.id
    });

    content.aiIndex = {
      status: 'not_requested',
      chunks: 0,
      textLength: 0,
      lastSyncedAt: new Date(),
      error: '',
      sourceType: ''
    };
    await content.save();

    res.status(200).json({
      success: true,
      data: content,
      removedChunks: removed,
      message: `Removed ${removed} AI chunks`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error removing AI knowledge',
      error: error.message
    });
  }
};

// @desc    Get content statistics
// @route   GET /api/content/stats/overview
// @access  Private
exports.getContentStats = async (req, res, next) => {
  try {
    const totalContent = await Content.countDocuments({ teacher: req.user.id });
    const publishedContent = await Content.countDocuments({ 
      teacher: req.user.id, 
      status: 'published' 
    });
    const draftContent = await Content.countDocuments({ 
      teacher: req.user.id, 
      status: 'draft' 
    });

    // Get content by type
    const contentByType = await Content.aggregate([
      { $match: { teacher: req.user._id } },
      { $group: { _id: '$type', count: { $sum: 1 } } }
    ]);

    const stats = {
      total: totalContent,
      published: publishedContent,
      draft: draftContent,
      byType: contentByType
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Add chapter
// @route   POST /api/content/chapters
// @access  Private
exports.addChapter = async (req, res, next) => {
  try {
    console.log('📚 Adding chapter:', {
      classId: req.body.classId,
      name: req.body.name,
      hasUser: !!req.user?.id
    });

    const { classId, name, description } = req.body;

    // Validate required fields
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID is required'
      });
    }

    if (!name || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Chapter name must be at least 2 characters long'
      });
    }

    // Validate classId is a valid MongoDB ObjectId
  
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Class ID format'
      });
    }

    // Verify class belongs to teacher
    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    if (classItem.teacher.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to add chapter to this class'
      });
    }

    // Ensure subject is set (required field)
    const subject = classItem.subject || 'General';
    if (!subject || subject.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Class must have a subject assigned. Please update the class first.'
      });
    }

    console.log('✅ Validated, creating chapter with:', {
      title: name.trim(),
      description: description || '',
      type: 'chapter',
      class: classId,
      teacher: req.user.id,
      subject: subject.trim()
    });

    // Create a placeholder content item to represent the chapter
    const chapter = await Content.create({
      title: name.trim(),
      description: description ? description.trim() : '',
      type: 'chapter',
      class: classId,
      teacher: req.user.id,
      subject: subject.trim(),
      chapter: {
        id: `chapter_${Date.now()}`,
        name: name.trim(),
        description: description ? description.trim() : ''
      },
      status: 'published'
    });

    console.log('✅ Chapter created successfully:', chapter._id);

    // Sync chapter to Course collection in student backend
    try {
      await syncContentToCourse(chapter, classItem, req.user.id);
    } catch (syncError) {
      console.error('⚠️ Failed to sync chapter to course (non-fatal):', syncError.message);
      // Don't fail the request if sync fails
    }

    res.status(201).json({
      success: true,
      data: chapter,
      message: 'Chapter added successfully'
    });
  } catch (error) {
    console.error('❌ Error adding chapter:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      
      // Check if it's a type enum error - this means server needs restart
      const typeError = errors.find(e => e.includes('is not a valid enum value') && e.includes('type'));
      if (typeError) {
        console.error('⚠️ Type enum error detected - server may need restart');
        return res.status(400).json({
          success: false,
          message: 'Content type validation error. The server may be using a cached model definition.',
          errors: errors,
          error: error.message,
          hint: 'Please restart the backend server to load the updated Content model with chapter/subtopic types.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during chapter creation',
      error: error.message
    });
  }
};

// @desc    Add subtopic
// @route   POST /api/content/subtopics
// @access  Private
exports.addSubtopic = async (req, res, next) => {
  try {
    console.log('📝 Adding subtopic:', {
      classId: req.body.classId,
      chapterId: req.body.chapterId,
      title: req.body.title,
      hasUser: !!req.user?.id
    });

    const { classId, chapterId, title, duration } = req.body;

    // Validate required fields
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'Class ID is required'
      });
    }

    if (!chapterId) {
      return res.status(400).json({
        success: false,
        message: 'Chapter ID is required'
      });
    }

    if (!title || title.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Subtopic title must be at least 2 characters long'
      });
    }

    // Validate ObjectIds
  
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid Class ID format'
      });
    }

    // Verify class belongs to teacher
    const classItem = await Class.findById(classId);
    if (!classItem) {
      return res.status(404).json({
        success: false,
        message: 'Class not found'
      });
    }

    if (classItem.teacher.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to add subtopic to this class'
      });
    }

    // Find the chapter to get its chapter.id (this is the key linking!)
    // Try multiple ways to find the chapter:
    // 1. By chapter.id field (most common - e.g., "chapter_1762541833991")
    // 2. By MongoDB _id (only if chapterId is a valid ObjectId)
  
    let chapterContent = null;
    
    // First try: Find by chapter.id field (this is the primary method)
    chapterContent = await Content.findOne({
      type: 'chapter',
      class: classId,
      'chapter.id': chapterId
    });
    
    // Second try: Find by MongoDB _id ONLY if chapterId is a valid ObjectId
    // This handles cases where old chapters might not have chapter.id set
    if (!chapterContent && mongoose.Types.ObjectId.isValid(chapterId)) {
      try {
        chapterContent = await Content.findOne({
          type: 'chapter',
          class: classId,
          _id: chapterId
        });
      } catch (idError) {
        // If casting fails, ignore and continue
        console.log('⚠️ Could not use chapterId as ObjectId:', chapterId);
      }
    }
    
    // Third try: Try to find by matching _id as string (only if valid ObjectId)
    // This is for backwards compatibility with old data
    if (!chapterContent && mongoose.Types.ObjectId.isValid(chapterId)) {
      try {
        // Try to find chapters where chapter.id matches the _id as string
        const allChapters = await Content.find({
          type: 'chapter',
          class: classId
        });
        chapterContent = allChapters.find(ch => 
          ch._id.toString() === chapterId || 
          (ch.chapter?.id && ch.chapter.id === chapterId)
        );
      } catch (findError) {
        console.log('⚠️ Error in third try:', findError.message);
      }
    }

    if (!chapterContent) {
      console.error('❌ Chapter not found:', {
        chapterId,
        classId,
        isValidObjectId: mongoose.Types.ObjectId.isValid(chapterId),
        availableChapters: await Content.find({ type: 'chapter', class: classId }).select('_id chapter.id chapter.name title')
      });
      return res.status(404).json({
        success: false,
        message: 'Chapter not found. Please ensure the chapter exists and try refreshing the page.'
      });
    }

    // Use the chapter's chapter.id (not the MongoDB _id) for linking
    // If chapter.id doesn't exist, create one from _id for consistency
    let actualChapterId = chapterContent.chapter?.id;
    if (!actualChapterId) {
      // If chapter was created without chapter.id, create a proper string ID
      // Use a timestamp-based ID to avoid conflicts
      actualChapterId = `chapter_${Date.now()}_${chapterContent._id.toString().slice(-6)}`;
      // Update the chapter to have chapter.id for future consistency
      chapterContent.chapter = {
        id: actualChapterId,
        name: chapterContent.chapter?.name || chapterContent.title,
        description: chapterContent.chapter?.description || chapterContent.description || ''
      };
      try {
        await chapterContent.save();
        console.log('✅ Updated chapter with chapter.id:', actualChapterId);
      } catch (saveError) {
        console.error('⚠️ Error saving chapter update (non-fatal):', saveError.message);
        // Continue anyway - the chapter.id is set in memory
      }
    }
    
    // CRITICAL: Ensure actualChapterId is a string and never an ObjectId
    actualChapterId = String(actualChapterId);
    if (actualChapterId.length === 24 && /^[0-9a-fA-F]{24}$/.test(actualChapterId)) {
      // If it looks like an ObjectId, convert it to a string identifier
      console.warn('⚠️ Chapter ID looks like ObjectId, converting to string identifier');
      actualChapterId = `chapter_${actualChapterId}`;
    }
    console.log('✅ Found chapter:', {
      chapterId: actualChapterId,
      chapterName: chapterContent.chapter?.name || chapterContent.title
    });

    // Ensure subject is set
    const subject = classItem.subject || 'General';
    if (!subject || subject.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Class must have a subject assigned. Please update the class first.'
      });
    }

    console.log('✅ Creating subtopic with:', {
      title: title.trim(),
      type: 'subtopic',
      class: classId,
      teacher: req.user.id,
      subject: subject.trim(),
      chapterId: actualChapterId
    });

    // Create a placeholder content item to represent the subtopic
    // Make sure we're not accidentally setting _id to chapterId
    // CRITICAL: Ensure all IDs are properly typed - class and teacher must be ObjectIds
  
    
    // Validate that classId and teacherId are valid ObjectIds
    if (!mongoose.Types.ObjectId.isValid(classId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid class ID format'
      });
    }
    
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid teacher ID format'
      });
    }
    
    let subtopic;
    try {
      // CRITICAL FIX: Create the document step by step to avoid any ObjectId casting issues
      // First, create a plain object with only the required fields
      const baseData = {
        title: String(title.trim()),
        description: String(''),
        type: String('subtopic'),
        class: mongoose.Types.ObjectId.isValid(classId) ? new mongoose.Types.ObjectId(classId) : classId,
        teacher: mongoose.Types.ObjectId.isValid(req.user.id) ? new mongoose.Types.ObjectId(req.user.id) : req.user.id,
        subject: String(subject.trim()),
        status: String('published')
      };
      
      // Validate ObjectIds one more time
      if (!(baseData.class instanceof mongoose.Types.ObjectId)) {
        throw new Error(`Invalid class ID: ${classId}`);
      }
      if (!(baseData.teacher instanceof mongoose.Types.ObjectId)) {
        throw new Error(`Invalid teacher ID: ${req.user.id}`);
      }
      
      // CRITICAL: Ensure baseData has no _id field that could cause issues
      // MongoDB will auto-generate _id, we should never set it manually
      if (baseData._id) {
        delete baseData._id;
      }
      if (baseData.id) {
        delete baseData.id;
      }
      
      // CRITICAL: Use direct MongoDB insertion to bypass Mongoose casting entirely
      // This prevents any ObjectId casting issues with nested objects
      const chapterIdString = String(actualChapterId);
      // Ensure chapterIdString doesn't look like an ObjectId
      const safeChapterId = chapterIdString.startsWith('chapter_') 
        ? chapterIdString 
        : `chapter_${chapterIdString}`;
      
      const subtopicIdString = `subtopic_${Date.now()}`;
      
      // Build complete document with all fields at once
      // CRITICAL: Convert ObjectIds to BSON ObjectId for direct MongoDB insertion
      const completeData = {
        title: String(title.trim()),
        description: String(''),
        type: String('subtopic'),
        class: baseData.class, // Already an ObjectId
        teacher: baseData.teacher, // Already an ObjectId
        subject: String(subject.trim()),
        status: String('published'),
        chapter: {
          id: safeChapterId, // String - NEVER an ObjectId
          name: String(chapterContent.chapter?.name || chapterContent.title)
        },
        subtopic: {
          id: subtopicIdString, // String - NEVER an ObjectId
          title: String(title.trim()),
          duration: String(duration || '')
        },
        visibility: 'class-only',
        stats: {
          views: 0,
          downloads: 0,
          likes: 0,
          shares: 0
        },
        isActive: true
      };
      
      // CRITICAL: Ensure no _id field exists - MongoDB will generate it
      delete completeData._id;
      delete completeData.id;
      
      console.log('📝 Inserting subtopic with data:', {
        title: completeData.title,
        type: completeData.type,
        class: completeData.class.toString(),
        teacher: completeData.teacher.toString(),
        chapterId: completeData.chapter.id,
        subtopicId: completeData.subtopic.id,
        has_id: '_id' in completeData
      });
      
      // CRITICAL: Use collection.insertOne() directly to bypass Mongoose casting
      // This ensures chapter.id and subtopic.id are never confused with _id
      const ContentCollection = Content.collection;
      const insertResult = await ContentCollection.insertOne(completeData);
      
      console.log('✅ Document inserted, insertedId:', insertResult.insertedId);
      
      // Now fetch the document using Mongoose to get proper document methods
      subtopic = await Content.findById(insertResult.insertedId);
      
      if (!subtopic) {
        throw new Error('Failed to retrieve created subtopic');
      }
      
      console.log('✅ Subtopic created successfully via direct insert:', subtopic._id);
    } catch (createError) {
      console.error('❌ Error during Content.create():', createError);
      console.error('Create error details:', {
        name: createError.name,
        message: createError.message,
        stack: createError.stack,
        chapterId: actualChapterId,
        classId: classId,
        teacherId: req.user.id
      });
      throw createError; // Re-throw to be caught by outer catch
    }

    // Sync subtopic to Course collection in student backend
    // This is non-fatal, so wrap in try-catch
    try {
      await syncContentToCourse(subtopic, classItem, req.user.id);
    } catch (syncError) {
      console.error('⚠️ Failed to sync subtopic to course (non-fatal):', syncError.message);
      console.error('Sync error details:', syncError);
      // Don't fail the request if sync fails
    }

    // Return the subtopic as a plain object to avoid any ObjectId casting issues
    // Convert Mongoose document to plain object and ensure no _id conflicts
    let subtopicData;
    if (subtopic.toObject) {
      subtopicData = subtopic.toObject({ 
        virtuals: false,  // Don't include virtuals
        transform: (doc, ret) => {
          // Ensure chapter.id is never confused with _id
          // Remove any accidental _id fields that might be strings
          if (ret._id && typeof ret._id === 'string' && ret._id.startsWith('chapter_')) {
            // This shouldn't happen, but if it does, remove it
            delete ret._id;
          }
          // Ensure chapter.id is properly set as a string
          if (ret.chapter && ret.chapter.id) {
            ret.chapter.id = String(ret.chapter.id);
          }
          return ret;
        }
      });
    } else {
      subtopicData = JSON.parse(JSON.stringify(subtopic));
      // Clean up any potential issues
      if (subtopicData._id && typeof subtopicData._id === 'string' && subtopicData._id.startsWith('chapter_')) {
        delete subtopicData._id;
      }
    }
    
    res.status(201).json({
      success: true,
      data: subtopicData,
      message: 'Subtopic added successfully'
    });
  } catch (error) {
    console.error('❌ Error adding subtopic:', error);
    console.error('Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      chapterId: req.body.chapterId,
      classId: req.body.classId
    });

    // Handle Mongoose CastError (ObjectId casting errors)
    if (error.name === 'CastError' || error.message.includes('Cast to ObjectId failed')) {
      console.error('⚠️ ObjectId casting error detected');
      return res.status(400).json({
        success: false,
        message: 'Invalid ID format. Please refresh the page and try again.',
        error: error.message,
        hint: 'The chapter ID format is invalid. This might happen if the page needs to be refreshed.'
      });
    }

    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      
      const typeError = errors.find(e => e.includes('is not a valid enum value') && e.includes('type'));
      if (typeError) {
        console.error('⚠️ Type enum error detected - server may need restart');
        return res.status(400).json({
          success: false,
          message: 'Content type validation error. The server may be using a cached model definition.',
          errors: errors,
          error: error.message,
          hint: 'Please restart the backend server to load the updated Content model with chapter/subtopic types.'
        });
      }
      
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors,
        error: error.message
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error during subtopic creation',
      error: error.message
    });
  }
};

// @desc    Get published content for students (by class)
// @route   GET /api/content/student
// @access  Public (for students)
exports.getPublishedContentForStudent = async (req, res, next) => {
  try {
    const { class: classQuery, subject, type, includeDrafts } = req.query;

    let classIds = [];
    // Handle multiple class query parameters
    // Express might parse ?class=id1&class=id2 as an array or as a single value
    if (Array.isArray(classQuery)) {
      classIds = classQuery.filter(Boolean);
    } else if (classQuery) {
      // If it's a string, it might be comma-separated or a single ID
      if (typeof classQuery === 'string' && classQuery.includes(',')) {
        classIds = classQuery.split(',').filter(Boolean);
      } else {
        classIds = [classQuery];
      }
    }

  
    const validClassIds = classIds.filter(id => mongoose.Types.ObjectId.isValid(id));

    // Fix: Allow subject-only queries (for students who haven't joined classes yet)
    if (validClassIds.length === 0 && !subject) {
      return res.status(200).json({
        success: true,
        count: 0,
        data: [],
        message: 'No class ID or subject provided'
      });
    }

    const query = {
      status: includeDrafts === 'true' ? { $in: ['draft', 'published'] } : 'published'
    };

    // Fix: Handle multiple class IDs properly
    // Priority: Class IDs > Subject (if class IDs are provided, don't filter by subject)
    if (validClassIds.length === 1) {
      query.class = validClassIds[0];
    } else if (validClassIds.length > 1) {
      query.class = { $in: validClassIds };
    }

    if (type) {
      query.type = type;
    }

    // Only apply subject filter if no class IDs are provided
    // This ensures students see all content from their enrolled classes
    if (subject && validClassIds.length === 0) {
      query.subject = subject;
    }

    console.log('📚 Fetching student content with query:', {
      classIds: validClassIds.length,
      validClassIds: validClassIds,
      subject,
      type,
      status: query.status,
      query: JSON.stringify(query, null, 2)
    });

    // First, let's see what chapters exist for these classes
    if (validClassIds.length > 0) {
      const allChaptersForClasses = await Content.find({
        type: 'chapter',
        class: validClassIds.length === 1 ? validClassIds[0] : { $in: validClassIds },
        status: query.status
      }).select('_id chapter.id chapter.name title class status');
      
      console.log('📚 All chapters in database for these classes:', {
        count: allChaptersForClasses.length,
        chapters: allChaptersForClasses.map(ch => ({
          _id: ch._id.toString(),
          chapterId: ch.chapter?.id,
          name: ch.chapter?.name || ch.title,
          classId: ch.class?.toString() || ch.class,
          status: ch.status
        }))
      });
    }

    const content = await Content.find(query)
      .populate('class', 'name subject grade teacher')
      .sort({ createdAt: -1 });

    // Log detailed information about what's being returned
    const chapters = content.filter(c => c.type === 'chapter');
    const subtopics = content.filter(c => c.type === 'subtopic');
    
    console.log('✅ Found content for students:', {
      total: content.length,
      chapters: chapters.length,
      subtopics: subtopics.length,
      other: content.filter(c => c.type !== 'chapter' && c.type !== 'subtopic').length
    });
    
    // Log chapter details
    if (chapters.length > 0) {
      console.log('📚 Chapters found:', chapters.map(ch => ({
        _id: ch._id.toString(),
        chapterId: ch.chapter?.id,
        name: ch.chapter?.name || ch.title,
        hasChapterId: !!ch.chapter?.id
      })));
    }
    
    // Log subtopic details
    if (subtopics.length > 0) {
      console.log('📝 Subtopics found:', subtopics.map(st => ({
        _id: st._id.toString(),
        subtopicId: st.subtopic?.id,
        chapterId: st.chapter?.id,
        title: st.subtopic?.title || st.title,
        hasChapterId: !!st.chapter?.id,
        chapterName: st.chapter?.name
      })));
    }

    res.status(200).json({
      success: true,
      count: content.length,
      data: content
    });
  } catch (error) {
    console.error('❌ Error fetching student content:', error);
    res.status(500).json({
      success: false,
      message: 'Server error fetching content',
      error: error.message
    });
  }
};

// @desc    Get chapters for a class
// @route   GET /api/content/chapters/:classId
// @access  Private
exports.getChapters = async (req, res, next) => {
  try {
    const { classId } = req.params;

    // Verify class belongs to teacher
    const classItem = await Class.findById(classId);
    if (!classItem || classItem.teacher.toString() !== req.user.id) {
      return res.status(401).json({
        success: false,
        message: 'Not authorized to access this class content'
      });
    }

    const chapters = await Content.find({
      class: classId,
      type: 'chapter'
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: chapters.length,
      data: chapters
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

const wantsAiIndexing = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on'].includes(String(value).toLowerCase());
};

const cleanText = (value) => (value || '').toString().replace(/\s+/g, ' ').trim();

const buildIndexableText = (contentData = {}) => {
  const parts = [
    contentData.extractedText,
    contentData.lessonText,
    contentData.notes,
    contentData.chapterText,
    contentData.description,
    contentData.title
  ].map(cleanText).filter(Boolean);

  return parts.join('\n\n').trim();
};

const indexTextForAI = async ({
  text,
  subject,
  chapter,
  topic,
  classId,
  teacherId,
  sourceType
}) => {
  const fullText = cleanText(text);
  if (fullText.length < MIN_AI_TEXT_LENGTH) {
    const reason = 'No text available to index.';
    console.warn('AI indexing skipped:', reason);
    return {
      success: false,
      status: 'failed',
      chunks: 0,
      textLength: fullText.length,
      error: reason
    };
  }

  try {
    const aiResponse = await axios.post(`${AI_SERVICE_URL}/upload-content`, {
      text: fullText,
      subject: subject || 'General',
      chapter: chapter || 'General',
      topic: topic || 'General',
      class_id: classId || '',
      teacher_id: teacherId || '',
      source_type: sourceType || 'teacher-content'
    }, { timeout: 60000 });

    const chunks = aiResponse.data?.chunks_stored || 0;
    if (chunks <= 0) {
      const reason = 'AI service responded but no chunks were stored.';
      console.warn(reason, aiResponse.data);
      return {
        success: false,
        status: 'failed',
        chunks: 0,
        textLength: fullText.length,
        error: reason
      };
    }

    return {
      success: true,
      status: 'indexed',
      chunks,
      textLength: aiResponse.data?.text_length || fullText.length,
      metadata: aiResponse.data?.metadata || {}
    };
  } catch (error) {
    const reason = error.response?.data?.detail || error.message || 'AI indexing failed';
    console.error('AI indexing failed:', reason);
    return {
      success: false,
      status: 'failed',
      chunks: 0,
      textLength: fullText.length,
      error: reason
    };
  }
};

const removeFromAI = async ({ subject, chapter, topic, classId, teacherId }) => {
  const aiResponse = await axios.post(`${AI_SERVICE_URL}/remove-content`, {
    subject: subject || 'General',
    chapter: chapter || 'General',
    topic: topic || undefined,
    class_id: classId || undefined,
    teacher_id: teacherId || undefined
  }, { timeout: 30000 });

  return aiResponse.data?.removed_chunks || 0;
};
