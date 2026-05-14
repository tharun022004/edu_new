import React, { useState, useEffect } from 'react';
import { Users, FileText, HelpCircle, TrendingUp, Calendar, Clock, Eye, CheckCircle, XCircle, BarChart3, X } from 'lucide-react';
import apiService from '../services/api';

const ClassOverview = ({ classId, classData, students = [] }) => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showClassReport, setShowClassReport] = useState(false);

  useEffect(() => {
    if (classId) {
      fetchAttendance();
    }
  }, [classId]);

  const fetchAttendance = async () => {
    try {
      const res = await apiService.getClassAttendance(classId);
      if (res.success) {
        setAttendanceData(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch attendance', err);
    }
  };

  // Get stats from classData or use defaults
  const totalStudents = students.length || classData?.studentCount || 0;
  const activeAssignments = classData?.stats?.totalAssignments || 0;
  const avgPerformance = classData?.stats?.averageScore || 0;
  
  const stats = [
    { name: 'Total Students', value: totalStudents, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { name: 'Active Assignments', value: activeAssignments, icon: FileText, color: 'text-green-600', bg: 'bg-green-50' },
    { name: 'Pending Doubts', value: '0', icon: HelpCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { name: 'Avg. Performance', value: `${avgPerformance}%`, icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-50' },
  ];

  // Helper to calculate student attendance stats
  const getStudentAttendanceStats = (studentId) => {
    let present = 0;
    let absent = 0;
    let late = 0;
    const absentDates = [];
    const lateDates = [];

    (attendanceData || []).forEach(session => {
      if (!session || !session.records) return;
      
      const record = session.records.find(r => {
        if (!r || !r.student) return false;
        const sId = r.student._id || r.student;
        return String(sId) === String(studentId);
      });
      
      if (record) {
        if (record.status === 'present') present++;
        else if (record.status === 'absent') {
          absent++;
          absentDates.push(new Date(session.date).toLocaleDateString());
        }
        else if (record.status === 'late') {
          late++;
          lateDates.push(new Date(session.date).toLocaleDateString());
        }
      }
    });

    const total = present + absent + late;
    const percentage = total === 0 ? 0 : Math.round(((present + late) / total) * 100);

    return { total, present, absent, late, percentage, absentDates, lateDates };
  };

  const getOverallAttendancePercentage = () => {
    let totalRecords = 0;
    let totalPresentLate = 0;
    (attendanceData || []).forEach(session => {
      if (!session || !session.records) return;
      session.records.forEach(r => {
        if (!r) return;
        totalRecords++;
        if (r.status === 'present' || r.status === 'late') totalPresentLate++;
      });
    });
    return totalRecords === 0 ? 0 : Math.round((totalPresentLate / totalRecords) * 100);
  };

  const getInitials = (name) => {
    if (!name) return 'ST';
    return name.split(' ').filter(Boolean).map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <div className="space-y-8 relative">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white/70 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 group">
              <div className="flex items-center space-x-4">
                <div className={`${stat.bg} p-3 rounded-2xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Students List */}
      {students.length > 0 && (
        <div className="bg-white/70 backdrop-blur-xl rounded-2xl p-8 border border-white/20 shadow-xl hover:shadow-2xl transition-all duration-300">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-indigo-500 rounded-xl shadow-md">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Class Students ({students.length})</h3>
            </div>
            <button 
              onClick={() => setShowClassReport(true)}
              className="flex items-center space-x-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-colors font-medium shadow-sm border border-indigo-100"
            >
              <BarChart3 className="w-4 h-4" />
              <span>Whole Class Report</span>
            </button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {students.map((student, index) => {
              const initials = getInitials(student.name);
              const colors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-amber-500', 'bg-red-500'];
              const colorIndex = index % colors.length;
              
              const stStats = getStudentAttendanceStats(student._id);
              
              return (
                <div 
                  key={student._id || index} 
                  onClick={() => setSelectedStudent(student)}
                  className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-indigo-50 rounded-xl border border-indigo-100 hover:shadow-md hover:border-indigo-300 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className={`${colors[colorIndex]} w-12 h-12 rounded-full flex items-center justify-center shadow-lg`}>
                      <span className="text-white font-bold text-sm">{initials}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 group-hover:text-indigo-700 transition-colors">{student.name || 'Student'}</p>
                      <p className="text-xs text-gray-500 truncate">{student.email || ''}</p>
                    </div>
                  </div>
                  <div className="text-right flex flex-col items-end">
                    <span className={`text-xs font-bold px-2 py-1 rounded-full shadow-sm ${
                      stStats.percentage >= 85 ? 'bg-green-100 text-green-700' :
                      stStats.percentage >= 70 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {stStats.percentage}%
                    </span>
                    <span className="text-[10px] text-gray-400 mt-1 uppercase font-semibold">Attendance</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Individual Student Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg mx-4 shadow-2xl relative">
            <button 
              onClick={() => setSelectedStudent(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
            
            <div className="flex items-center space-x-4 mb-8">
               <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                 <span className="text-xl font-bold text-white">
                   {selectedStudent.name ? selectedStudent.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : 'ST'}
                 </span>
               </div>
               <div>
                 <h3 className="text-2xl font-bold text-gray-900">{selectedStudent.name}</h3>
                 <p className="text-gray-500">{selectedStudent.email}</p>
               </div>
            </div>

            {(() => {
              const stats = getStudentAttendanceStats(selectedStudent._id);
              return (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 shadow-sm">
                       <p className="text-sm text-gray-500 mb-1 font-medium">Total Classes Taken</p>
                       <p className="text-4xl font-bold text-gray-900">{stats.total}</p>
                     </div>
                     <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 shadow-sm">
                       <p className="text-sm text-indigo-600 mb-1 font-medium">Attendance Rate</p>
                       <p className="text-4xl font-bold text-indigo-700">{stats.percentage}%</p>
                     </div>
                  </div>
                  
                  <div className="flex justify-between bg-white border border-gray-200 shadow-sm rounded-2xl p-6">
                     <div className="text-center flex-1">
                        <div className="flex items-center justify-center space-x-1 text-emerald-600 mb-2">
                          <CheckCircle className="w-5 h-5" />
                          <span className="text-xs font-bold uppercase tracking-wider">Present</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.present}</p>
                     </div>
                     <div className="w-px bg-gray-200"></div>
                     <div className="text-center flex-1">
                        <div className="flex items-center justify-center space-x-1 text-amber-600 mb-2">
                          <Clock className="w-5 h-5" />
                          <span className="text-xs font-bold uppercase tracking-wider">Late</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.late}</p>
                     </div>
                     <div className="w-px bg-gray-200"></div>
                     <div className="text-center flex-1">
                        <div className="flex items-center justify-center space-x-1 text-red-600 mb-2">
                          <XCircle className="w-5 h-5" />
                          <span className="text-xs font-bold uppercase tracking-wider">Absent</span>
                        </div>
                        <p className="text-2xl font-bold text-gray-900">{stats.absent}</p>
                     </div>
                  </div>

                  {stats.absentDates.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-sm font-bold text-gray-900 mb-3 flex items-center">
                        <Calendar className="w-4 h-4 mr-2 text-red-500" /> Dates Absent
                      </h4>
                      <div className="bg-red-50/50 rounded-xl p-4 border border-red-100 max-h-40 overflow-y-auto">
                        <div className="flex flex-wrap gap-2">
                          {stats.absentDates.map((date, i) => (
                            <span key={i} className="px-3 py-1 bg-white text-red-700 text-xs font-bold rounded-lg shadow-sm border border-red-200">
                              {date}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Whole Class Report Modal */}
      {showClassReport && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-4xl mx-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between mb-8 border-b border-gray-100 pb-4 shrink-0">
               <div className="flex items-center space-x-4">
                 <div className="p-3 bg-indigo-100 rounded-2xl shadow-inner">
                   <BarChart3 className="w-6 h-6 text-indigo-700" />
                 </div>
                 <div>
                   <h3 className="text-2xl font-bold text-gray-900">Whole Class Report</h3>
                   <p className="text-gray-500 font-medium">{attendanceData.length} Total Sessions Recorded</p>
                 </div>
               </div>
               <button 
                 onClick={() => setShowClassReport(false)}
                 className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full transition-all duration-200"
               >
                 <X className="w-6 h-6" />
               </button>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-8 shrink-0">
               <div className="bg-gray-50 p-6 rounded-2xl border border-gray-200 shadow-sm">
                 <p className="text-sm text-gray-500 mb-2 font-bold uppercase tracking-wider">Class Attendance Rate</p>
                 <p className="text-4xl font-black text-gray-900">{getOverallAttendancePercentage()}%</p>
               </div>
               <div className="bg-blue-50 p-6 rounded-2xl border border-blue-200 shadow-sm">
                 <p className="text-sm text-blue-600 mb-2 font-bold uppercase tracking-wider">Total Enrolled</p>
                 <p className="text-4xl font-black text-blue-700">{students.length}</p>
               </div>
               <div className="bg-purple-50 p-6 rounded-2xl border border-purple-200 shadow-sm">
                 <p className="text-sm text-purple-600 mb-2 font-bold uppercase tracking-wider">Total Sessions</p>
                 <p className="text-4xl font-black text-purple-700">{attendanceData.length}</p>
               </div>
            </div>

            <div className="overflow-y-auto flex-1 bg-white rounded-2xl border border-gray-200 shadow-inner">
               <table className="w-full text-left">
                 <thead className="bg-gray-50 border-b border-gray-200 sticky top-0 shadow-sm">
                   <tr>
                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Student Name</th>
                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Present</th>
                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Late</th>
                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-center">Absent</th>
                     <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Percentage</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-100">
                   {students.map(student => {
                     const stStats = getStudentAttendanceStats(student._id);
                     return (
                       <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                         <td className="px-6 py-4">
                           <div className="flex items-center space-x-3">
                             <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-md">
                               {student.name ? student.name[0].toUpperCase() : 'S'}
                             </div>
                             <div>
                               <p className="text-sm font-bold text-gray-900">{student.name}</p>
                               <p className="text-xs text-gray-500">{student.email}</p>
                             </div>
                           </div>
                         </td>
                         <td className="px-6 py-4 text-center font-bold text-gray-900">{stStats.present}</td>
                         <td className="px-6 py-4 text-center font-bold text-amber-600">{stStats.late}</td>
                         <td className="px-6 py-4 text-center font-bold text-red-600">{stStats.absent}</td>
                         <td className="px-6 py-4 text-right">
                           <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-black shadow-sm border ${
                             stStats.percentage >= 85 ? 'bg-green-50 text-green-700 border-green-200' :
                             stStats.percentage >= 70 ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-red-50 text-red-700 border-red-200'
                           }`}>
                             {stStats.percentage}%
                           </span>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassOverview;