import React, { useState, useEffect } from 'react';
import { Plus, FileText, Clock, CheckCircle, AlertCircle, Eye, X, Upload, PenTool, Link as LinkIcon, HelpCircle, Paperclip } from 'lucide-react';
import apiService from '../services/api';

const ClassAssignments = ({ classId }) => {
  const [filter, setFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [newAssignment, setNewAssignment] = useState({
    title: '',
    type: 'Assignment',
    dueDate: '',
    description: '',
    totalMarks: 100,
    assignmentType: 'text',
  });
  const [assignments, setAssignments] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch assignments and students
  useEffect(() => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    
    const fetchData = async () => {
      try {
        const [assignmentsRes, studentsRes] = await Promise.all([
          apiService.getAssignments(`?class=${classId}`),
          apiService.getClassStudents(classId),
        ]);
        setAssignments(assignmentsRes.data || []);
        setStudents(studentsRes.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load assignments or students');
        setAssignments([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
    
    // Refresh assignments every 30 seconds to get new submissions
    const interval = setInterval(() => {
      fetchData();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [classId]);

  // Helper for number of submissions per assignment
  const getSubmittedCount = (assignment) => assignment.submissions?.length || 0;

  const handleCreateAssignment = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        ...newAssignment,
        class: classId,
        dueDate: newAssignment.dueDate,
        totalMarks: newAssignment.totalMarks,
      };
      await apiService.createAssignment(payload);
      // Refresh assignments list
      const refreshed = await apiService.getAssignments(`?class=${classId}`);
      setAssignments(refreshed.data || []);
      setShowCreateModal(false);
      setNewAssignment({
        title: '', type: 'Assignment', dueDate: '', description: '', totalMarks: 100, assignmentType: 'text'
      });
    } catch (err) {
      setError(err.message || 'Failed to create assignment');
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async (assignmentId) => {
    setLoading(true);
    setError(null);
    try {
      await apiService.updateAssignment(assignmentId, { status: 'active' });
      const refreshed = await apiService.getAssignments(`?class=${classId}`);
      setAssignments(refreshed.data || []);
      setFilter('active'); // Automatically switch to show published assignment(s)
    } catch (err) {
      setError(err.message || 'Failed to publish assignment');
    } finally {
      setLoading(false);
    }
  };

  const handleGrade = async (assignment) => {
    try {
      setSelectedAssignment(assignment);
      setLoading(true);
      // Fetch latest submissions for this assignment
      const resp = await apiService.getAssignmentSubmissions(assignment._id);
      console.log('📥 Fetched submissions:', resp);
      setSubmissions(resp.data || []);
      setShowGradeModal(true);
    } catch (err) {
      console.error('❌ Error loading submissions:', err);
      setError(err.message || 'Failed to load submissions');
      alert(`Failed to load submissions: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Filtering (keep as before)
  const filteredAssignments = assignments.filter((assignment) => {
    if (filter === 'all') return true;
    return assignment.status === filter;
  });

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'completed': return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'draft': return <AlertCircle className="w-4 h-4 text-gray-600" />;
      default: return <FileText className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // --- Loading/Error handling
  if (loading) {
    return (
      <div className="flex w-full justify-center items-center py-24">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        <span className="ml-4 text-gray-600">Loading assignments...</span>
      </div>
    );
  }
  if (error) {
    return (
      <div className="py-8 text-center text-red-600 font-bold ">{error}</div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Actions and filter, as before... */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Assignments
          </h2>
          <p className="text-gray-600 mt-1">Manage assignments for this class</p>
        </div>
        <button className="mt-4 sm:mt-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 hover:scale-105 transition-all duration-300 flex items-center space-x-2 shadow-lg">
          <Plus className="w-4 h-4" />
          <span>Create Assignment</span>
        </button>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="mt-4 sm:mt-0 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 hover:scale-105 transition-all duration-300 flex items-center space-x-2 shadow-lg"
        >
          <Plus className="w-4 h-4" />
          <span>Create Assignment</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white/70 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg">
        <nav className="flex space-x-8 px-6 py-2">
          {[
            { key: 'all', label: 'All Assignments', count: assignments.length },
            { key: 'active', label: 'Active', count: assignments.filter(a => a.status === 'active').length },
            { key: 'completed', label: 'Completed', count: assignments.filter(a => a.status === 'completed').length },
            { key: 'draft', label: 'Draft', count: assignments.filter(a => a.status === 'draft').length },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`py-3 px-4 border-b-3 font-semibold text-sm transition-all duration-300 hover:scale-105 rounded-t-lg ${
                filter === tab.key
                  ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50'
                  : 'border-transparent text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </nav>
      </div>

      {/* Assignments List */}
      <div className="space-y-6">
        {filteredAssignments.map((assignment) => (
          <div key={assignment._id} className="bg-white/70 backdrop-blur-xl border border-white/20 rounded-2xl p-6 hover:shadow-2xl hover:scale-102 transition-all duration-300 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  {getStatusIcon(assignment.status)}
                  <h3 className="text-xl font-bold text-gray-900">{assignment.title}</h3>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-sm ${getStatusColor(assignment.status)}`}>
                    {assignment.status?.charAt(0).toUpperCase() + assignment.status?.slice(1)}
                  </span>
                </div>
                <p className="text-gray-600 mb-4 text-sm">{assignment.description}</p>
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <span className="bg-gray-100 px-2 py-1 rounded-lg">Type: {assignment.type}</span>
                  <span className="bg-amber-100 px-2 py-1 rounded-lg">Due: {assignment.dueDate ? new Date(assignment.dueDate).toLocaleDateString() : '-'}</span>
                  <span className="bg-blue-100 px-2 py-1 rounded-lg">Created: {assignment.createdAt ? new Date(assignment.createdAt).toLocaleDateString() : '-'}</span>
                </div>
              </div>
              <div className="flex items-center space-x-3 ml-4">
                <button className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all duration-200">
                  <Eye className="w-4 h-4" />
                </button>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 font-medium">Submissions</span>
                <span className="font-bold text-indigo-600">
                  {getSubmittedCount(assignment)} / {students.length}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                <div
                  className="bg-gradient-to-r from-indigo-500 to-purple-600 h-3 rounded-full transition-all duration-500 shadow-sm"
                  style={{ width: `${students.length ? ((getSubmittedCount(assignment) / students.length) * 100) : 0}%` }}
                ></div>
              </div>
            </div>
            {/* Action Buttons (as before) */}
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100">
              <div className="flex space-x-2">
                <button 
                  onClick={() => handleGrade(assignment)}
                  className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-200"
                >
                  View Submissions ({getSubmittedCount(assignment)})
                </button>
                <button className="text-gray-600 hover:text-gray-700 hover:bg-gray-50 px-3 py-1 rounded-lg text-sm font-semibold transition-all duration-200">
                  Edit
                </button>
              </div>
              <div className="flex items-center space-x-2">
                {assignment.status === 'active' && (
                  <button  onClick={() => handleGrade(assignment)} className="bg-gradient-to-r from-emerald-500 to-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-emerald-600 hover:to-green-700 hover:scale-105 transition-all duration-300 shadow-lg">
                    Grade Now
                  </button>
                )}
                {assignment.status === 'draft' && (
                  <button  onClick={() => handlePublish(assignment._id)} className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 hover:scale-105 transition-all duration-300 shadow-lg">
                    Publish
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
      {/* Empty State */}
      {filteredAssignments.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <FileText className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No assignments found</h3>
          <p className="text-gray-500">
            {filter === 'all'
              ? 'Create your first assignment to get started.'
              : `No ${filter} assignments at the moment.`}
          </p>
        </div>
      )}
      {/* Create Assignment Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Create New Assignment</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleCreateAssignment} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Title</label>
                  <input
                    type="text"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({...newAssignment, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Chapter 5 Quiz"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                  <select
                    value={newAssignment.type}
                    onChange={(e) => setNewAssignment({...newAssignment, type: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Assignment">Assignment</option>
                    <option value="Quiz">Quiz</option>
                    <option value="Homework">Homework</option>
                    <option value="Project">Project</option>
                    <option value="Exam">Exam</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assignment Format</label>
                <div className="grid grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setNewAssignment({...newAssignment, assignmentType: 'text'})}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      newAssignment.assignmentType === 'text' 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <PenTool className="w-6 h-6 mx-auto mb-2 text-blue-600" />
                    <div className="text-sm font-medium">Text Response</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAssignment({...newAssignment, assignmentType: 'upload'})}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      newAssignment.assignmentType === 'upload' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Upload className="w-6 h-6 mx-auto mb-2 text-green-600" />
                    <div className="text-sm font-medium">File Upload</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewAssignment({...newAssignment, assignmentType: 'quiz'})}
                    className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                      newAssignment.assignmentType === 'quiz' 
                        ? 'border-purple-500 bg-purple-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <HelpCircle className="w-6 h-6 mx-auto mb-2 text-purple-600" />
                    <div className="text-sm font-medium">Quiz</div>
                  </button>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Due Date</label>
                  <input
                    type="date"
                    value={newAssignment.dueDate}
                    onChange={(e) => setNewAssignment({...newAssignment, dueDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Total Marks</label>
                  <input
                    type="number"
                    value={newAssignment.totalMarks}
                    onChange={(e) => setNewAssignment({...newAssignment, totalMarks: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={newAssignment.description}
                  onChange={(e) => setNewAssignment({...newAssignment, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                  placeholder="Describe the assignment details..."
                  required
                />
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200"
                >
                  Create Assignment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Grade Assignment Modal - Google Classroom Style */}
      {showGradeModal && selectedAssignment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-6xl mx-4 max-h-[95vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex-1">
                <h3 className="text-xl font-semibold text-gray-900">{selectedAssignment.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {submissions.length} {submissions.length === 1 ? 'submission' : 'submissions'} • 
                  Due {selectedAssignment.dueDate ? new Date(selectedAssignment.dueDate).toLocaleDateString() : '—'}
                </p>
              </div>
              <button 
                onClick={() => setShowGradeModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-200 rounded-lg transition-all duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto">
              {submissions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 px-4">
                  <FileText className="w-16 h-16 text-gray-300 mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No submissions yet</h4>
                  <p className="text-sm text-gray-500 text-center">Students haven't submitted their work for this assignment.</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {submissions.map((sub, index) => (
                    <div key={sub._id} className="p-6 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start space-x-4">
                        {/* Student Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-3">
                            <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-indigo-600 font-semibold text-sm">
                                {(sub.student?.name || sub.student?.email || 'S')[0].toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-base font-semibold text-gray-900 truncate">
                                {sub.student?.name || sub.student?.email || 'Student'}
                              </h4>
                              <p className="text-xs text-gray-500">
                                {sub.submittedAt 
                                  ? `Turned in ${new Date(sub.submittedAt).toLocaleString()}`
                                  : 'Not turned in'}
                                {sub.isLate && (
                                  <span className="ml-2 text-orange-600 font-medium">• Late</span>
                                )}
                              </p>
                            </div>
                          </div>

                          {/* Student Work Content */}
                          {sub.content && (
                            <div className="mb-4 p-3 bg-white border border-gray-200 rounded-lg">
                              <p className="text-sm text-gray-700 whitespace-pre-wrap">{sub.content}</p>
                            </div>
                          )}

                          {/* Attachments - Clickable Files */}
                          {sub.attachments && sub.attachments.length > 0 && (
                            <div className="mb-4">
                              <h5 className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">
                                Student Work ({sub.attachments.length})
                              </h5>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {sub.attachments.map((attachment, idx) => {
                                  // Construct proper file URL
                                  let fileUrl = '';
                                  if (attachment.path) {
                                    if (attachment.path.startsWith('http')) {
                                      fileUrl = attachment.path;
                                    } else if (attachment.path.startsWith('/uploads')) {
                                      fileUrl = `http://localhost:5001${attachment.path}`;
                                    } else if (attachment.path.startsWith('uploads')) {
                                      fileUrl = `http://localhost:5001/${attachment.path}`;
                                    } else {
                                      fileUrl = `http://localhost:5001/uploads/${attachment.path}`;
                                    }
                                  } else if (attachment.url) {
                                    fileUrl = attachment.url.startsWith('http') 
                                      ? attachment.url 
                                      : `http://localhost:5001${attachment.url}`;
                                  }
                                  
                                  const fileName = attachment.originalName || attachment.filename || `Attachment ${idx + 1}`;
                                  const fileType = attachment.mimetype || 'file';
                                  
                                  return (
                                    <button
                                      key={idx}
                                      onClick={() => {
                                        if (fileUrl) {
                                          window.open(fileUrl, '_blank');
                                        }
                                      }}
                                      className="flex items-center space-x-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-indigo-400 hover:bg-indigo-50 transition-all cursor-pointer text-left group"
                                    >
                                      <div className="w-10 h-10 bg-red-100 rounded flex items-center justify-center flex-shrink-0">
                                        <FileText className="w-5 h-5 text-red-600" />
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-indigo-600">
                                          {fileName}
                                        </p>
                                        <p className="text-xs text-gray-500 capitalize">{fileType}</p>
                                      </div>
                                      <Eye className="w-4 h-4 text-gray-400 group-hover:text-indigo-600 flex-shrink-0" />
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Grading Section */}
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            {sub.score !== undefined ? (
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="text-sm font-medium text-gray-700">Graded</span>
                                  </div>
                                  {sub.feedback && (
                                    <p className="text-sm text-gray-600 mt-2 p-2 bg-gray-50 rounded">
                                      {sub.feedback}
                                    </p>
                                  )}
                                </div>
                                <div className="text-right">
                                  <div className="text-2xl font-bold text-green-600">
                                    {sub.score} / {selectedAssignment.totalMarks}
                                  </div>
                                  <div className="text-xs text-gray-500">
                                    {((sub.score / selectedAssignment.totalMarks) * 100).toFixed(0)}%
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-600">Not graded</span>
                                <button
                                  onClick={async () => {
                                    const scoreInput = prompt(`Enter score (out of ${selectedAssignment.totalMarks}):`);
                                    if (scoreInput === null) return;
                                    const score = Number(scoreInput);
                                    if (isNaN(score) || score < 0 || score > selectedAssignment.totalMarks) {
                                      alert(`Please enter a valid score between 0 and ${selectedAssignment.totalMarks}`);
                                      return;
                                    }
                                    const feedback = prompt('Enter feedback (optional):') || '';
                                    try {
                                      await apiService.gradeSubmission(selectedAssignment._id, sub._id, { 
                                        score: score, 
                                        feedback: feedback 
                                      });
                                      // Refresh submissions after grading
                                      const refreshed = await apiService.getAssignmentSubmissions(selectedAssignment._id);
                                      setSubmissions(refreshed.data || []);
                                      // Also refresh assignments list to update submission count
                                      const assignmentsRefreshed = await apiService.getAssignments(`?class=${classId}`);
                                      setAssignments(assignmentsRefreshed.data || []);
                                    } catch (e) {
                                      alert(e.message || 'Failed to grade');
                                    }
                                  }}
                                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium shadow-sm transition-colors"
                                >
                                  Grade
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-600">
                {submissions.filter(s => s.score !== undefined).length} of {submissions.length} graded
              </div>
              <button 
                onClick={() => setShowGradeModal(false)} 
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassAssignments;