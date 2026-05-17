import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  FileText, 
  TrendingUp, 
  ChevronRight, 
  Eye,
  Plus,
  Settings,
  Clock,
  AlertTriangle,
  Star,
  Zap,
  Target,
  Award,
  Activity
} from 'lucide-react';
import { X } from 'lucide-react';
import apiService from '../services/api';

const Classes = () => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newClass, setNewClass] = useState({
    name: '',
    subject: '',
    grade: '',
    students: 30,
    description: ''
  });

  const [classes, setClasses] = useState([]);

  // Fetch classes from backend on component mount
  useEffect(() => {
    // Check if token exists before making the request
    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to view your classes');
      setLoading(false);
      return;
    }
    
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('Fetching classes from API...');
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Please log in to view your classes');
        setLoading(false);
        return;
      }
      
      console.log('Token exists:', !!token);
      
      // Fetch classes and assignments in parallel for accurate counts
      const [classResponse, assignResponse] = await Promise.all([
        apiService.getClasses(),
        apiService.getAssignments().catch(() => ({ success: false, data: [] }))
      ]);
      
      console.log('API Response:', classResponse);
      
      if (!classResponse.data || classResponse.data.length === 0) {
        console.log('No classes found in response');
        setClasses([]);
        return;
      }
      
      // Build a map of classId → active assignment count from real assignment data
      const assignmentCountByClass = {};
      if (assignResponse.success && Array.isArray(assignResponse.data)) {
        assignResponse.data.forEach(a => {
          const cid = a.class?._id || a.class;
          if (cid) {
            assignmentCountByClass[cid] = (assignmentCountByClass[cid] || 0) + 1;
          }
        });
      }
      
      // Transform backend data to match UI format
      const transformedClasses = classResponse.data.map(cls => {
        // Calculate progress from stats
        const progress = Math.round(cls.stats?.averageScore || 0);
        const engagement = Math.round(cls.stats?.engagement || 0);
        
        // Get students info
        const students = cls.students || [];
        const studentCount = cls.studentCount || students.length;
        
        // Use REAL assignment count from assignments list (not stale stats field)
        const realAssignmentCount = assignmentCountByClass[String(cls._id)] || 0;
        
        // Map recent students (first 3) - defensive for missing/invalid student data
        const recentStudents = students.slice(0, 3)
          .filter(s => s && (s.name || s.fullName || s.email))
          .map((student, idx) => {
            const name = student.name || student.fullName || student.email || 'Student';
            const parts = String(name).split(' ').filter(Boolean);
            const initials = parts.length >= 2
              ? (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2)
              : (name[0] || '?').toUpperCase();
            const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500'];
            const displayName = parts.length >= 2
              ? `${parts[0]} ${parts[1][0] || ''}`
              : name;
            
            return {
              name: displayName,
              avatar: initials,
              color: colors[idx % colors.length]
            };
          });
        
        // Determine AI tag based on stats
        let aiTag = { text: 'Active Class', type: 'info', icon: '🔥' };
        if (progress >= 85) {
          aiTag = { text: 'Top Performer', type: 'success', icon: '⭐' };
        } else if (progress < 70) {
          aiTag = { text: 'Needs Attention', type: 'warning', icon: '⚠️' };
        } else if (engagement >= 80) {
          aiTag = { text: 'High Engagement', type: 'success', icon: '🚀' };
        }
        
        // Determine gradient based on subject
        const gradients = {
          'Mathematics': 'from-indigo-500 via-purple-500 to-pink-500',
          'Science': 'from-emerald-500 via-teal-500 to-cyan-500',
          'English': 'from-amber-500 via-orange-500 to-red-500',
          'Physics': 'from-violet-500 via-purple-500 to-fuchsia-500',
          'Chemistry': 'from-cyan-500 via-blue-500 to-indigo-500',
          'default': 'from-indigo-500 via-purple-500 to-pink-500'
        };
        
        const glowColors = {
          'Mathematics': 'shadow-indigo-500/25',
          'Science': 'shadow-emerald-500/25',
          'English': 'shadow-amber-500/25',
          'Physics': 'shadow-violet-500/25',
          'Chemistry': 'shadow-cyan-500/25',
          'default': 'shadow-indigo-500/25'
        };
        
        const icons = {
          'Mathematics': '🔢',
          'Science': '🧪',
          'English': '📚',
          'Physics': '⚛️',
          'Chemistry': '🧬',
          'default': '📖'
        };
        
        const gradient = gradients[cls.subject] || gradients.default;
        const glowColor = glowColors[cls.subject] || glowColors.default;
        const icon = icons[cls.subject] || icons.default;
        
        return {
          id: cls._id,
          name: cls.name || 'Unnamed Class',
          subject: cls.subject || 'General',
          grade: cls.grade || '',
          students: studentCount,
          assignments: realAssignmentCount, // ← REAL count from assignments API
          pendingDoubts: 0,
          lastActivity: cls.updatedAt ? new Date(cls.updatedAt).toLocaleDateString() : 'N/A',
          progress: progress,
          engagement: engagement,
          gradient: gradient,
          glowColor: glowColor,
          icon: icon,
          aiTag: aiTag,
          recentStudents: recentStudents
        };
      });
      
      setClasses(transformedClasses);
      console.log(`Successfully loaded ${transformedClasses.length} classes`);

    } catch (err) {
      console.error('Error fetching classes:', err);
      console.error('Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response
      });
      
      // Check if it's an authorization error
      if (err.message && (err.message.includes('Not authorized') || err.message.includes('401'))) {
        setError('Your session has expired. Please log in again.');
        // Clear invalid token
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } else {
        setError(err.message || 'Failed to load classes');
      }
      
      // Keep empty array if there's an error - will show empty state
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Create class with proper format
      const classData = {
      name: `${newClass.grade} - ${newClass.name}`,
        grade: newClass.grade,
      subject: newClass.subject,
        description: newClass.description || ''
      };
      
      await apiService.createClass(classData);
      
      // Refresh the classes list
      await fetchClasses();
      
    setShowCreateModal(false);
    setNewClass({
      name: '',
      subject: '',
      grade: '',
      students: 30,
      description: ''
    });
    } catch (err) {
      console.error('Error creating class:', err);
      alert(err.message || 'Failed to create class');
    } finally {
      setLoading(false);
    }
  };

  const getAITagStyle = (type) => {
    switch (type) {
      case 'success':
        return 'bg-emerald-100/80 text-emerald-700 border-emerald-200';
      case 'warning':
        return 'bg-amber-100/80 text-amber-700 border-amber-200';
      case 'info':
        return 'bg-blue-100/80 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-100/80 text-gray-700 border-gray-200';
    }
  };

  const CircularProgress = ({ progress, size = 60, strokeWidth = 4 }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${(progress / 100) * circumference} ${circumference}`;

    return (
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            className="text-white/20"
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="none"
            strokeDasharray={strokeDasharray}
            className="text-white transition-all duration-1000 ease-out"
            style={{
              filter: 'drop-shadow(0 0 6px rgba(255,255,255,0.5))'
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-white">{progress}%</span>
        </div>
      </div>
    );
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your classes...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6 flex items-center justify-center">
        <div className="text-center bg-white rounded-2xl p-8 max-w-md shadow-xl">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Unable to Load Classes</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          {error.includes('log in') || error.includes('session has expired') ? (
            <Link
              to="/login"
              className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all duration-200"
            >
              Go to Login
            </Link>
          ) : (
            <button
              onClick={() => fetchClasses()}
              className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:bg-indigo-700 transition-all duration-200"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-4">
            My Classes
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Manage and monitor all your classes with intelligent insights and beautiful analytics
          </p>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Classes</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{classes.length}</p>
              </div>
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
          
          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Students</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {classes.reduce((sum, cls) => sum + cls.students, 0)}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-xl">
                <Users className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Active Assignments</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {classes.reduce((sum, cls) => sum + cls.assignments, 0)}
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-amber-500 to-orange-500 rounded-xl">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg. Progress</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {classes.length > 0 ? Math.round(classes.reduce((sum, cls) => sum + cls.progress, 0) / classes.length) : 0}%
                </p>
              </div>
              <div className="p-3 bg-gradient-to-r from-violet-500 to-purple-500 rounded-xl">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        </div>

        {/* Classes Grid */}
        {classes.length === 0 ? (
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">No Classes Yet</h3>
            <p className="text-gray-600 mb-6">Create your first class to get started!</p>
            <button 
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
            >
              <div className="flex items-center space-x-2">
                <Plus className="w-5 h-5" />
                <span>Create Your First Class</span>
              </div>
            </button>
          </div>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {classes.map((classItem) => (
            <div
              key={classItem.id}
              className={`group relative overflow-hidden rounded-3xl transition-all duration-500 hover:scale-[1.02] ${
                hoveredCard === classItem.id ? `shadow-2xl ${classItem.glowColor}` : 'shadow-xl'
              }`}
              onMouseEnter={() => setHoveredCard(classItem.id)}
              onMouseLeave={() => setHoveredCard(null)}
            >
              {/* Gradient Background */}
              <div className={`absolute inset-0 bg-gradient-to-br ${classItem.gradient} opacity-90`} />
              
              {/* Glass Effect Overlay */}
              <div className="absolute inset-0 bg-white/10 backdrop-blur-sm" />
              
              {/* Watermark Icon */}
              <div className="absolute top-4 right-4 text-6xl opacity-20">
                {classItem.icon}
              </div>

              {/* Content */}
              <div className="relative p-8 text-white">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h3 className="text-2xl font-bold mb-2">{classItem.name}</h3>
                    <div className="flex items-center space-x-2">
                      <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium backdrop-blur-sm">
                        {classItem.subject}
                      </span>
                    </div>
                  </div>
                  <div className={`px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm ${getAITagStyle(classItem.aiTag.type)}`}>
                    <span className="mr-1">{classItem.aiTag.icon}</span>
                    {classItem.aiTag.text}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Students */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Users className="w-4 h-4" />
                      <span className="text-sm font-medium">Students</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="flex -space-x-2">
                        {classItem.recentStudents.map((student, index) => (
                          <div
                            key={index}
                            className={`w-8 h-8 ${student.color} rounded-full flex items-center justify-center text-xs font-bold text-white border-2 border-white shadow-lg`}
                          >
                            {student.avatar}
                          </div>
                        ))}
                      </div>
                      {Math.max(0, classItem.students - classItem.recentStudents.length) > 0 && (
                        <span className="text-lg font-bold">+{Math.max(0, classItem.students - classItem.recentStudents.length)}</span>
                      )}
                    </div>
                  </div>

                  {/* Progress Ring */}
                  <div className="space-y-3">
                    <div className="flex items-center space-x-2">
                      <Target className="w-4 h-4" />
                      <span className="text-sm font-medium">Progress</span>
                    </div>
                    <CircularProgress progress={classItem.progress} />
                  </div>
                </div>

                {/* Activity Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm opacity-90">Assignments</span>
                      <span className="font-bold">{classItem.assignments}</span>
                    </div>
                  </div>
                  <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-sm opacity-90">Doubts</span>
                      <span className={`font-bold ${classItem.pendingDoubts > 0 ? 'text-yellow-300' : ''}`}>
                        {classItem.pendingDoubts}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Link
                      to={`/classes/${classItem.id}`}
                      className="flex items-center space-x-2 bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl transition-all duration-200 backdrop-blur-sm group"
                      onClick={() => console.log('Navigating to class:', classItem.id)}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="font-medium">View</span>
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </Link>
                    
                    <button className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 backdrop-blur-sm">
                      <Plus className="w-4 h-4" />
                    </button>
                    
                    <button className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 backdrop-blur-sm">
                      <Settings className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 text-sm opacity-75">
                    <Clock className="w-4 h-4" />
                    <span>{classItem.lastActivity}</span>
                  </div>
                </div>

                {/* Hover Expansion */}
                <div className={`mt-4 transition-all duration-300 overflow-hidden ${
                  hoveredCard === classItem.id ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
                }`}>
                  <div className="pt-4 border-t border-white/20">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center space-x-1">
                          <Activity className="w-4 h-4" />
                          <span>Engagement: {classItem.engagement}%</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Award className="w-4 h-4" />
                          <span>Performance: {classItem.progress}%</span>
                        </div>
                      </div>
                      <button className="flex items-center space-x-1 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg transition-all duration-200">
                        <Zap className="w-3 h-3" />
                        <span>Quick Actions</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        )}

        {/* Create New Class Button - Only show if there are classes */}
        {classes.length > 0 && (
        <div className="text-center mt-12">
          <button 
            onClick={() => setShowCreateModal(true)}
            className="group bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-semibold text-lg shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-105"
          >
            <div className="flex items-center space-x-3">
              <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
              <span>Create New Class</span>
            </div>
          </button>
        </div>
        )}

        {/* Create Class Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-2xl font-bold text-gray-900">Create New Class</h3>
                <button 
                  onClick={() => setShowCreateModal(false)}
                  className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
              
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Class Name</label>
                  <input
                    type="text"
                    value={newClass.name}
                    onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., A, B, C"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Grade</label>
                  <select
                    value={newClass.grade}
                    onChange={(e) => setNewClass({...newClass, grade: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Grade</option>
                    <option value="6th Grade">6th Grade</option>
                    <option value="7th Grade">7th Grade</option>
                    <option value="8th Grade">8th Grade</option>
                    <option value="9th Grade">9th Grade</option>
                    <option value="10th Grade">10th Grade</option>
                    <option value="11th Grade">11th Grade</option>
                    <option value="12th Grade">12th Grade</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                  <input
                    type="text"
                    value={newClass.subject}
                    onChange={(e) => setNewClass({...newClass, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="e.g., Mathematics, Science, English"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Number of Students</label>
                  <input
                    type="number"
                    value={newClass.students}
                    onChange={(e) => setNewClass({...newClass, students: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    min="1"
                    max="50"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description (Optional)</label>
                  <textarea
                    value={newClass.description}
                    onChange={(e) => setNewClass({...newClass, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={3}
                    placeholder="Brief description of the class..."
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
                    className="flex-1 bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-4 py-2 rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 transition-all duration-200"
                  >
                    Create Class
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Classes;
