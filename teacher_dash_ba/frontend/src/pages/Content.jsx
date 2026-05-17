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

  // Fetch content from backend
  const fetchContent = async () => {
    try {
      const response = await apiService.get('/content');
      if (response.data && Array.isArray(response.data.data)) {
        // Map backend content to the format expected by the UI
        const mappedContent = response.data.data.map(item => ({
          id: item._id,
          dbId: item._id,
          title: item.title,
          type: item.type === 'document' ? 'pdf' : item.type,
          class: item.class ? item.class.name : 'Unassigned',
          classId: item.class ? item.class._id : '',
          subject: item.subject,
          chapter: item.chapter?.name || item.chapter,
          topic: item.subtopic?.title || item.topic,
          size: item.file?.size ? `${(item.file.size / 1024 / 1024).toFixed(2)} MB` : '-',
          uploadDate: item.createdAt || new Date().toISOString(),
          downloads: item.downloads || 0,
          views: item.views || 0,
          description: item.description,
          url: item.file?.url || item.file?.path || item.link || '',
          aiIndexed: item.aiIndex?.status === 'indexed',
          chunksStored: item.aiIndex?.chunks || 0,
          aiIndex: item.aiIndex,
          extractedText: item.extractedText
        }));
        setContent(mappedContent);
      }
    } catch (error) {
      console.error('Failed to fetch content:', error);
      showNotice('Failed to load content library', 'error');
    }
  };

  useEffect(() => {
    fetchContent();
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
    if (previewItem?.url) {
      setPreviewLoading(true);
      // Give the iframe a moment to load, or just rely on native iframe loading
      const timer = setTimeout(() => {
        setPreviewLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
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

      {/* AI Knowledge Summary Dashboard */}
      <div className="bg-gradient-to-br from-indigo-900 to-purple-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Database className="w-32 h-32" />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                <Database className="w-6 h-6 text-indigo-100" />
              </div>
              <h2 className="text-2xl font-bold">AI Knowledge Base</h2>
            </div>
            <p className="text-indigo-200 mb-4 max-w-xl">
              Your intelligent content repository. Documents uploaded here are parsed and indexed, empowering the AI to answer student doubts accurately.
            </p>
            <div className="flex flex-wrap gap-2">
              {loadingKnowledge ? (
                <span className="text-indigo-200 text-sm animate-pulse">Loading knowledge graph...</span>
              ) : knowledgeSubjects.length > 0 ? (
                knowledgeSubjects.map(subject => (
                  <span key={subject} className="px-3 py-1 bg-white/10 hover:bg-white/20 transition-colors rounded-full text-xs font-medium border border-white/10 backdrop-blur-sm">
                    {subject}
                  </span>
                ))
              ) : (
                <span className="text-indigo-200 text-sm">No knowledge indexed yet. Upload content to build your AI brain.</span>
              )}
            </div>
          </div>
          
          {!loadingKnowledge && knowledgeItems.length > 0 && (
            <div className="w-full md:w-80 bg-black/20 rounded-xl p-4 backdrop-blur-md border border-white/10">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-semibold text-indigo-100">Recent Indexing</h3>
                <span className="text-xs bg-indigo-500/30 px-2 py-1 rounded text-indigo-100">{knowledgeItems.length} entries</span>
              </div>
              <div className="space-y-2 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
                {knowledgeItems.slice(0, 5).map((item, index) => (
                  <div key={`${item.subject}-${item.chapter}-${item.topic}-${index}`} className="flex justify-between items-center text-xs group">
                    <span className="text-indigo-200 truncate pr-2 group-hover:text-white transition-colors">
                      {item.subject} › {item.chapter}
                    </span>
                    <span className="text-emerald-400 font-mono bg-emerald-400/10 px-1.5 py-0.5 rounded flex-shrink-0">
                      {item.chunks || 0} pts
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center text-white">
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Upload className="w-5 h-5" />
                Upload Course Content
              </h3>
              <button onClick={handleCloseUpload} className="text-white/80 hover:text-white transition-colors">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            
            <div className="overflow-y-auto p-6 custom-scrollbar">
              <form id="upload-form" onSubmit={(e) => handleSubmitUpload(e, true)} className="space-y-6">
                
                {/* File Upload Area */}
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-blue-500 transition-colors bg-gray-50">
                  <input 
                    type="file" 
                    id="file-upload"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.mp4,.mp3,.wav,.jpg,.jpeg,.png,.gif"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setNewItem(prev => ({
                          ...prev, 
                          file,
                          title: prev.title || file.name.replace(/\.[^/.]+$/, '')
                        }));
                      }
                    }}
                    className="hidden"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center gap-3">
                    <div className="p-4 bg-blue-100 text-blue-600 rounded-full">
                      <Upload className="w-8 h-8" />
                    </div>
                    <div>
                      <span className="text-blue-600 font-semibold hover:underline">Click to upload</span> or drag and drop
                      <p className="text-xs text-gray-500 mt-1">PDF, Video, or Document (Max 100MB)</p>
                    </div>
                  </label>
                  {newItem.file && (
                    <div className="mt-4 p-3 bg-white border border-green-200 rounded-lg flex items-center justify-between">
                      <div className="flex items-center gap-3 overflow-hidden">
                        <FileText className="w-5 h-5 text-green-500 flex-shrink-0" />
                        <span className="text-sm font-medium text-gray-700 truncate">{newItem.file.name}</span>
                      </div>
                      <span className="text-xs text-gray-500 flex-shrink-0">{(newItem.file.size / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1 md:col-span-2">
                    <label className="text-sm font-semibold text-gray-700">Content Title</label>
                    <input 
                      placeholder="e.g. Intro to Algebra" 
                      value={newItem.title} 
                      onChange={e=>setNewItem(prev=>({...prev,title:e.target.value}))} 
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow" 
                      required
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">Content Type</label>
                    <select 
                      value={newItem.type} 
                      onChange={e=>setNewItem(prev=>({...prev,type:e.target.value}))} 
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                    >
                      <option value="pdf">PDF / Document</option>
                      <option value="video">Video</option>
                      <option value="link">External Link</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-sm font-semibold text-gray-700">Target Class</label>
                    <input 
                      placeholder="e.g. 10th Grade Math" 
                      value={newItem.class} 
                      onChange={e=>setNewItem(prev=>({...prev,class:e.target.value}))} 
                      className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                    />
                  </div>
                </div>

                <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Database className="w-4 h-4 text-indigo-600" />
                    <h4 className="font-semibold text-indigo-900 text-sm">AI Knowledge Indexing Metadata</h4>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input placeholder="Subject" value={newItem.subject} onChange={e=>setNewItem(prev=>({...prev,subject:e.target.value}))} className="w-full border border-indigo-200 px-3 py-2 rounded-md text-sm focus:ring-2 focus:ring-indigo-500" required />
                    <input placeholder="Chapter" value={newItem.chapter} onChange={e=>setNewItem(prev=>({...prev,chapter:e.target.value}))} className="w-full border border-indigo-200 px-3 py-2 rounded-md text-sm focus:ring-2 focus:ring-indigo-500" required />
                    <input placeholder="Topic (Optional)" value={newItem.topic} onChange={e=>setNewItem(prev=>({...prev,topic:e.target.value}))} className="w-full border border-indigo-200 px-3 py-2 rounded-md text-sm focus:ring-2 focus:ring-indigo-500" />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-semibold text-gray-700">Description</label>
                  <textarea 
                    placeholder="Provide a brief description of the content..." 
                    value={newItem.description} 
                    onChange={e=>setNewItem(prev=>({...prev,description:e.target.value}))} 
                    className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 resize-none" 
                  />
                </div>
              </form>
            </div>
            
            <div className="border-t border-gray-100 px-6 py-4 bg-gray-50 flex items-center justify-between rounded-b-2xl">
              <p className="text-xs text-gray-500 flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-emerald-500" /> Auto-syncs to AI Base
              </p>
              <div className="flex gap-3">
                <button type="button" onClick={handleCloseUpload} className="px-5 py-2 rounded-lg font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button 
                  type="submit" 
                  form="upload-form"
                  className="px-6 py-2 rounded-lg font-medium text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Upload & Index
                </button>
              </div>
            </div>
          </div>
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
