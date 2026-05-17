import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './components/Login';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Profile from './components/Profile';
import Courses from './components/Courses';
import VideoPlayer from './components/VideoPlayer';
import Assignments from './components/Assignments';
import AssignmentDetail from './components/AssignmentDetail';
import DocumentViewer from './components/DocumentViewer';
import Progress from './components/Progress';
import DoubtResolution from './components/DoubtResolution';
import Notes from './components/Notes';
import Quiz from './components/Quiz';
import AIChat from './components/AIChat';
import { MagnifyingGlassIcon, BellIcon } from '@heroicons/react/24/outline';

function App() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const getAvatarUrl = () => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const name = u.fullName || u.name || u.email || 'Student';
      return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=4f46e5&color=fff&size=32`;
    } catch { return 'https://ui-avatars.com/api/?name=Student&background=4f46e5&color=fff&size=32'; }
  };

  const getUserName = () => {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.fullName || u.name || 'Student';
    } catch { return 'Student'; }
  };

  useEffect(() => {
    // Authenticate based on presence of JWT token and expiration
    const token = localStorage.getItem('token');
    const authExpiry = localStorage.getItem('authExpiry');
    
    // Check if auth has expired (1 day = 24 hours)
    if (token && authExpiry) {
      const expiryTime = parseInt(authExpiry, 10);
      const now = Date.now();
      
      if (now > expiryTime) {
        // Auth expired, clear it
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('authExpiry');
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(true);
      }
    } else if (token) {
      // Old token without expiry, clear it for security
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setIsAuthenticated(false);
    } else {
      setIsAuthenticated(false);
    }
    
    setIsLoading(false);
  }, []);

  const handleLogin = (authStatus) => {
    setIsAuthenticated(authStatus);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('authExpiry');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading EduPlatform...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <Router>
        <Login onLogin={handleLogin} />
        <Toaster position="top-right" />
      </Router>
    );
  }

  return (
    <Router>
      <div className="flex h-screen bg-gray-50 overflow-hidden">
        <Sidebar 
          isOpen={isSidebarOpen} 
          onClose={() => setIsSidebarOpen(false)} 
        />
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Mobile Header */}
          <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-lg font-bold text-indigo-600">EduPlatform</h1>
            <div className="flex items-center space-x-2">
              <button className="relative p-2">
                <BellIcon className="h-5 w-5 text-gray-600" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </button>
              <img
                src={getAvatarUrl()}
                alt="Profile"
                className="h-7 w-7 rounded-full"
              />
            </div>
          </div>

          {/* Desktop Top Navigation Bar */}
          <div className="hidden lg:block bg-white border-b border-gray-200 px-6 py-3">
            <div className="flex items-center flex-1">
              <div className="max-w-2xl w-full">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search courses, doubts, or assessments..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
              <div className="flex items-center space-x-6 ml-6">
                <button className="relative p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-indigo-600">
                  <BellIcon className="h-6 w-6" />
                  <span className="absolute top-1.5 right-1.5 h-2.5 w-2.5 bg-red-500 border-2 border-white rounded-full"></span>
                </button>
              </div>
            </div>
          </div>
          
          {/* Main Content */}
          <div className="flex-1 overflow-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/courses" element={<Courses />} />
            <Route path="/courses/topic/:topicId/video" element={<VideoPlayer />} />
            <Route path="/courses/document" element={<DocumentViewer />} />
            <Route path="/assignments" element={<Assignments />} />
            <Route path="/assignment/:assignmentId" element={<AssignmentDetail />} />
            <Route path="/progress" element={<Progress />} />
            <Route path="/doubts" element={<DoubtResolution />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/quiz" element={<Quiz />} />
            <Route path="/ai-chat" element={<AIChat />} />
          </Routes>
          </div>
        </div>
        
        <Toaster position="top-right" />
      </div>
    </Router>
  );
}

export default App;