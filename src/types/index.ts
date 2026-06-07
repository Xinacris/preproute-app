export interface User {
  id: string;
  name: string;
  role: string;
}

export interface Subject {
  id: string;
  name: string;
}

export interface Topic {
  id: string;
  name: string;
  subject_id: string;
}

export interface SubTopic {
  id: string;
  name: string;
  topic_id: string;
}

export interface Test {
  id: string;
  name: string;
  type: string;
  subject: string;
  topics: string[];
  sub_topics?: string[];
  status: 'draft' | 'live' | 'unpublished' | 'scheduled' | 'expired' | null;
  difficulty: 'easy' | 'medium' | 'hard';
  correct_marks: number;
  wrong_marks: number;
  unattempt_marks: number;
  total_time: number;
  total_marks: number;
  total_questions: number;
  questions?: string[];
  created_at?: string;
}

export interface Question {
  id?: string;
  type: 'mcq';
  question: string;
  option1: string;
  option2: string;
  option3: string;
  option4: string;
  correct_option: 'option1' | 'option2' | 'option3' | 'option4';
  explanation?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  subject?: string;
  topic?: string;
  sub_topic?: string;
  media_url?: string;
  test_id?: string;
}
