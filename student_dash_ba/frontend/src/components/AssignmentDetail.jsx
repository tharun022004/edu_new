import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, CheckCircleIcon, ClockIcon, DocumentTextIcon, StarIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';
import apiService from '../services/api';

// Type config: label, emoji, color classes
const TYPE_CONFIG = {
  Quiz:       { label: 'Quiz',       emoji: '🧠', bg: 'from-violet-500 to-purple-600',  badge: 'bg-violet-100 text-violet-700 border-violet-200' },
  Homework:   { label: 'Homework',   emoji: '📘', bg: 'from-blue-500 to-cyan-600',      badge: 'bg-blue-100 text-blue-700 border-blue-200' },
  Project:    { label: 'Project',    emoji: '🔬', bg: 'from-emerald-500 to-teal-600',   badge: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  Exam:       { label: 'Exam',       emoji: '📝', bg: 'from-red-500 to-rose-600',       badge: 'bg-red-100 text-red-700 border-red-200' },
  Assignment: { label: 'Assignment', emoji: '📄', bg: 'from-indigo-500 to-purple-600',  badge: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
};
const getTypeConfig = (type) => TYPE_CONFIG[type] || TYPE_CONFIG['Assignment'];

const AssignmentDetail = () => {
  const { assignmentId } = useParams();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState(null);
  const [answers, setAnswers] = useState({}); // { questionIndex: answerText }
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toast, setToast] = useState(null);
  const [isQA, setIsQA] = useState(false);
  const [isPdfAssignment, setIsPdfAssignment] = useState(false);
  const [answerPdfFile, setAnswerPdfFile] = useState(null);

  const TEACHER_BASE = import.meta.env.VITE_TEACHER_API_URL || 'http://localhost:5001';
  const getAttachmentUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    if (path.startsWith('/uploads')) return `${TEACHER_BASE}${path}`;
    if (path.includes('uploads/submissions')) return `${TEACHER_BASE}/${path.replace(/^\//, '')}`;
    if (path.includes('uploads/content')) return `${TEACHER_BASE}/${path.replace(/^\//, '')}`;
    return `${TEACHER_BASE}/uploads/submissions/${path.split(/[/\\]/).pop()}`;
  };

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Get current student info from localStorage
  const getStudentInfo = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      return {
        email: user.email || '',
        name: user.fullName || user.name || ''
      };
    } catch {
      return { email: '', name: '' };
    }
  };

  useEffect(() => {
    if (!assignmentId) return;
    const fetchAssignment = async () => {
      setLoading(true);
      const student = getStudentInfo();

      // Try teacher backend Q&A assignment first
      if (student.email) {
        try {
          const res = await apiService.getStudentAssignmentFromTeacher(student.email, assignmentId);
          if (res.success && res.data) {
            const data = res.data;
            const pdfType = data.assignmentType === 'upload';
            const qaType = !pdfType && (data.assignmentType === 'qa' || (data.questions && data.questions.length > 0));
            setIsPdfAssignment(pdfType);
            setIsQA(qaType);
            setAssignment({
              ...data,
              dueDate: new Date(data.dueDate).toLocaleDateString(),
              instructor: data.teacher?.name || data.teacher || 'Teacher',
              createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : '',
              points: data.totalMarks
            });
            const sub = data.studentSubmission;
            setSubmission(sub || null);
            // Pre-fill answers if already submitted
            if (sub && sub.answers && sub.answers.length > 0) {
              const prefilled = {};
              sub.answers.forEach(a => { prefilled[a.questionIndex] = a.answer; });
              setAnswers(prefilled);
            }
            setLoading(false);
            return;
          }
        } catch (err) {
          console.warn('Teacher backend Q&A lookup failed, trying student backend:', err.message);
        }
      }

      // Fallback: try student backend (for regular assessments)
      try {
        const response = await apiService.getAssessment(assignmentId);
        if (response.success) {
          const data = response.data;
          const pdfType = data.assignmentType === 'upload';
          const qaType = !pdfType && (data.assignmentType === 'qa' || (data.questions && data.questions.length > 0));
          setIsPdfAssignment(pdfType);
          setIsQA(qaType);
          setAssignment({
            ...data,
            dueDate: new Date(data.dueDate).toLocaleDateString(),
            instructor: data.instructor?.name || data.instructor || 'Unknown',
            createdAt: data.createdAt ? new Date(data.createdAt).toLocaleDateString() : '',
            points: data.totalMarks || data.points
          });
          setSubmission(data.studentSubmission || null);
          if (data.studentSubmission?.answers) {
            const prefilled = {};
            data.studentSubmission.answers.forEach(a => { prefilled[a.questionIndex] = a.answer; });
            setAnswers(prefilled);
          }
        } else {
          setAssignment(null);
        }
      } catch (err) {
        console.error('Error fetching assignment:', err);
        setAssignment(null);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [assignmentId]);

  const handleAnswerChange = (questionIndex, value) => {
    setAnswers(prev => ({ ...prev, [questionIndex]: value }));
  };

  const handleSubmitQA = async () => {
    const student = getStudentInfo();
    if (!student.email) {
      showToast('Could not determine your student email. Please re-login.', 'error');
      return;
    }
    const questionsArr = assignment?.questions || [];
    const answersArray = questionsArr.map((_, idx) => ({
      questionIndex: idx,
      answer: answers[idx] || ''
    }));
    const unanswered = answersArray.filter(a => !a.answer.trim()).length;
    if (unanswered > 0 && !window.confirm(`You have ${unanswered} unanswered question(s). Submit anyway?`)) return;

    setIsSubmitting(true);
    try {
      const res = await apiService.submitQAAssignment(assignmentId, {
        studentEmail: student.email,
        studentName: student.name,
        answers: answersArray,
        status: 'submitted'
      });
      if (res.success) {
        showToast('Answers submitted successfully! 🎉');
        setSubmission({ ...res.data, status: 'submitted', answers: answersArray });
      } else {
        showToast(res.message || 'Submission failed', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitPdf = async () => {
    const student = getStudentInfo();
    if (!student.email) {
      showToast('Could not determine your student email. Please re-login.', 'error');
      return;
    }
    if (!answerPdfFile && !submission?.attachments?.length) {
      showToast('Please select your completed PDF to upload', 'error');
      return;
    }
    setIsSubmitting(true);
    try {
      let attachments = submission?.attachments || [];
      if (answerPdfFile) {
        const uploadRes = await apiService.uploadSubmissionPdf(answerPdfFile);
        if (!uploadRes.success) throw new Error(uploadRes.message || 'Upload failed');
        const f = uploadRes.data;
        attachments = [{
          filename: f.filename,
          originalName: f.originalName,
          mimetype: f.mimetype,
          size: f.size,
          path: f.path
        }];
      }
      const res = await apiService.submitQAAssignment(assignmentId, {
        studentEmail: student.email,
        studentName: student.name,
        attachments,
        status: 'submitted'
      });
      if (res.success) {
        showToast('PDF submitted successfully!');
        setSubmission({ ...res.data, status: 'submitted', attachments });
        setAnswerPdfFile(null);
      } else {
        showToast(res.message || 'Submission failed', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Failed to submit PDF', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsubmitPdf = async () => {
    if (!window.confirm('Unsubmit so you can upload a new PDF?')) return;
    const student = getStudentInfo();
    setIsSubmitting(true);
    try {
      await apiService.submitQAAssignment(assignmentId, {
        studentEmail: student.email,
        studentName: student.name,
        attachments: [],
        status: 'draft'
      });
      setSubmission(prev => ({ ...prev, status: 'draft', attachments: [] }));
      setAnswerPdfFile(null);
      showToast('You can upload a new PDF.');
    } catch (err) {
      showToast(err.message || 'Failed to unsubmit', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnsubmit = async () => {
    if (!window.confirm('This will unsubmit your answers so you can edit them. Continue?')) return;
    const student = getStudentInfo();
    setIsSubmitting(true);
    try {
      const questionsArr = assignment?.questions || [];
      const answersArray = questionsArr.map((_, idx) => ({
        questionIndex: idx,
        answer: answers[idx] || ''
      }));
      await apiService.submitQAAssignment(assignmentId, {
        studentEmail: student.email,
        studentName: student.name,
        answers: answersArray,
        status: 'draft'
      });
      setSubmission(prev => ({ ...prev, status: 'draft' }));
      showToast('Assignment unsubmitted. You can now edit your answers.');
    } catch (err) {
      showToast(err.message || 'Failed to unsubmit', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!assignment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assignment Not Found</h2>
          <p className="text-gray-600 mb-6">This assignment doesn't exist or you don't have access.</p>
          <button onClick={() => navigate('/assignments')} className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
            Back to Assignments
          </button>
        </div>
      </div>
    );
  }

  const isSubmitted = submission?.status === 'submitted' || submission?.status === 'graded';
  const isGraded = submission?.score !== undefined && submission?.score !== null;
  const questions = assignment.questions || [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-5 py-3 rounded-xl shadow-lg text-white font-medium ${toast.type === 'error' ? 'bg-red-500' : 'bg-emerald-500'}`}>
          {toast.msg}
        </div>
      )}

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back button */}
        <button onClick={() => navigate('/assignments')} className="flex items-center text-indigo-600 hover:text-indigo-800 mb-6 font-medium">
          <ArrowLeftIcon className="h-5 w-5 mr-2" />
          Back to Assignments
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-5">
            {/* Assignment Header */}
            <div className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 bg-gradient-to-br ${getTypeConfig(assignment.type).bg} rounded-xl flex items-center justify-center flex-shrink-0 text-xl`}>
                    {getTypeConfig(assignment.type).emoji}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-1">{assignment.title}</h1>
                    <p className="text-gray-500 text-sm">
                      {assignment.instructor} • {assignment.createdAt}
                    </p>
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="text-xl font-bold text-gray-900">{assignment.points} pts</div>
                  <div className="text-xs text-gray-500">Due {assignment.dueDate}</div>
                </div>
              </div>

              {/* Status badges */}
              <div className="flex flex-wrap gap-2 mb-4">
                {isPdfAssignment && (
                  <span className="px-3 py-1 text-xs font-bold rounded-full border bg-amber-100 text-amber-800 border-amber-200">
                    📎 PDF Assignment
                  </span>
                )}
                {isQA && (
                  <span className={`px-3 py-1 text-xs font-bold rounded-full border ${getTypeConfig(assignment.type).badge}`}>
                    {getTypeConfig(assignment.type).emoji} {getTypeConfig(assignment.type).label}
                  </span>
                )}
                <span className={`px-3 py-1 text-xs font-bold rounded-full border ${isSubmitted ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                  {isSubmitted ? '✓ Submitted' : 'Not Submitted'}
                </span>
                {isGraded && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full border border-blue-200">
                    ⭐ Graded: {submission.score}/{assignment.points}
                  </span>
                )}
              </div>

              <hr className="mb-4" />

              {assignment.description && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 leading-relaxed">{assignment.description}</p>
                </div>
              )}

              {assignment.instructions && (
                <div className="mb-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Instructions</h3>
                  <p className="text-gray-700 leading-relaxed">{assignment.instructions}</p>
                </div>
              )}
            </div>

            {/* Q&A Questions Section */}
            {isQA && questions.length > 0 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span className="bg-indigo-600 text-white text-sm font-bold px-2.5 py-1 rounded-full">{questions.length}</span>
                  Questions
                </h2>

                {questions.map((q, idx) => {
                  const existingAnswer = submission?.answers?.find(a => a.questionIndex === idx);
                  return (
                    <div key={idx} className="bg-white rounded-2xl shadow-sm overflow-hidden border border-gray-200">
                      {/* Question header */}
                      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-5 py-3 border-b border-gray-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="bg-indigo-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">Q{idx + 1}</span>
                          <span className="text-xs font-semibold text-indigo-700">{q.points || 0} marks</span>
                        </div>
                        {isSubmitted && existingAnswer?.answer && (
                          <span className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                            <CheckCircleIcon className="w-4 h-4" /> Answered
                          </span>
                        )}
                      </div>

                      <div className="p-5">
                        <p className="text-gray-800 font-medium mb-4 leading-relaxed">{q.question}</p>

                        {isSubmitted ? (
                          // Read-only submitted view
                          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                            <p className="text-xs font-semibold text-indigo-700 mb-2">Your Answer:</p>
                            <p className="text-gray-800 text-sm whitespace-pre-wrap leading-relaxed">
                              {existingAnswer?.answer || answers[idx] || <span className="text-gray-400 italic">No answer provided</span>}
                            </p>
                          </div>
                        ) : (
                          // Editable textarea
                          <textarea
                            value={answers[idx] || ''}
                            onChange={e => handleAnswerChange(idx, e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-colors placeholder-gray-400"
                            rows={4}
                            placeholder={`Write your answer for Question ${idx + 1} here...`}
                          />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* PDF assignment */}
            {isPdfAssignment && (assignment.attachments?.length > 0) && (
              <div className="bg-white rounded-2xl shadow-sm p-6 border border-amber-200">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-lg">📎</span> Assignment PDF
                </h3>
                <p className="text-sm text-gray-600 mb-4">Download and complete the worksheet below, then submit as instructed by your teacher.</p>
                <div className="space-y-3">
                  {assignment.attachments.map((att, i) => (
                    <a
                      key={i}
                      href={getAttachmentUrl(att.path)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl hover:bg-amber-100 transition-colors"
                    >
                      <DocumentTextIcon className="w-8 h-8 text-amber-600 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{att.originalName || att.filename || 'Assignment PDF'}</p>
                        <p className="text-xs text-amber-700">Open / download PDF</p>
                      </div>
                    </a>
                  ))}
                </div>

                {/* Submit completed PDF */}
                <div className="mt-6 pt-6 border-t border-amber-200">
                  <h4 className="font-semibold text-gray-900 mb-2">Submit your work</h4>
                  <p className="text-sm text-gray-600 mb-4">Upload your completed assignment as a PDF file.</p>

                  {isSubmitted && submission?.attachments?.length > 0 ? (
                    <div className="space-y-3">
                      <p className="text-xs font-semibold text-emerald-700 flex items-center gap-1">
                        <CheckCircleIcon className="w-4 h-4" /> Submitted file
                      </p>
                      {submission.attachments.map((att, i) => (
                        <a
                          key={i}
                          href={getAttachmentUrl(att.path)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-xl"
                        >
                          <DocumentTextIcon className="w-8 h-8 text-emerald-600" />
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{att.originalName || att.filename}</p>
                            <p className="text-xs text-emerald-700">Your submission</p>
                          </div>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <label className="flex flex-col items-center justify-center w-full min-h-[140px] border-2 border-dashed border-amber-300 rounded-xl cursor-pointer hover:bg-amber-50/50 transition-colors">
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
                          setAnswerPdfFile(file || null);
                        }}
                      />
                      {answerPdfFile ? (
                        <>
                          <DocumentTextIcon className="w-10 h-10 text-amber-600 mb-2" />
                          <p className="font-semibold text-gray-900 text-sm">{answerPdfFile.name}</p>
                          <p className="text-xs text-gray-500">{(answerPdfFile.size / 1024).toFixed(1)} KB · Click to change</p>
                        </>
                      ) : (
                        <>
                          <ArrowUpTrayIcon className="w-10 h-10 text-gray-400 mb-2" />
                          <p className="font-medium text-gray-700 text-sm">Click to upload your answer PDF</p>
                        </>
                      )}
                    </label>
                  )}
                </div>
              </div>
            )}

            {/* Non-Q&A / non-PDF fallback */}
            {!isQA && !isPdfAssignment && (
              <div className="bg-white rounded-2xl shadow-sm p-6">
                <h3 className="font-semibold text-gray-900 mb-2">Submission</h3>
                <p className="text-gray-600 text-sm">This assignment uses a different submission format. Check your course materials for details.</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-5">
            {/* Grade Card */}
            {isGraded && (
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-200 rounded-2xl p-5 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <StarIcon className="h-5 w-5 text-emerald-600" />
                  <h3 className="font-bold text-gray-900">Your Grade</h3>
                </div>
                <div className="text-4xl font-black text-emerald-600 mb-1">
                  {submission.score}<span className="text-lg font-semibold text-gray-400">/{assignment.points}</span>
                </div>
                <div className="text-sm text-gray-600 mb-1">
                  {Math.round((submission.score / assignment.points) * 100)}%
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                  <div
                    className="bg-emerald-500 h-2 rounded-full transition-all"
                    style={{ width: `${Math.min(100, (submission.score / assignment.points) * 100)}%` }}
                  />
                </div>
                {submission.feedback && (
                  <div className="bg-white border border-emerald-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-600 mb-1">Teacher's Feedback:</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{submission.feedback}</p>
                  </div>
                )}
              </div>
            )}

            {/* Submission Status Card */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">Your Work</h3>
                <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border ${isSubmitted ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-amber-100 text-amber-700 border-amber-200'}`}>
                  {isSubmitted ? 'Turned In' : 'Not Turned In'}
                </span>
              </div>

              {isQA && (
                <div className="mb-4">
                  <p className="text-xs text-gray-500 mb-3">
                    {isSubmitted
                      ? `${submission?.answers?.filter(a => a.answer?.trim()).length || Object.values(answers).filter(v => v.trim()).length} of ${questions.length} questions answered`
                      : `${Object.values(answers).filter(v => v.trim()).length} of ${questions.length} questions answered`
                    }
                  </p>
                  <div className="w-full bg-gray-200 rounded-full h-1.5">
                    <div
                      className="bg-indigo-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${questions.length ? (Object.values(answers).filter(v => v.trim()).length / questions.length) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {isSubmitted ? (
                  <button
                    onClick={handleUnsubmit}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 transition-colors font-semibold text-sm"
                  >
                    {isSubmitting ? 'Processing...' : 'Unsubmit'}
                  </button>
                ) : isQA ? (
                  <button
                    onClick={handleSubmitQA}
                    disabled={isSubmitting}
                    className="w-full px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors font-semibold text-sm shadow-sm"
                  >
                    {isSubmitting ? 'Submitting...' : 'Submit Answers'}
                  </button>
                ) : isPdfAssignment ? (
                  isSubmitted ? (
                    <button
                      onClick={handleUnsubmitPdf}
                      disabled={isSubmitting}
                      className="w-full px-4 py-2.5 text-gray-700 bg-gray-100 rounded-xl hover:bg-gray-200 disabled:opacity-50 font-semibold text-sm"
                    >
                      {isSubmitting ? 'Processing...' : 'Unsubmit PDF'}
                    </button>
                  ) : (
                    <button
                      onClick={handleSubmitPdf}
                      disabled={isSubmitting || (!answerPdfFile && !submission?.attachments?.length)}
                      className="w-full px-4 py-2.5 bg-amber-600 text-white rounded-xl hover:bg-amber-700 disabled:opacity-50 font-semibold text-sm shadow-sm"
                    >
                      {isSubmitting ? 'Uploading...' : 'Submit PDF'}
                    </button>
                  )
                ) : null}
              </div>

              {isSubmitted && !isGraded && (
                <div className="mt-3 flex items-center gap-2 text-amber-600">
                  <ClockIcon className="h-4 w-4" />
                  <p className="text-xs font-medium">Waiting for teacher to grade</p>
                </div>
              )}
            </div>

            {/* Assignment Info Card */}
            <div className="bg-white rounded-2xl shadow-sm p-5 border border-gray-200">
              <h3 className="font-bold text-gray-900 mb-3">Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Due Date</span>
                  <span className="font-medium text-gray-800">{assignment.dueDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Marks</span>
                  <span className="font-medium text-gray-800">{assignment.points}</span>
                </div>
                {questions.length > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Questions</span>
                    <span className="font-medium text-gray-800">{questions.length}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Type</span>
                  <span className="font-medium text-gray-800">{isPdfAssignment ? 'PDF Upload' : isQA ? 'Q&A' : assignment.type || 'Assignment'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignmentDetail;
