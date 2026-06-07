import { create } from 'zustand';
import type { Test, Question } from '../types';

interface TestState {
  currentTest: Test | null;
  questions: Question[];
  setCurrentTest: (test: Test) => void;
  addQuestion: (q: Question) => void;
  updateQuestion: (index: number, q: Question) => void;
  removeQuestion: (index: number) => void;
  clearAll: () => void;
}

export const useTestStore = create<TestState>((set) => ({
  currentTest: null,
  questions: [],
  setCurrentTest: (test) => set({ currentTest: test }),
  addQuestion: (q) => set((s) => ({ questions: [...s.questions, q] })),
  updateQuestion: (index, q) =>
    set((s) => {
      const qs = [...s.questions];
      qs[index] = q;
      return { questions: qs };
    }),
  removeQuestion: (index) =>
    set((s) => ({ questions: s.questions.filter((_, i) => i !== index) })),
  clearAll: () => set({ currentTest: null, questions: [] }),
}));
