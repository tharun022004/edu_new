import React, { useState, useEffect } from 'react';
import { useParams, Routes, Route, Link, useLocation } from 'react-router-dom';
import { 
  FileText, 
  FolderOpen, 
  HelpCircle, 
  FileEdit, 
  Brain, 
  BarChart3,
  Users,
  Calendar,
  ChevronRight,
  Plus,
  Copy,
  CheckCircle,
  AlertCircle,
  X,
  Key
} from 'lucide-react';
import ClassOverview from '../components/ClassOverview';
import ClassAssignments from '../components/ClassAssignments';
import ClassContent from '../components/ClassContent';
import ClassDoubts from '../components/ClassDoubts';
import ClassReports from '../components/ClassReports';
import ClassAITools from '../components/ClassAITools';
import apiService from '../services/api';
import ErrorPopup from '../components/ErrorPopup';

const ClassDetail = () => {
  const { classId } = useParams();
  const location = useLocation();
  const [classCode, setClassCode] = useState(null);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    studentId: ''
  });
  const [addingStudent, setAddingStudent] = useState(false);
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [errorPopup, setErrorPopup] = useState({
    isOpen: false,
    title: '',
    message: '',
    errors: []
  });

  // Fetch class data on mount
  useEffect(() => {
    if (classId) {
      fetchClassData();
    }
  }, [classId]);

  const fetchClassData = async () => {
    try {
      setLoading(true);
      console.log('Fetching class details for ID:', classId);
      const response = await apiService.getClass(classId);
      console.log('Class data received:', response.data);
      setClassData(response.data);
    } catch (err) {
      console.error('Error fetching class:', err);
      setError(err.message || 'Failed to load class details');
    } finally {
      setLoading(false);
    }
  };

  // Function to generate class code
  const generateClassCode = async () => {
    try {
      const response = await apiService.generateClassCode(classId);
      
      if (response.success) {
        setClassCode(response.data);
        setShowCodeModal(true);
      } else {
        setErrorPopup({
          isOpen: true,
          title: 'Failed to Generate Code',
          message: response.message || 'Failed to generate class code. Please try again.',
          errors: []
        });
      }
    } catch (error) {
      console.error('Error generating class code:', error);
      setErrorPopup({
        isOpen: true,
        title: 'Error',
        message: error.message || 'Error generating class code. Please try again.',
        errors: error.errors || []
      });
    }
  };

  // Function to get existing class code (or generate if none exists)
  const getClassCode = async () => {
    try {
      const response = await apiService.getClassCode(classId);
      
      if (response.success) {
        setClassCode(response.data);
        setShowCodeModal(true);
      } else {
        // If no code exists, offer to generate one
        if (response.message && response.message.includes('No valid class code')) {
          // Auto-generate if none exists
          await generateClassCode();
        } else {
          setErrorPopup({
            isOpen: true,
            title: 'No Class Code',
            message: response.message || 'No class code found. Click "Generate Class Code" to create one.',
            errors: []
          });
        }
      }
    } catch (error) {
      console.error('Error getting class code:', error);
      // If error is 404 (no code), try to generate one
      if (error.status === 404 || (error.message && error.message.includes('No valid class code'))) {
        await generateClassCode();
      } else {
        setErrorPopup({
          isOpen: true,
          title: 'Error',
          message: error.message || 'Error getting class code. Please try again.',
          errors: error.errors || []
        });
      }
    }
  };

  // Function to copy class code
  const copyClassCode = () => {
    if (classCode) {
      navigator.clipboard.writeText(classCode.classCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!classId) return;

    if (!newStudent.email.trim()) {
      alert('Please enter student email');
      return;
    }

    setAddingStudent(true);
    try {
      const payload = {
        email: newStudent.email.trim().toLowerCase(),
        name: newStudent.name.trim() || undefined,
        studentId: newStudent.studentId.trim() || undefined,
      };

      const response = await apiService.addStudentToClass(classId, payload);
      console.log('Student added:', response);

      // Refresh class data so the new student appears immediately
      await fetchClassData();

      setShowAddStudentModal(false);
      setNewStudent({ name: '', email: '', studentId: '' });
      alert('Student added to class successfully');
    } catch (error) {
      console.error('Error adding student:', error);
      alert(error.message || 'Failed to add student to class');
    } finally {
      setAddingStudent(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading class details...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !classData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Class Not Found</h2>
          <p className="text-gray-600 mb-4">{error || 'Class not found'}</p>
          <Link to="/classes" className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700">
            Back to Classes
          </Link>
        </div>
      </div>
    );
  }

  // Determine color based on subject
  const getSubjectColor = (subject) => {
    const colors = {
      'Mathematics': 'bg-blue-500',
      'Science': 'bg-emerald-500',
      'English': 'bg-amber-500',
      'Physics': 'bg-violet-500',
      'Chemistry': 'bg-cyan-500',
      'default': 'bg-indigo-500'
    };
    return colors[subject] || colors.default;
  };

  const currentClass = classData;

  const tabs = [
    { name: 'Overview', href: `/classes/${classId}`, icon: BarChart3 },
    { name: 'Assignments', href: `/classes/${classId}/assignments`, icon: FileText },
    { name: 'Content', href: `/classes/${classId}/content`, icon: FolderOpen },
    { name: 'Doubts', href: `/classes/${classId}/doubts`, icon: HelpCircle },
    { name: 'AI Tools', href: `/classes/${classId}/ai-tools`, icon: Brain },
    { name: 'Reports', href: `/classes/${classId}/reports`, icon: Users },
  ];

  const isActiveTab = (href) => {
    if (href === `/classes/${classId}`) {
      return location.pathname === href;
    }
    return location.pathname.startsWith(href);
  };

  if (!currentClass) {
    return <div>Class not found</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 space-y-8">
      {/* Class Header */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300">
        <div className="flex items-center space-x-6">
          <div className={`${getSubjectColor(currentClass.subject)} p-4 rounded-2xl shadow-lg hover:scale-110 transition-transform duration-300`}>
            <Users className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              {currentClass.name}
            </h1>
            <p className="text-lg text-gray-600 mt-1">{currentClass.subject} • {currentClass.studentCount || 0} Students</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-4 mt-6">
          <button
            onClick={() => setShowAddStudentModal(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            <Plus className="w-4 h-4" />
            <span>Add Student</span>
          </button>
          
          <button
            onClick={generateClassCode}
            className="flex items-center space-x-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            <Key className="w-4 h-4" />
            <span>Generate Class Code</span>
          </button>
          
          <button
            onClick={getClassCode}
            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
          >
            <Copy className="w-4 h-4" />
            <span>Display Class Code</span>
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="flex items-center space-x-2 mt-6 text-sm text-gray-500">
          <Link to="/classes" className="hover:text-indigo-600 transition-colors duration-200">My Classes</Link>
          <ChevronRight className="w-4 h-4" />
          <span className="text-indigo-600 font-medium">{currentClass.name}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-xl border border-white/20 overflow-hidden">
        <div className="border-b border-gray-200/50">
          <nav className="flex space-x-8 px-8 py-2" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Link
                  key={tab.name}
                  to={tab.href}
                  className={`py-4 px-2 border-b-3 font-semibold text-sm flex items-center space-x-2 transition-all duration-300 hover:scale-105 ${
                    isActiveTab(tab.href)
                      ? 'border-indigo-500 text-indigo-600 bg-indigo-50/50 rounded-t-lg'
                      : 'border-transparent text-gray-500 hover:text-indigo-600 hover:border-indigo-300 hover:bg-indigo-50/30 rounded-t-lg'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{tab.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-8">
          <Routes>
            <Route path="/" element={<ClassOverview classId={classId} classData={currentClass} students={currentClass.students || []} />} />
            <Route path="/assignments" element={<ClassAssignments classId={classId} />} />
            <Route path="/content" element={<ClassContent classId={classId} classData={currentClass} />} />
            <Route path="/doubts" element={<ClassDoubts classId={classId} />} />
            <Route path="/ai-tools" element={<ClassAITools classId={classId} classData={currentClass} />} />
            <Route path="/reports" element={<ClassReports classId={classId} />} />
          </Routes>
        </div>
      </div>

      {/* Error Popup */}
      <ErrorPopup
        isOpen={errorPopup.isOpen}
        onClose={() => setErrorPopup({ ...errorPopup, isOpen: false })}
        title={errorPopup.title}
        message={errorPopup.message}
        errors={errorPopup.errors}
      />

      {/* Class Code Modal */}
      {showCodeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Class Code</h3>
              <p className="text-gray-600 mb-6">Share this code with your students to join the class</p>
              
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="text-3xl font-mono font-bold text-gray-900 tracking-wider">
                  {classCode?.classCode}
                </div>
                <div className="text-sm text-gray-500 mt-2">
                  Expires: {new Date(classCode?.expiry).toLocaleDateString()}
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={copyClassCode}
                  className="flex-1 flex items-center justify-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
                <button
                  onClick={generateClassCode}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors duration-200"
                >
                  Generate New
                </button>
              </div>
              
              <button
                onClick={() => setShowCodeModal(false)}
                className="mt-4 text-gray-500 hover:text-gray-700 transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add Student</h3>
              <button 
                onClick={() => setShowAddStudentModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form className="space-y-4" onSubmit={handleAddStudent}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student Name</label>
                <input
                  type="text"
                  value={newStudent.name}
                  onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter student name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  value={newStudent.email}
                  onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Student portal login email"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Student ID (Optional)</label>
                <input
                  type="text"
                  value={newStudent.studentId}
                  onChange={(e) => setNewStudent({ ...newStudent, studentId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter student ID"
                />
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddStudentModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingStudent}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {addingStudent ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassDetail;
