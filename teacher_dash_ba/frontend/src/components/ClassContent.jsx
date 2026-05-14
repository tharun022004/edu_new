import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  ChevronDown,
  ChevronRight,
  Play, 
  FileText, 
  Brain, 
  Edit3, 
  Trash2, 
  Upload, 
  Eye, 
  Download, 
  Clock, 
  Users, 
  BarChart3, 
  BookOpen, 
  Video, 
  HelpCircle, 
  CheckCircle, 
  X, 
  Save,
  MoreHorizontal,
  TrendingUp,
  Target,
  Zap,
  Image,
  Music,
  Link as LinkIcon,
  FileImage,
  Headphones,
  Monitor,
  PenTool,
  Search,
  Filter,
  FolderOpen,
  AlertCircle,
  Loader
} from 'lucide-react';
import apiService from '../services/api';

const ClassContent = ({ classId, classData }) => {
  const navigate = useNavigate();
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(false);
  const [showClassSelectModal, setShowClassSelectModal] = useState(!classId);

  useEffect(() => {
    if (!classId) {
      const fetchClasses = async () => {
        setLoadingClasses(true);
        try {
          const response = await apiService.getClasses();
          if (response.data) {
            setTeacherClasses(response.data);
          }
        } catch (error) {
          console.error('Error fetching classes:', error);
        } finally {
          setLoadingClasses(false);
        }
      };
      fetchClasses();
    }
  }, [classId]);

  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState(null);
  const [expandedSubtopics, setExpandedSubtopics] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedSubtopic, setSelectedSubtopic] = useState(null);
  const [selectedContentType, setSelectedContentType] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [linkUrl, setLinkUrl] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddChapterModal, setShowAddChapterModal] = useState(false);
  const [showAddSubtopicModal, setShowAddSubtopicModal] = useState(false);
  const [newChapter, setNewChapter] = useState({ name: '', description: '' });
  const [newSubtopic, setNewSubtopic] = useState({ title: '', duration: '' });
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(!!classId);
  const [error, setError] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Organize content by chapters and subtopics
  const organizeContent = (contentList) => {
    const chaptersMap = new Map();
    const subtopicsMap = new Map();
    
    // First pass: Create chapters and subtopics
    contentList.forEach(item => {
      if (item.type === 'chapter') {
        const chapterId = item.chapter?.id || (item._id ? item._id.toString() : undefined);
        chaptersMap.set(chapterId, {
          id: chapterId,
          name: item.chapter?.name || item.title,
          description: item.chapter?.description || item.description || '',
          subtopics: [],
          createdAt: item.createdAt
        });
      } else if (item.type === 'subtopic') {
        const chapterId = item.chapter?.id;
        const subtopicId = item.subtopic?.id || (item._id ? item._id.toString() : undefined);
        
        if (chapterId) {
          // Ensure chapter exists (might be created in a different order)
          if (!chaptersMap.has(chapterId)) {
            // Try to find the chapter in the content list
            const chapterItem = contentList.find(c => 
              c.type === 'chapter' && (c.chapter?.id === chapterId || (c._id && c._id.toString() === chapterId))
            );
            if (chapterItem) {
              chaptersMap.set(chapterId, {
                id: chapterId,
                name: chapterItem.chapter?.name || chapterItem.title,
                description: chapterItem.chapter?.description || chapterItem.description || '',
                subtopics: [],
                createdAt: chapterItem.createdAt
              });
            } else {
              // Create placeholder chapter
              chaptersMap.set(chapterId, {
                id: chapterId,
                name: item.chapter?.name || 'Untitled Chapter',
                description: item.chapter?.description || '',
                subtopics: [],
                createdAt: item.createdAt
              });
            }
          }
          
          subtopicsMap.set(subtopicId, {
            id: subtopicId,
            title: item.subtopic?.title || item.title,
            duration: item.subtopic?.duration || item.metadata?.duration || '0 mins',
            status: item.status,
            contents: [],
            chapterId: chapterId
          });
        }
      }
    });

    // Second pass: Link regular content items to subtopics
    contentList.forEach(item => {
      if (item.type !== 'chapter' && item.type !== 'subtopic') {
        const subtopicId = item.subtopic?.id;
        if (subtopicId && subtopicsMap.has(subtopicId)) {
          subtopicsMap.get(subtopicId).contents.push(item);
        }
      }
    });

    // Third pass: Link subtopics to chapters
    subtopicsMap.forEach((subtopic, subtopicId) => {
      if (subtopic.chapterId && chaptersMap.has(subtopic.chapterId)) {
        chaptersMap.get(subtopic.chapterId).subtopics.push(subtopic);
      }
    });

    // Sort chapters by creation date and subtopics within chapters
    const sortedChapters = Array.from(chaptersMap.values())
      .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    
    sortedChapters.forEach(chapter => {
      chapter.subtopics.sort((a, b) => {
        const aItem = contentList.find(item => {
          if (!item) return false;
          const itemSubtopicId = item.subtopic?.id || (item._id ? item._id.toString() : undefined);
          return itemSubtopicId === a.id;
        });

        const bItem = contentList.find(item => {
          if (!item) return false;
          const itemSubtopicId = item.subtopic?.id || (item._id ? item._id.toString() : undefined);
          return itemSubtopicId === b.id;
        });

        return new Date(aItem?.createdAt || 0) - new Date(bItem?.createdAt || 0);
      });
    });

    console.log('📚 Organized chapters:', {
      total: sortedChapters.length,
      chapterNames: sortedChapters.map(ch => ch.name),
      chaptersWithSubtopics: sortedChapters.map(ch => ({
        name: ch.name,
        subtopicsCount: ch.subtopics.length
      }))
    });
    
    return sortedChapters;
  };

  useEffect(() => {
    if (!classId) return;
    if (classData?.subject) {
      setSelectedSubject(classData.subject);
    }
  }, [classId, classData?.subject]);

  useEffect(() => {
    if (classId) {
      fetchContent();
    }
  }, [classId, selectedSubject, classData?.subject]);

  const fetchContent = async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        status: 'all', // Show all statuses (published and draft) for teacher
        includeShared: 'true'
      });

      if (classId) {
        params.append('class', classId);
      }

      const subjectFilter = classData?.subject || selectedSubject;
      if (subjectFilter) {
        params.append('subject', subjectFilter);
      }

      const response = await apiService.getContent(`?${params.toString()}`);
      const contentList = response.data || [];
      
      const chapters = contentList.filter(c => c.type === 'chapter');
      const subtopics = contentList.filter(c => c.type === 'subtopic');
      
      console.log('📚 Fetched content (Teacher):', {
        total: contentList.length,
        chapters: chapters.length,
        subtopics: subtopics.length,
        other: contentList.filter(c => c.type !== 'chapter' && c.type !== 'subtopic').length
      });
      
      // Log detailed chapter information
      if (chapters.length > 0) {
        console.log('📚 Chapters (Teacher):', chapters.map(ch => ({
          _id: ch._id?.toString() || ch._id,
          chapterId: ch.chapter?.id,
          name: ch.chapter?.name || ch.title,
          hasChapterId: !!ch.chapter?.id,
          chapterObject: ch.chapter
        })));
      }
      
      // Log detailed subtopic information
      if (subtopics.length > 0) {
        console.log('📝 Subtopics (Teacher):', subtopics.map(st => ({
          _id: st._id?.toString() || st._id,
          subtopicId: st.subtopic?.id,
          chapterId: st.chapter?.id,
          title: st.subtopic?.title || st.title,
          hasChapterId: !!st.chapter?.id,
          chapterName: st.chapter?.name,
          chapterObject: st.chapter
        })));
      }
      
      setContent(contentList);
    } catch (err) {
      console.error('Error fetching content:', err);
      setError(err.message || 'Failed to load content');
    } finally {
      setLoading(false);
    }
  };

  const handleAddChapter = async (e) => {
    e.preventDefault();
    
    // Validate required fields
    if (!newChapter.name || newChapter.name.trim().length < 2) {
      alert('Chapter name must be at least 2 characters long');
      return;
    }

    const subject = classData?.subject || selectedSubject;
    if (!subject || subject.trim() === '') {
      alert('Subject is required. Please ensure the class has a subject assigned.');
      return;
    }

    if (!classId) {
      alert('Class ID is missing');
      return;
    }

    try {
      setUploading(true);
      console.log('Creating chapter with data:', {
        classId: classId,
        name: newChapter.name.trim(),
        description: newChapter.description || ''
      });

      // Use the dedicated chapters endpoint instead of createContent
      const response = await apiService.addChapter({
        classId: classId,
        name: newChapter.name.trim(),
        description: newChapter.description || ''
      });
      
      console.log('Chapter created successfully:', response);
      await fetchContent();
      setShowAddChapterModal(false);
      setNewChapter({ name: '', description: '' });
      if (response.data?.chapter?.id) {
        setSelectedChapter(response.data.chapter.id);
      }
    } catch (err) {
      console.error('Error creating chapter:', err);
      const errorMessage = err.message || err.errors?.map(e => e.msg).join(', ') || 'Failed to create chapter';
      alert(`Error: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleAddSubtopic = async (e) => {
    e.preventDefault();
    if (!selectedChapter) {
      alert('Please select a chapter first');
      return;
    }

    if (selectedChapter === 'general') {
      alert('Please select a specific chapter before adding a subtopic.');
      return;
    }

    if (!newSubtopic.title || newSubtopic.title.trim().length < 2) {
      alert('Subtopic title must be at least 2 characters long');
      return;
    }

    if (!classId) {
      alert('Class ID is missing');
      return;
    }

    try {
      setUploading(true);
      console.log('Creating subtopic with data:', {
        classId: classId,
        chapterId: selectedChapter,
        title: newSubtopic.title.trim(),
        duration: newSubtopic.duration || ''
      });

      // Use the dedicated subtopics endpoint
      const response = await apiService.addSubtopic({
        classId: classId,
        chapterId: selectedChapter,
        title: newSubtopic.title.trim(),
        duration: newSubtopic.duration || ''
      });

      console.log('Subtopic created successfully:', response);
      await fetchContent();
      setShowAddSubtopicModal(false);
      setNewSubtopic({ title: '', duration: '' });
    } catch (err) {
      console.error('Error creating subtopic:', err);
      let errorMessage = 'Failed to create subtopic';
      
      if (err.message) {
        errorMessage = err.message;
      } else if (err.errors && Array.isArray(err.errors)) {
        errorMessage = err.errors.map(e => e.msg || e).join(', ');
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      // Add hint if available
      if (err.hint) {
        errorMessage += `\n\nHint: ${err.hint}`;
      }
      
      alert(`Error: ${errorMessage}`);
    } finally {
      setUploading(false);
    }
  };

  const handleContentTypeSelect = (contentType) => {
    setSelectedContentType(contentType);
    setSelectedFile(null);
    setLinkUrl('');
    
    // For link type, show URL input immediately
    if (contentType === 'link') {
      // Will be handled in the modal
    }
    // For quiz type, allow creation without file
    else if (contentType === 'quiz') {
      // Will be handled in the modal
    }
    // For file-based types (pdf, image, video, audio), require file selection
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleUploadContent = async () => {
    if (!selectedSubtopic || !selectedContentType) {
      alert('Please select a content type');
      return;
    }

    // For file-based content types, require a file
    const fileBasedTypes = ['pdf', 'image', 'video', 'audio', 'document'];
    if (fileBasedTypes.includes(selectedContentType) && !selectedFile) {
      alert(`Please select a file to upload for ${selectedContentType.toUpperCase()}`);
      return;
    }

    // For link type, require URL
    if (selectedContentType === 'link' && !linkUrl.trim()) {
      alert('Please enter a URL');
      return;
    }

    try {
      setUploading(true);

      // Find the current chapter and subtopic to get their IDs (defensive for empty state)
      const chapters = organizedChapters || [];
      const currentChapterData = selectedChapter ? chapters.find(ch => ch && ch.id === selectedChapter) : null;
      const currentSubtopicData = currentChapterData?.subtopics?.find(st => st && st.id === selectedSubtopic);
      
      // Get chapter ID from the subtopic's chapterId or from selectedChapter
      const chapterId = currentSubtopicData?.chapterId || selectedChapter || (currentChapterData?.id);

      const baseContentData = {
        type: selectedContentType,
        class: classId,
        subject: classData?.subject || selectedSubject,
        subtopic: {
          id: selectedSubtopic
        },
        status: 'published',
        visibility: 'class-only'
      };

      // Add chapter reference if available
      if (chapterId) {
        const chapterItem = content.find(c => 
          c.type === 'chapter' && (c.chapter?.id === chapterId || c._id?.toString() === chapterId)
        );
        if (chapterItem) {
          baseContentData.chapter = {
            id: chapterItem.chapter?.id || chapterId,
            name: chapterItem.chapter?.name || chapterItem.title
          };
        } else {
          // Fallback: use chapterId directly
          baseContentData.chapter = {
            id: chapterId
          };
        }
      }

      if (selectedContentType === 'link') {
        baseContentData.link = { url: linkUrl.trim(), title: linkUrl.trim() };
        baseContentData.title = linkUrl.trim();
      } else if (selectedContentType === 'quiz') {
        // For quiz, create with a default title - user can edit later
        baseContentData.title = 'New Quiz';
        baseContentData.description = 'Click to edit quiz details';
      } else if (selectedFile) {
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadResponse = await apiService.uploadContentFile(formData);
        const uploadedFile = uploadResponse.data;

        baseContentData.file = uploadedFile;
        baseContentData.title = uploadedFile.originalName || selectedFile.name;
      } else {
        // This shouldn't happen due to validation above, but fallback
        alert('Please select a file to upload');
        return;
      }

      await apiService.createContent(baseContentData);
      await fetchContent();
      
      // Reset state
      setShowUploadModal(false);
      setSelectedContentType(null);
      setSelectedFile(null);
      setLinkUrl('');
    } catch (err) {
      console.error('Error uploading content:', err);
      const msg = err.message || 'Failed to upload content';
      const hint = msg === 'Failed to fetch' 
        ? 'Check that the teacher backend is running on port 5001 and CORS is enabled.'
        : '';
      alert(msg + (hint ? '\n\n' + hint : ''));
    } finally {
      setUploading(false);
    }
  };

  const resetUploadModal = () => {
    setShowUploadModal(false);
    setSelectedContentType(null);
    setSelectedFile(null);
    setLinkUrl('');
  };

  const handleDeleteContent = async (contentId) => {
    if (!confirm('Are you sure you want to delete this content?')) return;
    try {
      await apiService.deleteContent(contentId);
      await fetchContent();
    } catch (err) {
      console.error('Error deleting content:', err);
      alert(err.message || 'Failed to delete content');
    }
  };

  const handlePublishContent = async (contentId, currentStatus) => {
    try {
      const newStatus = currentStatus === 'published' ? 'draft' : 'published';
      await apiService.updateContent(contentId, { status: newStatus });
      await fetchContent();
    } catch (err) {
      console.error('Error updating content:', err);
      alert(err.message || 'Failed to update content');
    }
  };

  const uploadOptions = [
    {
      id: 'video',
      name: 'Upload Video',
      description: 'MP4, AVI, MOV files',
      icon: Video,
      color: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-50',
      textColor: 'text-red-700'
    },
    {
      id: 'pdf',
      name: 'Upload Notes/PDF',
      description: 'PDF, DOC, DOCX files',
      icon: FileText,
      color: 'from-blue-500 to-indigo-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-700'
    },
    {
      id: 'quiz',
      name: 'Create Quiz',
      description: 'Interactive questions',
      icon: HelpCircle,
      color: 'from-purple-500 to-violet-500',
      bgColor: 'bg-purple-50',
      textColor: 'text-purple-700'
    },
    {
      id: 'link',
      name: 'Add Link',
      description: 'External resources',
      icon: LinkIcon,
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-700'
    },
    {
      id: 'image',
      name: 'Upload Images',
      description: 'JPG, PNG, GIF files',
      icon: Image,
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-700'
    },
    {
      id: 'audio',
      name: 'Upload Audio',
      description: 'MP3, WAV files',
      icon: Headphones,
      color: 'from-teal-500 to-cyan-500',
      bgColor: 'bg-teal-50',
      textColor: 'text-teal-700'
    }
  ];

  const organizedChapters = organizeContent(content);
  
  // Filter chapters by search term
  const filteredChapters = useMemo(() => {
    if (!searchTerm.trim()) return organizedChapters;
    const searchLower = searchTerm.toLowerCase();
    return organizedChapters.filter(chapter => 
      chapter.name.toLowerCase().includes(searchLower) ||
      chapter.description.toLowerCase().includes(searchLower)
    );
  }, [organizedChapters, searchTerm]);
  
  // Auto-select first chapter if none selected or selected chapter doesn't exist
  useEffect(() => {
    if (organizedChapters.length > 0 && (!selectedChapter || !organizedChapters.find(ch => ch.id === selectedChapter))) {
      setSelectedChapter(organizedChapters[0].id);
    }
  }, [organizedChapters, selectedChapter]);
  
  const currentChapter = organizedChapters.find(ch => ch.id === selectedChapter) || organizedChapters[0];

  const toggleSubtopic = (subtopicId) => {
    setExpandedSubtopics(prev => 
      prev.includes(subtopicId) 
        ? prev.filter(id => id !== subtopicId)
        : [...prev, subtopicId]
    );
  };

  const openUploadModal = (subtopicId) => {
    setSelectedSubtopic(subtopicId);
    setSelectedContentType(null);
    setSelectedFile(null);
    setLinkUrl('');
    setShowUploadModal(true);
  };

  const getContentIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="w-4 h-4 text-red-600" />;
      case 'pdf': return <FileText className="w-4 h-4 text-blue-600" />;
      case 'quiz': return <HelpCircle className="w-4 h-4 text-purple-600" />;
      case 'link': return <LinkIcon className="w-4 h-4 text-green-600" />;
      case 'image': return <Image className="w-4 h-4 text-yellow-600" />;
      case 'audio': return <Headphones className="w-4 h-4 text-teal-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getContentColor = (type) => {
    switch (type) {
      case 'video': return 'bg-red-50 border-red-200';
      case 'pdf': return 'bg-blue-50 border-blue-200';
      case 'quiz': return 'bg-purple-50 border-purple-200';
      case 'link': return 'bg-green-50 border-green-200';
      case 'image': return 'bg-yellow-50 border-yellow-200';
      case 'audio': return 'bg-teal-50 border-teal-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  // If no classId is provided (e.g. when accessed from the top-level `/content` route),
  // show a friendly message instead of an infinite loading state.
  if (!classId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 max-w-md text-center">
          <BookOpen className="w-16 h-16 text-indigo-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Select a Class</h2>
          <p className="text-gray-600 mb-6">
            Please select a class to view and manage its content.
          </p>
          <button
            onClick={() => setShowClassSelectModal(true)}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all duration-200"
          >
            Select Class
          </button>
        </div>

        {/* Class Selection Modal */}
        {showClassSelectModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-8 w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Select a Class</h3>
                <button
                  onClick={() => setShowClassSelectModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {loadingClasses ? (
                <div className="flex-1 flex items-center justify-center py-12">
                  <Loader className="w-10 h-10 text-indigo-600 animate-spin" />
                </div>
              ) : teacherClasses.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600">No classes found. Create one first.</p>
                </div>
              ) : (
                <div className="flex-1 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4">
                  {teacherClasses.map((cls) => (
                    <button
                      key={cls._id}
                      onClick={() => navigate(`/classes/${cls._id}/content`)}
                      className="text-left p-4 rounded-xl border border-gray-200 hover:border-indigo-500 hover:shadow-md transition-all duration-200 group"
                    >
                      <h4 className="text-lg font-bold text-gray-900 group-hover:text-indigo-600 mb-1">{cls.name}</h4>
                      <p className="text-sm text-gray-500">{cls.subject} • {cls.students?.length || cls.studentCount || 0} Students</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="text-center bg-white rounded-2xl p-8 max-w-md shadow-xl">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Content</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={fetchContent}
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all duration-200"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex h-screen">
        {/* Sidebar */}
        <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
          {/* Sidebar Header */}
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Content Library</h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Subject Selection */}
          <div className="p-4 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Subject</h3>
            <div className="text-sm font-medium text-blue-700 bg-blue-50 p-3 rounded-lg border border-blue-200">
              {classData?.subject || selectedSubject || 'No Subject'}
            </div>
          </div>

          {/* Chapter Selection */}
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Chapters</h3>
            {filteredChapters.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p className="text-sm">
                  {organizedChapters.length === 0 
                    ? 'No chapters yet' 
                    : 'No chapters match your search'}
                </p>
                {organizedChapters.length === 0 && (
                  <button
                    onClick={() => setShowAddChapterModal(true)}
                    className="mt-4 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Add First Chapter
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredChapters.map((chapter) => (
                  <button
                    key={chapter.id}
                    onClick={() => setSelectedChapter(chapter.id)}
                    className={`w-full text-left p-3 rounded-lg transition-all duration-200 ${
                      selectedChapter === chapter.id
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    <div className="font-medium">{chapter.name}</div>
                    <div className="text-xs text-gray-500 mt-1">{chapter.description}</div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        {chapter.subtopics.length} subtopics
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-8">
            {!currentChapter && organizedChapters.length === 0 ? (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-900 mb-2">No Content Yet</h2>
                <p className="text-gray-600 mb-6">Get started by creating your first chapter</p>
                <button
                  onClick={() => setShowAddChapterModal(true)}
                  className="bg-emerald-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center space-x-2 mx-auto"
                >
                  <Plus className="w-5 h-5" />
                  <span>Add First Chapter</span>
                </button>
              </div>
            ) : currentChapter ? (
              <>
                {/* Chapter Header */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-3xl font-bold text-gray-900 mb-2">{currentChapter.name}</h1>
                      <p className="text-gray-600">{currentChapter.description}</p>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {currentChapter.subtopics.reduce((sum, st) => sum + st.contents.length, 0)}
                        </div>
                        <div className="text-sm text-gray-500">Total Items</div>
                      </div>
                      <button 
                        onClick={() => setShowAddChapterModal(true)}
                        className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-colors flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Chapter</span>
                      </button>
                      <button 
                        onClick={() => setShowAddSubtopicModal(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2">
                        <Plus className="w-4 h-4" />
                        <span>Add Subtopic</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Subtopics */}
                <div className="space-y-4">
                  {currentChapter.subtopics.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
                      <p className="text-gray-600 mb-4">No subtopics yet. Add one to get started!</p>
                      <button
                        onClick={() => setShowAddSubtopicModal(true)}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-blue-700 transition-colors"
                      >
                        Add Subtopic
                      </button>
                    </div>
                  ) : (
                    currentChapter.subtopics.map((subtopic) => (
                      <div key={subtopic.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        {/* Subtopic Header */}
                        <div 
                          className="p-6 cursor-pointer hover:bg-gray-50 transition-colors duration-200"
                          onClick={() => toggleSubtopic(subtopic.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="flex items-center space-x-2">
                                {expandedSubtopics.includes(subtopic.id) ? (
                                  <ChevronDown className="w-5 h-5 text-gray-500" />
                                ) : (
                                  <ChevronRight className="w-5 h-5 text-gray-500" />
                                )}
                                <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600">
                                  <BookOpen className="w-5 h-5 text-white" />
                                </div>
                              </div>
                              <div>
                                <h3 className="text-xl font-bold text-gray-900">{subtopic.title}</h3>
                                <div className="flex items-center space-x-4 mt-1">
                                  <div className="flex items-center space-x-1 text-sm text-gray-600">
                                    <Clock className="w-4 h-4" />
                                    <span>{subtopic.duration}</span>
                                  </div>
                                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                    subtopic.status === 'published' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-gray-100 text-gray-800'
                                  }`}>
                                    {subtopic.status === 'published' ? '✅ Published' : '⏳ Draft'}
                                  </span>
                                  <span className="text-sm text-gray-500">
                                    {subtopic.contents.length} items
                                  </span>
                                </div>
                              </div>
                            </div>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                openUploadModal(subtopic.id);
                              }}
                              className="bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-4 py-2 rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-200 hover:scale-105 flex items-center space-x-2"
                            >
                              <Upload className="w-5 h-5" />
                              <span className="font-medium">Upload</span>
                            </button>
                          </div>
                        </div>

                        {/* Subtopic Content */}
                        {expandedSubtopics.includes(subtopic.id) && (
                          <div className="border-t border-gray-200 p-6 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                              {subtopic.contents.map((contentItem) => (
                                <div key={contentItem._id} className={`p-4 rounded-xl border-2 ${getContentColor(contentItem.type)} hover:shadow-md transition-all duration-200`}>
                                  <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-2">
                                      {getContentIcon(contentItem.type)}
                                      <span className="font-medium text-gray-900 text-sm">{contentItem.type.toUpperCase()}</span>
                                    </div>
                                    <div className="flex items-center space-x-1">
                                      <button 
                                        onClick={() => handlePublishContent(contentItem._id, contentItem.status)}
                                        className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                        title={contentItem.status === 'published' ? 'Unpublish' : 'Publish'}
                                      >
                                        {contentItem.status === 'published' ? <CheckCircle className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                      </button>
                                      <button 
                                        onClick={() => handleDeleteContent(contentItem._id)}
                                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    </div>
                                  </div>
                                  <h4 className="font-semibold text-gray-900 mb-2">{contentItem.title}</h4>
                                  <div className="space-y-1 text-xs text-gray-600">
                                    {contentItem.stats?.views > 0 && <div>👁 {contentItem.stats.views} views</div>}
                                    {contentItem.stats?.downloads > 0 && <div>⬇ {contentItem.stats.downloads} downloads</div>}
                                    {contentItem.metadata?.fileSize && <div>📦 {contentItem.metadata.fileSize}</div>}
                                    {contentItem.link?.url && <div>🔗 {contentItem.link.url}</div>}
                                  </div>
                                </div>
                              ))}
                              
                              {/* Add Content Card */}
                              <button
                                onClick={() => openUploadModal(subtopic.id)}
                                className="p-4 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 flex flex-col items-center justify-center space-y-2 text-gray-500 hover:text-blue-600"
                              >
                                <Plus className="w-6 h-6" />
                                <span className="font-medium">Add Content</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-4xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">
                  {selectedContentType ? `Upload ${selectedContentType.toUpperCase()}` : 'Choose Upload Type'}
                </h3>
                <p className="text-gray-600 mt-1">
                  {selectedContentType 
                    ? 'Select a file or provide details' 
                    : "Select what you'd like to add to this subtopic"}
                </p>
              </div>
              <button 
                onClick={resetUploadModal}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {!selectedContentType ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {uploadOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <div
                      key={option.id}
                      className={`${option.bgColor} rounded-2xl p-6 border-2 border-transparent hover:border-gray-200 cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-lg group`}
                      onClick={() => handleContentTypeSelect(option.id)}
                    >
                      <div className={`w-16 h-16 bg-gradient-to-r ${option.color} rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                        <Icon className="w-8 h-8 text-white" />
                      </div>
                      <h4 className={`font-bold text-lg ${option.textColor} mb-2`}>{option.name}</h4>
                      <p className="text-sm text-gray-600">{option.description}</p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-6">
                {/* File-based content types */}
                {['pdf', 'image', 'video', 'audio', 'document'].includes(selectedContentType) && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select File to Upload
                    </label>
                    <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-colors">
                      <input
                        type="file"
                        onChange={handleFileSelect}
                        accept={
                          selectedContentType === 'pdf' ? '.pdf,.doc,.docx' :
                          selectedContentType === 'image' ? '.jpg,.jpeg,.png,.gif' :
                          selectedContentType === 'video' ? '.mp4,.avi,.mov' :
                          selectedContentType === 'audio' ? '.mp3,.wav' :
                          '.pdf,.doc,.docx,.ppt,.pptx'
                        }
                        className="hidden"
                        id="file-upload"
                        disabled={uploading}
                      />
                      <label
                        htmlFor="file-upload"
                        className="cursor-pointer flex flex-col items-center"
                      >
                        <Upload className="w-12 h-12 text-gray-400 mb-4" />
                        {selectedFile ? (
                          <div>
                            <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFile(null);
                                document.getElementById('file-upload').value = '';
                              }}
                              className="mt-2 text-sm text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-1">
                              Click to select file
                            </p>
                            <p className="text-xs text-gray-500">
                              {selectedContentType === 'pdf' && 'PDF, DOC, DOCX files'}
                              {selectedContentType === 'image' && 'JPG, PNG, GIF files'}
                              {selectedContentType === 'video' && 'MP4, AVI, MOV files'}
                              {selectedContentType === 'audio' && 'MP3, WAV files'}
                              {selectedContentType === 'document' && 'PDF, DOC, PPT files'}
                            </p>
                          </div>
                        )}
                      </label>
                    </div>
                  </div>
                )}

                {/* Link type */}
                {selectedContentType === 'link' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Enter URL
                    </label>
                    <input
                      type="url"
                      value={linkUrl}
                      onChange={(e) => setLinkUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={uploading}
                    />
                  </div>
                )}

                {/* Quiz type */}
                {selectedContentType === 'quiz' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <p className="text-sm text-blue-800">
                      A quiz will be created. You can add questions and configure it after creation.
                    </p>
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex space-x-3 pt-4">
                  <button
                    onClick={resetUploadModal}
                    className="flex-1 px-4 py-3 text-gray-600 hover:text-gray-800 transition-colors border border-gray-300 rounded-xl"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUploadContent}
                    disabled={
                      uploading ||
                      (['pdf', 'image', 'video', 'audio', 'document'].includes(selectedContentType) && !selectedFile) ||
                      (selectedContentType === 'link' && !linkUrl.trim())
                    }
                    className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                  >
                    {uploading ? (
                      <>
                        <Loader className="w-5 h-5 animate-spin" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span>Upload</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Chapter Modal */}
      {showAddChapterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add New Chapter</h3>
              <button 
                onClick={() => setShowAddChapterModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddChapter} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Chapter Name</label>
                <input
                  type="text"
                  value={newChapter.name}
                  onChange={(e) => setNewChapter({...newChapter, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Linear Equations"
                  required
                  disabled={uploading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newChapter.description}
                  onChange={(e) => setNewChapter({...newChapter, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Brief description of the chapter"
                  required
                  disabled={uploading}
                />
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddChapterModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-emerald-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? 'Creating...' : 'Add Chapter'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Subtopic Modal */}
      {showAddSubtopicModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add New Subtopic</h3>
              <button 
                onClick={() => setShowAddSubtopicModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddSubtopic} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subtopic Title</label>
                <input
                  type="text"
                  value={newSubtopic.title}
                  onChange={(e) => setNewSubtopic({...newSubtopic, title: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Introduction to Linear Equations"
                  required
                  disabled={uploading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Duration</label>
                <input
                  type="text"
                  value={newSubtopic.duration}
                  onChange={(e) => setNewSubtopic({...newSubtopic, duration: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., 30 mins"
                  required
                  disabled={uploading}
                />
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddSubtopicModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-blue-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={uploading}
                >
                  {uploading ? 'Creating...' : 'Add Subtopic'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassContent;
