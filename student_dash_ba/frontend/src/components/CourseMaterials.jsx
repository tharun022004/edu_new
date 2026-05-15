import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import apiService from '../services/api';
import {
  DocumentTextIcon,
  PlayCircleIcon,
  LinkIcon,
  PhotoIcon,
  SpeakerWaveIcon,
  ClockIcon,
  ArrowPathIcon,
  QuestionMarkCircleIcon,
  AcademicCapIcon
} from '@heroicons/react/24/outline';

const CourseMaterials = ({ course, onCountChange, navigateToResource }) => {
  const [teacherContent, setTeacherContent] = useState([]); // Teacher-created chapters from Content API
  const [loading, setLoading] = useState(false); // Start with false, will be set to true when fetching
  const [error, setError] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fetchingRef = useRef(false); // Prevent concurrent requests
  const courseIdRef = useRef(null); // Track last fetched course ID

  // Map course category to possible subject names
  const mapCategoryToSubject = (category) => {
    const mapping = {
      'mathematics': ['mathematics', 'math', 'maths', 'algebra', 'geometry', 'calculus'],
      'physics': ['physics', 'physical science'],
      'chemistry': ['chemistry', 'chemical science'],
      'biology': ['biology', 'life science'],
      'english': ['english', 'language', 'literature'],
      'history': ['history', 'social studies'],
      'computer-science': ['computer science', 'computer', 'cs', 'programming', 'coding']
    };
    return mapping[category] || [category];
  };

  // Get subject from course - try multiple fields
  const courseCategory = course?.category || course?.subject || '';
  const possibleSubjects = courseCategory ? mapCategoryToSubject(courseCategory.toLowerCase()) : [];
  const subjectKey = course?.subject || courseCategory || course?.name || '';
  const activeClassId = (course?.classId || course?._id)?.toString();

  const filterContentForClass = useCallback(
    (items) => {
      if (!activeClassId || !Array.isArray(items)) return items || [];
      return items.filter((item) => {
        const itemClassId = item.class?._id || item.class?.id || item.class;
        if (!itemClassId) return false;
        return itemClassId.toString() === activeClassId;
      });
    },
    [activeClassId]
  );

  // Convert Course modules to Content format (for display)
  // Now uses chapterId/subtopicId from Course modules for proper linking
  const convertCourseModulesToContent = useCallback((courseModules) => {
    if (!courseModules || !Array.isArray(courseModules)) return [];
    
    const convertedContent = [];
    
    courseModules.forEach((module, moduleIndex) => {
      // Use chapterId from module if available, otherwise generate one
      const chapterId = module.chapterId || `course_module_${module._id || moduleIndex}`;
      const chapter = {
        _id: chapterId,
        type: 'chapter',
        title: module.name,
        description: module.description || '',
        chapter: {
          id: chapterId,
          name: module.name,
          description: module.description || ''
        },
        subject: course?.category || course?.subject || '',
        createdAt: module.createdAt || new Date(),
        isCourseModule: true, // Flag to identify course modules
        moduleData: module // Store original module data for progress/actions
      };
      convertedContent.push(chapter);
      
      // Convert topics to subtopics
      if (module.topics && Array.isArray(module.topics)) {
        module.topics.forEach((topic, topicIndex) => {
          // Use subtopicId from topic if available, otherwise generate one
          const subtopicId = topic.subtopicId || `course_topic_${topic._id || topicIndex}`;
          const subtopic = {
            _id: subtopicId,
            type: 'subtopic',
            title: topic.name,
            description: topic.description || '',
            chapter: {
              id: chapterId,
              name: module.name
            },
            subtopic: {
              id: subtopicId,
              title: topic.name,
              duration: topic.duration || ''
            },
            subject: course?.category || course?.subject || '',
            status: 'published',
            createdAt: topic.createdAt || new Date(),
            isCourseModule: true,
            topicData: topic, // Store original topic data for progress/actions
            // Convert topic content to content items
            topicContent: topic.content ? {
              notes: topic.content.notes,
              resources: topic.content.resources || [],
              keyPoints: topic.content.keyPoints || [],
              videoUrl: topic.videoUrl,
              thumbnail: topic.thumbnail
            } : null
          };
          convertedContent.push(subtopic);
        });
      }
    });
    
    return convertedContent;
  }, [course]);

  const fetchContent = useCallback(async (isManualRefresh = false) => {
    // Prevent concurrent requests
    if (fetchingRef.current && !isManualRefresh) {
      console.log('⏸️ Already fetching, skipping duplicate request');
      return;
    }
    
    fetchingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      if (isManualRefresh) {
        setIsRefreshing(true);
      }

      console.log('📚 Fetching content for course:', {
        courseName: course?.name,
        courseId: course?._id,
        classId: activeClassId,
        category: courseCategory,
        possibleSubjects,
        subjectKey,
        hasCourseModules: course?.modules?.length > 0
      });

      const params = { status: 'published' };
      if (activeClassId) {
        params.class = activeClassId;
      }

      console.log('📡 Fetching teacher content with params:', params);
      const teacherResponse = await apiService.getContent(params);
      
      console.log('📡 Teacher content response:', {
        success: teacherResponse?.success,
        hasData: !!teacherResponse?.data,
        dataLength: teacherResponse?.data?.length || 0,
        message: teacherResponse?.message
      });

      let teacherContentData = [];
      if (teacherResponse.success) {
        teacherContentData = filterContentForClass(teacherResponse.data || []);
        
        const chapters = teacherContentData.filter(c => c.type === 'chapter');
        const subtopics = teacherContentData.filter(c => c.type === 'subtopic');
        
        console.log('📦 Received teacher content (Student):', {
          total: teacherContentData.length,
          chapters: chapters.length,
          subtopics: subtopics.length
        });
        
        // Log detailed chapter information
        if (chapters.length > 0) {
          console.log('📚 Chapters (Student):', chapters.map(ch => ({
            _id: ch._id?.toString() || ch._id,
            chapterId: ch.chapter?.id,
            name: ch.chapter?.name || ch.title,
            hasChapterId: !!ch.chapter?.id,
            chapterObject: ch.chapter
          })));
        }
        
        // Log detailed subtopic information
        if (subtopics.length > 0) {
          console.log('📝 Subtopics (Student):', subtopics.map(st => ({
            _id: st._id?.toString() || st._id,
            subtopicId: st.subtopic?.id,
            chapterId: st.chapter?.id,
            title: st.subtopic?.title || st.title,
            hasChapterId: !!st.chapter?.id,
            chapterName: st.chapter?.name,
            chapterObject: st.chapter
          })));
        }

        console.log('✅ Teacher content for this class:', {
          total: teacherContentData.length,
          chapters: teacherContentData.filter(c => c.type === 'chapter').length,
          subtopics: teacherContentData.filter(c => c.type === 'subtopic').length
        });
      } else {
        console.warn('⚠️ Failed to fetch teacher content:', teacherResponse.message);
      }

      // Convert course modules to content format
      const courseModulesContent = convertCourseModulesToContent(course?.modules || []);
      console.log('📚 Converted course modules:', {
        modules: course?.modules?.length || 0,
        converted: courseModulesContent.length
      });

      // Combine both: Course modules (static) + Teacher-created content (dynamic)
      const combinedContent = [...courseModulesContent, ...teacherContentData];
      
      console.log('📚 Final combined content:', {
        total: combinedContent.length,
        courseModules: courseModulesContent.length,
        teacherContent: teacherContentData.length,
        chapters: combinedContent.filter(c => c.type === 'chapter').length,
        subtopics: combinedContent.filter(c => c.type === 'subtopic').length
      });

      setTeacherContent(combinedContent);
      onCountChange?.(combinedContent.length);
      console.log('✅ Content fetch completed successfully');
    } catch (err) {
      console.error('❌ Error fetching course materials:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      setError(err.message || 'Failed to fetch materials');
      setTeacherContent([]);
      onCountChange?.(0);
    } finally {
      fetchingRef.current = false;
      setLoading(false);
      if (isManualRefresh) {
        setIsRefreshing(false);
      }
      console.log('🏁 Fetch completed, loading set to false');
    }
  }, [course, activeClassId, courseCategory, possibleSubjects, subjectKey, convertCourseModulesToContent, filterContentForClass, onCountChange]);

  useEffect(() => {
    // Only fetch when course ID actually changes, not on every render
    const currentCourseId = course?._id?.toString();
    
    console.log('🔄 CourseMaterials useEffect triggered:', {
      currentCourseId,
      hasCourse: !!course,
      courseName: course?.name
    });
    
    if (!currentCourseId) {
      console.log('⚠️ No course ID, clearing content');
      setTeacherContent([]);
      onCountChange?.(0);
      setLoading(false); // Make sure to stop loading if no course
      return;
    }
    
    console.log('🚀 Starting to fetch content for course:', currentCourseId);
    setTeacherContent([]);
    onCountChange?.(0);
    setLoading(true); // Start loading
    
    // Fetch directly without setTimeout to avoid StrictMode cancellation issues
    fetchContent(false).catch(err => {
      console.error('❌ fetchContent error in useEffect:', err);
      setLoading(false);
      setError(err.message || 'Failed to fetch materials');
    });
    
    // Safety timeout - if fetch takes too long, stop loading after 30 seconds
    const safetyTimeout = setTimeout(() => {
      if (fetchingRef.current) {
        console.warn('⚠️ Fetch taking too long, stopping loading state');
        fetchingRef.current = false;
        setLoading(false);
        setError('Request timed out. Please try refreshing.');
      }
    }, 30000);
    
    return () => {
      clearTimeout(safetyTimeout);
      // In Strict Mode, if unmounted, allow next mount to fetch
      fetchingRef.current = false;
    };
  }, [course?._id?.toString()]); // Only depend on course ID - fetchContent is stable via useCallback

  const getTypeIcon = useCallback((type) => {
    switch (type) {
      case 'pdf':
      case 'document':
        return <DocumentTextIcon className="h-5 w-5 text-red-600" />;
      case 'video':
        return <PlayCircleIcon className="h-5 w-5 text-blue-600" />;
      case 'link':
        return <LinkIcon className="h-5 w-5 text-green-600" />;
      case 'image':
        return <PhotoIcon className="h-5 w-5 text-yellow-600" />;
      case 'audio':
        return <SpeakerWaveIcon className="h-5 w-5 text-purple-600" />;
      default:
        return <DocumentTextIcon className="h-5 w-5 text-gray-600" />;
    }
  }, []);

  const getTypeColor = useCallback((type) => {
    switch (type) {
      case 'pdf':
      case 'document':
        return 'bg-red-100 text-red-800';
      case 'video':
        return 'bg-blue-100 text-blue-800';
      case 'link':
        return 'bg-green-100 text-green-800';
      case 'image':
        return 'bg-yellow-100 text-yellow-800';
      case 'audio':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  const navigate = useNavigate();

  const handleContentClick = useCallback((item) => {
    if (item.type === 'link' && item.link?.url) {
      window.open(item.link.url, '_blank');
    } else if (item.file?.url || item.file?.path) {
      const rawUrl = item.file.url || item.file.path;
      const fileUrl = rawUrl.startsWith('http') ? rawUrl : `http://localhost:5001${rawUrl}`;
      if (['pdf', 'document', 'image', 'audio', 'video'].includes(item.type)) {
        const subject = course?.category || course?.subject || course?.name || 'Study Material';
        // Open inside the inline document viewer using React Router
        navigate(`/courses/document?fileUrl=${encodeURIComponent(fileUrl)}&title=${encodeURIComponent(item.title)}&subject=${encodeURIComponent(subject)}`);
      } else {
        window.open(fileUrl, '_blank');
      }
    }
  }, [course, navigate]);

  const organizedChapters = useMemo(() => {
    const chaptersMap = new Map();
    const subtopicsMap = new Map();

    console.log('🔄 Organizing content:', {
      total: teacherContent.length,
      chapters: teacherContent.filter(c => c.type === 'chapter').length,
      subtopics: teacherContent.filter(c => c.type === 'subtopic').length,
      other: teacherContent.filter(c => c.type !== 'chapter' && c.type !== 'subtopic').length
    });

    // First pass: Create chapters and subtopics
    // This merges Course modules and teacher content using chapterId/subtopicId
    teacherContent.forEach((item) => {
      if (item.type === 'chapter') {
        // Use chapter.id if available, otherwise use _id or courseModuleId
        // Course modules don't have _id (to avoid ObjectId casting), so use courseModuleId
        const chapterId = item.chapter?.id || item.courseModuleId || (item._id ? item._id.toString() : null);
        
        if (!chapterId) {
          console.warn('⚠️ Chapter without ID:', item);
          return; // Skip chapters without valid ID
        }
        
        // If chapter already exists (from Course module), merge data
        if (chaptersMap.has(chapterId)) {
          const existing = chaptersMap.get(chapterId);
          // Update with teacher content if it has more info
          if (!existing.description && item.description) {
            existing.description = item.description;
          }
          if (item.moduleData) {
            existing.moduleData = item.moduleData;
          }
          // Update isCourseModule flag
          existing.isCourseModule = item.isCourseModule || existing.isCourseModule;
        } else {
          chaptersMap.set(chapterId, {
            id: chapterId,
            name: item.chapter?.name || item.title,
            description: item.chapter?.description || item.description || '',
            subtopics: [],
            createdAt: item.createdAt,
            moduleData: item.moduleData,
            isCourseModule: item.isCourseModule
          });
        }
      } else if (item.type === 'subtopic') {
        // Get chapter ID - try multiple ways to find it
        let chapterId = item.chapter?.id;
        
        // If no chapter.id, try to find the chapter by matching _id or courseModuleId
        if (!chapterId) {
          // Try to find a chapter that matches this subtopic's chapter reference
          const chapterItem = teacherContent.find(c => {
            if (c.type !== 'chapter') return false;
            const cId = c.chapter?.id || c.courseModuleId || (c._id ? c._id.toString() : null);
            return cId && (cId === (item.chapter?._id?.toString() || item.chapter?.toString() || item.chapter?.id));
          });
          if (chapterItem) {
            chapterId = chapterItem.chapter?.id || chapterItem.courseModuleId || (chapterItem._id ? chapterItem._id.toString() : null);
          }
        }
        
        // Use subtopic.id, courseModuleId, or _id
        const subtopicId = item.subtopic?.id || item.courseModuleId || (item._id ? item._id.toString() : null);
        
        if (!subtopicId) {
          console.warn('⚠️ Subtopic without ID:', item);
          return; // Skip subtopics without valid ID
        }
        
        if (chapterId) {
          // Ensure chapter exists (might be created in a different order)
          if (!chaptersMap.has(chapterId)) {
            // Try to find the chapter in the content list by multiple methods
            const chapterItem = teacherContent.find(c => {
              if (c.type !== 'chapter') return false;
              const cId = c.chapter?.id || c._id.toString();
              return cId === chapterId || 
                     c._id.toString() === chapterId ||
                     (item.chapter?.id && c.chapter?.id === item.chapter.id);
            });
            
            if (chapterItem) {
              const foundChapterId = chapterItem.chapter?.id || chapterItem._id.toString();
              chaptersMap.set(foundChapterId, {
                id: foundChapterId,
                name: chapterItem.chapter?.name || chapterItem.title,
                description: chapterItem.chapter?.description || chapterItem.description || '',
                subtopics: [],
                createdAt: chapterItem.createdAt,
                moduleData: chapterItem.moduleData,
                isCourseModule: chapterItem.isCourseModule
              });
              // Update chapterId to match the found chapter
              chapterId = foundChapterId;
            } else {
              // Create placeholder chapter from subtopic's chapter info
              const placeholderId = chapterId;
              chaptersMap.set(placeholderId, {
                id: placeholderId,
                name: item.chapter?.name || 'Untitled Chapter',
                description: item.chapter?.description || '',
                subtopics: [],
                createdAt: item.createdAt || new Date(),
                isCourseModule: item.isCourseModule
              });
            }
          }
          
          // If subtopic already exists (from Course module), merge data
          if (subtopicsMap.has(subtopicId)) {
            const existing = subtopicsMap.get(subtopicId);
            // Update with teacher content if it has more info
            if (!existing.description && item.description) {
              existing.description = item.description;
            }
            if (item.topicData) {
              existing.topicData = item.topicData;
            }
            existing.isCourseModule = item.isCourseModule || existing.isCourseModule;
            // Update chapterId if it changed
            if (chapterId && existing.chapterId !== chapterId) {
              existing.chapterId = chapterId;
            }
          } else {
            subtopicsMap.set(subtopicId, {
              id: subtopicId,
              title: item.subtopic?.title || item.title,
              duration: item.subtopic?.duration || item.metadata?.duration || '0 mins',
              status: item.status || 'published',
              contents: [],
              chapterId: chapterId,
              createdAt: item.createdAt || new Date(),
              topicData: item.topicData,
              isCourseModule: item.isCourseModule
            });
          }
        } else {
          // Subtopic without a chapter - add to general chapter
          console.warn('⚠️ Subtopic without chapter:', {
            subtopicId,
            title: item.subtopic?.title || item.title
          });
          const generalChapterId = 'general';
          if (!chaptersMap.has(generalChapterId)) {
            chaptersMap.set(generalChapterId, {
              id: generalChapterId,
              name: 'General',
              description: 'Materials not organized into chapters',
              subtopics: [],
              createdAt: new Date(0)
            });
          }
          if (!subtopicsMap.has(subtopicId)) {
            subtopicsMap.set(subtopicId, {
              id: subtopicId,
              title: item.subtopic?.title || item.title,
              duration: item.subtopic?.duration || item.metadata?.duration || '0 mins',
              status: item.status || 'published',
              contents: [],
              chapterId: generalChapterId,
              createdAt: item.createdAt || new Date(),
              topicData: item.topicData,
              isCourseModule: item.isCourseModule
            });
          }
        }
      }
    });

    // Second pass: Link regular content items to subtopics AND handle course module topics
    teacherContent.forEach((item) => {
      if (item.type !== 'chapter' && item.type !== 'subtopic') {
        const subtopicId = item.subtopic?.id;
        if (subtopicId && subtopicsMap.has(subtopicId)) {
          subtopicsMap.get(subtopicId).contents.push(item);
        } else {
          // Add to general chapter if no subtopic
          const generalChapterId = 'general';
          if (!chaptersMap.has(generalChapterId)) {
            chaptersMap.set(generalChapterId, {
              id: generalChapterId,
              name: 'General',
              description: 'Materials not organized into chapters',
              subtopics: [],
              createdAt: new Date(0)
            });
          }
          if (!subtopicsMap.has('general')) {
            subtopicsMap.set('general', {
              id: 'general',
              title: 'General Materials',
              duration: '',
              status: 'published',
              contents: [],
              chapterId: generalChapterId,
              createdAt: new Date(0)
            });
          }
          subtopicsMap.get('general').contents.push(item);
        }
      }
      
      // Handle course module topics with content
      if (item.type === 'subtopic' && item.isCourseModule && item.topicContent) {
        const subtopicId = item.subtopic?.id || item._id.toString();
        if (subtopicsMap.has(subtopicId)) {
          const subtopic = subtopicsMap.get(subtopicId);
          
          // Add video if exists
          if (item.topicContent.videoUrl) {
            subtopic.contents.push({
              _id: `${subtopicId}_video`,
              type: 'video',
              title: 'Video Lesson',
              description: item.description,
              link: { url: item.topicContent.videoUrl },
              createdAt: item.createdAt
            });
          }
          
          // Add notes if exists
          if (item.topicContent.notes) {
            subtopic.contents.push({
              _id: `${subtopicId}_notes`,
              type: 'pdf',
              title: 'Notes',
              description: item.topicContent.notes,
              createdAt: item.createdAt
            });
          }
          
          // Add resources as links
          if (item.topicContent.resources && item.topicContent.resources.length > 0) {
            item.topicContent.resources.forEach((resource, idx) => {
              subtopic.contents.push({
                _id: `${subtopicId}_resource_${idx}`,
                type: 'link',
                title: resource,
                link: { url: resource },
                createdAt: item.createdAt
              });
            });
          }
        }
      }
    });

    // Third pass: Link subtopics to chapters
    subtopicsMap.forEach((subtopic, subtopicId) => {
      if (subtopic.chapterId) {
        // Try to find the chapter by exact match first
        if (chaptersMap.has(subtopic.chapterId)) {
          chaptersMap.get(subtopic.chapterId).subtopics.push(subtopic);
        } else {
          // If exact match fails, try to find by _id or other methods
          let foundChapter = null;
          for (const [chapterId, chapter] of chaptersMap.entries()) {
            // Check if this chapter's ID matches the subtopic's chapterId in any way
            if (chapterId === subtopic.chapterId || 
                chapterId === subtopic.chapterId.toString() ||
                (subtopic.chapterId && chapterId.includes(subtopic.chapterId)) ||
                (subtopic.chapterId && subtopic.chapterId.includes(chapterId))) {
              foundChapter = chapter;
              break;
            }
          }
          
          if (foundChapter) {
            foundChapter.subtopics.push(subtopic);
            // Update subtopic's chapterId to match the found chapter
            subtopic.chapterId = foundChapter.id;
          } else {
            // If still not found, add to general chapter
            console.warn('⚠️ Could not find chapter for subtopic, adding to general:', {
              subtopicId,
              subtopicTitle: subtopic.title,
              chapterId: subtopic.chapterId
            });
            const generalChapterId = 'general';
            if (!chaptersMap.has(generalChapterId)) {
              chaptersMap.set(generalChapterId, {
                id: generalChapterId,
                name: 'General',
                description: 'Materials not organized into chapters',
                subtopics: [],
                createdAt: new Date(0)
              });
            }
            subtopic.chapterId = generalChapterId;
            chaptersMap.get(generalChapterId).subtopics.push(subtopic);
          }
        }
      }
    });

    // Sort chapters by creation date and subtopics within chapters
    const sortedChapters = Array.from(chaptersMap.values())
      .sort((a, b) => {
        // Put general chapter last
        if (a.id === 'general') return 1;
        if (b.id === 'general') return -1;
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      });
    
    sortedChapters.forEach(chapter => {
      chapter.subtopics.sort((a, b) => {
        const aItem = teacherContent.find(item => 
          (item.subtopic?.id || item._id.toString()) === a.id
        );
        const bItem = teacherContent.find(item => 
          (item.subtopic?.id || item._id.toString()) === b.id
        );
        return new Date(aItem?.createdAt || 0) - new Date(bItem?.createdAt || 0);
      });
    });

    console.log('✅ Organized chapters result:', {
      totalChapters: sortedChapters.length,
      chapters: sortedChapters.map(ch => ({
        id: ch.id,
        name: ch.name,
        subtopicsCount: ch.subtopics.length,
        subtopicTitles: ch.subtopics.map(st => st.title)
      }))
    });

    return sortedChapters;
  }, [teacherContent]);

  const handleRefresh = () => {
    fetchContent(true);
  };

  if (loading && !isRefreshing) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-semibold text-gray-900">Materials & Notes</h3>
          {subjectKey && (
            <p className="text-sm text-gray-500">Subject: {subjectKey}</p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50 disabled:opacity-50"
        >
          <ArrowPathIcon className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          <span>{isRefreshing ? 'Refreshing' : 'Refresh'}</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          <p className="font-medium">Unable to load materials</p>
          <p className="text-sm mt-1">{error}</p>
        </div>
      )}

      {organizedChapters.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <DocumentTextIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Materials Available</h3>
          <p className="text-gray-600">
            {course?.modules?.length > 0 
              ? 'No additional materials posted by your teacher yet. Check the Modules tab for course content.'
              : 'Your teacher hasn\'t posted any materials for this course yet.'}
          </p>
        </div>
      ) : (
        organizedChapters.map((chapter) => {
          // Check if this is a course module chapter
          const isCourseModule = teacherContent.find(c => 
            c.type === 'chapter' && (c.chapter?.id === chapter.id || c._id.toString() === chapter.id)
          )?.isCourseModule;
          
          return (
          <div key={chapter.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className={`px-6 py-4 border-b border-gray-200 ${isCourseModule ? 'bg-blue-50' : 'bg-gray-50'}`}>
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-lg font-semibold text-gray-900">{chapter.name}</h3>
                    {isCourseModule && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">
                        Course Module
                      </span>
                    )}
                  </div>
                  {chapter.description && (
                    <p className="text-sm text-gray-600 mt-1">{chapter.description}</p>
                  )}
                  <p className="text-sm text-gray-500 mt-2">
                    {chapter.subtopics.length} {chapter.subtopics.length === 1 ? 'section' : 'sections'}
                  </p>
                </div>
              </div>
            </div>
            <div className="p-6">
              {chapter.subtopics.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No materials in this chapter yet.</p>
              ) : (
                <div className="space-y-4">
                  {chapter.subtopics.map((subtopic) => {
                    // Check if this is a course module topic
                    const isCourseModuleTopic = teacherContent.find(c => 
                      c.type === 'subtopic' && (c.subtopic?.id === subtopic.id || c._id.toString() === subtopic.id)
                    )?.isCourseModule;
                    
                    // Get original topic data for progress and actions
                    const topicData = teacherContent.find(c => 
                      c.type === 'subtopic' && (c.subtopic?.id === subtopic.id || c._id.toString() === subtopic.id)
                    )?.topicData;
                    
                    const topicProgress = topicData?.progress || 0;
                    const topicId = topicData?._id || subtopic.id;
                    
                    return (
                      <div key={subtopic.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{subtopic.title}</h4>
                            {subtopic.description && (
                              <p className="text-sm text-gray-600 mt-1">{subtopic.description}</p>
                            )}
                          </div>
                          <div className="flex items-center space-x-3">
                            {subtopic.duration && (
                              <span className="text-xs text-gray-500 flex items-center">
                                <ClockIcon className="h-3 w-3 mr-1" />
                                {subtopic.duration}
                              </span>
                            )}
                            {isCourseModuleTopic && topicProgress > 0 && (
                              <span className="text-xs text-gray-600">{topicProgress}% Complete</span>
                            )}
                          </div>
                        </div>
                        
                        {/* Progress bar for course module topics */}
                        {isCourseModuleTopic && (
                          <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${topicProgress}%` }}
                            ></div>
                          </div>
                        )}
                        
                        {/* Action buttons for course module topics */}
                        {isCourseModuleTopic && navigateToResource && (
                          <div className="flex flex-wrap gap-3 mb-3">
                            <button
                              onClick={() => navigateToResource(topicId, 'video')}
                              className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors duration-200 text-sm"
                            >
                              <PlayCircleIcon className="h-4 w-4" />
                              <span>Watch</span>
                            </button>
                            <button
                              onClick={() => navigateToResource(topicId, 'notes')}
                              className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 text-sm"
                            >
                              <DocumentTextIcon className="h-4 w-4" />
                              <span>Notes</span>
                            </button>
                            <button
                              onClick={() => navigateToResource(topicId, 'doubt')}
                              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm"
                            >
                              <QuestionMarkCircleIcon className="h-4 w-4" />
                              <span>Ask Doubt</span>
                            </button>
                            <button
                              onClick={() => navigateToResource(topicId, 'quiz')}
                              className="flex items-center space-x-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors duration-200 text-sm"
                            >
                              <AcademicCapIcon className="h-4 w-4" />
                              <span>Quiz</span>
                            </button>
                          </div>
                        )}
                        
                        {/* Materials/Content */}
                        {subtopic.contents.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                            {subtopic.contents.map((item) => (
                              <div
                                key={item._id}
                                onClick={() => handleContentClick(item)}
                                className="bg-gray-50 rounded-lg p-3 border border-gray-200 hover:border-indigo-400 hover:shadow-md transition-all cursor-pointer group"
                              >
                                <div className="flex items-start space-x-2">
                                  <div className="flex-shrink-0 mt-1">
                                    {getTypeIcon(item.type)}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <h5 className="font-medium text-sm text-gray-900 truncate group-hover:text-indigo-600">
                                      {item.title}
                                    </h5>
                                    {item.description && (
                                      <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                                        {item.description}
                                      </p>
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                                        {item.type?.toUpperCase() || 'ITEM'}
                                      </span>
                                      {item.createdAt && (
                                        <span className="text-xs text-gray-400">
                                          {new Date(item.createdAt).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          !isCourseModuleTopic && (
                            <p className="text-sm text-gray-500 text-center py-2">No materials in this section yet.</p>
                          )
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          );
        })
      )}
    </div>
  );
};

export default CourseMaterials;

