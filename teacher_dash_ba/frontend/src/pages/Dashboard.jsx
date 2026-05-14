import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Users, 
  BookOpen, 
  FileText, 
  HelpCircle, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Brain,
  Plus,
  Calendar,
  PlayCircle,
  Bell,
  Target,
  Zap,
  ChevronRight,
  Upload,
  PenTool,
  Star,
  Activity,
  Award,
  MessageSquare,
  Eye,
  BarChart3,
  Sparkles,
  Timer,
  BookmarkCheck,
  X,
  Save,
  Send
} from 'lucide-react';
import apiService from '../services/api';

const Dashboard = () => {
  const navigate = useNavigate();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showAddScheduleModal, setShowAddScheduleModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [showClassDetailsModal, setShowClassDetailsModal] = useState(false);
  const [attendanceModal, setAttendanceModal] = useState({ show: false, scheduleItem: null, records: [] });
  
  const [newSchedule, setNewSchedule] = useState({
    class: '',
    dayOfWeek: 'Monday',
    startTime: '',
    endTime: ''
  });
  const [newTask, setNewTask] = useState({
    task: '',
    priority: 'medium',
    dueTime: '',
    subject: 'General'
  });
  
  // State for API data
  const [dashboardStats, setDashboardStats] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);

  const [classes, setClasses] = useState([]);

  // Fetch dashboard data on component mount
  useEffect(() => {
    fetchDashboardData();
    // Fetch teacher profile
    apiService.getCurrentUser().then(res => {
      const userData = res.data || res;
      setUser(userData);
    }).catch(err => {
      console.error('Failed to fetch user:', err);
      // Try to get user from localStorage as fallback
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse stored user:', e);
        }
      }
    });
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch data with error handling for each call
      try {
        const statsResponse = await apiService.getDashboardStats();
        setDashboardStats(statsResponse.data);
      } catch (err) {
        console.warn('Failed to load dashboard stats:', err);
        setDashboardStats({ overview: { totalClasses: 0, totalStudents: 0, pendingTasks: 0, pendingDoubts: 0 } });
      }

      try {
        const tasksResponse = await apiService.getTasks();
        setTasks(tasksResponse.data || []);
      } catch (err) {
        console.warn('Failed to load tasks:', err);
        setTasks([]);
      }

      try {
        const activityResponse = await apiService.getRecentActivity();
        setRecentActivity(activityResponse.data || []);
      } catch (err) {
        console.warn('Failed to load recent activity:', err);
        setRecentActivity([]);
      }

      try {
        const notificationsResponse = await apiService.getNotifications();
        setNotifications(notificationsResponse.data || []);
      } catch (err) {
        console.warn('Failed to load notifications:', err);
        setNotifications([]);
      }

      try {
        const scheduleResponse = await apiService.getSchedule();
        setSchedule(scheduleResponse.data || []);
      } catch (err) {
        console.warn('Failed to load schedule:', err);
        setSchedule([]);
      }

      try {
        const classesResponse = await apiService.getClasses();
        setClasses(classesResponse.data || []);
      } catch (err) {
        console.warn('Failed to load classes:', err);
        setClasses([]);
      }
    } catch (err) {
      // Only set error state if all API calls fail
      if (!dashboardStats && !tasks && !recentActivity && !notifications && !schedule) {
        setError(err.message || 'Failed to load dashboard data');
      }
      console.error('Error fetching dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };



  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

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

  const quickStats = [
    { 
      label: 'Classes', 
      value: dashboardStats?.overview?.totalClasses || '0', 
      icon: BookOpen, 
      color: 'text-blue-600' 
    },
    { 
      label: 'Students', 
      value: dashboardStats?.overview?.totalStudents || '0', 
      icon: Users, 
      color: 'text-emerald-600' 
    },
    { 
      label: 'Pending Tasks', 
      value: dashboardStats?.overview?.pendingTasks || '0', 
      icon: Clock, 
      color: 'text-amber-600' 
    },
    { 
      label: 'Doubts', 
      value: dashboardStats?.overview?.pendingDoubts || '0', 
      icon: HelpCircle, 
      color: 'text-violet-600' 
    },
  ];

  const quickActions = [
    { 
      name: 'Create Assignment', 
      icon: PenTool, 
      href: '/assignments',
      color: 'bg-gradient-to-r from-blue-500 to-blue-600',
      hoverColor: 'hover:from-blue-600 hover:to-blue-700'
    },
    { 
      name: 'Upload Content', 
      icon: Upload, 
      href: '/content',
      color: 'bg-gradient-to-r from-emerald-500 to-emerald-600',
      hoverColor: 'hover:from-emerald-600 hover:to-emerald-700'
    },
    { 
      name: 'Resolve Doubts', 
      icon: MessageSquare, 
      href: '/doubts',
      color: 'bg-gradient-to-r from-amber-500 to-amber-600',
      hoverColor: 'hover:from-amber-600 hover:to-amber-700'
    },
    { 
      name: 'View Classes', 
      icon: Users, 
      href: '/classes',
      color: 'bg-gradient-to-r from-violet-500 to-violet-600',
      hoverColor: 'hover:from-violet-600 hover:to-violet-700'
    },
  ];

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

  const todayName = daysOfWeek[currentTime.getDay()];
  const nowHHMM = currentTime.getHours().toString().padStart(2, '0') + ':' + currentTime.getMinutes().toString().padStart(2, '0');

  const getNextClass = () => {
    if (!schedule || schedule.length === 0) return null;
    let todayIndex = currentTime.getDay();

    for (let i = 0; i < 7; i++) {
      const searchDay = daysOfWeek[(todayIndex + i) % 7];
      let daySchedule = schedule.filter(s => s.dayOfWeek === searchDay).sort((a, b) => a.startTime.localeCompare(b.startTime));
      
      if (i === 0) {
         // Today, filter by future classes (or currently active)
         daySchedule = daySchedule.filter(s => s.endTime > nowHHMM);
      }
      
      if (daySchedule.length > 0) {
         return {
           original: daySchedule[0],
           daysFromNow: i
         };
      }
    }
    return null;
  };

  const nextClassData = getNextClass();

  const nextClass = nextClassData ? {
    subject: nextClassData.original.class?.subject || 'Subject',
    grade: nextClassData.original.class?.grade || '',
    time: `${nextClassData.original.startTime} - ${nextClassData.original.endTime}`,
    room: nextClassData.original.class?.name || '',
    studentsCount: nextClassData.original.class?.students?.length || 0,
    topic: 'Scheduled Session',
    timeUntil: nextClassData.daysFromNow === 0 
               ? (nextClassData.original.startTime > nowHHMM ? `Today at ${nextClassData.original.startTime}` : 'In Progress')
               : (nextClassData.daysFromNow === 1 ? `Tomorrow at ${nextClassData.original.startTime}` : `In ${nextClassData.daysFromNow} days`),
    color: 'from-indigo-500 to-purple-600',
    dayOfWeek: nextClassData.original.dayOfWeek
  } : {
    subject: 'No upcoming classes',
    grade: '',
    time: '--:--',
    room: '-',
    studentsCount: 0,
    topic: '-',
    timeUntil: '',
    color: 'from-gray-500 to-gray-600',
    dayOfWeek: ''
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    try {
      const taskData = {
        title: newTask.task,
        priority: newTask.priority,
        dueDate: new Date().toISOString()
      };
      
      await apiService.createTask(taskData);
      setShowAddTaskModal(false);
      setNewTask({
        task: '',
        priority: 'medium',
        dueTime: '',
        subject: 'General'
      });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleAddSchedule = async (e) => {
    e.preventDefault();
    try {
      await apiService.createSchedule(newSchedule);
      setShowAddScheduleModal(false);
      setNewSchedule({ class: '', dayOfWeek: 'Monday', startTime: '', endTime: '' });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to create schedule:', err);
      alert('Failed to create schedule');
    }
  };

  const openAttendanceModal = async (scheduleItem) => {
    try {
      // Fetch students for the class
      const classRes = await apiService.api.get(`/classes/${scheduleItem.class._id}`);
      const students = classRes.data.data.students || [];

      // Fetch existing attendance for today if any
      const today = new Date().toISOString().split('T')[0];
      const attendanceRes = await apiService.getClassAttendance(scheduleItem.class._id);
      
      let records = students.map(s => ({ student: s._id, name: s.fullName, status: 'present' }));

      // If attendance was already submitted today, use those records
      const todayAttendance = attendanceRes.data.find(a => a.date.startsWith(today));
      if (todayAttendance) {
        records = records.map(r => {
          const existing = todayAttendance.records.find(tr => tr.student._id === r.student);
          return { ...r, status: existing ? existing.status : 'present' };
        });
      }

      setAttendanceModal({ show: true, scheduleItem, records });
    } catch (err) {
      console.error('Failed to prepare attendance:', err);
    }
  };

  const submitAttendance = async () => {
    try {
      const recordsToSubmit = attendanceModal.records.map(r => ({ student: r.student, status: r.status }));
      await apiService.submitAttendance({
        classId: attendanceModal.scheduleItem.class._id,
        date: new Date().toISOString().split('T')[0],
        records: recordsToSubmit
      });
      setAttendanceModal({ show: false, scheduleItem: null, records: [] });
      alert('Attendance saved successfully!');
    } catch (err) {
      console.error('Failed to submit attendance:', err);
      alert('Failed to submit attendance');
    }
  };

  const handleToggleTask = async (task) => {
    try {
      await apiService.updateTask(task._id, { completed: !task.completed });
      fetchDashboardData();
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleViewClassDetails = () => {
    setShowClassDetailsModal(true);
  };

  const displayRecentActivity = recentActivity.slice(0, 10);

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-50 text-red-700 border-red-200';
      case 'medium': return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'low': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                {`Welcome back, ${user?.name || user?.fullName || 'Teacher'}! 👋`}
              </h1>
              <p className="text-gray-600 text-lg">
                {currentTime.toLocaleDateString('en-US', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="flex items-center space-x-2 text-2xl font-bold text-gray-900">
              <Clock className="w-6 h-6 text-blue-600" />
              {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="flex flex-wrap gap-4 mt-6">
            {quickStats.map((stat) => {
              const Icon = stat.icon || BookOpen; // Default to BookOpen icon if undefined
              return (
                <div key={stat.label} className="flex items-center space-x-3 bg-gray-50 rounded-full px-4 py-2 border border-gray-200">
                  <Icon className={`w-5 h-5 ${stat.color || 'text-gray-600'}`} />
                  <span className="font-semibold text-gray-900">{stat.value}</span>
                  <span className="text-sm text-gray-600">{stat.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">Quick Actions</h2>
            <Zap className="w-5 h-5 text-amber-500" />
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {quickActions.map((action) => {
              const Icon = action.icon || BookOpen; // Default to BookOpen icon if undefined
              return (
                <Link
                  key={action.name}
                  to={action.href}
                  className={`group ${action.color} ${action.hoverColor} text-white p-4 rounded-xl transition-all duration-200 hover:scale-105 hover:shadow-lg`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <Icon className="w-6 h-6" />
                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="font-semibold">{action.name}</div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Class Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Next Class */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <div className={`bg-gradient-to-r ${nextClass.color} p-6 text-white`}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold">Next Class</h3>
                  <PlayCircle className="w-6 h-6" />
                </div>
                <div className="space-y-2">
                  <div className="text-2xl font-bold">{nextClass.subject}</div>
                  <div className="text-indigo-100">{nextClass.grade} • {nextClass.room}</div>
                  <div className="flex items-center space-x-2 text-indigo-200">
                    <Timer className="w-4 h-4" />
                    <span>{nextClass.time} • in {nextClass.timeUntil}</span>
                  </div>
                </div>
              </div>
              <div className="p-4 bg-gray-50 flex items-center justify-between text-sm text-gray-600 border-t border-gray-100">
                <div className="flex items-center space-x-2">
                  <Users className="w-4 h-4" />
                  <span>{nextClass.studentsCount} Students Registered</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Tasks & AI */}
          <div className="lg:col-span-2 space-y-6">
            {/* Tasks & AI Suggestions Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Today's Tasks */}
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-gray-900">Today's Tasks</h3>
                  <Target className="w-5 h-5 text-gray-500" />
                </div>
                <div className="space-y-3">
                  {tasks.slice(0, 4).map((item) => (
                    <div key={item._id} className="flex items-start space-x-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => handleToggleTask(item)}
                        className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm font-medium ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {item.title}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                          <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(item.priority)}`}>
                            {item.priority.toUpperCase()}
                          </span>
                          <span className="text-xs text-gray-500">{new Date(item.dueDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex space-x-2 mt-4">
                  <button 
                    onClick={() => setShowTaskModal(true)}
                    className="flex-1 text-indigo-600 hover:text-indigo-700 text-sm font-medium py-2 hover:bg-indigo-50 rounded-xl transition-colors"
                  >
                    View All Tasks
                  </button>
                  <button 
                    onClick={() => setShowAddTaskModal(true)}
                    className="flex items-center space-x-1 bg-indigo-600 text-white px-3 py-2 rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Task</span>
                  </button>
                </div>
              </div>

              {/* Removed AI Suggestions placeholder */}
            </div>

            {/* Recent Activity */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-900">Recent Activity</h3>
                <Activity className="w-5 h-5 text-gray-500" />
              </div>
              <div className="space-y-4">
                {displayRecentActivity.map((activity) => {
                  const Icon = activity.icon || Activity; // Default to Activity icon if undefined
                  return (
                    <div key={activity.id} className="flex items-start space-x-4 p-4 rounded-xl hover:bg-gray-50 transition-colors">
                      <div className="p-2 rounded-lg bg-gray-100">
                        <Icon className={`w-4 h-4 ${activity.color || 'text-gray-600'}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm">
                          <span className="font-medium text-gray-900">{activity.student}</span>
                          <span className="text-gray-600"> {activity.action}</span>
                        </p>
                        <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  );
                })}
              </div>
              <div className="mt-6 text-center">
                <button 
                  onClick={() => setShowActivityModal(true)}
                  className="text-indigo-600 hover:text-indigo-700 text-sm font-medium flex items-center mx-auto space-x-1 hover:bg-indigo-50 px-4 py-2 rounded-xl transition-colors"
                >
                  <span>View All Activity</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Timetable Grid Section */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 overflow-x-auto">
          <div className="flex items-center justify-between mb-6 min-w-[800px]">
            <h3 className="text-xl font-bold text-gray-900">Weekly Timetable</h3>
            <button 
              onClick={() => setShowAddScheduleModal(true)}
              className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-200 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Add Schedule</span>
            </button>
          </div>
          <div className="min-w-[800px]">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="p-3 border border-gray-200 bg-[#1E293B] text-white font-bold w-24 uppercase">Time Table</th>
                  {timetableSlots.map((slot, index) => (
                    <th key={index} className="p-3 border border-gray-200 bg-[#334155] text-white text-center whitespace-pre-line text-sm">
                      {slot.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekDaysTimetable.map(day => (
                  <tr key={day}>
                    <td className="p-3 border border-gray-200 bg-[#334155] text-white font-bold text-center text-sm">
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
                              navigate('/attendance', { state: { classId: cellSchedule.class?._id || cellSchedule.class } });
                            } else {
                              setNewSchedule({
                                class: '',
                                dayOfWeek: day,
                                startTime: slot.start,
                                endTime: slot.end
                              });
                              setShowAddScheduleModal(true);
                            }
                          }}
                        >
                          {cellSchedule ? (
                            <div>
                              <div className="text-sm font-bold text-[#0F172A]">{cellSchedule.class?.name || 'Class'}</div>
                              <div className="text-xs text-[#334155] mt-1 font-medium">{cellSchedule.class?.subject}</div>
                            </div>
                          ) : (
                            <div className="w-full h-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="w-4 h-4 text-indigo-400" />
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

      {/* View All Tasks Modal */}
      {showTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">All Tasks</h3>
              <button 
                onClick={() => setShowTaskModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task._id} className="flex items-start space-x-3 p-4 bg-gray-50 rounded-xl">
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => handleToggleTask(task)}
                    className="mt-1 h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                      {task.title}
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityColor(task.priority)}`}>
                        {task.priority.toUpperCase()}
                      </span>
                      <span className="text-xs text-gray-500">{new Date(task.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <div className="flex justify-end mt-6">
              <button 
                onClick={() => setShowAddTaskModal(true)}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Add New Task</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add New Task</h3>
              <button 
                onClick={() => setShowAddTaskModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={handleAddTask} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Task Description</label>
                <input
                  type="text"
                  value={newTask.task}
                  onChange={(e) => setNewTask({...newTask, task: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., Grade Math Quiz"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
                <select
                  value={newTask.priority}
                  onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Due Time</label>
                <input
                  type="text"
                  value={newTask.dueTime}
                  onChange={(e) => setNewTask({...newTask, dueTime: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g., 2:00 PM, Tomorrow, Friday"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={newTask.subject}
                  onChange={(e) => setNewTask({...newTask, subject: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="Math">Math</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="General">General</option>
                  <option value="Admin">Admin</option>
                  <option value="Planning">Planning</option>
                </select>
              </div>
              
              <div className="flex space-x-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddTaskModal(false)}
                  className="flex-1 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  Add Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Add to Schedule</h3>
              <button onClick={() => setShowAddScheduleModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-6 h-6" />
              </button>
            </div>
            <form onSubmit={handleAddSchedule} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Class</label>
                <select
                  required
                  value={newSchedule.class}
                  onChange={(e) => setNewSchedule({...newSchedule, class: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select a Class</option>
                  {classes.map(c => (
                    <option key={c._id} value={c._id}>{c.name} - {c.subject}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Day of Week</label>
                <select
                  required
                  value={newSchedule.dayOfWeek}
                  onChange={(e) => setNewSchedule({...newSchedule, dayOfWeek: e.target.value})}
                  className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                >
                  {daysOfWeek.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    required
                    value={newSchedule.startTime}
                    onChange={(e) => setNewSchedule({...newSchedule, startTime: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                  <input
                    type="time"
                    required
                    value={newSchedule.endTime}
                    onChange={(e) => setNewSchedule({...newSchedule, endTime: e.target.value})}
                    className="w-full px-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors mt-4"
              >
                Save Schedule
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Attendance Modal */}
      {attendanceModal.show && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">
                Attendance: {attendanceModal.scheduleItem?.class.name}
              </h3>
              <button 
                onClick={() => setAttendanceModal({ show: false, scheduleItem: null, records: [] })}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {attendanceModal.records.map((record, idx) => (
                <div key={record.student} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <span className="font-medium">{record.name}</span>
                  <select 
                    value={record.status}
                    onChange={(e) => {
                      const newRecords = [...attendanceModal.records];
                      newRecords[idx].status = e.target.value;
                      setAttendanceModal({ ...attendanceModal, records: newRecords });
                    }}
                    className={`px-3 py-1 rounded-lg border ${
                      record.status === 'present' ? 'bg-green-100 text-green-800 border-green-200' :
                      record.status === 'absent' ? 'bg-red-100 text-red-800 border-red-200' :
                      'bg-yellow-100 text-yellow-800 border-yellow-200'
                    }`}
                  >
                    <option value="present">Present</option>
                    <option value="absent">Absent</option>
                    <option value="late">Late</option>
                  </select>
                </div>
              ))}
            </div>
            
            <div className="mt-6 flex justify-end">
              <button 
                onClick={submitAttendance}
                className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
              >
                Submit Attendance
              </button>
            </div>
          </div>
        </div>
      )}

      {/* All Activity Modal */}
      {showActivityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">All Recent Activity</h3>
              <button 
                onClick={() => setShowActivityModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-4">
              {displayRecentActivity.map((activity) => {
                const Icon = activity.icon || Activity; // Default to Activity icon if undefined
                return (
                  <div key={activity.id} className="flex items-start space-x-4 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="p-2 rounded-lg bg-white shadow-sm">
                      <Icon className={`w-5 h-5 ${activity.color || 'text-gray-600'}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-medium text-gray-900">{activity.student}</span>
                        <span className="text-gray-600"> {activity.action}</span>
                      </p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-gray-400" />
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Class Details Modal */}
      {showClassDetailsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Class Details - {nextClass.subject}</h3>
              <button 
                onClick={() => setShowClassDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-xl transition-all duration-200"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="space-y-6">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-2xl p-6 text-white">
                <h4 className="text-xl font-bold mb-2">{nextClass.subject}</h4>
                <p className="text-indigo-100 mb-4">{nextClass.grade} • {nextClass.room}</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-indigo-200">Time</p>
                    <p className="font-semibold">{nextClass.time}</p>
                  </div>
                  <div>
                    <p className="text-sm text-indigo-200">Students</p>
                    <p className="font-semibold">{nextClass.studentsCount}</p>
                  </div>
                  <div>
                    <p className="text-sm text-indigo-200">Topic</p>
                    <p className="font-semibold">{nextClass.topic}</p>
                  </div>
                  <div>
                    <p className="text-sm text-indigo-200">Starts In</p>
                    <p className="font-semibold">{nextClass.timeUntil}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Quick Actions</h5>
                  <div className="space-y-2">
                    <button className="w-full text-left p-2 hover:bg-white rounded-lg transition-colors">
                      📋 Take Attendance
                    </button>
                    <button className="w-full text-left p-2 hover:bg-white rounded-lg transition-colors">
                      📝 Start Assignment
                    </button>
                    <button className="w-full text-left p-2 hover:bg-white rounded-lg transition-colors">
                      💬 Open Discussion
                    </button>
                  </div>
                </div>
                
                <div className="bg-gray-50 rounded-xl p-4">
                  <h5 className="font-semibold text-gray-900 mb-3">Class Materials</h5>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2 p-2 hover:bg-white rounded-lg transition-colors">
                      <FileText className="w-4 h-4 text-blue-600" />
                      <span className="text-sm">Chapter 5 Notes</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 hover:bg-white rounded-lg transition-colors">
                      <PlayCircle className="w-4 h-4 text-red-600" />
                      <span className="text-sm">Video Lecture</span>
                    </div>
                    <div className="flex items-center space-x-2 p-2 hover:bg-white rounded-lg transition-colors">
                      <HelpCircle className="w-4 h-4 text-purple-600" />
                      <span className="text-sm">Practice Quiz</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button 
                  onClick={() => setShowClassDetailsModal(false)}
                  className="px-6 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                >
                  Close
                </button>
                <Link 
                  to="/classes/8A"
                  className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-medium hover:bg-indigo-700 transition-colors"
                >
                  Go to Class
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;