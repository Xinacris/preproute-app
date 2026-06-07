import api from './axios';

export const bulkCreateQuestions = (questions: unknown[]) =>
  api.post('/questions/bulk', { questions });
export const fetchBulkQuestions = (question_ids: string[]) =>
  api.post('/questions/fetchBulk', { question_ids });
