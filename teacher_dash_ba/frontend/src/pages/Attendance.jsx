import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  ClipboardCheck, 
  Calendar, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Save,
  Download,
  AlertCircle,
  BookOpen
} from 'lucide-react';
import apiService from '../services/api';

const Attendance = () => {
  const location = useLocation();
  const initialClassId = location.state?.classId || '';
  
  const [classes, setClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(initialClassId);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [students, setStudents] = useState([]);
  const [attendanceRecords, setAttendanceRecords] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchClassData(selectedClass);
    } else {
      setStudents([]);
      setAttendanceRecords({});
    }
  }, [selectedClass, selectedDate]);

  const fetchClasses = async () => {
    try {
      setLoading(true);
      const response = await apiService.getClasses();
      setClasses(response.data || []);
      if (!initialClassId && response.data?.length > 0) {
        setSelectedClass(response.data[0]._id);
      }
    } catch (err) {
      console.error('Failed to fetch classes', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassData = async (classId) => {
    try {
      setLoading(true);
      const response = await apiService.getClass(classId);
      const classData = response.data || response;
      setStudents(classData.students || []);
      
      // Fetch existing attendance records for this class
      const attendanceRes = await apiService.getClassAttendance(classId);
      const allAttendance = attendanceRes.data || [];
      
      // Find attendance for the selected date
      const targetDateStr = new Date(selectedDate).toDateString();
      const existingAttendance = allAttendance.find(a => new Date(a.date).toDateString() === targetDateStr);
      
      const records = {};
      
      if (existingAttendance && existingAttendance.records) {
        // Load existing records
        existingAttendance.records.forEach(r => {
          const studentId = r.student._id || r.student;
          records[studentId] = { status: r.status };
        });
      }
      
      // Ensure all students have a record (default to present if new)
      (classData.students || []).forEach(student => {
         const sId = student._id || student;
         if (!records[sId]) {
           records[sId] = { status: 'present' };
         }
      });
      
      setAttendanceRecords(records);
    } catch (err) {
      console.error('Failed to fetch class data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = (studentId, status) => {
    setAttendanceRecords({
      ...attendanceRecords,
      [studentId]: { status }
    });
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      
      const recordsArray = Object.entries(attendanceRecords).map(([studentId, data]) => ({
        student: studentId,
        status: data.status
      }));
      
      await apiService.submitAttendance({
        classId: selectedClass,
        date: selectedDate,
        records: recordsArray
      });
      
      alert('Attendance saved successfully!');
    } catch (err) {
      console.error('Failed to save attendance', err);
      alert(err.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  // Calculate stats
  const totalStudents = students.length;
  const presentCount = Object.values(attendanceRecords).filter(r => r.status === 'present').length;
  const absentCount = Object.values(attendanceRecords).filter(r => r.status === 'absent').length;
  const lateCount = Object.values(attendanceRecords).filter(r => r.status === 'late').length;
  
  const presentPercent = totalStudents ? Math.round((presentCount / totalStudents) * 100) : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Attendance Tracker</h1>
          <p className="text-gray-600 mt-1">Manage and track student attendance</p>
        </div>
        <div className="flex items-center space-x-4">
          <button className="flex items-center space-x-2 px-4 py-2 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors text-gray-700 font-medium shadow-sm">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
          <button 
            onClick={handleSaveAttendance}
            disabled={saving || !selectedClass}
            className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-colors text-white font-medium disabled:opacity-50 shadow-sm"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Attendance'}</span>
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 flex flex-col md:flex-row gap-6 items-end">
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">Select Class</label>
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all appearance-none outline-none"
            >
              <option value="" disabled>Select a class...</option>
              {classes.map(c => (
                <option key={c._id} value={c._id}>{c.name} - {c.subject}</option>
              ))}
            </select>
            <BookOpen className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
        </div>
        <div className="flex-1 w-full">
          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <div className="relative">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
            />
            <Calendar className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
        </div>
      ) : selectedClass ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Attendance List */}
          <div className="lg:col-span-3 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 bg-gray-50/50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-900">Student List</h3>
              <div className="text-sm font-medium text-gray-500 bg-white px-3 py-1 rounded-full border border-gray-200 shadow-sm">
                {students.length} Students Total
              </div>
            </div>
            
            <div className="divide-y divide-gray-100">
              {students.length > 0 ? students.map((student, idx) => {
                const record = attendanceRecords[student._id || student] || { status: 'present' };
                // Using generic names if student object is just an ID
                const studentName = student.name || `Student ${idx + 1}`;
                const studentEmail = student.email || `student${idx+1}@example.com`;
                
                return (
                  <div key={student._id || student} className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between hover:bg-gray-50 transition-colors gap-4">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                        {studentName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{studentName}</div>
                        <div className="text-sm text-gray-500">{studentEmail}</div>
                      </div>
                    </div>
                    
                    <div className="flex bg-gray-100 rounded-xl p-1 shadow-inner">
                      <button
                        onClick={() => handleStatusChange(student._id || student, 'present')}
                        className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          record.status === 'present' 
                            ? 'bg-white text-emerald-600 shadow-sm ring-1 ring-emerald-500/20' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <CheckCircle className="w-4 h-4" />
                        <span>Present</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(student._id || student, 'absent')}
                        className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          record.status === 'absent' 
                            ? 'bg-white text-red-600 shadow-sm ring-1 ring-red-500/20' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Absent</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(student._id || student, 'late')}
                        className={`flex items-center space-x-1 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          record.status === 'late' 
                            ? 'bg-white text-amber-600 shadow-sm ring-1 ring-amber-500/20' 
                            : 'text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        <span>Late</span>
                      </button>
                    </div>
                  </div>
                );
              }) : (
                <div className="p-12 text-center text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p>No students found in this class.</p>
                </div>
              )}
            </div>
          </div>
          
          {/* Stats Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-6">Summary</h3>
              
              <div className="flex items-center justify-center mb-6">
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-gray-100"
                      strokeWidth="3"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    <path
                      className="text-emerald-500 transition-all duration-1000 ease-out"
                      strokeWidth="3"
                      strokeDasharray={`${presentPercent}, 100`}
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-bold text-gray-900">{presentPercent}%</span>
                    <span className="text-xs text-gray-500 font-medium">Present</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-emerald-50 rounded-xl border border-emerald-100/50">
                  <div className="flex items-center space-x-2 text-emerald-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">Present</span>
                  </div>
                  <span className="text-emerald-700 font-bold bg-white px-2 py-0.5 rounded shadow-sm">{presentCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-red-50 rounded-xl border border-red-100/50">
                  <div className="flex items-center space-x-2 text-red-700">
                    <XCircle className="w-5 h-5" />
                    <span className="font-medium text-sm">Absent</span>
                  </div>
                  <span className="text-red-700 font-bold bg-white px-2 py-0.5 rounded shadow-sm">{absentCount}</span>
                </div>
                <div className="flex items-center justify-between p-3 bg-amber-50 rounded-xl border border-amber-100/50">
                  <div className="flex items-center space-x-2 text-amber-700">
                    <Clock className="w-5 h-5" />
                    <span className="font-medium text-sm">Late</span>
                  </div>
                  <span className="text-amber-700 font-bold bg-white px-2 py-0.5 rounded shadow-sm">{lateCount}</span>
                </div>
              </div>
            </div>
            
            {absentCount > 0 && (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 flex items-start space-x-3 shadow-sm">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-red-800">
                  <span className="font-bold block mb-1">Attention Needed</span>
                  You have {absentCount} student{absentCount > 1 ? 's' : ''} absent today. Consider sending a quick follow-up message.
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center max-w-2xl mx-auto mt-12">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <ClipboardCheck className="w-10 h-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No Class Selected</h3>
          <p className="text-gray-500">Please select a class from the dropdown above to manage attendance for this date.</p>
        </div>
      )}
    </div>
  );
};

export default Attendance;
