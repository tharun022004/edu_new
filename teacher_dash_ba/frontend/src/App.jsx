import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Classes from './pages/Classes';
import ClassDetail from './pages/ClassDetail';
import Assignments from './pages/Assignments';
import ClassContent from './components/ClassContent';
import ClassAITools from './components/ClassAITools';
import Doubts from './pages/Doubts';
import Settings from './pages/Settings';
import TeacherQuiz from './pages/Quiz';
import TeacherNotes from './pages/TeacherNotes';
import Attendance from './pages/Attendance';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Restore user from localStorage on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    const authExpiry = localStorage.getItem('authExpiry');
    
    console.log('App mount - checking auth...');
    console.log('Token exists:', !!storedToken);
    console.log('User exists:', !!storedUser);
    
    // Check if auth has expired (1 day = 24 hours)
    if (storedToken && authExpiry) {
      const expiryTime = parseInt(authExpiry, 10);
      const now = Date.now();
      
      if (now > expiryTime) {
        // Auth expired, clear it
        console.log('Auth expired, clearing...');
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        localStorage.removeItem('authExpiry');
        setUser(null);
      } else if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
          console.log('User restored from localStorage');
        } catch (error) {
          console.error('Error parsing user data from localStorage:', error);
          localStorage.removeItem('user');
          localStorage.removeItem('token');
          localStorage.removeItem('authExpiry');
        }
      }
    } else if (storedToken) {
      // Old token without expiry, clear it for security
      console.log('Old token without expiry found, clearing...');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      setUser(null);
    } else {
      console.log('No stored auth data found');
    }
    setLoading(false);
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('authExpiry');
  };

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Router>
      <Layout user={user} onLogout={handleLogout}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/classes" element={<Classes />} />
          <Route path="/classes/:classId/*" element={<ClassDetail />} />
          <Route path="/assignments" element={<Assignments />} />
          <Route path="/notes" element={<TeacherNotes />} />
          <Route path="/content" element={<ClassContent />} />
          <Route path="/ai-knowledge" element={<ClassAITools />} />
          <Route path="/doubts" element={<Doubts />} />
          <Route path="/attendance" element={<Attendance />} />
          <Route path="/quiz" element={<TeacherQuiz />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
