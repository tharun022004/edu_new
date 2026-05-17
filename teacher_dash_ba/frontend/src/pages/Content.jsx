import React, { useEffect, useMemo, useState } from 'react';
import { Upload, FileText, Video, Link as LinkIcon, Search, Filter, Download, Eye, CheckCircle, XCircle, RefreshCw, Trash2, Database } from 'lucide-react';
import apiService from '../services/api';

const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

const Content = () => {
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [uploadingAiId, setUploadingAiId] = useState(null);
  const [content, setContent] = useState([]);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [loadingKnowledge, setLoadingKnowledge] = useState(false);
  const [notice, setNotice] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewItem, setPreviewItem] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    title: '',
    type: 'pdf',
    class: '',
    classId: '',
    subject: '',
    chapter: '',
    topic: '',
    description: '',
    file: null,
    addToAi: true,
  });
  

  const showNotice = (message, type = 'success') => {
    setNotice({ message, type });
    setTimeout(() => setNotice(null), 3500);
  };

  const handleCloseUpload = () => {
    setShowUploadModal(false);
    setNewItem({ title: '', type: 'pdf', class: '', classId: '', subject: '', chapter: '', topic: '', description: '', file: null, addToAi: true });
  };

  const resolveFileUrl = (candidate) => {
    if (!candidate) return '';
    if (candidate.startsWith('http://') || candidate.startsWith('https://') || candidate.startsWith('blob:') || candidate.startsWith('data:')) {
      return candidate;
    }
    const normalizedPath = candidate.startsWith('/') ? candidate : `/${candidate}`;
    return `http://localhost:5001${normalizedPath.replace(/\\/g, '/')}`;
  };

  const fetchKnowledge = async () => {
    setLoadingKnowledge(true);
    try {
      const response = await fetch(`${AI_BASE_URL}/knowledge`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || 'Unable to load AI knowledge');
      setKnowledgeItems(data.items || []);
    } catch (error) {
      showNotice(error.message || 'AI knowledge list is unavailable', 'error');
    } finally {
      setLoadingKnowledge(false);
    }
  };

  const handleSubmitUpload = async (e, forceAddToAi = false) => {
    if (e && e.preventDefault) e.preventDefault();
    
    // If file is selected, upload it first
    if (newItem.file) {
      try {
        const formData = new FormData();
        formData.append('file', newItem.file);
        formData.append('title', newItem.title || newItem.file.name);
        formData.append('subject', newItem.subject);
        formData.append('chapter', newItem.chapter);
        formData.append('topic', newItem.topic);
        formData.append('class_id', newItem.classId || '');
        formData.append('addToAi', newItem.addToAi ? 'true' : 'false');

        // forceAddToAi overrides the checkbox
        if (forceAddToAi) formData.set('addToAi', 'true');
        const uploadData = await apiService.uploadContentFile(formData);

        // File uploaded successfully
        const message = uploadData.data?.textExtracted 
          ? (uploadData.data?.aiIndexed
              ? `✅ File uploaded and added to AI Knowledge Base!`
              : `✅ File uploaded. PDF text was extracted, but AI indexing did not complete.`)
          : `✅ File uploaded successfully`;
        
        showNotice(message);
        
        // Add to local content list with extracted text
        const id = (content.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1;
        // Build item and include uploaded file url/path so View works
        const fileUrl = uploadData.data?.url || uploadData.data?.path || null;
        const item = {
          id,
          title: newItem.title || newItem.file.name,
          type: newItem.type,
          class: newItem.class || 'Unassigned',
          classId: newItem.classId || '',
          subject: newItem.subject,
          chapter: newItem.chapter,
          topic: newItem.topic,
          size: `${(newItem.file.size / 1024 / 1024).toFixed(2)} MB`,
          uploadDate: new Date().toISOString(),
          downloads: 0,
          views: 0,
          description: newItem.description,
          extractedText: uploadData.data?.extractedText || null,
          textExtracted: uploadData.data?.textExtracted || false,
          aiIndexed: uploadData.data?.aiIndexed || false,
          chunksStored: uploadData.data?.chunksStored || 0,
          url: fileUrl,
        };
        
        setContent(prev => [item, ...prev]);
        handleCloseUpload();
        
        // Try to create a Content record on the backend so material is added for students
        try {
          const payload = {
            title: item.title,
            type: item.type === 'pdf' ? 'document' : item.type,
            class: item.classId || '',
            subject: item.subject,
            chapter: item.chapter,
            topic: item.topic,
            description: item.description,
            extractedText: uploadData.data?.extractedText || '',
            addToAi: false,
            // Persist file metadata to `file` so backend stores it in Content.file
            file: fileUrl ? {
              filename: uploadData.data?.filename,
              originalName: uploadData.data?.originalName,
              mimetype: uploadData.data?.mimetype,
              size: uploadData.data?.size,
              path: fileUrl,
              url: fileUrl
            } : undefined
          };

          const created = await apiService.createContent(payload);
          if (created && created.data) {
            const createdUrl = created.data?.file?.url || created.data?.file?.path || fileUrl;
            setContent(prev => prev.map(p => p.id === id ? { ...p, dbId: created.data._id, aiIndex: created.data.aiIndex, url: createdUrl } : p));
          }
        } catch (err) {
          console.warn('Failed to create content on backend:', err.message || err);
        }
        await fetchKnowledge();
      } catch (error) {
        console.error('Upload error:', error);
        showNotice(error.retryable ? `${error.message} Use Retry AI after adding clearer text.` : `Upload failed: ${error.message}`, 'error');
      }
    } else {
      // No file selected - create note/description content.
      const id = (content.reduce((m, c) => Math.max(m, c.id), 0) || 0) + 1;
      try {
        const created = await apiService.createContent({
          title: newItem.title || `Untitled ${id}`,
          type: newItem.type === 'pdf' ? 'document' : newItem.type,
          class: newItem.classId || '',
          subject: newItem.subject,
          chapter: newItem.chapter,
          topic: newItem.topic,
          description: newItem.description,
          addToAi: newItem.addToAi
        });
        const item = {
        id,
        dbId: created.data?._id,
        title: created.data?.title || newItem.title || `Untitled ${id}`,
        type: newItem.type,
        class: newItem.class || 'Unassigned',
        classId: newItem.classId || '',
        subject: newItem.subject,
        chapter: newItem.chapter,
        topic: newItem.topic,
        size: '-',
        uploadDate: new Date().toISOString(),
        downloads: 0,
        views: 0,
        description: newItem.description,
        aiIndexed: created.data?.aiIndex?.status === 'indexed',
        chunksStored: created.data?.aiIndex?.chunks || 0,
        aiIndex: created.data?.aiIndex
        };
        setContent(prev => [item, ...prev]);
        handleCloseUpload();
        showNotice(newItem.addToAi ? 'Content posted and added to AI' : 'Content posted');
        await fetchKnowledge();
      } catch (error) {
        showNotice(error.message || 'Content could not be posted', 'error');
      }
    }
  };

  // initial sample content
  useEffect(() => {
    setContent([
      {
        id: 1,
        title: 'Chapter 5: Quadratic Equations',
        type: 'pdf',
        class: '8th Grade A',
        classId: 'class-8A',
        subject: 'Mathematics',
        chapter: 'Quadratic Equations',
        topic: 'Introduction and solving methods',
        size: '2.4 MB',
        uploadDate: '2024-03-01',
        downloads: 28,
        views: 45,
        description: 'Complete notes on quadratic equations with examples',
      },
      {
        id: 2,
        title: 'Geometry Basics Video',
        type: 'video',
        class: '8th Grade B',
        classId: 'class-8B',
        subject: 'Mathematics',
        chapter: 'Geometry Basics',
        topic: 'Shapes and properties',
        size: '45.2 MB',
        uploadDate: '2024-02-28',
        downloads: 0,
        views: 32,
        description: 'Introduction to basic geometric concepts',
        duration: '15:30',
      },
      {
        id: 3,
        title: 'Khan Academy - Algebra',
        type: 'link',
        class: 'Multiple Classes',
        classId: '',
        subject: 'Mathematics',
        chapter: 'Algebra',
        topic: 'Practice and review',
        size: '-',
        uploadDate: '2024-02-25',
        downloads: 0,
        views: 18,
        description: 'External resource for additional practice',
        url: 'https://khanacademy.org/algebra',
      },
      {
        id: 4,
        title: 'Trigonometry Notes',
        type: 'pdf',
        class: '9th Grade C',
        classId: 'class-9C',
        subject: 'Mathematics',
        chapter: 'Trigonometry',
        topic: 'Ratios and identities',
        size: '3.1 MB',
        uploadDate: '2024-02-20',
        downloads: 32,
        views: 48,
        description: 'Comprehensive trigonometry reference',
      },
    ]);
  }, []);

  useEffect(() => {
    fetchKnowledge();
  }, []);

  const knowledgeSubjects = useMemo(() => {
    return [...new Set(knowledgeItems.map(item => item.subject).filter(Boolean))].sort();
  }, [knowledgeItems]);

  const findKnowledgeForItem = (item) => {
    return knowledgeItems.find(k => (
      k.subject === item.subject &&
      k.chapter === item.chapter &&
      (k.topic || 'General') === (item.topic || 'General') &&
      (k.class_id || '') === (item.classId || '')
    ));
  };

  const handleSyncToAI = async (item) => {
    const text = [item.extractedText, item.description, item.title, item.subject, item.chapter, item.topic]
      .filter(Boolean)
      .join('\n\n');
    if (!text.trim()) {
      showNotice('Add some text before syncing to AI.', 'error');
      return;
    }

    setUploadingAiId(item.id);
    try {
      let result;
      if (item.dbId) {
        result = await apiService.post(`/content/${item.dbId}/ai-sync`, {
          text,
          topic: item.topic,
          sourceType: 'teacher-content-page'
        });
      } else {
        const response = await fetch(`${AI_BASE_URL}/upload-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text,
            subject: item.subject,
            chapter: item.chapter,
            topic: item.topic || 'General',
            class_id: item.classId || '',
            source_type: 'teacher-content-page'
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'AI sync failed');
        result = { data: { aiIndex: { status: 'indexed', chunks: data.chunks_stored, textLength: data.text_length } } };
      }

      const nextIndex = result.data?.aiIndex || { status: 'indexed' };
      setContent(prev => prev.map(row => row.id === item.id ? {
        ...row,
        aiIndexed: true,
        chunksStored: nextIndex.chunks || row.chunksStored || 0,
        aiIndex: nextIndex
      } : row));
      showNotice('Added to AI database');
      await fetchKnowledge();
    } catch (error) {
      setContent(prev => prev.map(row => row.id === item.id ? {
        ...row,
        aiIndexed: false,
        aiIndex: { ...(row.aiIndex || {}), status: 'failed', error: error.message }
      } : row));
      showNotice(error.message || 'AI sync failed', 'error');
    } finally {
      setUploadingAiId(null);
    }
  };

  const handleRemoveFromAI = async (item) => {
    if (!window.confirm(`Remove "${item.title}" from the AI database?`)) return;
    setUploadingAiId(item.id);
    try {
      if (item.dbId) {
        await apiService.delete(`/content/${item.dbId}/ai-sync`);
      } else {
        const response = await fetch(`${AI_BASE_URL}/remove-content`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: item.subject,
            chapter: item.chapter,
            topic: item.topic || 'General',
            class_id: item.classId || ''
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.detail || 'Remove failed');
      }

      setContent(prev => prev.map(row => row.id === item.id ? {
        ...row,
        aiIndexed: false,
        chunksStored: 0,
        aiIndex: { status: 'not_requested', chunks: 0 }
      } : row));
      showNotice('Removed from AI database');
      await fetchKnowledge();
    } catch (error) {
      showNotice(error.message || 'Could not remove from AI', 'error');
    } finally {
      setUploadingAiId(null);
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'pdf':
        return <FileText className="w-5 h-5 text-red-600" />;
      case 'video':
        return <Video className="w-5 h-5 text-blue-600" />;
      case 'link':
        return <LinkIcon className="w-5 h-5 text-green-600" />;
      default:
        return <FileText className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'pdf':
        return 'bg-red-100 text-red-800';
      case 'video':
        return 'bg-blue-100 text-blue-800';
      case 'link':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleView = (item) => {
    try {
      const candidate = item.url || item.path || item.link || item.attachment || '';
      if (!candidate) {
        alert('No file available to view for this item');
        return;
      }

      const cleanUrl = resolveFileUrl(candidate);
      setPreviewItem({
        title: item.title,
        url: cleanUrl,
        type: item.type,
        name: item.title || 'Preview'
      });
      setPreviewUrl('');
    } catch (err) {
      console.error('Error opening file:', err);
      alert('Failed to open file');
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadPreview = async () => {
      if (!previewItem?.url) {
        setPreviewUrl('');
        return;
      }

      setPreviewLoading(true);
      try {
        const response = await fetch(previewItem.url);
        if (!response.ok) {
          throw new Error(`Unable to load file (${response.status})`);
        }

        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        if (!cancelled) {
          setPreviewUrl(objectUrl);
        } else {
          URL.revokeObjectURL(objectUrl);
        }
      } catch (error) {
        if (!cancelled) {
          setPreviewUrl(previewItem.url);
        }
      } finally {
        if (!cancelled) {
          setPreviewLoading(false);
        }
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
      setPreviewUrl(current => {
        if (current && current.startsWith('blob:')) {
          URL.revokeObjectURL(current);
        }
        return '';
      });
    };
  }, [previewItem]);

  const filteredContent = content.filter(item => {
    const matchesFilter = filter === 'all' || item.type === filter;
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.class.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {notice && (
        <div className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${notice.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {notice.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Content Library</h1>
          <p className="text-gray-600 mt-1">Manage all your teaching materials in one place</p>
        </div>
        <button onClick={() => setShowUploadModal(true)} className="mt-4 sm:mt-0 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <Upload className="w-4 h-4" />
          <span>Upload Content</span>
        </button>
      </div>

      <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-indigo-900">AI Knowledge Snapshot</h2>
            <p className="text-sm text-indigo-700">These subjects and chapters are already indexed in AI.</p>
          </div>
          <div className="text-sm text-indigo-700">
            {loadingKnowledge ? 'Loading...' : `${knowledgeItems.length} indexed entries`}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {knowledgeSubjects.length > 0 ? knowledgeSubjects.map(subject => (
            <span key={subject} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
              {subject}
            </span>
          )) : (
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-indigo-700 shadow-sm">
              No AI knowledge indexed yet
            </span>
          )}
        </div>
        {!loadingKnowledge && knowledgeItems.length > 0 && (
          <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
            {knowledgeItems.slice(0, 6).map((item, index) => (
              <div key={`${item.subject}-${item.chapter}-${item.topic}-${index}`} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs text-indigo-900">
                <span className="truncate">
                  {item.subject} / {item.chapter}{item.topic ? ` / ${item.topic}` : ''}
                </span>
                <span className="ml-3 shrink-0 font-semibold">{item.chunks || 0} chunks</span>
              </div>
            ))}
          </div>
        )}
      </div>



      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Types</option>
            <option value="pdf">Documents</option>
            <option value="video">Videos</option>
            <option value="link">Links</option>
          </select>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Items</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{content.length}</p>
            </div>
            <FileText className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Documents</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {content.filter(c => c.type === 'pdf').length}
              </p>
            </div>
            <FileText className="w-8 h-8 text-red-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Videos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {content.filter(c => c.type === 'video').length}
              </p>
            </div>
            <Video className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {content.reduce((sum, c) => sum + c.views, 0)}
              </p>
            </div>
            <Eye className="w-8 h-8 text-green-500" />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.map((item) => (
          <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
            {(() => {
              const indexedEntry = findKnowledgeForItem(item);
              const aiStatus = item.aiIndex?.status || (item.aiIndexed || indexedEntry ? 'indexed' : 'not_requested');
              const chunkCount = item.aiIndex?.chunks || item.chunksStored || indexedEntry?.chunks || 0;
              const isBusy = uploadingAiId === item.id;
              return (
                <>
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                {getTypeIcon(item.type)}
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-500 mt-1">{item.class}</p>
                </div>
              </div>
              <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getTypeColor(item.type)}`}>
                {item.type.toUpperCase()}
              </span>
            </div>

            <p className="text-sm text-gray-600 mb-4">{item.description}</p>

            <div className="mb-4 rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
              <p><span className="font-semibold text-gray-700">AI subject:</span> {item.subject}</p>
              <p><span className="font-semibold text-gray-700">AI chapter:</span> {item.chapter}</p>
              <p><span className="font-semibold text-gray-700">AI topic:</span> {item.topic}</p>
            </div>

            <div className={`mb-4 rounded-lg border p-3 text-xs ${
              aiStatus === 'indexed'
                ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                : aiStatus === 'failed'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-gray-200 bg-gray-50 text-gray-600'
            }`}>
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1 font-semibold">
                  {aiStatus === 'indexed' ? <CheckCircle className="h-4 w-4" /> : aiStatus === 'failed' ? <XCircle className="h-4 w-4" /> : <Database className="h-4 w-4" />}
                  {aiStatus === 'indexed' ? 'Synced to AI' : aiStatus === 'failed' ? 'AI sync failed' : 'Not in AI'}
                </span>
                <span>{chunkCount} chunks</span>
              </div>
              {item.aiIndex?.error && <p className="mt-2">{item.aiIndex.error}</p>}
            </div>

            <div className="space-y-2 mb-4">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Size:</span>
                <span>{item.size}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>Uploaded:</span>
                <span>{new Date(item.uploadDate).toLocaleDateString()}</span>
              </div>
              {item.duration && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Duration:</span>
                  <span>{item.duration}</span>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <Eye className="w-3 h-3" />
                  <span>{item.views} views</span>
                </span>
                {item.downloads > 0 && (
                  <span className="flex items-center space-x-1">
                    <Download className="w-3 h-3" />
                    <span>{item.downloads} downloads</span>
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <button onClick={() => handleView(item)} className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  View
                </button>
                <button
                  onClick={() => handleSyncToAI(item)}
                  disabled={isBusy}
                  className="inline-flex items-center gap-1 text-sm font-medium text-purple-600 hover:text-purple-700 disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isBusy ? 'animate-spin' : ''}`} />
                  {aiStatus === 'indexed' ? 'Re-sync AI' : 'Add to AI'}
                </button>
                {aiStatus === 'indexed' && (
                  <button
                    onClick={() => handleRemoveFromAI(item)}
                    disabled={isBusy}
                    className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove AI
                  </button>
                )}
              </div>
              <button className="text-gray-600 hover:text-gray-700 text-sm">
                Edit
              </button>
            </div>
                </>
              );
            })()}
          </div>
        ))}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <form onSubmit={handleSubmitUpload} className="bg-white rounded-lg p-6 w-full max-w-xl">
            <h3 className="text-lg font-semibold mb-3">Upload Content</h3>
            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  File (PDF, Video, or Document)
                </label>
                <input 
                  type="file" 
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mp3,.wav,.jpg,.jpeg,.png,.gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setNewItem(prev => ({
                        ...prev, 
                        file,
                        title: prev.title || file.name.replace(/\.[^/.]+$/, '') // Auto-populate title from filename
                      }));
                    }
                  }}
                  className="block w-full text-sm text-gray-500 border border-gray-300 rounded px-3 py-2
                    file:mr-4 file:py-2 file:px-4
                    file:rounded file:border-0
                    file:text-sm file:font-semibold
                    file:bg-blue-50 file:text-blue-700
                    hover:file:bg-blue-100"
                />
                {newItem.file && (
                  <p className="text-xs text-gray-600 mt-1">
                    ✅ Selected: {newItem.file.name} ({(newItem.file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <input 
                placeholder="Title (auto-filled if uploading a file)" 
                value={newItem.title} 
                onChange={e=>setNewItem(prev=>({...prev,title:e.target.value}))} 
                className="border p-2 rounded" 
              />
              <select value={newItem.type} onChange={e=>setNewItem(prev=>({...prev,type:e.target.value}))} className="border p-2 rounded">
                <option value="pdf">PDF / Document</option>
                <option value="video">Video</option>
                <option value="link">Link</option>
              </select>
              <input placeholder="Class (e.g. 8th Grade A)" value={newItem.class} onChange={e=>setNewItem(prev=>({...prev,class:e.target.value}))} className="border p-2 rounded" />
              <input placeholder="Class ID (optional)" value={newItem.classId} onChange={e=>setNewItem(prev=>({...prev,classId:e.target.value}))} className="border p-2 rounded" />
              <input placeholder="Subject (for AI)" value={newItem.subject} onChange={e=>setNewItem(prev=>({...prev,subject:e.target.value}))} className="border p-2 rounded" />
              <input placeholder="Chapter (for AI)" value={newItem.chapter} onChange={e=>setNewItem(prev=>({...prev,chapter:e.target.value}))} className="border p-2 rounded" />
              <input placeholder="Topic (for AI)" value={newItem.topic} onChange={e=>setNewItem(prev=>({...prev,topic:e.target.value}))} className="border p-2 rounded" />
              <textarea placeholder="Description" value={newItem.description} onChange={e=>setNewItem(prev=>({...prev,description:e.target.value}))} className="border p-2 rounded" />
              <p className="text-xs text-gray-600 bg-blue-50 p-2 rounded">
                💡 Content will be uploaded and added to the AI Knowledge Base.
              </p>
            </div>

            <div className="mt-4 flex justify-end space-x-2">
              <button type="button" onClick={handleCloseUpload} className="px-4 py-2 rounded border">Cancel</button>
              <button type="button" onClick={(e) => handleSubmitUpload(e, true)} className="px-4 py-2 rounded bg-purple-600 text-white font-medium hover:bg-purple-700">
                Upload to Knowledge Base
              </button>
            </div>
          </form>
        </div>
      )}

      {previewItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-6xl overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{previewItem.name}</h3>
                <p className="text-xs text-gray-500">{previewItem.url}</p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewUrl || previewItem.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Open in new tab
                </a>
                <button
                  type="button"
                  onClick={() => setPreviewItem(null)}
                  className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-gray-800"
                >
                  Close
                </button>
              </div>
            </div>
            <div className="h-[78vh] bg-gray-100">
              {previewLoading ? (
                <div className="flex h-full items-center justify-center text-sm text-gray-600">Loading PDF...</div>
              ) : (
                <iframe
                  title={previewItem.name}
                  src={previewUrl || previewItem.url}
                  className="h-full w-full border-0"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {filteredContent.length === 0 && (
        <div className="text-center py-12">
          <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No content found</h3>
          <p className="text-gray-500">
            {searchTerm 
              ? 'Try adjusting your search terms.'
              : 'Upload your first content to get started.'
            }
          </p>
        </div>
      )}
    </div>
  );
};

export default Content;
