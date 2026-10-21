import api from './axios';

export const getDashboardStats = () => api.get('/features/dashboard/stats');
export const getRecentApplications = () => api.get('/features/dashboard/recent');
export const getUpcomingInterviews = () => api.get('/applications/get-upcoming-interviews');
