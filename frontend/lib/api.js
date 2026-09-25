import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 30000, // 30 second timeout (LLM narrative generation)
});

export const getCases = async () => {
  const response = await api.get('/cases');
  return response.data;
};

export const createCase = async (name, description) => {
  const response = await api.post('/cases', { name, description });
  return response.data;
};

export const getCaseDetails = async (caseId) => {
  const response = await api.get(`/cases/${caseId}`);
  return response.data;
};

export const uploadToCase = async (caseId, file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post(`/cases/${caseId}/upload`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 60000 // Extended timeout for heavy analysis tasks
  });
  
  return response.data;
};

export const deleteCase = async (caseId) => {
  const response = await api.delete(`/cases/${caseId}`);
  return response.data;
};

// Add interceptor to format timeout errors clearly
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.code === 'ECONNABORTED' || (error.message && error.message.includes('timeout'))) {
      error.isTimeout = true;
      error.customMessage = "Analysis is taking longer than expected and is running in the background.";
    }
    return Promise.reject(error);
  }
);

export default api;
