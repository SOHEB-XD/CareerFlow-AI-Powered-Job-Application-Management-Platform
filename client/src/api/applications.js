import api from './axios';

/**
 * Fetch all applications with optional query params (page, limit, search, status)
 */
export const getApplications = (params = {}) => {
  return api.get('/applications/get-all-applications', { params });
};

/**
 * Fetch single application by ID
 */
export const getApplicationById = (id) => {
  return api.get(`/applications/get-application/${id}`);
};

/**
 * Create a new application
 */
export const addApplication = (data) => {
  return api.post('/applications/add-application', data);
};

/**
 * Update an existing application by ID
 */
export const updateApplication = (id, data) => {
  return api.put(`/applications/update-application/${id}`, data);
};

/**
 * Delete an application by ID
 */
export const deleteApplication = (id) => {
  return api.delete(`/applications/delete-application/${id}`);
};

/**
 * Auto-update 'Applied' status older than 10 days to 'No Response'
 */
export const updateNoResponse = () => {
  return api.put('/applications/update-no-response');
};
