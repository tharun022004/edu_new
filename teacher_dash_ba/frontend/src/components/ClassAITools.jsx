import React, { useEffect, useMemo, useState } from 'react';
import { Brain, BookOpen, CheckCircle, Database, Loader, Plus, RefreshCcw, Sparkles } from 'lucide-react';
import apiService from '../services/api';

const AI_BASE_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000';

const emptyForm = {
  subject: '',
  chapter: '',
  topic: '',
  text: ''
};

const toText = (value) => {
  if (value == null) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'object') {
    const nested = value.name ?? value.title ?? value.label ?? value.id ?? value.value;
    return typeof nested === 'object' ? toText(nested) : (nested ? String(nested) : '');
  }
  return String(value);
};

const toKey = (value) => toText(value) || 'item';

const ClassAITools = ({ classId, classData }) => {
  const [teacherClasses, setTeacherClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState(classId || '');
  const [currentClass, setCurrentClass] = useState(classData || null);
  const [contentItems, setContentItems] = useState([]);
  const [knowledgeItems, setKnowledgeItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [aiOnline, setAiOnline] = useState(true);
  const [message, setMessage] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedSubject, setSelectedSubject] = useState('');
  const [selectedChapter, setSelectedChapter] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedContentId, setSelectedContentId] = useState(null);

  const activeClassId = classId || selectedClassId;
  const subject = toText(currentClass?.subject) || toText(currentClass?.name) || 'General';
  const getTeacherId = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return user._id || user.id || localStorage.getItem('userId') || '';
    } catch {
      return localStorage.getItem('userId') || '';
    }
  };

  const showMessage = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      subject: prev.subject || subject
    }));
  }, [subject]);

  const fetchTeacherClasses = async () => {
    if (classId) return;
    const response = await apiService.getClasses();
    const classes = response.data || [];
    setTeacherClasses(classes);
    if (!selectedClassId && classes.length > 0) {
      setSelectedClassId(classes[0]._id);
      setCurrentClass(classes[0]);
    } else if (selectedClassId) {
      const selected = classes.find(item => item._id === selectedClassId);
      if (selected) setCurrentClass(selected);
    }
  };

  const fetchClassDetails = async () => {
    if (classData && classId) return;
    if (!activeClassId) return;
    const response = await apiService.getClass(activeClassId);
    setCurrentClass(response.data || response.class || response);
  };

  const fetchClassContent = async () => {
    if (!activeClassId) {
      setContentItems([]);
      return;
    }
    const params = new URLSearchParams({ status: 'all', includeShared: 'true', class: activeClassId });
    const response = await apiService.getContent(`?${params.toString()}`);
    setContentItems(response.data || []);
  };

  const fetchKnowledge = async () => {
    let response;
    try {
      response = await fetch(`${AI_BASE_URL}/knowledge`);
    } catch {
      setAiOnline(false);
      throw new Error('AI service is offline. Start the AI service on port 8000 to view or add knowledge.');
    }
    setAiOnline(true);
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      throw new Error(data.detail || 'Unable to read AI knowledge');
    }
    const data = await response.json();
    setKnowledgeItems(data.items || []);
  };

  const refreshAll = async () => {
    setLoading(true);
    try {
      await fetchTeacherClasses();
      await Promise.all([fetchClassDetails(), fetchClassContent(), fetchKnowledge()]);
    } catch (error) {
      showMessage(error.message || 'Failed to load AI knowledge', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
  }, [classId, selectedClassId]);

  const chapters = useMemo(() => {
    const names = contentItems
      .filter(item => item.type === 'chapter')
      .map(item => item.chapter?.name || item.title)
      .filter(Boolean);
    return [...new Set(names)];
  }, [contentItems]);

  const contentSubjects = useMemo(() => {
    return [...new Set(contentItems.map(c => toText(c.subject)).filter(Boolean))];
  }, [contentItems]);

  const contentChapters = useMemo(() => {
    return [...new Set(contentItems.filter(c => !selectedSubject || toText(c.subject) === selectedSubject).map(c => toText(c.chapter)).filter(Boolean))];
  }, [contentItems, selectedSubject]);

  const contentTopics = useMemo(() => {
    return [...new Set(contentItems.filter(c => (!selectedChapter || toText(c.chapter) === selectedChapter)).map(c => toText(c.topic)).filter(Boolean))];
  }, [contentItems, selectedChapter]);

  const subtopics = useMemo(() => {
    const names = contentItems
      .filter(item => item.type === 'subtopic')
      .map(item => item.subtopic?.title || item.title)
      .filter(Boolean);
    return [...new Set(names)];
  }, [contentItems]);

  const knowledgeSubjects = useMemo(() => {
    return [...new Set(knowledgeItems.map(item => toText(item.subject)).filter(Boolean))].sort();
  }, [knowledgeItems]);

  const activeKnowledgeSubject = form.subject || subject;

  const knowledgeForSubject = useMemo(() => {
    return knowledgeItems.filter(item => toText(item.subject) === activeKnowledgeSubject);
  }, [knowledgeItems, activeKnowledgeSubject]);

  const knowledgeChapters = useMemo(() => {
    return [...new Set(knowledgeForSubject.map(item => toText(item.chapter)).filter(Boolean))].sort();
  }, [knowledgeForSubject]);

  const knowledgeTopics = useMemo(() => {
    return [...new Set(
      knowledgeForSubject
        .filter(item => !form.chapter || toText(item.chapter) === form.chapter)
        .map(item => toText(item.topic))
        .filter(Boolean)
    )].sort();
  }, [knowledgeForSubject, form.chapter]);

  const classKnowledge = useMemo(() => {
    return knowledgeItems.filter(item => {
      const sameClass = toText(item.class_id) && toText(item.class_id) === toText(activeClassId);
      const sameSubject = toText(item.subject).toLowerCase() === subject.toLowerCase();
      return sameClass || sameSubject;
    });
  }, [knowledgeItems, activeClassId, subject]);

  const missingChapters = useMemo(() => {
    const known = new Set(classKnowledge.map(item => toText(item.chapter).toLowerCase()));
    return chapters.filter(chapter => !known.has(toText(chapter).toLowerCase()));
  }, [chapters, classKnowledge]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const selectedSubject = form.subject.trim() || subject;
    if (!selectedSubject.trim() || !form.chapter.trim() || !form.topic.trim() || !form.text.trim()) {
      showMessage('Subject, chapter, topic, and content are required', 'error');
      return;
    }

    setSyncing(true);
    try {
      const response = await fetch(`${AI_BASE_URL}/upload-content`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: form.text.trim(),
          subject: selectedSubject,
          chapter: form.chapter.trim(),
          topic: form.topic.trim(),
          class_id: activeClassId,
          teacher_id: getTeacherId(),
          source_type: 'teacher-ai-tools'
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.detail || 'Failed to add content to AI');
      }

      showMessage(`Added ${data.chunks_stored} AI knowledge chunks`);
      setForm({ ...emptyForm, subject: selectedSubject, chapter: form.chapter, topic: '' });
      await fetchKnowledge();
    } catch (error) {
      showMessage(error.message === 'Failed to fetch'
        ? 'AI service is offline. Start the AI service on port 8000 first.'
        : error.message || 'Failed to connect to AI service', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleAddContentItemToAI = async (contentId) => {
    const item = contentItems.find(c => c._id === contentId || c.id === contentId || String(c._id) === String(contentId));
    if (!item) return showMessage('Selected content not found', 'error');
    setSyncing(true);
    try {
      const resp = await fetch(`${AI_BASE_URL}/upload-content`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({
          text: `${toText(item.title) || toText(item.name)}. ${toText(item.description) || toText(item.summary) || ''}`,
          subject: toText(item.subject) || form.subject || subject,
          chapter: toText(item.chapter) || form.chapter || '',
          topic: toText(item.topic) || form.topic || 'General',
          class_id: activeClassId,
          teacher_id: getTeacherId(),
          source_type: 'teacher-class-content'
        })
      });
      const data = await resp.json();
      if (resp.ok) {
        showMessage(`Added ${data.chunks_stored} chunks to AI`);
        await fetchKnowledge();
      } else {
        showMessage(data.detail || 'Failed to add to AI', 'error');
      }
    } catch (err) {
      showMessage('Failed to reach AI service', 'error');
    } finally {
      setSyncing(false);
    }
  };

  const handleRemoveContentItemFromAI = async (contentId) => {
    const item = contentItems.find(c => c._id === contentId || c.id === contentId || String(c._id) === String(contentId));
    if (!item) return showMessage('Selected content not found', 'error');
    if (!confirm(`Remove ${toText(item.title) || toText(item.name)} from AI knowledge?`)) return;
    setSyncing(true);
    try {
      const resp = await fetch(`${AI_BASE_URL}/remove-content`, {
        method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ subject: toText(item.subject) || '', chapter: toText(item.chapter) || '', topic: toText(item.topic) || '', class_id: activeClassId, teacher_id: getTeacherId() })
      });
      const data = await resp.json();
      if (resp.ok) {
        showMessage(`Removed ${data.removed_chunks} chunks from AI`);
        await fetchKnowledge();
      } else {
        showMessage(data.detail || 'Failed to remove from AI', 'error');
      }
    } catch (err) {
      showMessage('Failed to reach AI service', 'error');
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      {message && (
        <div className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-3 text-sm font-semibold text-white shadow-lg ${message.type === 'error' ? 'bg-red-600' : 'bg-emerald-600'}`}>
          {message.text}
        </div>
      )}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-indigo-100 p-3 text-indigo-700">
            <Brain className="h-7 w-7" />
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-900">AI Knowledge Base</h2>
            <p className="text-sm text-gray-600">Manage what students can use for AI doubts and generated quizzes</p>
          </div>
        </div>
        <button
          onClick={refreshAll}
          disabled={loading}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {!classId && (
        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <label className="mb-2 block text-sm font-medium text-gray-700">Choose class</label>
          <select
            value={selectedClassId}
            onChange={(event) => {
              const nextClassId = event.target.value;
              setSelectedClassId(nextClassId);
              const nextClass = teacherClasses.find(item => item._id === nextClassId);
              setCurrentClass(nextClass || null);
              setForm(emptyForm);
            }}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select a class</option>
            {teacherClasses.map(item => (
              <option key={item._id || item.id} value={item._id || item.id}>
                {toText(item.name)}{toText(item.subject) ? ` - ${toText(item.subject)}` : ''}
              </option>
            ))}
          </select>
        </section>
      )}

      {!aiOnline && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          AI service is offline. The knowledge form is visible, but saving requires the AI service running on port 8000.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <Database className="mb-3 h-6 w-6 text-indigo-600" />
          <p className="text-2xl font-bold text-gray-900">{knowledgeItems.reduce((sum, item) => sum + (item.chunks || 0), 0)}</p>
          <p className="text-sm text-gray-500">Indexed chunks in AI</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <BookOpen className="mb-3 h-6 w-6 text-emerald-600" />
          <p className="text-2xl font-bold text-gray-900">{knowledgeSubjects.length}</p>
          <p className="text-sm text-gray-500">Subjects in knowledge</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <Sparkles className="mb-3 h-6 w-6 text-amber-600" />
          <p className="text-2xl font-bold text-gray-900">{knowledgeChapters.length}</p>
          <p className="text-sm text-gray-500">Chapters for current subject</p>
        </div>
      </div>

      {!activeClassId && !loading && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-5 text-sm text-amber-700">
          Create or select a class before adding AI knowledge.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <Database className="mb-3 h-6 w-6 text-indigo-600" />
          <p className="text-2xl font-bold text-gray-900">{classKnowledge.reduce((sum, item) => sum + item.chunks, 0)}</p>
          <p className="text-sm text-gray-500">Indexed chunks</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <BookOpen className="mb-3 h-6 w-6 text-emerald-600" />
          <p className="text-2xl font-bold text-gray-900">{classKnowledge.length}</p>
          <p className="text-sm text-gray-500">Chapter/topic entries</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-5">
          <Sparkles className="mb-3 h-6 w-6 text-amber-600" />
          <p className="text-2xl font-bold text-gray-900">{missingChapters.length}</p>
          <p className="text-sm text-gray-500">Chapters not yet added</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 p-5">
            <h3 className="font-semibold text-gray-900">What AI Knows</h3>
            <p className="text-sm text-gray-500">These entries are available for AI quiz and doubt retrieval.</p>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {knowledgeChapters.slice(0, 8).map(chapter => (
                <span key={toKey(chapter)} className="rounded-full bg-indigo-50 px-3 py-1 font-medium text-indigo-700">
                  {toText(chapter)}
                </span>
              ))}
              {knowledgeChapters.length === 0 && (
                <span className="rounded-full bg-gray-100 px-3 py-1 font-medium text-gray-600">
                  No indexed chapters for this subject yet
                </span>
              )}
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center gap-2 p-10 text-gray-500">
              <Loader className="h-5 w-5 animate-spin" />
              Loading knowledge...
            </div>
          ) : classKnowledge.length === 0 ? (
            <div className="p-10 text-center">
              <Brain className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="font-semibold text-gray-800">No AI knowledge added for this class yet</p>
              <p className="mt-1 text-sm text-gray-500">Add a chapter or topic from the form to make it available to students.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                  <tr>
                    <th className="px-5 py-3">Chapter</th>
                    <th className="px-5 py-3">Topic</th>
                    <th className="px-5 py-3">Chunks</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {classKnowledge.map((item, index) => (
                    <tr key={`${toText(item.subject)}-${toText(item.chapter)}-${toText(item.topic)}-${index}`}>
                      <td className="px-5 py-4 font-medium text-gray-900">{toText(item.chapter)}</td>
                      <td className="px-5 py-4 text-gray-600">{toText(item.topic)}</td>
                      <td className="px-5 py-4 text-gray-600">{item.chunks}</td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Added
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-5">
          <div className="mb-5 flex items-center gap-2">
            <Plus className="h-5 w-5 text-indigo-600" />
            <h3 className="font-semibold text-gray-900">Add To AI Knowledge</h3>
          </div>
          {/* Quick manage uploaded class content: select subject/chapter/topic and add/remove content */}
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
              <select value={selectedSubject} onChange={e=>{ setSelectedSubject(e.target.value); setSelectedChapter(''); setSelectedContentId(null); }} className="border rounded p-2">
                <option value="">-- Subject --</option>
                {contentSubjects.map(s=> <option key={toKey(s)} value={toText(s)}>{toText(s)}</option>)}
              </select>
              <select value={selectedChapter} onChange={e=>{ setSelectedChapter(e.target.value); setSelectedTopic(''); setSelectedContentId(null); }} className="border rounded p-2">
                <option value="">-- Chapter --</option>
                {contentChapters.map(c=> <option key={toKey(c)} value={toText(c)}>{toText(c)}</option>)}
              </select>
              <select value={selectedTopic} onChange={e=>{ setSelectedTopic(e.target.value); setSelectedContentId(null); }} className="border rounded p-2">
                <option value="">-- Topic --</option>
                {contentTopics.map(t=> <option key={toKey(t)} value={toText(t)}>{toText(t)}</option>)}
              </select>
            </div>

            <div className="mt-2">
              <select value={selectedContentId || ''} onChange={e=>setSelectedContentId(e.target.value)} className="w-full border rounded p-2">
                <option value="">-- Pick a content item --</option>
                {contentItems.filter(c=>{
                  if (selectedSubject && toText(c.subject) !== selectedSubject) return false;
                  if (selectedChapter && toText(c.chapter) !== selectedChapter) return false;
                  if (selectedTopic && toText(c.topic) !== selectedTopic) return false;
                  return true;
                }).map(c => (
                  <option key={c._id || c.id || `${toText(c.title)}-${toText(c.name)}`} value={c._id || c.id}>{toText(c.title) || toText(c.name)}</option>
                ))}
              </select>
            </div>

            <div className="flex gap-2">
              <button type="button" onClick={() => {
                if (!selectedContentId) return showMessage('Select a content item first', 'error');
                handleAddContentItemToAI(selectedContentId);
              }} className="rounded bg-indigo-600 px-3 py-2 text-white">Add Selected to AI</button>
              <button type="button" onClick={() => {
                if (!selectedContentId) return showMessage('Select a content item first', 'error');
                handleRemoveContentItemFromAI(selectedContentId);
              }} className="rounded border px-3 py-2">Remove Selected from AI</button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
              <select
                value={form.subject}
                onChange={(event) => setForm(prev => ({ ...prev, subject: event.target.value, chapter: '', topic: '' }))}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              >
                <option value={subject}>{subject} (current class)</option>
                {knowledgeSubjects.filter(item => item !== subject).map(item => (
                  <option key={item} value={item}>{item}</option>
                ))}
                <option value="">Custom subject</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Chapter</label>
              <input
                list="ai-chapters"
                value={form.chapter}
                onChange={(event) => setForm(prev => ({ ...prev, chapter: event.target.value }))}
                placeholder="Select or type chapter"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                disabled={!activeKnowledgeSubject}
              />
              <datalist id="ai-chapters">
                {knowledgeChapters.map(chapter => <option key={chapter} value={chapter} />)}
              </datalist>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Topic</label>
              <input
                list="ai-topics"
                value={form.topic}
                onChange={(event) => setForm(prev => ({ ...prev, topic: event.target.value }))}
                placeholder="Select or type topic"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                disabled={!form.chapter}
              />
              <datalist id="ai-topics">
                {knowledgeTopics.map(topic => <option key={topic} value={topic} />)}
              </datalist>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Lesson Text</label>
              <textarea
                value={form.text}
                onChange={(event) => setForm(prev => ({ ...prev, text: event.target.value }))}
                rows={7}
                placeholder="Paste the notes or explanation students should be able to ask AI about..."
                className="w-full resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={syncing || !aiOnline || !activeClassId}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {syncing ? <Loader className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
              {syncing ? 'Adding...' : 'Add to AI Knowledge'}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
};

export default ClassAITools;
