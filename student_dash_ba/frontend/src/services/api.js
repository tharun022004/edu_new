const API_BASE_URL = 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('🔑 Token found in localStorage, adding to headers');
    } else {
      console.warn('⚠️ No token found in localStorage');
    }
    
    return headers;
  }

  // Helper method to handle responses
  async handleResponse(response, endpoint = '') {
    if (!response.ok) {
      let errorBody = {};
      try {
        errorBody = await response.json();
      } catch {}
      
      // Only logout on 401 if it's not a submission error
      // Submission errors should be handled gracefully without logging out
      if (response.status === 401) {
        // Check if this is a submission endpoint - don't logout on submission errors
        const isSubmissionEndpoint = endpoint.includes('/submit') || endpoint.includes('/assessments');
        
        if (!isSubmissionEndpoint) {
          // clear invalid auth and force re-login
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          localStorage.removeItem('authExpiry');
          if (window.location.pathname !== '/') {
            window.location.href = '/';
          }
        }
      }
      
      // Create error with validation details
      const error = new Error(errorBody.message || 'Something went wrong');
      error.errors = errorBody.errors || [];
      error.status = response.status;
      throw error;
    }
    return response.json();
  }

  // Generic HTTP methods
  async get(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response, endpoint);
  }

  async post(endpoint, data) {
    const headers = this.getAuthHeaders();
    console.log('📤 POST request to:', `${this.baseURL}${endpoint}`);
    console.log('📋 Headers:', { ...headers, Authorization: headers.Authorization ? 'Bearer ***' : 'None' });
    
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify(data),
    });
    return this.handleResponse(response, endpoint);
  }

  async put(endpoint, data) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response, endpoint);
  }

  async delete(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response, endpoint);
  }

  // Auth endpoints
  async login(email, password) {
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    return this.handleResponse(response);
  }

  async register(fullName, email, password) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fullName, email, password }),
    });
    return this.handleResponse(response);
  }

  async getCurrentUser() {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Profile endpoints
  async getProfile() {
    return this.get('/users/profile');
  }

  async updateProfile(profileData) {
    return this.put('/users/profile', profileData);
  }

  // Student classes (mapped from teacher backend)
  async getStudentClasses() {
    const response = await fetch(`${this.baseURL}/classes`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response, '/classes');
  }

  // Teachers list (for Ask Faculty)
  async getTeachers() {
    const response = await fetch(`${this.baseURL}/users?role=teacher`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Dashboard endpoints
  async getDashboard() {
    const response = await fetch(`${this.baseURL}/dashboard`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Courses endpoints
  async getCourses() {
    const response = await fetch(`${this.baseURL}/courses`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getSubjects() {
    const response = await fetch(`${this.baseURL}/courses/subjects`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getEnrolledCourses() {
    const response = await fetch(`${this.baseURL}/courses`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getCourse(courseId) {
    const response = await fetch(`${this.baseURL}/courses/${courseId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async enrollInCourse(courseId) {
    const response = await fetch(`${this.baseURL}/courses/${courseId}/enroll`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateCourseProgress(courseId, lessonId, completed) {
    const response = await fetch(`${this.baseURL}/courses/${courseId}/progress`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ lessonId, completed }),
    });
    return this.handleResponse(response);
  }

  // Quizzes endpoints
  async getQuizzes(courseId) {
    const url = courseId ? `${this.baseURL}/quizzes?courseId=${courseId}` : `${this.baseURL}/quizzes`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getQuiz(quizId) {
    const response = await fetch(`${this.baseURL}/quizzes/${quizId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async submitQuizAttempt(quizId, answers, timeSpent) {
    const response = await fetch(`${this.baseURL}/quizzes/${quizId}/attempt`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ answers, timeSpent }),
    });
    return this.handleResponse(response);
  }

  async getQuizResults(quizId) {
    const response = await fetch(`${this.baseURL}/quizzes/${quizId}/results`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Progress endpoints
  async getProgress() {
    const response = await fetch(`${this.baseURL}/progress`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateProgress(progressData) {
    const response = await fetch(`${this.baseURL}/progress`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(progressData),
    });
    return this.handleResponse(response);
  }

  // Notes endpoints
  async getNotes(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${this.baseURL}/notes?${queryString}` : `${this.baseURL}/notes`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createNote(noteData) {
    const response = await fetch(`${this.baseURL}/notes`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(noteData),
    });
    return this.handleResponse(response);
  }

  // Collections endpoints
  async getCollections() {
    const response = await fetch(`${this.baseURL}/collections`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createCollection(collectionData) {
    const response = await fetch(`${this.baseURL}/collections`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(collectionData),
    });
    return this.handleResponse(response);
  }

  async updateCollection(collectionId, collectionData) {
    const response = await fetch(`${this.baseURL}/collections/${collectionId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(collectionData),
    });
    return this.handleResponse(response);
  }

  async deleteCollection(collectionId) {
    const response = await fetch(`${this.baseURL}/collections/${collectionId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Video notes endpoints
  async getVideoNotes() {
    const response = await fetch(`${this.baseURL}/videos/notes`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createVideoNote(noteData) {
    const response = await fetch(`${this.baseURL}/videos/notes`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(noteData),
    });
    return this.handleResponse(response);
  }

  async updateVideoNote(noteId, noteData) {
    const response = await fetch(`${this.baseURL}/videos/notes/${noteId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(noteData),
    });
    return this.handleResponse(response);
  }

  async deleteVideoNote(noteId) {
    const response = await fetch(`${this.baseURL}/videos/notes/${noteId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Class joining functionality
  async joinClassByCode(classCode) {
    const response = await fetch(`${this.baseURL}/classes/join`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ classCode }),
    });
    return this.handleResponse(response);
  }

  // Doubts endpoints
  async getDoubts(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${this.baseURL}/doubts?${queryString}` : `${this.baseURL}/doubts`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getDoubt(doubtId) {
    const response = await fetch(`${this.baseURL}/doubts/${doubtId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createDoubt(doubtData) {
    const response = await fetch(`${this.baseURL}/doubts`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(doubtData),
    });
    return this.handleResponse(response);
  }

  async updateDoubt(doubtId, doubtData) {
    const response = await fetch(`${this.baseURL}/doubts/${doubtId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(doubtData),
    });
    return this.handleResponse(response);
  }

  async deleteDoubt(doubtId) {
    const response = await fetch(`${this.baseURL}/doubts/${doubtId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async addAnswer(doubtId, answerData) {
    const response = await fetch(`${this.baseURL}/doubts/${doubtId}/answers`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(answerData),
    });
    return this.handleResponse(response);
  }

  async voteAnswer(doubtId, answerId, voteType) {
    const response = await fetch(`${this.baseURL}/doubts/${doubtId}/answers/${answerId}/vote`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ voteType }),
    });
    return this.handleResponse(response);
  }

  async likeDoubt(doubtId) {
    const response = await fetch(`${this.baseURL}/doubts/${doubtId}/like`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async bookmarkDoubt(doubtId) {
    const response = await fetch(`${this.baseURL}/doubts/${doubtId}/bookmark`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async updateDoubtStatus(doubtId, status) {
    const response = await fetch(`${this.baseURL}/doubts/${doubtId}/status`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ status }),
    });
    return this.handleResponse(response);
  }

  // Notes endpoints
  async getNotes(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${this.baseURL}/notes?${queryString}` : `${this.baseURL}/notes`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getNote(noteId) {
    const response = await fetch(`${this.baseURL}/notes/${noteId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createNote(noteData) {
    const response = await fetch(`${this.baseURL}/notes`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(noteData),
    });
    return this.handleResponse(response);
  }

  async updateNote(noteId, noteData) {
    const response = await fetch(`${this.baseURL}/notes/${noteId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(noteData),
    });
    return this.handleResponse(response);
  }

  async deleteNote(noteId) {
    const response = await fetch(`${this.baseURL}/notes/${noteId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Assessment methods (unified system)
  async getAssessments(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/assessments${queryString ? `?${queryString}` : ''}`);
  }

  async getAssessment(assessmentId) {
    return this.get(`/assessments/${assessmentId}`);
  }

  async submitAssessment(assessmentId, data) {
    return this.post(`/assessments/${assessmentId}/submit`, data);
  }

  async uploadAssessmentFile(assessmentId, fileData) {
    return this.post(`/assessments/${assessmentId}/upload`, fileData);
  }

  async deleteAssessmentFile(assessmentId, fileId) {
    return this.delete(`/assessments/${assessmentId}/files/${fileId}`);
  }

  // Content methods (materials, notes, videos from teacher)
  async getContent(params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/content${queryString ? `?${queryString}` : ''}`);
  }

  async getContentItem(contentId) {
    return this.get(`/content/${contentId}`);
  }

  // ── Teacher-Backend Assignment methods (port 5001) ──
  // These call the TEACHER backend directly for Q&A assignment flow.
  get teacherBaseURL() {
    return 'http://localhost:5001/api';
  }

  async getStudentAssignmentsFromTeacher(email) {
    const encoded = encodeURIComponent(email);
    const ts = Date.now(); // cache buster
    const response = await fetch(`${this.teacherBaseURL}/assignments/student/${encoded}?_t=${ts}`, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch assignments from teacher backend');
    }
    return response.json();
  }

  async getStudentAssignmentFromTeacher(email, assignmentId) {
    const encoded = encodeURIComponent(email);
    const ts = Date.now(); // cache buster
    const response = await fetch(`${this.teacherBaseURL}/assignments/student/${encoded}/${assignmentId}?_t=${ts}`, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch assignment from teacher backend');
    }
    return response.json();
  }

  async uploadSubmissionPdf(file) {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${this.teacherBaseURL}/assignments/student/upload`, {
      method: 'POST',
      body: formData
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to upload PDF');
    }
    return response.json();
  }

  async submitQAAssignment(assignmentId, data) {
    // data: { studentEmail, studentName, answers?, attachments?, status? }
    const response = await fetch(`${this.teacherBaseURL}/assignments/student/submit/${assignmentId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to submit assignment');
    }
    return response.json();
  }

  // Fetch Teacher Notes for a specific class
  async getStudentNotesFromTeacher(classId) {
    const ts = Date.now();
    const response = await fetch(`${this.teacherBaseURL}/student-notes/${classId}?_t=${ts}`, {
      headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || 'Failed to fetch notes from teacher backend');
    }
    return response.json();
  }
  async getRecentActivity() {
    const response = await fetch(`${this.baseURL}/dashboard/activity`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // --- Dashboard Schedule, Attendance, & Goals ---
  async getSchedule() {
    const response = await fetch(`${this.baseURL}/schedule`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getAttendance() {
    const response = await fetch(`${this.baseURL}/attendance`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getGoals() {
    const response = await fetch(`${this.baseURL}/goals`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createGoal(goalData) {
    const response = await fetch(`${this.baseURL}/goals`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(goalData)
    });
    return this.handleResponse(response);
  }

  async updateGoal(id, goalData) {
    const response = await fetch(`${this.baseURL}/goals/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(goalData)
    });
    return this.handleResponse(response);
  }

  async deleteGoal(id) {
    const response = await fetch(`${this.baseURL}/goals/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }
}
export default new ApiService();

