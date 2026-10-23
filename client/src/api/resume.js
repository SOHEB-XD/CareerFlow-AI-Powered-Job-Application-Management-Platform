import api from './axios';

/**
 * Fetch all resume versions for the authenticated user, sorted newest first.
 */
export const getResumes = () => {
  return api.get('/features/resume');
};

/**
 * Fetch the active/current resume for the authenticated user.
 */
export const getCurrentResume = () => {
  return api.get('/features/resume/current');
};

/**
 * Fetch a single resume by ID.
 */
export const getResumeById = (id) => {
  return api.get(`/features/resume/${id}`);
};

/**
 * Upload a new resume version.
 * @param {Object} data - { originalFileName, fileData, fileContentType, fileSize, resumeText, note, targetCompany, targetRole }
 */
export const uploadResume = (data) => {
  return api.post('/features/resume/upload', data);
};

/**
 * Set a specific resume version as the current active version.
 */
export const setCurrentResume = (id) => {
  return api.patch(`/features/resume/${id}/current`);
};

/**
 * Update the note or target company/role for a resume version.
 */
export const updateResumeNote = (id, data) => {
  return api.patch(`/features/resume/${id}/note`, data);
};

/**
 * Delete a resume version by ID.
 */
export const deleteResume = (id) => {
  return api.delete(`/features/resume/${id}`);
};

/**
 * Download a resume file as a blob for browser saving.
 */
export const downloadResumeBlob = (id) => {
  return api.get(`/features/resume/${id}/download`, { responseType: 'blob' });
};
