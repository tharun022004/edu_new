const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
  }

  // Generic HTTP methods
  async get(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async post(endpoint, data) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async put(endpoint, data) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });
    return this.handleResponse(response);
  }

  async delete(endpoint) {
    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Helper method to get auth headers
  getAuthHeaders() {
    const token = localStorage.getItem('token');
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
      console.log('Authorization header set with token');
    } else {
      console.warn('⚠️ No token found in localStorage');
    }
    
    console.log('Request headers:', headers);
    return headers;
  }

  // Helper method to handle responses
  async handleResponse(response) {
    if (!response.ok) {
      let error;
      try {
        error = await response.json();
      } catch (e) {
        // If response is not JSON, create a generic error
        error = {
          message: `Server error: ${response.status} ${response.statusText}`,
          success: false
        };
      }
      console.error('API Error:', {
        status: response.status,
        statusText: response.statusText,
        error: error
      });
      
      // Provide more detailed error messages
      let errorMessage = error.message || 'Something went wrong';
      if (error.errors && Array.isArray(error.errors)) {
        // express-validator or similar: errors is array of objects
        errorMessage = error.errors
          .map(e => (typeof e === 'string' ? e : e.msg || e.message || JSON.stringify(e)))
          .join(', ');
      } else if (error.error) {
        errorMessage = error.error;
      }
      
      // Create error object with more details
      const apiError = new Error(errorMessage);
      apiError.status = response.status;
      apiError.errors = error.errors;
      apiError.hint = error.hint;
      apiError.data = error.data;
      apiError.retryable = error.retryable;
      throw apiError;
    }
    return response.json();
  }


  // Auth endpoints
  async login(email, password) {
    console.log('🔐 Sending login request to:', `${this.baseURL}/auth/login`);
    console.log('📧 Email:', email);
    
    const response = await fetch(`${this.baseURL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });
    
    console.log('📡 Response status:', response.status, response.statusText);
    
    return this.handleResponse(response);
  }

  async register(name, email, password) {
    const response = await fetch(`${this.baseURL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name, email, password }),
    });
    return this.handleResponse(response);
  }

  async getCurrentUser() {
    const response = await fetch(`${this.baseURL}/auth/me`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Update teacher profile
  async updateProfile(profileData) {
    const response = await fetch(`${this.baseURL}/auth/profile`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(profileData),
    });
    return this.handleResponse(response);
  }

  // Dashboard endpoints
  async getDashboardStats() {
    const response = await fetch(`${this.baseURL}/dashboard/stats`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getTasks() {
    const response = await fetch(`${this.baseURL}/dashboard/tasks`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createTask(taskData) {
    const response = await fetch(`${this.baseURL}/dashboard/tasks`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(taskData),
    });
    return this.handleResponse(response);
  }

  async updateTask(taskId, taskData) {
    const response = await fetch(`${this.baseURL}/dashboard/tasks/${taskId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(taskData),
    });
    return this.handleResponse(response);
  }

  async deleteTask(taskId) {
    const response = await fetch(`${this.baseURL}/dashboard/tasks/${taskId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getRecentActivity() {
    const response = await fetch(`${this.baseURL}/dashboard/activity`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getSchedule(date) {
    const url = date ? `${this.baseURL}/dashboard/schedule?date=${date}` : `${this.baseURL}/dashboard/schedule`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getNotifications() {
    const response = await fetch(`${this.baseURL}/dashboard/notifications`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Classes endpoints
  async getClasses() {
    const response = await fetch(`${this.baseURL}/classes`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getClass(classId) {
    const response = await fetch(`${this.baseURL}/classes/${classId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createClass(classData) {
    const response = await fetch(`${this.baseURL}/classes`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(classData),
    });
    return this.handleResponse(response);
  }

  async updateClass(classId, classData) {
    const response = await fetch(`${this.baseURL}/classes/${classId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(classData),
    });
    return this.handleResponse(response);
  }

  async deleteClass(classId) {
    const response = await fetch(`${this.baseURL}/classes/${classId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Attendance endpoints
  async submitAttendance(attendanceData) {
    const response = await fetch(`${this.baseURL}/attendance`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(attendanceData),
    });
    return this.handleResponse(response);
  }

  async getClassAttendance(classId) {
    const response = await fetch(`${this.baseURL}/attendance/class/${classId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Class code functionality
  async generateClassCode(classId) {
    const response = await fetch(`${this.baseURL}/classes/${classId}/generate-code`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getClassCode(classId) {
    const response = await fetch(`${this.baseURL}/classes/${classId}/code`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getClassStudents(classId) {
    const response = await fetch(`${this.baseURL}/classes/${classId}/students`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async addStudentToClass(classId, studentData) {
    const response = await fetch(`${this.baseURL}/classes/${classId}/students`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(studentData),
    });
    return this.handleResponse(response);
  }

  // Assignments endpoints
  async getAssignments(query = '') {
    const url = query ? `${this.baseURL}/assignments${query}` : `${this.baseURL}/assignments`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getAssignmentSubmissions(assignmentId) {
    const response = await fetch(`${this.baseURL}/assignments/${assignmentId}/submissions`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async gradeSubmission(assignmentId, submissionId, payload) {
    const response = await fetch(`${this.baseURL}/assignments/${assignmentId}/submissions/${submissionId}/grade`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    return this.handleResponse(response);
  }

  async getAssignment(assignmentId) {
    const response = await fetch(`${this.baseURL}/assignments/${assignmentId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createAssignment(assignmentData) {
    const response = await fetch(`${this.baseURL}/assignments`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(assignmentData),
    });
    return this.handleResponse(response);
  }

  async updateAssignment(assignmentId, assignmentData) {
    const response = await fetch(`${this.baseURL}/assignments/${assignmentId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(assignmentData),
    });
    return this.handleResponse(response);
  }

  async deleteAssignment(assignmentId) {
    const response = await fetch(`${this.baseURL}/assignments/${assignmentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Doubts endpoints
  async getDoubts(query = '') {
    const url = query ? `${this.baseURL}/doubts${query}` : `${this.baseURL}/doubts`;
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

  async respondToDoubt(doubtId, responseData) {
    const response = await fetch(`${this.baseURL}/doubts/${doubtId}/respond`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(responseData),
    });
    return this.handleResponse(response);
  }

  async resolveDoubt(doubtId) {
    const response = await fetch(`${this.baseURL}/doubts/${doubtId}/resolve`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  // Content endpoints
  async getContent(query = '') {
    const url = query ? `${this.baseURL}/content${query}` : `${this.baseURL}/content`;
    const response = await fetch(url, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getContentItem(contentId) {
    const response = await fetch(`${this.baseURL}/content/${contentId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async createContent(contentData) {
    const response = await fetch(`${this.baseURL}/content`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(contentData),
    });
    return this.handleResponse(response);
  }

  async updateContent(contentId, contentData) {
    const response = await fetch(`${this.baseURL}/content/${contentId}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(contentData),
    });
    return this.handleResponse(response);
  }

  async deleteContent(contentId) {
    const response = await fetch(`${this.baseURL}/content/${contentId}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async getChapters(classId) {
    const response = await fetch(`${this.baseURL}/content/chapters/${classId}`, {
      headers: this.getAuthHeaders(),
    });
    return this.handleResponse(response);
  }

  async addChapter(chapterData) {
    const response = await fetch(`${this.baseURL}/content/chapters`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(chapterData),
    });
    return this.handleResponse(response);
  }

  async addSubtopic(subtopicData) {
    const response = await fetch(`${this.baseURL}/content/subtopics`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(subtopicData),
    });
    return this.handleResponse(response);
  }

  async uploadContentFile(formData) {
    const headers = this.getAuthHeaders();
    delete headers['Content-Type'];

    const response = await fetch(`${this.baseURL}/content/upload`, {
      method: 'POST',
      headers,
      body: formData,
    });
    return this.handleResponse(response);
  }

  // --- Schedule Endpoints ---
  async getSchedule() {
    return this.get('/schedule');
  }

  async createSchedule(scheduleData) {
    return this.post('/schedule', scheduleData);
  }

  async deleteSchedule(id) {
    return this.delete(`/schedule/${id}`);
  }

  // --- Attendance Endpoints ---
  async submitAttendance(attendanceData) {
    return this.post('/attendance', attendanceData);
  }

  async getClassAttendance(classId) {
    return this.get(`/attendance/class/${classId}`);
  }
}

export default new ApiService();
