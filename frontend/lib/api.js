import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8000/api',
  timeout: 10000, // 10 second timeout
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
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  
  return response.data;
};

export default api;
