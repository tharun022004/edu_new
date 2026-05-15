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
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { 
  FireIcon as FireIconSolid,
  StarIcon as StarIconSolid,
  HeartIcon as HeartIconSolid,
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import apiService from '../services/api';
import { downloadAttendancePdf } from '../utils/attendanceReportPdf';

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, Title);

const Dashboard = () => {
  const navigate = useNavigate();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showWhatsNew, setShowWhatsNew] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showNewGoalModal, setShowNewGoalModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [newGoal, setNewGoal] = useState({ title: '', description: '', target: '' });

  // State for API data
  const [dashboardData, setDashboardData] = useState(null);
  const [userData, setUserData] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [attendanceSummary, setAttendanceSummary] = useState({
    total: 0,
    present: 0,
    late: 0,
    absent: 0,
    rate: 100
  });
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
      const [dashboardResponse, userResponse, activityRes, scheduleRes, attendanceRes, goalsRes] = await Promise.all([
        apiService.getDashboard(),
        apiService.getCurrentUser(),
        apiService.getRecentActivity().catch(() => ({ data: [] })),
        apiService.getSchedule().catch(() => ({ data: [] })),
        apiService.getAttendance().catch(() => ({
          data: [],
          summary: { total: 0, present: 0, late: 0, absent: 0, rate: 100 }
        })),
        apiService.getGoals().catch(() => ({ data: [] }))
      ]);

      setDashboardData(dashboardResponse.data);
      setUserData(userResponse.data.user || userResponse.data);
      setRecentActivity(activityRes.data || []);
      setSchedule(scheduleRes.data || []);
      setAttendance(attendanceRes.data || []);
      setAttendanceSummary(attendanceRes.summary || {
        total: 0,
        present: 0,
        late: 0,
        absent: 0,
        rate: 100
      });
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

  const ACTIVITY_STYLES = {
    doubt: { icon: QuestionMarkCircleIcon, iconBg: 'bg-violet-100', iconColor: 'text-violet-600', border: 'border-violet-100' },
    assignment: { icon: ClipboardDocumentListIcon, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', border: 'border-blue-100' },
    content: { icon: ArrowUpTrayIcon, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', border: 'border-emerald-100' },
  };
  const getActivityStyle = (type) =>
    ACTIVITY_STYLES[type] || {
      icon: ChartBarIcon,
      iconBg: 'bg-gray-100',
      iconColor: 'text-gray-600',
      border: 'border-gray-100',
    };

  const recentActivityPreview = recentActivity.slice(0, 3);
  
  const {
    total: totalClasses,
    present: presentClasses,
    late: lateClasses,
    absent: absentClasses,
    rate: attendanceRate
  } = attendanceSummary;

  const recentAttendance = [...attendance]
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5);

  const attendanceStatusStyle = (status) => {
    switch (status) {
      case 'present':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'late':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'absent':
        return 'bg-red-50 text-red-700 border-red-100';
      default:
        return 'bg-gray-50 text-gray-600 border-gray-100';
    }
  };

  const handleDownloadAttendanceReport = async () => {
    if (attendance.length === 0) {
      toast.error('No attendance records available to download.');
      return;
    }

    try {
      await downloadAttendancePdf({
        studentName: userData?.fullName || userData?.name || 'Student',
        studentEmail: userData?.email,
        records: attendance,
        summary: attendanceSummary
      });
      toast.success('Attendance PDF downloaded successfully!');
    } catch (err) {
      console.error('PDF download error:', err);
      toast.error('Failed to generate PDF report.');
    }
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 mb-10 items-start">
          {/* Quick Access Cards */}
<div className="lg:col-span-1 min-w-0">
  <div className="mb-4">
    <h2 className="text-lg font-bold text-gray-900">Quick Actions</h2>
  </div>

  <div className="grid grid-cols-2 gap-3 lg:gap-4">
    {[
      {
        icon: BookOpenIcon,
        label: 'My Courses',
        path: '/courses',
        color: 'bg-gradient-to-r from-blue-500 to-blue-600',
        hoverColor: 'hover:from-blue-600 hover:to-blue-700',
      },
      {
        icon: ClipboardDocumentListIcon,
        label: 'Assessments',
        path: '/assignments',
        color: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
        hoverColor: 'hover:from-emerald-600 hover:to-emerald-700',
      },
      {
        icon: ChartBarIcon,
        label: 'Progress',
        path: '/progress',
        color: 'bg-gradient-to-r from-purple-500 to-purple-600',
        hoverColor: 'hover:from-purple-600 hover:to-purple-700',
      },
      {
        icon: UserCircleIcon,
        label: 'Profile',
        path: '/profile',
        color: 'bg-gradient-to-r from-orange-500 to-orange-600',
        hoverColor: 'hover:from-orange-600 hover:to-orange-700',
      },
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
        <div className="font-semibold text-sm lg:text-base">
          {item.label}
        </div>
      </button>
    ))}
  </div>
</div>

          {/* Attendance Overview */}
          <div className="lg:col-span-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarDaysIcon className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Attendance</h3>
                    <p className="text-xs text-gray-500">Your class session record</p>
                  </div>
                </div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">
                  {attendanceRate}% rate
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3 text-center">
                  <p className="text-2xl font-bold text-emerald-600">{presentClasses}</p>
                  <p className="text-[11px] font-medium text-emerald-700 mt-0.5">Present</p>
                </div>
                <div className="rounded-xl bg-amber-50 border border-amber-100 p-3 text-center">
                  <p className="text-2xl font-bold text-amber-600">{lateClasses}</p>
                  <p className="text-[11px] font-medium text-amber-700 mt-0.5">Late</p>
                </div>
                <div className="rounded-xl bg-red-50 border border-red-100 p-3 text-center">
                  <p className="text-2xl font-bold text-red-600">{absentClasses}</p>
                  <p className="text-[11px] font-medium text-red-700 mt-0.5">Absent</p>
                </div>
              </div>

              <div className="mb-4">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>{totalClasses} sessions</span>
                  <span>{attendanceRate}% attended</span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                  {totalClasses > 0 ? (
                    <>
                      <div
                        className="bg-emerald-500 h-full"
                        style={{ width: `${(presentClasses / totalClasses) * 100}%` }}
                      />
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${(lateClasses / totalClasses) * 100}%` }}
                      />
                      <div
                        className="bg-red-500 h-full"
                        style={{ width: `${(absentClasses / totalClasses) * 100}%` }}
                      />
                    </>
                  ) : (
                    <div className="bg-gray-200 h-full w-full" />
                  )}
                </div>
              </div>

              <div className="flex-1 min-h-0 mb-4">
                <p className="text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Recent sessions</p>
                {recentAttendance.length > 0 ? (
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {recentAttendance.map((record) => (
                      <div
                        key={record._id || `${record.date}-${record.class?._id}`}
                        className="flex items-center justify-between gap-2 text-xs border border-gray-100 rounded-lg px-2.5 py-2 bg-gray-50/80"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {record.class?.name || 'Class'}
                          </p>
                          <p className="text-gray-500">
                            {new Date(record.date).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 px-2 py-0.5 rounded-full border text-[10px] font-semibold uppercase ${attendanceStatusStyle(record.status)}`}
                        >
                          {record.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-500 py-4 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    No attendance marked yet for your classes.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleDownloadAttendanceReport}
                className="flex items-center justify-center gap-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 px-4 py-2.5 rounded-xl transition-colors w-full"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                <span>Download PDF Report</span>
              </button>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="lg:col-span-1 min-w-0">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 lg:p-6 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Latest updates from your classes</p>
                </div>
                <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full">Last 3</span>
              </div>
              <div className="space-y-3 flex-1">
                {recentActivityPreview.length > 0 ? (
                  recentActivityPreview.map((activity) => {
                    const style = getActivityStyle(activity.type);
                    const Icon = style.icon;
                    return (
                      <div
                        key={activity.id}
                        className={`flex items-start gap-4 p-4 rounded-xl border ${style.border} bg-gradient-to-r from-white to-gray-50/80`}
                      >
                        <div className={`p-2.5 rounded-xl ${style.iconBg} flex-shrink-0`}>
                          <Icon className={`w-4 h-4 ${style.iconColor}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-800 leading-snug">
                            <span className="font-semibold text-gray-900">{activity.student}</span>
                            <span className="text-gray-600"> {activity.action}</span>
                          </p>
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className="text-[11px] font-medium text-gray-500">{activity.time}</span>
                            {activity.class && (
                              <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                                {activity.class}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <p>No recent activity yet.</p>
                    <p className="text-xs mt-1">Join a class, ask doubts, or submit assignments to see updates here.</p>
                  </div>
                )}
              </div>
              {recentActivity.length > 3 && (
                <div className="mt-5 pt-4 border-t border-gray-100 text-center">
                  <button
                    type="button"
                    onClick={() => setShowActivityModal(true)}
                    className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center justify-center mx-auto space-x-1 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors w-full"
                  >
                    <span>View All Activity</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
          </div> 

        {/* Weekly Timetable Grid Section */}
        <div className="mb-8 lg:mb-12 mt-4 clear-both">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 lg:p-6 overflow-x-auto">
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
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">All Recent Activity</h3>
              <button
                type="button"
                onClick={() => setShowActivityModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            <div className="space-y-4">
              {recentActivity.map((activity) => {
                const style = getActivityStyle(activity.type);
                const Icon = style.icon;
                return (
                  <div key={activity.id} className={`flex items-start gap-4 p-4 rounded-xl border ${style.border} bg-gray-50`}>
                    <div className={`p-2.5 rounded-xl ${style.iconBg}`}>
                      <Icon className={`w-5 h-5 ${style.iconColor}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-800">
                        <span className="font-semibold text-gray-900">{activity.student}</span>
                        <span className="text-gray-600"> {activity.action}</span>
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="text-xs text-gray-500">{activity.time}</span>
                        {activity.class && (
                          <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{activity.class}</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default Dashboard;
