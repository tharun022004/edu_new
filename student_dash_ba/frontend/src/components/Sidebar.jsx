import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  BookOpenIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  UserCircleIcon,
  FolderIcon,
  XMarkIcon,
  AcademicCapIcon,
} from '@heroicons/react/24/outline';

const Sidebar = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) {
      try {
        setUser(JSON.parse(stored));
      } catch (e) {
        console.error('Failed to parse user', e);
      }
    }
  }, [location.pathname]);

  const displayName = user?.fullName || user?.name || user?.email || 'Student';
  const avatarUrl = user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=4f46e5&color=fff&size=32`;

  const menuItems = [
    { icon: HomeIcon, label: 'Dashboard', path: '/' },
    { icon: BookOpenIcon, label: 'My Courses', path: '/courses' },
    { icon: QuestionMarkCircleIcon, label: 'Doubt Resolution', path: '/doubts' },
    { icon: ClipboardDocumentListIcon, label: 'Assignments', path: '/assignments' },
    { icon: ChartBarIcon, label: 'Progress', path: '/progress' },
    { icon: FolderIcon, label: 'Notes', path: '/notes' },
    { icon: AcademicCapIcon, label: 'Quiz', path: '/quiz' },
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-gradient-to-b from-white to-gray-50/50 border-r border-gray-100 transform transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] shadow-[4px_0_24px_rgba(0,0,0,0.02)]
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Mobile Close Button */}
        <div className="lg:hidden flex justify-end p-4">
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-gray-700 hover:bg-gray-100/50 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>
        
        <div className="h-full flex flex-col">
          {/* Logo Section */}
          <div className="px-6 py-8">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                <AcademicCapIcon className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent tracking-tight">
                EduPlatform
              </h1>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto custom-scrollbar px-4">
            <nav className="space-y-1.5 pb-8">
              {menuItems.map((item, index) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <div
                    key={index}
                    onClick={() => navigate(item.path)}
                    className={`flex items-center space-x-3.5 px-4 py-3.5 rounded-2xl cursor-pointer transition-all duration-200 group ${
                      isActive
                        ? 'bg-gradient-to-br from-indigo-50 to-purple-50/50 text-indigo-700 shadow-sm border border-indigo-100/50'
                        : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900 border border-transparent'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 flex-shrink-0 transition-transform duration-200 ${isActive ? 'scale-110 text-indigo-600' : 'group-hover:scale-110'}`} />
                    <span className={`text-[15px] ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
                    {isActive && (
                      <div className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-600" />
                    )}
                  </div>
                );
              })}
            </nav>
          </div>

          {/* User Profile */}
          <div className="p-4 border-t border-gray-200/60 bg-white">
            <div 
              onClick={() => navigate('/profile')}
              className="flex items-center space-x-3 p-2 rounded-xl cursor-pointer hover:bg-gray-50 transition-colors"
            >
              <img
                src={avatarUrl}
                alt="Profile"
                className="w-10 h-10 rounded-full border border-gray-200"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-500 truncate">View Profile</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;