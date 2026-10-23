import api from './axios';

/**
 * Generate a personalized, company-aware email draft using AI.
 * @param {Object} payload - { applicationId, type, userContext, includeResume, recipient, draftId }
 */
export const generateStudioEmail = (payload) => {
  return api.post('/features/communications/generate', payload);
};

/**
 * Update an existing draft with edited subject, body, or recipient.
 * @param {string} id - Communication ID
 * @param {Object} payload - { subject, body, recipient, userContext }
 */
export const updateStudioDraft = (id, payload) => {
  return api.put(`/features/communications/${id}/draft`, payload);
};

/**
 * Retrieve recent drafts for AI Email Studio.
 */
export const getStudioDrafts = () => {
  return api.get('/features/communications/drafts');
};

/**
 * Generate a Gmail compose URL for the specified draft or explicit parameters.
 * @param {string} id - Communication ID or 'custom'
 * @param {Object} params - { recipient, subject, body }
 */
export const getStudioGmailLink = (id, params = {}) => {
  return api.get(`/features/communications/${id}/gmail-link`, { params });
};
