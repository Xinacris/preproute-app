import api from './axios';

export const getSubjects = () => api.get('/subjects');
export const getTopicsBySubject = (subjectId: string) =>
  api.get(`/topics/subject/${subjectId}`);
export const getSubTopicsByTopics = (topicIds: string[]) =>
  api.post('/sub-topics/multi-topics', { topicIds });
