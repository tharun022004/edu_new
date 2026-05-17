import React, { useState, useEffect, useRef } from 'react';
import {
  ChatBubbleLeftRightIcon,
  PaperAirplaneIcon,
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ClockIcon,
  PlusCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  ExclamationTriangleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

const TEACHER_BASE = 'http://localhost:5001/api';

const CATEGORIES = ['general', 'concept', 'homework', 'assignment', 'exam'];
const PRIORITIES = ['low', 'medium', 'high'];
const CATEGORY_EMOJI = { general: '❓', concept: '💡', homework: '📚', assignment: '📝', exam: '📋' };

const getStudentEmail = () => {
  try { return JSON.parse(localStorage.getItem('user') || '{}').email || ''; } catch { return ''; }
};
const getStudentName = () => {
  try { const u = JSON.parse(localStorage.getItem('user') || '{}'); return u.name || u.fullName || u.email?.split('@')[0] || 'Student'; } catch { return 'Student'; }
};

const DoubtResolution = () => {
  const [view, setView] = useState('list'); // 'list' | 'thread' | 'ask'
  const [doubts, setDoubts] = useState([]);
  const [selectedDoubt, setSelectedDoubt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [replying, setReplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [toast, setToast] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [enrolledClasses, setEnrolledClasses] = useState([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const threadEndRef = useRef(null);

  // New doubt form state — classId replaces manual subject entry
  const [form, setForm] = useState({ title: '', question: '', classId: '', category: 'general', priority: 'medium' });

  const studentEmail = getStudentEmail();
  const studentName = getStudentName();

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDoubts = async () => {
    if (!studentEmail) return;
    try {
      setLoading(true);
      const encoded = encodeURIComponent(studentEmail);
      const ts = Date.now();
      const res = await fetch(`${TEACHER_BASE}/student-doubts/${encoded}?_t=${ts}`, { headers: { 'Cache-Control': 'no-cache' } });
      const data = await res.json();
      if (data.success) setDoubts(data.data || []);
    } catch (err) {
      console.error('Failed to fetch doubts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchThread = async (doubtId) => {
    try {
      const encoded = encodeURIComponent(studentEmail);
      const res = await fetch(`${TEACHER_BASE}/student-doubts/${encoded}/${doubtId}?_t=${Date.now()}`);
      const data = await res.json();
      if (data.success) {
        setSelectedDoubt(data.data);
        setDoubts(prev => prev.map(d => d._id === doubtId ? data.data : d));
      }
    } catch {}
  };

  // Fetch enrolled classes whenever the ask view opens
  const fetchEnrolledClasses = async () => {
    if (!studentEmail) return;
    setClassesLoading(true);
    try {
      const encoded = encodeURIComponent(studentEmail);
      const res = await fetch(`http://localhost:5001/api/classes/student/${encoded}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.data)) {
        const classes = data.data
          .map(entry => entry.class || entry)
          .filter(c => c && c._id);
        setEnrolledClasses(classes);
        // Pre-select the first class
        if (classes.length > 0) setForm(f => ({ ...f, classId: classes[0]._id }));
      }
    } catch (err) {
      console.error('Failed to fetch enrolled classes:', err);
    } finally {
      setClassesLoading(false);
    }
  };

  useEffect(() => { fetchDoubts(); }, []);
  useEffect(() => { if (view === 'ask') fetchEnrolledClasses(); }, [view]);
  useEffect(() => { if (view === 'thread') setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }, [view, selectedDoubt]);

  const handleSubmitDoubt = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.question.trim()) { showToast('Please fill in title and question', 'error'); return; }
    if (!form.classId) { showToast('Please select a course', 'error'); return; }
    // Derive subject from the selected class
    const selectedClass = enrolledClasses.find(c => c._id === form.classId);
    const subject = selectedClass?.subject || selectedClass?.name || 'General';
    setSubmitting(true);
    try {
      const res = await fetch(`${TEACHER_BASE}/student-doubts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentEmail, studentName, subject, classId: form.classId, category: form.category, priority: form.priority, title: form.title, question: form.question })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Doubt submitted! Teacher will respond soon 🎉');
        setForm(f => ({ title: '', question: '', classId: f.classId, category: 'general', priority: 'medium' }));
        setView('list');
        await fetchDoubts();
      } else {
        showToast(data.message || 'Failed to submit', 'error');
      }
    } catch {
      showToast('Error submitting doubt', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAskAI = async (e) => {
    e.preventDefault();
    if (!form.question.trim() || !form.classId) { showToast('Please enter a question and select a course', 'error'); return; }
    
    const selectedClass = enrolledClasses.find(c => c._id === form.classId);
    const subject = selectedClass?.subject || selectedClass?.name || 'General';
    const chapter = form.title || 'General';
    
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await fetch('http://localhost:8000/ask-doubt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: form.question,
          subject,
          chapter,
          student_id: studentEmail || 'student_123',
          class_id: form.classId
        })
      });
      const data = await res.json();
      if (res.ok) {
        setAiResponse(data.answer);
      } else {
        showToast(data.detail || 'Failed to get AI response', 'error');
      }
    } catch {
      showToast('Error connecting to AI Tutor', 'error');
    } finally {
      setAiLoading(false);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !selectedDoubt) return;
    setReplying(true);
    try {
      const encoded = encodeURIComponent(studentEmail);
      const res = await fetch(`${TEACHER_BASE}/student-doubts/${encoded}/${selectedDoubt._id}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: replyText.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setSelectedDoubt(data.data);
        setReplyText('');
        setTimeout(() => threadEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        showToast(data.message || 'Failed to reply', 'error');
      }
    } catch {
      showToast('Error sending reply', 'error');
    } finally {
      setReplying(false);
    }
  };

  const handleResolve = async () => {
    if (!selectedDoubt) return;
    try {
      const encoded = encodeURIComponent(studentEmail);
      const res = await fetch(`${TEACHER_BASE}/student-doubts/${encoded}/${selectedDoubt._id}/resolve`, { method: 'PUT' });
      const data = await res.json();
      if (data.success) {
        setSelectedDoubt(data.data);
        setDoubts(prev => prev.map(d => d._id === selectedDoubt._id ? data.data : d));
        showToast('Doubt marked as resolved! ✅');
      }
    } catch { showToast('Error resolving doubt', 'error'); }
  };

  const handleDeleteDoubt = async (doubtId, fromThread = false) => {
    if (!window.confirm('Delete this doubt? This cannot be undone.')) return;
    try {
      const encoded = encodeURIComponent(studentEmail);
      const res = await fetch(`${TEACHER_BASE}/student-doubts/${encoded}/${doubtId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        setDoubts(prev => prev.filter(d => d._id !== doubtId));
        showToast('Doubt deleted');
        if (fromThread) setView('list');
      } else {
        showToast(data.message || 'Cannot delete', 'error');
      }
    } catch { showToast('Error deleting doubt', 'error'); }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    const d = new Date(ts), now = new Date();
    const diff = Math.floor((now - d) / 60000);
    if (diff < 1) return 'Just now';
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff/60)}h ago`;
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  const statusBadge = { pending: 'bg-amber-100 text-amber-700', answered: 'bg-blue-100 text-blue-700', resolved: 'bg-emerald-100 text-emerald-700' };
  const statusLabel = { pending: '⏳ Pending', answered: '💬 Answered', resolved: '✅ Resolved' };

  const filtered = doubts.filter(d => {
    const mStatus = filterStatus === 'all' || d.status === filterStatus;
    const mSearch = !searchTerm || d.title?.toLowerCase().includes(searchTerm.toLowerCase()) || d.subject?.toLowerCase().includes(searchTerm.toLowerCase()) || d.question?.toLowerCase().includes(searchTerm.toLowerCase());
    return mStatus && mSearch;
  });

  // ── THREAD VIEW ──────────────────────────────────────
  if (view === 'thread' && selectedDoubt) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 h-full flex flex-col">
        {toast && <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>{toast.msg}</div>}
        {/* Thread Header */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 mb-4">
          <div className="flex items-start justify-between mb-2">
            <button onClick={() => { setView('list'); fetchDoubts(); }} className="flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium mb-3">
              <ArrowLeftIcon className="w-4 h-4" />  Back to doubts
            </button>
            <div className="flex items-center gap-2">
              {/* Student can delete any of their own doubts */}
              <button
                onClick={() => handleDeleteDoubt(selectedDoubt._id, true)}
                className="flex items-center gap-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 px-3 py-1.5 rounded-xl text-xs font-medium transition-colors"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Delete
              </button>
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadge[selectedDoubt.status] || statusBadge.pending}`}>
                {statusLabel[selectedDoubt.status] || selectedDoubt.status}
              </span>
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedDoubt.title}</h2>
          <div className="flex flex-wrap gap-2 text-xs text-gray-500">
            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{selectedDoubt.subject}</span>
            <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{CATEGORY_EMOJI[selectedDoubt.category]} {selectedDoubt.category}</span>
            <span>{formatTime(selectedDoubt.createdAt)}</span>
            <span>• {selectedDoubt.views || 0} views</span>
          </div>
        </div>

        {/* Thread Messages */}
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
          <div className="flex-1 overflow-y-auto p-5 space-y-4 max-h-[60vh]">
            {/* Original question */}
            <div className="flex gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                {studentName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-gray-900">{studentName}</span>
                  <span className="text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">You</span>
                  <span className="text-xs text-gray-400">{formatTime(selectedDoubt.createdAt)}</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-100 rounded-2xl rounded-tl-none px-4 py-3">
                  <p className="text-gray-800 text-sm leading-relaxed">{selectedDoubt.question}</p>
                </div>
              </div>
            </div>

            {/* Responses */}
            {(selectedDoubt.responses || []).map((r, i) => (
              <div key={r._id || i} className={`flex gap-3 ${r.authorType === 'student' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0 ${r.authorType === 'teacher' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                  {r.authorType === 'teacher' ? '👩‍🏫' : studentName.charAt(0).toUpperCase()}
                </div>
                <div className={`max-w-[75%] ${r.authorType === 'student' ? 'items-end' : 'items-start'} flex flex-col`}>
                  <div className={`flex items-center gap-2 mb-1 ${r.authorType === 'student' ? 'flex-row-reverse' : ''}`}>
                    <span className="text-sm font-semibold text-gray-900">{r.author}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded-full ${r.authorType === 'teacher' ? 'bg-emerald-100 text-emerald-700' : 'bg-indigo-100 text-indigo-700'}`}>
                      {r.authorType === 'teacher' ? 'Teacher' : 'You'}
                    </span>
                    <span className="text-xs text-gray-400">{formatTime(r.createdAt)}</span>
                  </div>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${r.authorType === 'teacher' ? 'bg-emerald-50 border border-emerald-100 rounded-tl-none text-gray-800' : 'bg-indigo-600 text-white rounded-tr-none'}`}>
                    {r.message}
                  </div>
                </div>
              </div>
            ))}
            <div ref={threadEndRef} />
          </div>

          {/* Reply Box */}
          {selectedDoubt.status !== 'resolved' ? (
            <div className="border-t border-gray-100 p-4">
              <div className="flex gap-3">
                <textarea
                  value={replyText}
                  onChange={e => setReplyText(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleReply(); } }}
                  placeholder="Type a follow-up message... (Enter to send)"
                  rows={2}
                  className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 resize-none text-sm"
                />
                <button onClick={handleReply} disabled={!replyText.trim() || replying} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-40 transition-colors">
                  {replying ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <PaperAirplaneIcon className="w-5 h-5" />}
                </button>
              </div>
              <button onClick={handleResolve} className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 border-2 border-dashed border-emerald-300 text-emerald-700 rounded-xl hover:bg-emerald-50 transition-colors text-sm font-medium">
                <CheckCircleIcon className="w-4 h-4" />
                Mark as Resolved
              </button>
            </div>
          ) : (
            <div className="border-t border-gray-100 p-4 text-center text-emerald-600 font-medium text-sm">
              ✅ This doubt has been resolved!
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── ASK NEW DOUBT ────────────────────────────────────
  if (view === 'ask') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6">
        {toast && <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>{toast.msg}</div>}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold">Ask a Doubt</h2>
                <p className="text-indigo-200 text-sm mt-0.5">Your teacher will respond as soon as possible</p>
              </div>
              <button onClick={() => setView('list')} className="p-2 rounded-xl hover:bg-white/20 transition-colors">
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmitDoubt} className="p-6 space-y-5">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Question Title <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="e.g. How to solve quadratic equations?"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                required
              />
            </div>

            {/* Question */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Detailed Question <span className="text-red-500">*</span></label>
              <textarea
                value={form.question}
                onChange={e => setForm(p => ({ ...p, question: e.target.value }))}
                placeholder="Describe your doubt in detail. Include what you've tried and what you're confused about..."
                rows={5}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm resize-none"
                required
              />
            </div>

            {/* Course selector (replaces manual subject entry) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Course <span className="text-red-500">*</span>
              </label>
              {classesLoading ? (
                <div className="flex items-center gap-2 text-sm text-gray-500 py-2.5 px-4 border border-gray-300 rounded-xl bg-gray-50">
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                  Loading your courses...
                </div>
              ) : enrolledClasses.length === 0 ? (
                <div className="py-2.5 px-4 border border-amber-200 rounded-xl bg-amber-50 text-sm text-amber-700">
                  ⚠️ You are not enrolled in any class yet. Ask your teacher for a class code.
                </div>
              ) : (
                <select
                  value={form.classId}
                  onChange={e => setForm(p => ({ ...p, classId: e.target.value }))}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                  required
                >
                  {enrolledClasses.map(c => (
                    <option key={c._id} value={c._id}>
                      {c.name}{c.grade ? ` (${c.grade})` : ''}{c.subject ? ` — ${c.subject}` : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Category</label>
              <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                className="w-full px-3 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm">
                {CATEGORIES.map(c => <option key={c} value={c}>{CATEGORY_EMOJI[c]} {c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>

            {/* Priority */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Priority</label>
              <div className="flex gap-3">
                {PRIORITIES.map(p => (
                  <button key={p} type="button" onClick={() => setForm(f => ({ ...f, priority: p }))}
                    className={`flex-1 py-2 rounded-xl border-2 text-sm font-medium transition-all ${form.priority === p ? (p==='high'?'border-red-500 bg-red-50 text-red-700':p==='medium'?'border-yellow-500 bg-yellow-50 text-yellow-700':'border-green-500 bg-green-50 text-green-700') : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
                    {p==='high'?'🔴':p==='medium'?'🟡':'🟢'} {p.charAt(0).toUpperCase()+p.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button type="button" onClick={handleAskAI} disabled={aiLoading || !form.question.trim()}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 transition-all shadow-md">
                {aiLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span className="text-xl">✨</span>}
                Ask AI Tutor First
              </button>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-gray-200"></div>
                <span className="flex-shrink-0 mx-4 text-gray-400 text-sm">or</span>
                <div className="flex-grow border-t border-gray-200"></div>
              </div>

              <button type="submit" disabled={submitting || !form.title.trim() || !form.question.trim()}
                className="w-full flex items-center justify-center gap-2 bg-white text-indigo-600 border-2 border-indigo-600 py-3 rounded-xl font-semibold hover:bg-indigo-50 disabled:opacity-50 transition-colors">
                {submitting ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" /> : <PaperAirplaneIcon className="w-5 h-5" />}
                Send to Teacher
              </button>
            </div>
            
            {aiResponse && (
              <div className="mt-6 bg-purple-50 border border-purple-200 rounded-xl p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xl">✨</span>
                  <h3 className="font-bold text-purple-900">AI Tutor Response</h3>
                </div>
                <p className="text-purple-800 text-sm whitespace-pre-wrap leading-relaxed">{aiResponse}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    );
  }

  // ── DOUBTS LIST ──────────────────────────────────────
  const pending = doubts.filter(d => d.status === 'pending').length;
  const answered = doubts.filter(d => d.status === 'answered').length;
  const resolved = doubts.filter(d => d.status === 'resolved').length;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {toast && <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>{toast.msg}</div>}

      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Doubts</h1>
          <p className="text-gray-500 text-sm mt-0.5">Ask questions, get answers from your teacher</p>
        </div>
        <button onClick={() => setView('ask')} className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 font-semibold transition-colors shadow-sm">
          <PlusCircleIcon className="w-5 h-5" />
          Ask a Doubt
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[{label:'Pending', value:pending, icon:'⏳', color:'amber'}, {label:'Answered', value:answered, icon:'💬', color:'blue'}, {label:'Resolved', value:resolved, icon:'✅', color:'emerald'}].map(s => (
          <div key={s.label} className={`bg-white rounded-xl border-2 border-${s.color}-100 p-4 flex items-center gap-4`}>
            <span className="text-2xl">{s.icon}</span>
            <div>
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className={`text-xs font-medium text-${s.color}-600`}>{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + Filter */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search doubts..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm" />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-indigo-500">
          <option value="all">All</option>
          <option value="pending">⏳ Pending</option>
          <option value="answered">💬 Answered</option>
          <option value="resolved">✅ Resolved</option>
        </select>
      </div>

      {/* Doubt Cards */}
      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" /></div>
      ) : !studentEmail ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
          <ExclamationTriangleIcon className="w-12 h-12 text-amber-400 mx-auto mb-3" />
          <p className="text-gray-700 font-medium">Please log in to access doubt resolution</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-200 shadow-sm">
          <ChatBubbleLeftRightIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-900 mb-1">No doubts found</h3>
          <p className="text-gray-500 text-sm mb-4">{doubts.length === 0 ? 'You haven\'t asked any doubts yet.' : 'Try changing your filter.'}</p>
          {doubts.length === 0 && (
            <button onClick={() => setView('ask')} className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700">
              <PlusCircleIcon className="w-4 h-4" /> Ask your first doubt
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(d => (
            <div key={d._id} className="bg-white rounded-2xl border border-gray-200 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all">
              {/* Clickable card body → opens thread */}
              <div onClick={() => { setSelectedDoubt(d); setView('thread'); fetchThread(d._id); }} className="cursor-pointer p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1 pr-4">
                    <h3 className="font-semibold text-gray-900 mb-0.5 line-clamp-1">{d.title}</h3>
                    <p className="text-gray-500 text-sm line-clamp-2">{d.question}</p>
                  </div>
                  <span className={`flex-shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold ${statusBadge[d.status] || statusBadge.pending}`}>
                    {statusLabel[d.status] || d.status}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-400">
                  <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">{d.subject}</span>
                  <span>{CATEGORY_EMOJI[d.category]} {d.category}</span>
                  <span className="ml-auto">{d.responses?.length || 0} replies • {formatTime(d.createdAt)}</span>
                </div>
                {d.status === 'answered' && d.responses?.length > 0 && (
                  <div className="mt-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 text-xs text-emerald-700">
                    💬 Teacher replied — click to view
                  </div>
                )}
              </div>
              {/* Delete button row — always visible for the student */}
              <div className="px-5 pb-3 pt-0 flex justify-end border-t border-gray-50">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteDoubt(d._id, false); }}
                  className="flex items-center gap-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DoubtResolution;
