import React, { useState, useEffect } from 'react';
import { Plus, FileText, Clock, CheckCircle, Users, Search, Trophy, AlertCircle, X, ChevronDown, Trash2, PlusCircle, Eye, Star, MessageSquare, Upload, ListOrdered, FileUp, ExternalLink } from 'lucide-react';
import apiService from '../services/api';

const TYPE_CONFIG = {
  Quiz:       { emoji: '🧠', bg: 'from-violet-500 to-purple-600',  badge: 'bg-violet-100 text-violet-700 border border-violet-200' },
  Homework:   { emoji: '📘', bg: 'from-blue-500 to-cyan-600',      badge: 'bg-blue-100 text-blue-700 border border-blue-200' },
  Project:    { emoji: '🔬', bg: 'from-emerald-500 to-teal-600',   badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200' },
  Exam:       { emoji: '📝', bg: 'from-red-500 to-rose-600',       badge: 'bg-red-100 text-red-700 border border-red-200' },
  Assignment: { emoji: '📄', bg: 'from-indigo-500 to-purple-600',  badge: 'bg-indigo-100 text-indigo-700 border border-indigo-200' },
};
const tc = (type) => TYPE_CONFIG[type] || TYPE_CONFIG['Assignment'];

const Assignments = () => {
  const [activeTab, setActiveTab] = useState('active');
  const [selectedClass, setSelectedClass] = useState('all');
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [submissions, setSubmissions] = useState([]);
  const [gradingData, setGradingData] = useState({});
  const [savingGrade, setSavingGrade] = useState('');
  const [createStep, setCreateStep] = useState(1); // 1=details, 2=questions or pdf
  const [createMode, setCreateMode] = useState('manual'); // 'manual' | 'pdf'
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUploading, setPdfUploading] = useState(false);
  const [toast, setToast] = useState(null);

  const [newAssignment, setNewAssignment] = useState({
    title: '',
    type: 'Assignment',
    assignmentType: 'qa',
    class: '',
    dueDate: '',
    description: '',
    instructions: '',
    totalMarks: 100,
    questions: [{ question: '', points: 10 }]
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Load assignments and classes from API
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [assignRes, classRes] = await Promise.all([
          apiService.getAssignments(),
          apiService.getClasses()
        ]);
        if (assignRes.success) setAssignments(assignRes.data || []);
        if (classRes.success) setClasses(classRes.data || []);
      } catch (err) {
        console.error('Failed to load assignments:', err);
        showToast('Failed to load data. Make sure the backend is running.', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const resetCreateForm = () => {
    setNewAssignment({
      title: '',
      type: 'Assignment',
      assignmentType: 'qa',
      class: '',
      dueDate: '',
      description: '',
      instructions: '',
      totalMarks: 100,
      questions: [{ question: '', points: 10 }]
    });
    setCreateStep(1);
    setCreateMode('manual');
    setPdfFile(null);
  };

  const TEACHER_API = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';
  const getPdfUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) return `${TEACHER_API.replace('/api', '')}${path}`;
    if (path.includes('uploads/content')) return `${TEACHER_API.replace('/api', '')}/${path.replace(/\\/g, '/')}`;
    return `${TEACHER_API.replace('/api', '')}/uploads/content/${path.split(/[/\\]/).pop()}`;
  };

  // Question builder helpers
  const addQuestion = () => {
    setNewAssignment(prev => ({
      ...prev,
      questions: [...prev.questions, { question: '', points: 10 }]
    }));
  };

  const removeQuestion = (idx) => {
    setNewAssignment(prev => ({
      ...prev,
      questions: prev.questions.filter((_, i) => i !== idx)
    }));
  };

  const updateQuestion = (idx, field, value) => {
    setNewAssignment(prev => {
      const updated = [...prev.questions];
      updated[idx] = { ...updated[idx], [field]: value };
      return { ...prev, questions: updated };
    });
  };

  const uploadPdfFile = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiService.uploadContentFile(formData);
    return res.data;
  };

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    if (!newAssignment.class) { showToast('Please select a class', 'error'); return; }

    const description = newAssignment.description?.trim() ||
      (createMode === 'pdf' ? 'Complete the assignment using the attached PDF document.' : 'Answer each question below.');

    try {
      if (createMode === 'pdf') {
        if (!pdfFile) { showToast('Please upload a PDF file', 'error'); return; }
        setPdfUploading(true);
        const uploaded = await uploadPdfFile(pdfFile);
        const payload = {
          title: newAssignment.title,
          type: newAssignment.type,
          assignmentType: 'upload',
          class: newAssignment.class,
          dueDate: newAssignment.dueDate,
          description,
          instructions: newAssignment.instructions || 'Read the attached PDF and submit your work as instructed by your teacher.',
          totalMarks: Number(newAssignment.totalMarks) || 100,
          status: 'active',
          questions: [],
          attachments: [{
            filename: uploaded.filename,
            originalName: uploaded.originalName,
            mimetype: uploaded.mimetype,
            size: uploaded.size,
            path: uploaded.url || uploaded.path
          }]
        };
        const res = await apiService.createAssignment(payload);
        if (res.success) {
          setAssignments(prev => [res.data, ...prev]);
          setShowCreateModal(false);
          resetCreateForm();
          showToast('PDF assignment published! Students can download and complete it.');
        }
        return;
      }

      const emptyQ = newAssignment.questions.some(q => !q.question?.trim());
      if (emptyQ) { showToast('Please fill in all questions', 'error'); return; }

      const totalMarks = newAssignment.questions.reduce((sum, q) => sum + (Number(q.points) || 0), 0) || newAssignment.totalMarks;
      const payload = {
        ...newAssignment,
        description,
        assignmentType: 'qa',
        totalMarks,
        status: 'active',
        questions: newAssignment.questions.map(q => ({
          question: q.question,
          type: 'essay',
          points: Number(q.points) || 10
        }))
      };
      const res = await apiService.createAssignment(payload);
      if (res.success) {
        setAssignments(prev => [res.data, ...prev]);
        setShowCreateModal(false);
        resetCreateForm();
        showToast(`${newAssignment.type} published! Students can now see it.`);
      }
    } catch (err) {
      showToast(err.message || 'Failed to create assignment', 'error');
    } finally {
      setPdfUploading(false);
    }
  };

  const handlePublish = async (assignmentId) => {
    try {
      const res = await apiService.updateAssignment(assignmentId, { status: 'active' });
      if (res.success) {
        setAssignments(prev => prev.map(a => a._id === assignmentId ? { ...a, status: 'active' } : a));
        showToast('Assignment published successfully!');
      }
    } catch (err) {
      showToast(err.message || 'Failed to publish', 'error');
    }
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm('Are you sure you want to delete this assignment?')) return;
    try {
      await apiService.deleteAssignment(assignmentId);
      setAssignments(prev => prev.filter(a => a._id !== assignmentId));
      showToast('Assignment deleted.');
    } catch (err) {
      showToast(err.message || 'Failed to delete', 'error');
    }
  };

  const openGradeModal = async (assignment) => {
    setSelectedAssignment(assignment);
    setShowGradeModal(true);
    setGradeLoading(true);
    try {
      const res = await apiService.getAssignmentSubmissions(assignment._id);
      const subs = res.data || [];
      setSubmissions(subs);
      // Build grading data pre-filled with existing scores
      const gd = {};
      subs.forEach(sub => {
        const sid = sub._id;
        gd[sid] = { score: sub.score ?? '', feedback: sub.feedback || '' };
      });
      setGradingData(gd);
    } catch (err) {
      console.error('Failed to load submissions:', err);
      showToast('Failed to load submissions', 'error');
    } finally {
      setGradeLoading(false);
    }
  };

  const openViewModal = (assignment) => {
    setSelectedAssignment(assignment);
    setShowViewModal(true);
  };

  const handleSaveGrade = async (submissionId) => {
    if (!selectedAssignment) return;
    const { score, feedback } = gradingData[submissionId] || {};
    if (score === '' || score === undefined) { showToast('Please enter a score', 'error'); return; }
    setSavingGrade(submissionId);
    try {
      await apiService.gradeSubmission(selectedAssignment._id, submissionId, {
        score: Number(score),
        feedback
      });
      setSubmissions(prev => prev.map(s => s._id === submissionId
        ? { ...s, score: Number(score), feedback, gradedAt: new Date().toISOString() }
        : s
      ));
      showToast('Grade saved!');
    } catch (err) {
      showToast(err.message || 'Failed to save grade', 'error');
    } finally {
      setSavingGrade('');
    }
  };

  const filteredAssignments = assignments.filter(a => {
    const matchesTab = activeTab === 'all' || a.status === activeTab;
    const matchesClass = selectedClass === 'all' || a.class?._id === selectedClass;
    const matchesSearch = a.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          a.class?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesTab && matchesClass && matchesSearch;
  });

  const active = assignments.filter(a => a.status === 'active').length;
  const completed = assignments.filter(a => a.status === 'completed').length;
  const draft = assignments.filter(a => a.status === 'draft').length;
  const totalSubmissions = assignments.reduce((sum, a) => sum + (a.submissions?.length || 0), 0);

  const formatDate = (ds) => {
    if (!ds) return 'No date';
    const d = new Date(ds);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
      completed: 'bg-blue-100 text-blue-800 border border-blue-200',
      draft: 'bg-gray-100 text-gray-700 border border-gray-200',
      archived: 'bg-red-100 text-red-800 border border-red-200'
    };
    return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${styles[status] || styles.draft}`}>{status?.charAt(0).toUpperCase() + status?.slice(1)}</span>;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium transition-all ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Assignments</h1>
            <p className="text-gray-500 mt-1">Create Q&amp;A or PDF assignments, manage submissions &amp; grade students</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-xl px-4 py-2 pr-8 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Classes</option>
                {classes.map((cls) => (
                  <option key={cls._id} value={cls._id}>{cls.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
            <button
              onClick={() => { resetCreateForm(); setShowCreateModal(true); }}
              className="bg-blue-600 text-white px-5 py-2 rounded-xl font-semibold hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create Assignment
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active', value: active, icon: CheckCircle, color: 'emerald' },
            { label: 'Drafts', value: draft, icon: Clock, color: 'amber' },
            { label: 'Completed', value: completed, icon: Trophy, color: 'blue' },
            { label: 'Total Submissions', value: totalSubmissions, icon: Users, color: 'purple' }
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-2xl p-5 border border-gray-200 shadow-sm flex items-center gap-4">
              <div className={`bg-${color}-100 p-3 rounded-xl`}>
                <Icon className={`w-5 h-5 text-${color}-600`} />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 font-medium">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Assignment List */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          <div className="p-5 border-b border-gray-200 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex gap-1">
              {['active', 'draft', 'completed', 'all'].map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${activeTab === tab ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search assignments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-56"
              />
            </div>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="flex justify-center py-16">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
              </div>
            ) : filteredAssignments.length === 0 ? (
              <div className="text-center py-16">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-700 mb-1">No assignments found</h3>
                <p className="text-sm text-gray-500">Create your first Q&amp;A assignment using the button above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredAssignments.map(assignment => {
                  const submissionCount = assignment.submissions?.length || 0;
                  const gradedCount = assignment.submissions?.filter(s => s.score !== undefined && s.score !== null).length || 0;
                  const dueDate = new Date(assignment.dueDate);
                  const isOverdue = dueDate < new Date() && assignment.status === 'active';
                  return (
                    <div key={assignment._id} className="border border-gray-200 rounded-2xl p-5 hover:shadow-md transition-all duration-200 bg-white">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4 flex-1 min-w-0">
                          <div className={`bg-gradient-to-br ${tc(assignment.type).bg} p-3 rounded-xl flex items-center justify-center min-w-[48px] h-12 text-xl`}>
                            {tc(assignment.type).emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-1">
                              <h3 className="text-base font-bold text-gray-900">{assignment.title}</h3>
                              {getStatusBadge(assignment.status)}
                              {assignment.assignmentType === 'upload' && (
                                <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                                  📎 PDF
                                </span>
                              )}
                              {assignment.assignmentType === 'qa' && (
                                <span className={`px-2 py-0.5 text-xs font-semibold rounded-full ${tc(assignment.type).badge}`}>
                                  {tc(assignment.type).emoji} Q&amp;A
                                </span>
                              )}
                              {isOverdue && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full border border-red-200">Overdue</span>}
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-2">
                              <span className="font-medium text-gray-700">{assignment.class?.name || 'No class'}</span>
                              <span>•</span>
                              <span>{assignment.assignmentType === 'upload' ? 'PDF Document' : `${assignment.questions?.length || 0} Questions`}</span>
                              <span>•</span>
                              <span>{assignment.totalMarks} Marks</span>
                              <span>•</span>
                              <span>Due {formatDate(assignment.dueDate)}</span>
                            </div>
                            {assignment.status !== 'draft' && (
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-500">{submissionCount} submitted • {gradedCount} graded</span>
                                <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-1.5">
                                  <div
                                    className="bg-blue-600 h-1.5 rounded-full"
                                    style={{ width: `${submissionCount ? (gradedCount / submissionCount) * 100 : 0}%` }}
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <button
                            onClick={() => openViewModal(assignment)}
                            title="View Assignment"
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          {assignment.status === 'active' && (
                            <button
                              onClick={() => openGradeModal(assignment)}
                              className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors"
                            >
                              Grade
                            </button>
                          )}
                          {assignment.status === 'draft' && (
                            <button
                              onClick={() => handlePublish(assignment._id)}
                              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                            >
                              Publish
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(assignment._id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ──────────── Create Assignment Modal ──────────── */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Create {newAssignment.type} {tc(newAssignment.type).emoji}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  Step {createStep} of 2 · {createMode === 'pdf' ? 'PDF upload' : 'Question by question'}
                </p>
              </div>
              <button onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Step progress */}
            <div className="px-6 pt-4 flex-shrink-0">
              <div className="flex gap-2">
                <div className={`flex-1 h-1.5 rounded-full ${createStep >= 1 ? 'bg-blue-600' : 'bg-gray-200'}`} />
                <div className={`flex-1 h-1.5 rounded-full ${createStep >= 2 ? 'bg-blue-600' : 'bg-gray-200'}`} />
              </div>
            </div>

            <form onSubmit={handleCreateAssignment} className="flex flex-col flex-1 overflow-hidden">
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {createStep === 1 && (
                  <>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-2">How do you want to create this assignment?</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <button
                          type="button"
                          onClick={() => { setCreateMode('manual'); setPdfFile(null); }}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            createMode === 'manual'
                              ? 'border-blue-500 bg-blue-50 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <ListOrdered className={`w-6 h-6 mb-2 ${createMode === 'manual' ? 'text-blue-600' : 'text-gray-400'}`} />
                          <p className="font-semibold text-gray-900 text-sm">Add questions one by one</p>
                          <p className="text-xs text-gray-500 mt-1">Build open-ended Q&amp;A questions with marks per question</p>
                        </button>
                        <button
                          type="button"
                          onClick={() => setCreateMode('pdf')}
                          className={`p-4 rounded-2xl border-2 text-left transition-all ${
                            createMode === 'pdf'
                              ? 'border-amber-500 bg-amber-50 shadow-sm'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <FileUp className={`w-6 h-6 mb-2 ${createMode === 'pdf' ? 'text-amber-600' : 'text-gray-400'}`} />
                          <p className="font-semibold text-gray-900 text-sm">Upload PDF</p>
                          <p className="text-xs text-gray-500 mt-1">Attach a PDF worksheet or assignment sheet for students</p>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Title <span className="text-red-500">*</span></label>
                        <input
                          type="text"
                          value={newAssignment.title}
                          onChange={e => setNewAssignment(p => ({ ...p, title: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="e.g. Chapter 3 Review"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Type</label>
                        <select
                          value={newAssignment.type}
                          onChange={e => setNewAssignment(p => ({ ...p, type: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        >
                          {['Assignment', 'Quiz', 'Homework', 'Project', 'Exam'].map(t => <option key={t}>{t}</option>)}
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Class <span className="text-red-500">*</span></label>
                        <select
                          value={newAssignment.class}
                          onChange={e => setNewAssignment(p => ({ ...p, class: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          required
                        >
                          <option value="">Select a class...</option>
                          {classes.map(cls => <option key={cls._id} value={cls._id}>{cls.name} — {cls.subject}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Due Date <span className="text-red-500">*</span></label>
                        <input
                          type="date"
                          value={newAssignment.dueDate}
                          onChange={e => setNewAssignment(p => ({ ...p, dueDate: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Description</label>
                      <textarea
                        value={newAssignment.description}
                        onChange={e => setNewAssignment(p => ({ ...p, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="Brief description for students..."
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Instructions</label>
                      <textarea
                        value={newAssignment.instructions}
                        onChange={e => setNewAssignment(p => ({ ...p, instructions: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500"
                        rows={2}
                        placeholder="Detailed instructions for answering..."
                      />
                    </div>
                  </>
                )}

                {createStep === 2 && createMode === 'pdf' && (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900">Upload assignment PDF</h4>
                      <p className="text-xs text-gray-500 mt-0.5">Students will download this PDF and submit their work as instructed.</p>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1.5">Total Marks</label>
                      <input
                        type="number"
                        min="1"
                        value={newAssignment.totalMarks}
                        onChange={e => setNewAssignment(p => ({ ...p, totalMarks: e.target.value }))}
                        className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <label
                      className={`flex flex-col items-center justify-center w-full min-h-[200px] border-2 border-dashed rounded-2xl cursor-pointer transition-all ${
                        pdfFile ? 'border-amber-400 bg-amber-50' : 'border-gray-300 hover:border-amber-400 hover:bg-amber-50/50'
                      }`}
                    >
                      <input
                        type="file"
                        accept=".pdf,application/pdf"
                        className="hidden"
                        onChange={e => {
                          const file = e.target.files?.[0];
                          if (file && file.type !== 'application/pdf') {
                            showToast('Please select a PDF file only', 'error');
                            return;
                          }
                          setPdfFile(file || null);
                        }}
                      />
                      {pdfFile ? (
                        <>
                          <FileText className="w-12 h-12 text-amber-600 mb-3" />
                          <p className="font-semibold text-gray-900 text-sm">{pdfFile.name}</p>
                          <p className="text-xs text-gray-500 mt-1">{(pdfFile.size / 1024).toFixed(1)} KB · Click to change</p>
                        </>
                      ) : (
                        <>
                          <Upload className="w-12 h-12 text-gray-400 mb-3" />
                          <p className="font-semibold text-gray-700 text-sm">Click to upload PDF</p>
                          <p className="text-xs text-gray-500 mt-1">PDF only</p>
                        </>
                      )}
                    </label>
                  </div>
                )}

                {createStep === 2 && createMode === 'manual' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-gray-900">Questions</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Students will write open-ended text answers. Total marks: {newAssignment.questions.reduce((s, q) => s + (Number(q.points) || 0), 0)}</p>
                      </div>
                      <button type="button" onClick={addQuestion} className="flex items-center gap-1.5 text-sm text-blue-600 font-semibold hover:bg-blue-50 px-3 py-1.5 rounded-lg transition-colors">
                        <PlusCircle className="w-4 h-4" /> Add Question
                      </button>
                    </div>

                    {newAssignment.questions.map((q, idx) => (
                      <div key={idx} className="border border-gray-200 rounded-2xl p-4 bg-gray-50">
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <span className="bg-blue-600 text-white text-xs font-bold px-2.5 py-1 rounded-full mt-0.5">Q{idx + 1}</span>
                          <button
                            type="button"
                            onClick={() => removeQuestion(idx)}
                            disabled={newAssignment.questions.length === 1}
                            className="text-gray-400 hover:text-red-500 disabled:opacity-30 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <textarea
                          value={q.question}
                          onChange={e => updateQuestion(idx, 'question', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 bg-white mb-3"
                          rows={2}
                          placeholder="Enter your question here..."
                          required
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-xs font-semibold text-gray-600">Marks:</label>
                          <input
                            type="number"
                            value={q.points}
                            onChange={e => updateQuestion(idx, 'points', e.target.value)}
                            min="1"
                            className="w-20 px-2 py-1 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer buttons */}
              <div className="p-6 border-t border-gray-200 flex justify-between gap-3 flex-shrink-0">
                {createStep === 1 ? (
                  <>
                    <button type="button" onClick={() => { setShowCreateModal(false); resetCreateForm(); }} className="px-5 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">Cancel</button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!newAssignment.title || !newAssignment.class || !newAssignment.dueDate) {
                          showToast('Please fill in all required fields', 'error');
                          return;
                        }
                        setCreateStep(2);
                      }}
                      className="bg-blue-600 text-white px-6 py-2 rounded-xl font-semibold text-sm hover:bg-blue-700 transition-colors"
                    >
                      {createMode === 'pdf' ? 'Next: Upload PDF →' : 'Next: Add Questions →'}
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={() => setCreateStep(1)} className="px-5 py-2 text-gray-600 hover:text-gray-800 font-medium text-sm">← Back</button>
                    <button
                      type="submit"
                      disabled={pdfUploading}
                      className={`text-white px-6 py-2 rounded-xl font-semibold text-sm transition-all disabled:opacity-50 ${
                        createMode === 'pdf'
                          ? 'bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700'
                          : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700'
                      }`}
                    >
                      {pdfUploading ? 'Uploading...' : createMode === 'pdf' ? 'Publish PDF Assignment' : 'Create Assignment'}
                    </button>
                  </>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ──────────── View Assignment Modal ──────────── */}
      {showViewModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">{selectedAssignment.title}</h3>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <div className="flex flex-wrap gap-2">
                {getStatusBadge(selectedAssignment.status)}
                <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${
                  selectedAssignment.assignmentType === 'upload'
                    ? 'bg-amber-100 text-amber-800 border-amber-200'
                    : 'bg-purple-100 text-purple-700 border-purple-200'
                }`}>
                  {selectedAssignment.assignmentType === 'upload' ? '📎 PDF' : 'Q&amp;A'}
                </span>
                <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-xs font-semibold rounded-full">{selectedAssignment.totalMarks} Total Marks</span>
              </div>
              <div className="text-sm text-gray-600 space-y-1">
                <p><span className="font-semibold">Class:</span> {selectedAssignment.class?.name}</p>
                <p><span className="font-semibold">Due:</span> {formatDate(selectedAssignment.dueDate)}</p>
                {selectedAssignment.description && <p><span className="font-semibold">Description:</span> {selectedAssignment.description}</p>}
                {selectedAssignment.instructions && <p><span className="font-semibold">Instructions:</span> {selectedAssignment.instructions}</p>}
              </div>
              {selectedAssignment.assignmentType === 'upload' && selectedAssignment.attachments?.length > 0 && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Attached PDF</h4>
                  {selectedAssignment.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={getPdfUrl(att.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                    >
                      <FileText className="w-8 h-8 text-amber-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm truncate">{att.originalName || att.filename}</p>
                        <p className="text-xs text-gray-500">Click to open PDF</p>
                      </div>
                      <ExternalLink className="w-4 h-4 text-amber-600 flex-shrink-0" />
                    </a>
                  ))}
                </div>
              )}
              {selectedAssignment.assignmentType !== 'upload' && (
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Questions ({selectedAssignment.questions?.length || 0})</h4>
                <div className="space-y-3">
                  {(selectedAssignment.questions || []).map((q, i) => (
                    <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <div className="flex items-start justify-between gap-2">
                        <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">Q{i + 1}</span>
                        <span className="text-xs text-gray-500 font-medium">{q.points || 0} pts</span>
                      </div>
                      <p className="text-sm text-gray-800 mt-2">{q.question}</p>
                    </div>
                  ))}
                </div>
              </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────── Grade Modal ──────────── */}
      {showGradeModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Grade Submissions</h3>
                <p className="text-sm text-gray-500 mt-0.5">{selectedAssignment.title} • {selectedAssignment.totalMarks} total marks</p>
              </div>
              <button onClick={() => setShowGradeModal(false)} className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {gradeLoading ? (
                <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>
              ) : submissions.length === 0 ? (
                <div className="text-center py-16">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <h4 className="text-lg font-semibold text-gray-700">No submissions yet</h4>
                  <p className="text-sm text-gray-500 mt-1">Students haven't submitted answers for this assignment.</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {submissions.map(sub => {
                    const student = sub.student;
                    const isGraded = sub.score !== undefined && sub.score !== null;
                    const gd = gradingData[sub._id] || { score: '', feedback: '' };
                    return (
                      <div key={sub._id} className="border border-gray-200 rounded-2xl overflow-hidden">
                        {/* Student header */}
                        <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-200">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm">
                              {(student?.fullName || student?.name || 'S')[0].toUpperCase()}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">{student?.fullName || student?.name || 'Unknown Student'}</p>
                              <p className="text-xs text-gray-500">{student?.email} • Submitted {formatDate(sub.submittedAt)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {sub.isLate && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">Late</span>}
                            {isGraded
                              ? <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-sm font-bold rounded-full">{sub.score}/{selectedAssignment.totalMarks}</span>
                              : <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded-full">Pending Grade</span>
                            }
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          {selectedAssignment.assignmentType === 'upload' && sub.attachments?.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Student PDF Submission</h5>
                              <div className="space-y-2">
                                {sub.attachments.map((att, idx) => (
                                  <a
                                    key={idx}
                                    href={getPdfUrl(att.path)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100"
                                  >
                                    <FileText className="w-5 h-5 text-amber-600" />
                                    <span className="text-sm font-medium text-gray-900 truncate">{att.originalName || att.filename}</span>
                                    <ExternalLink className="w-4 h-4 text-amber-600 ml-auto" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Q&A Answers */}
                          {(selectedAssignment.questions || []).map((q, qi) => {
                            const ans = (sub.answers || []).find(a => a.questionIndex === qi);
                            return (
                              <div key={qi} className="bg-white border border-gray-100 rounded-xl p-3">
                                <div className="flex items-start gap-2 mb-2">
                                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0">Q{qi + 1}</span>
                                  <span className="text-xs text-gray-500">{q.points} pts</span>
                                </div>
                                <p className="text-sm font-medium text-gray-700 mb-2">{q.question}</p>
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
                                  <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                                    <MessageSquare className="w-3 h-3" /> Student's Answer
                                  </p>
                                  <p className="text-sm text-gray-800 whitespace-pre-wrap">
                                    {ans?.answer || <span className="text-gray-400 italic">No answer provided</span>}
                                  </p>
                                </div>
                              </div>
                            );
                          })}

                          {/* Grading Section */}
                          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-2">
                            <div className="flex items-center gap-2 mb-3">
                              <Star className="w-4 h-4 text-emerald-600" />
                              <h5 className="font-semibold text-gray-900 text-sm">Assign Grade</h5>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                              <div>
                                <label className="block text-xs font-semibold text-gray-600 mb-1">
                                  Score (out of {selectedAssignment.totalMarks})
                                </label>
                                <input
                                  type="number"
                                  value={gd.score}
                                  onChange={e => setGradingData(prev => ({ ...prev, [sub._id]: { ...gd, score: e.target.value } }))}
                                  min="0"
                                  max={selectedAssignment.totalMarks}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                                  placeholder="e.g. 85"
                                />
                              </div>
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-semibold text-gray-600 mb-1">Feedback (optional)</label>
                                <input
                                  type="text"
                                  value={gd.feedback}
                                  onChange={e => setGradingData(prev => ({ ...prev, [sub._id]: { ...gd, feedback: e.target.value } }))}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500"
                                  placeholder="Good work! Keep improving..."
                                />
                              </div>
                            </div>
                            <button
                              onClick={() => handleSaveGrade(sub._id)}
                              disabled={savingGrade === sub._id}
                              className="mt-3 w-full sm:w-auto bg-emerald-600 text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                            >
                              {savingGrade === sub._id ? 'Saving...' : isGraded ? '✓ Update Grade' : 'Save Grade'}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Assignments;