import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title } from 'chart.js';
import { Doughnut, Line } from 'react-chartjs-2';
import {
  PlayCircleIcon,
  QuestionMarkCircleIcon,
  ClipboardDocumentListIcon,
  ChartBarIcon,
  BookOpenIcon,
  UserCircleIcon,
  BellIcon,
  XMarkIcon,
  FireIcon,
  TrophyIcon,
  ClockIcon,
  ArrowRightIcon,
  ChatBubbleLeftEllipsisIcon,
  AcademicCapIcon,
  StarIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  EyeIcon,
  HeartIcon,
  UserGroupIcon,
  Bars3Icon,
  ChevronRightIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
import { 
  FireIcon as FireIconSolid,
  StarIcon as StarIconSolid,
  HeartIcon as HeartIconSolid,
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import apiService from '../services/api';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

const Dashboard = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', target: '' });

  // State for API data
  const [dashboardData, setDashboardData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [schedule, setSchedule] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [dashboardResponse, userResponse, scheduleRes, attendanceRes, goalsRes] = await Promise.all([
        apiService.getDashboard(),
        apiService.getCurrentUser(),
        apiService.getSchedule().catch(() => ({ data: [] })),
        apiService.getAttendance().catch(() => ({ data: [] })),
        apiService.getGoals().catch(() => ({ data: [] }))
      ]);

      setDashboardData(dashboardResponse.data);
      setUserData(userResponse.data.user || userResponse.data);
      setSchedule(scheduleRes.data || []);
      setAttendance(attendanceRes.data || []);
      setGoals(goalsRes.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  // Use API goals if available, otherwise fallback to empty (since backend is now wired)
  const displayGoals = goals.length > 0 ? goals : [];

  const notifications = [
    { id: 1, title: 'New Physics course added', time: '2 hours ago', type: 'course', read: false },
    { id: 2, title: 'Math assessment due tomorrow', time: '5 hours ago', type: 'assessment', read: false },
    { id: 3, title: 'Your doubt was answered', time: '1 day ago', type: 'doubt', read: true },
  ];



  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const handleContinueLearning = () => {
    navigate('/courses');
    toast.success('Continuing your learning journey!');
  };

  const handleAskDoubt = () => {
    navigate('/doubts');
    toast.success('AI tutor is ready to help!');
  };
  const handleCreateGoal = async () => {
    if (!newGoal.title.trim() || !newGoal.target) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const goalData = {
        title: newGoal.title,
        progress: 0,
        completed: false,
        target: parseInt(newGoal.target)
      };

      await apiService.createGoal(goalData);
      
      setNewGoal({ title: '', description: '', target: '' });
      setShowNewGoalModal(false);
      toast.success('New goal created successfully!');
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to create goal');
      console.error(err);
    }
  };

  const toggleGoalCompletion = async (goalId, currentCompleted) => {
    try {
      const updateData = {
        completed: !currentCompleted,
        progress: !currentCompleted ? 100 : 0
      };
      await apiService.updateGoal(goalId, updateData);
      fetchDashboardData();
    } catch (err) {
      toast.error('Failed to update goal');
      console.error(err);
    }
  };

  // Get progress data from dashboard data or use defaults
  const progressData = dashboardData?.stats || {
    topicsCompleted: 75,
    assessmentsCompleted: 60,
    weeklyStreak: 6,
  };

  // Compute Schedule
  const daysOfWeek = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const weekDaysTimetable = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const timetableSlots = [
    { start: '09:00', end: '09:50', label: '1\n09:00 To 09:50' },
    { start: '10:00', end: '10:50', label: '2\n10:00 To 10:50' },
    { start: '11:00', end: '11:50', label: '3\n11:00 To 11:50' },
    { start: '12:00', end: '12:50', label: '4\n12:00 To 12:50' },
    { start: '13:00', end: '13:50', label: '5\n01:00 To 01:50' },
    { start: '14:00', end: '14:50', label: '6\n02:00 To 02:50' },
    { start: '15:00', end: '15:50', label: '7\n03:00 To 03:50' },
    { start: '16:00', end: '17:30', label: '8\n04:00 To 05:30' },
  ];

  const getScheduleForSlot = (day, slot) => {
    return schedule.find(s => s.dayOfWeek === day && s.startTime >= slot.start && s.startTime <= slot.end);
  };
  
  // Compute Attendance Stats
  const totalClasses = attendance.length;
  const presentClasses = attendance.filter(a => a.status === 'present').length;
  const lateClasses = attendance.filter(a => a.status === 'late').length;
  const absentClasses = attendance.filter(a => a.status === 'absent').length;
  const attendanceRate = totalClasses === 0 ? 100 : Math.round(((presentClasses + lateClasses) / totalClasses) * 100);

  const handleDownloadAttendanceReport = () => {
    if (attendance.length === 0) {
      toast.error('No attendance records available to download.');
      return;
    }

    // Generate CSV content
    const headers = ['Date', 'Class/Subject', 'Status'];
    const rows = attendance.map(record => [
      new Date(record.date).toLocaleDateString(),
      record.class?.subject || 'Class Session',
      record.status.toUpperCase()
    ]);
    
    // Create CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.join(','))
    ].join('\n');

    // Create a Blob and trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast.success('Attendance report downloaded successfully!');
  };

  // Chart configurations
  const progressChartData = {
    datasets: [{
      data: [progressData.topicsCompleted || 75, 100 - (progressData.topicsCompleted || 75)],
      backgroundColor: ['#4F46E5', '#E5E7EB'],
      borderWidth: 0,
      cutout: '75%',
    }],
  };

  const assessmentChartData = {
    datasets: [{
      data: [progressData.assessmentsCompleted || 60, 100 - (progressData.assessmentsCompleted || 60)],
      backgroundColor: ['#10B981', '#E5E7EB'],
      borderWidth: 0,
      cutout: '75%',
    }],
  };



  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };



  // Show loading state while data is being fetched
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // Show error state if there's an error
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-6xl mb-4">⚠️</div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Dashboard</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={fetchDashboardData}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-indigo-50">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden bg-white p-2 rounded-lg shadow-md"
      >
        <Bars3Icon className="h-6 w-6 text-gray-600" />
      </button>

      {/* Floating Chat Bot */}
      <button
        onClick={handleAskDoubt}
        className="fixed bottom-6 right-6 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-all duration-300 hover:scale-110 z-50"
      >
        <ChatBubbleLeftEllipsisIcon className="h-6 w-6" />
      </button>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-10">
        {/* Section 1: Welcome + Key Actions */}
        <div className="mb-8 lg:mb-12">
          <div className="bg-white rounded-2xl shadow-md p-6 lg:p-8 border border-gray-100">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-6 lg:mb-8">
              <div className="flex items-center space-x-4 lg:space-x-6 mb-4 lg:mb-0">
                <img
                  src={userData?.avatar || 'https://ui-avatars.com/api/?name=Student&background=4f46e5&color=fff'}
                  alt="Profile"
                  className="w-16 h-16 lg:w-20 lg:h-20 rounded-full border-4 border-indigo-100 shadow-md"
                />
                <div>
                  <h1 className="text-2xl lg:text-4xl font-bold text-gray-900 mb-2">
                    {getGreeting()}, {userData?.fullName || 'Student'}! 👋
                  </h1>
                  <p className="text-gray-600 flex items-center space-x-3 text-sm lg:text-lg">
                    <ClockIcon className="h-4 w-4 lg:h-5 lg:w-5" />
                    <span>Last active: {userData?.lastLogin ? new Date(userData.lastLogin).toLocaleDateString() : 'Recently'}</span>
                    <span className="text-indigo-600 font-semibold">• {userData?.level || 'Student'}</span>
                  </p>
                </div>
              </div>
              
              {/* Notifications removed for now */}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 lg:gap-6">
              <button
                onClick={handleContinueLearning}
                className="flex items-center justify-center space-x-3 bg-indigo-600 hover:bg-indigo-700 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-md"
              >
                <PlayCircleIcon className="h-5 w-5 lg:h-6 lg:w-6" />
                <span>Continue Learning</span>
              </button>
              <button
                onClick={handleAskDoubt}
                className="flex items-center justify-center space-x-3 bg-green-600 hover:bg-green-700 text-white px-6 lg:px-8 py-3 lg:py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 shadow-md"
              >
                <QuestionMarkCircleIcon className="h-5 w-5 lg:h-6 lg:w-6" />
                <span>Ask a Doubt</span>
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-8 lg:mb-12">
          {/* Quick Access Cards */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-6 lg:mb-8">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Quick Actions</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:gap-4">
              {[
                { icon: BookOpenIcon, label: 'My Courses', path: '/courses', color: 'bg-gradient-to-r from-blue-500 to-blue-600', hoverColor: 'hover:from-blue-600 hover:to-blue-700' },
                { icon: ClipboardDocumentListIcon, label: 'Assessments', path: '/assessments', color: 'bg-gradient-to-r from-emerald-500 to-emerald-600', hoverColor: 'hover:from-emerald-600 hover:to-emerald-700' },
                { icon: ChartBarIcon, label: 'Progress', path: '/progress', color: 'bg-gradient-to-r from-purple-500 to-purple-600', hoverColor: 'hover:from-purple-600 hover:to-purple-700' },
                { icon: UserCircleIcon, label: 'Profile', path: '/profile', color: 'bg-gradient-to-r from-orange-500 to-orange-600', hoverColor: 'hover:from-orange-600 hover:to-orange-700' },
              ].map((item, index) => (
                <button
                  key={index}
                  onClick={() => navigate(item.path)}
                  className={`group ${item.color} ${item.hoverColor} text-white p-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg text-left`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <item.icon className="h-6 w-6" />
                    <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="font-semibold text-sm lg:text-base">{item.label}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Attendance Overview */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-6 lg:mb-8">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Attendance</h2>
              <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{attendanceRate}% Rate</span>
            </div>
            <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center h-full min-h-[200px]">
              <div className="flex justify-between w-full mb-6 text-center">
                <div>
                  <p className="text-3xl font-bold text-green-500">{presentClasses}</p>
                  <p className="text-sm text-gray-500">Present</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-yellow-500">{lateClasses}</p>
                  <p className="text-sm text-gray-500">Late</p>
                </div>
                <div>
                  <p className="text-3xl font-bold text-red-500">{absentClasses}</p>
                  <p className="text-sm text-gray-500">Absent</p>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div className="bg-green-500 h-3 rounded-full transition-all duration-300" style={{ width: `${attendanceRate}%` }}></div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">Keep up the good attendance!</p>
              <button 
                onClick={handleDownloadAttendanceReport}
                className="mt-6 flex items-center justify-center space-x-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-4 py-2 rounded-xl transition-colors w-full"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Download Report</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1">
            <div className="flex items-center justify-between mb-6 lg:mb-8">
              <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Recent Activity</h2>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 lg:p-6 h-full flex flex-col">
              <div className="space-y-4 flex-1">
                {(dashboardData?.recentActivities?.slice(0, 5) || []).length > 0 ? (
                  dashboardData.recentActivities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                        <PlayCircleIcon className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{activity.courseTitle}</p>
                        <p className="text-xs text-gray-500 mt-0.5">Accessed {new Date(activity.lastAccessed).toLocaleDateString()}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No recent activity.</p>
                  </div>
                )}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 text-center">
                <button 
                  onClick={() => navigate('/progress')}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center justify-center mx-auto space-x-1 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors w-full"
                >
                  <span>View All Activity</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Timetable Grid Section */}
        <div className="mb-8 lg:mb-12">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6 overflow-x-auto h-full">
            <div className="flex items-center justify-between mb-6 min-w-[800px]">
              <h3 className="text-xl lg:text-2xl font-bold text-gray-900">Weekly Timetable</h3>
            </div>
            <div className="min-w-[800px]">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-3 border border-gray-200 bg-[#1E293B] text-white font-bold w-24 uppercase">Time Table</th>
                    {timetableSlots.map((slot, index) => (
                      <th key={index} className="p-3 border border-gray-200 bg-[#334155] text-white text-center whitespace-pre-line text-xs lg:text-sm">
                        {slot.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weekDaysTimetable.map(day => (
                    <tr key={day}>
                      <td className="p-3 border border-gray-200 bg-[#334155] text-white font-bold text-center text-xs lg:text-sm">
                        {day}
                      </td>
                      {timetableSlots.map((slot, index) => {
                        const cellSchedule = getScheduleForSlot(day, slot);
                        return (
                          <td 
                            key={index} 
                            className={`p-3 border border-gray-200 text-center h-16 ${cellSchedule ? 'bg-[#E0F2FE] hover:bg-[#BAE6FD] transition-colors cursor-pointer' : 'bg-[#F0F9FF] hover:bg-white cursor-pointer group transition-colors'}`}
                            onClick={() => {
                              if (cellSchedule) {
                                navigate('/courses');
                              }
                            }}
                          >
                            {cellSchedule ? (
                              <div>
                                <div className="text-xs lg:text-sm font-bold text-[#0F172A]">{cellSchedule.class?.subject || 'Class'}</div>
                                <div className="text-[10px] lg:text-xs text-[#334155] mt-1 font-medium">{cellSchedule.class?.name}</div>
                              </div>
                            ) : (
                              <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-[10px] text-gray-400">
                                No Class
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Section 4: Weekly Goals - Second Priority */}
        <div className="mb-8 lg:mb-12">
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Weekly Goals</h2>
            <button 
              onClick={() => setShowNewGoalModal(true)}
              className="text-indigo-600 hover:text-indigo-700 font-medium text-sm lg:text-base"
            >
              Set New Goal
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
            {displayGoals.map(goal => (
              <div key={goal._id} className="bg-white rounded-xl p-4 lg:p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all duration-200">
                <div className="flex items-start space-x-4">
                  <button
                    onClick={() => toggleGoalCompletion(goal._id, goal.completed)}
                    className={`flex-shrink-0 w-6 h-6 lg:w-7 lg:h-7 rounded-full border-2 flex items-center justify-center mt-0.5 transition-all ${
                      goal.completed ? 'bg-green-500 border-green-500' : 'border-gray-300 hover:border-green-500'
                    }`}
                  >
                    {goal.completed && <CheckCircleIcon className="h-3 w-3 lg:h-4 lg:w-4 text-white" />}
                  </button>
                  <div className="flex-1">
                    <h3 className={`font-semibold text-sm lg:text-base mb-2 lg:mb-3 ${goal.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {goal.title}
                    </h3>
                    <div className="w-full bg-gray-200 rounded-full h-2 lg:h-2.5 mb-2">
                      <div 
                        className={`h-2 lg:h-2.5 rounded-full transition-all duration-300 ${goal.completed ? 'bg-green-500' : 'bg-indigo-600'}`}
                        style={{ width: `${goal.progress}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">{goal.progress}% completed</span>
                      {goal.completed && <span className="text-green-600 font-medium text-xs lg:text-sm">✓ Done!</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 5: Your Progress - Third Priority */}
        <div className="mb-8 lg:mb-12">
          <div className="flex items-center justify-between mb-6 lg:mb-8">
            <h2 className="text-xl lg:text-2xl font-bold text-gray-900">Your Progress</h2>
            <button 
              onClick={() => navigate('/progress')}
              className="text-indigo-600 hover:text-indigo-700 font-medium flex items-center space-x-2 text-sm lg:text-base"
            >
              <span>View Details</span>
              <ArrowRightIcon className="h-4 w-4" />
            </button>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* Topics Progress */}
            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="font-semibold text-gray-700 text-sm lg:text-base">Topics</h3>
                <BookOpenIcon className="h-5 w-5 lg:h-6 lg:w-6 text-indigo-500" />
              </div>
              <div className="relative h-20 lg:h-24 mb-4 lg:mb-6">
                <Doughnut data={progressChartData} options={chartOptions} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg lg:text-2xl font-bold text-indigo-600">{progressData.topicsCompleted}%</span>
                </div>
              </div>
              <p className="text-xs lg:text-sm text-gray-600 text-center">Great progress!</p>
            </div>

            {/* Assessments Progress */}
            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="font-semibold text-gray-700 text-sm lg:text-base">Tests</h3>
                <ClipboardDocumentListIcon className="h-5 w-5 lg:h-6 lg:w-6 text-green-500" />
              </div>
              <div className="relative h-20 lg:h-24 mb-4 lg:mb-6">
                <Doughnut data={assessmentChartData} options={chartOptions} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg lg:text-2xl font-bold text-green-600">{progressData.assessmentsCompleted}%</span>
                </div>
              </div>
              <p className="text-xs lg:text-sm text-gray-600 text-center">Keep it up!</p>
            </div>

            {/* Streak Counter */}
            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="font-semibold text-gray-700 text-sm lg:text-base">Streak</h3>
                <FireIconSolid className="h-5 w-5 lg:h-6 lg:w-6 text-orange-500" />
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-orange-600 mb-2">{userData?.stats?.currentStreak || 0}</div>
                <div className="text-xs lg:text-sm text-gray-600 mb-1">days</div>
                <div className="text-xs lg:text-sm text-orange-600 font-semibold">🔥 On fire!</div>
              </div>
            </div>

            {/* Total Points */}
            <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4 lg:mb-6">
                <h3 className="font-semibold text-gray-700 text-sm lg:text-base">Points</h3>
                <TrophyIcon className="h-5 w-5 lg:h-6 lg:w-6 text-purple-500" />
              </div>
              <div className="text-center">
                <div className="text-2xl lg:text-3xl font-bold text-purple-600 mb-2">{userData?.stats?.totalPoints || 0}</div>
                <div className="text-xs lg:text-sm text-gray-600 mb-1">earned</div>
                <div className="text-xs lg:text-sm text-purple-600 font-semibold">🏆 Great!</div>
              </div>
            </div>
          </div>
        </div>



        {/* Section 9: Footer - Remaining Same */}
        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-100">
          <div className="flex flex-wrap justify-center space-x-4 lg:space-x-8 text-gray-600 mb-6">
            <a href="#" className="hover:text-gray-900 transition-colors font-medium text-sm lg:text-base">Help Center</a>
            <a href="#" className="hover:text-gray-900 transition-colors font-medium text-sm lg:text-base">Terms & Privacy</a>
            <a href="#" className="hover:text-gray-900 transition-colors font-medium text-sm lg:text-base">About Team</a>
            <a href="#" className="hover:text-gray-900 transition-colors font-medium text-sm lg:text-base">Contact</a>
          </div>
          <div className="text-center text-gray-500 text-sm lg:text-base">
            © 2024 EduPlatform. Made with <HeartIcon className="h-4 w-4 inline text-red-500" /> for learners worldwide.
          </div>
        </div>

      {/* New Goal Modal */}
      {showNewGoalModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl w-full max-w-md">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold">Set New Weekly Goal</h3>
              <button
                onClick={() => setShowNewGoalModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Goal Title *
                </label>
                <input
                  type="text"
                  value={newGoal.title}
                  onChange={(e) => setNewGoal({ ...newGoal, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., Complete 5 lessons this week"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={newGoal.description}
                  onChange={(e) => setNewGoal({ ...newGoal, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Additional details about your goal"
                  rows="3"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Number *
                </label>
                <input
                  type="number"
                  value={newGoal.target}
                  onChange={(e) => setNewGoal({ ...newGoal, target: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g., 5"
                  min="1"
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-4">
              <button
                onClick={() => setShowNewGoalModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateGoal}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create Goal
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default Dashboard;