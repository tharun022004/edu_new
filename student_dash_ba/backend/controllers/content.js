const {
  fetchStudentEnrollments,
  extractEnrolledClassIds
} = require('../utils/teacherEnrollment');

// @desc    Get content for student's enrolled classes
// @route   GET /api/content
// @access  Private
exports.getContent = async (req, res, next) => {
  try {
    const { class: classId, subject, type, status } = req.query;
    const studentId = req.user._id;
    const studentEmail = req.user.email;

    console.log('📚 Fetching content for student:', {
      studentId: studentId.toString(),
      studentEmail,
      classId,
      subject,
      type,
      status
    });

    // Get student's enrolled classes from teacher backend
    const teacherApiUrl = process.env.TEACHER_API_URL || 'http://localhost:5001';
    
    try {
      const enrolledClasses = await fetchStudentEnrollments({
        email: studentEmail,
        id: studentId
      });
      console.log('Found enrolled classes:', enrolledClasses.length);

      const enrolledClassIds = extractEnrolledClassIds(enrolledClasses);

      if (classId && enrolledClassIds.length > 0 && !enrolledClassIds.includes(classId.toString())) {
        return res.status(403).json({
          success: false,
          message: 'You are not enrolled in this class'
        });
      }

      const queryParams = new URLSearchParams();

      if (classId) {
        queryParams.append('class', classId);
      } else if (enrolledClassIds.length > 0) {
        enrolledClassIds.forEach((id) => queryParams.append('class', id));
      } else if (subject) {
        queryParams.append('subject', subject);
      }
      
      if (type) queryParams.append('type', type);
      
      // Only get published content for students (unless explicitly requested)
      if (status) {
        queryParams.append('status', status);
      } else {
        queryParams.append('status', 'published');
      }

      // If we have no class IDs and no subject, return empty
      if (enrolledClasses.length === 0 && !classId && !subject) {
        console.log('⚠️ No enrolled classes found and no classId/subject provided');
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
          message: 'No enrolled classes found. Please join a class first.'
        });
      }

      // Fetch content from teacher backend
      const contentUrl = `${teacherApiUrl}/api/content/student?${queryParams.toString()}`;
      console.log('📡 Fetching content from:', contentUrl);
      console.log('📡 Query params:', {
        classIds: Array.from(queryParams.getAll('class')),
        subject: queryParams.get('subject'),
        type: queryParams.get('type'),
        status: queryParams.get('status')
      });
      
      const contentResponse = await fetch(contentUrl, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!contentResponse.ok) {
        const errorData = await contentResponse.json().catch(() => ({}));
        console.error('❌ Error fetching content from teacher backend:', {
          status: contentResponse.status,
          statusText: contentResponse.statusText,
          error: errorData
        });
        return res.status(contentResponse.status).json({
          success: false,
          message: 'Failed to fetch content from teacher backend',
          error: errorData.message || 'Unknown error'
        });
      }

      const contentData = await contentResponse.json();
      let content = contentData.data || (contentData.success ? (contentData.data || []) : []);

      const allowedClassIds = classId
        ? [classId.toString()]
        : extractEnrolledClassIds(enrolledClasses);

      if (allowedClassIds.length > 0) {
        console.log('🔍 Filtering content by class IDs:', allowedClassIds);

        content = content.filter((item) => {
          const itemClassId = item.class?._id || item.class?.id || item.class;
          if (!itemClassId) {
            return false;
          }
          return allowedClassIds.includes(itemClassId.toString());
        });
        
        console.log('✅ After filtering:', {
          total: content.length,
          chapters: content.filter(c => c.type === 'chapter').length,
          subtopics: content.filter(c => c.type === 'subtopic').length
        });
      }

      const chapters = content.filter(c => c.type === 'chapter');
      const subtopics = content.filter(c => c.type === 'subtopic');
      
      console.log('✅ Content fetched successfully:', {
        total: content.length,
        chapters: chapters.length,
        subtopics: subtopics.length,
        other: content.filter(c => c.type !== 'chapter' && c.type !== 'subtopic').length
      });
      
      // Log detailed chapter information
      if (chapters.length > 0) {
        console.log('📚 Chapters received:', chapters.map(ch => ({
          _id: ch._id?.toString() || ch._id,
          chapterId: ch.chapter?.id,
          name: ch.chapter?.name || ch.title,
          hasChapterId: !!ch.chapter?.id,
          classId: ch.class?._id?.toString() || ch.class?.id || ch.class
        })));
      }
      
      // Log detailed subtopic information
      if (subtopics.length > 0) {
        console.log('📝 Subtopics received:', subtopics.map(st => ({
          _id: st._id?.toString() || st._id,
          subtopicId: st.subtopic?.id,
          chapterId: st.chapter?.id,
          title: st.subtopic?.title || st.title,
          hasChapterId: !!st.chapter?.id,
          chapterName: st.chapter?.name,
          classId: st.class?._id?.toString() || st.class?.id || st.class
        })));
      }

      res.status(200).json({
        success: true,
        count: content.length,
        data: content
      });
    } catch (teacherError) {
      console.error('❌ Error communicating with teacher backend:', teacherError);
      return res.status(500).json({
        success: false,
        message: 'Error fetching content from teacher backend',
        error: teacherError.message
      });
    }
  } catch (error) {
    console.error('❌ Get content error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting content',
      error: error.message
    });
  }
};

// @desc    Get single content item
// @route   GET /api/content/:id
// @access  Private
exports.getContentItem = async (req, res, next) => {
  try {
    const contentId = req.params.id;
    const teacherApiUrl = process.env.TEACHER_API_URL || 'http://localhost:5001';

    // Fetch content from teacher backend
    const contentResponse = await fetch(
      `${teacherApiUrl}/api/content/${contentId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.authorization || ''
        }
      }
    );

    if (!contentResponse.ok) {
      const errorData = await contentResponse.json().catch(() => ({}));
      return res.status(contentResponse.status).json({
        success: false,
        message: 'Content not found',
        error: errorData.message || 'Unknown error'
      });
    }

    const contentData = await contentResponse.json();
    const content = contentData.data || contentData.success ? (contentData.data || null) : null;

    const enrolledClasses = await fetchStudentEnrollments({
      email: req.user.email,
      id: req.user._id
    });
    const classIds = extractEnrolledClassIds(enrolledClasses);
    const contentClassId = content?.class?._id || content?.class?.id || content?.class;

    if (
      contentClassId &&
      classIds.length > 0 &&
      !classIds.includes(contentClassId.toString())
    ) {
      return res.status(403).json({
        success: false,
        message: 'You are not enrolled in this class'
      });
    }

    res.status(200).json({
      success: true,
      data: content
    });
  } catch (error) {
    console.error('❌ Get content item error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error getting content item',
      error: error.message
    });
  }
};

