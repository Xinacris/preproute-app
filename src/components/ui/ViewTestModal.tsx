import { X, Clock, FileText, Star, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getTestById } from '../../api/tests';
import { fetchBulkQuestions } from '../../api/questions';
import { Spinner } from './Spinner';
import { Badge } from './Badge';
import { Button } from './Button';
import type { Test, Question } from '../../types';

const OPTION_KEYS = ['option1', 'option2', 'option3', 'option4'] as const;

interface ViewTestModalProps {
  testId: string;
  onClose: () => void;
}

export const ViewTestModal = ({ testId, onClose }: ViewTestModalProps) => {
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['viewModalTest', testId],
    queryFn: async () => {
      const res = await getTestById(testId);
      const test: Test = res.data?.data || res.data;
      const ids: string[] = Array.isArray(test?.questions) ? (test.questions as string[]) : [];
      let questions: Question[] = [];
      if (ids.length > 0) {
        const qRes = await fetchBulkQuestions(ids);
        questions = qRes.data?.data || qRes.data || [];
      }
      return { test, questions };
    },
    staleTime: 0,
  });

  const test = data?.test || null;
  const questions: Question[] = data?.questions || [];

  const typeLabel = test?.type === 'chapterwise' ? 'Chapter Wise'
    : test?.type === 'pyq' ? 'PYQ'
    : test?.type === 'mock' ? 'Mock Test'
    : test?.type || 'Chapter Wise';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-3xl z-10 flex flex-col" style={{ maxHeight: '92vh' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-base font-semibold text-text-primary">Test Details</h3>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 sm:p-6">
          {isLoading ? (
            <div className="flex justify-center py-12"><Spinner /></div>
          ) : test ? (
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="dark">{typeLabel}</Badge>
                  <Badge variant={test.difficulty as 'easy' | 'medium' | 'hard'}>
                    {test.difficulty ? test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1) : 'Easy'}
                  </Badge>
                </div>
                <h2 className="text-lg font-semibold text-text-primary">{test.name}</h2>
                <div className="flex items-center gap-3 flex-wrap">
                  {test.subject && (
                    <span className="inline-block bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full font-medium">{test.subject}</span>
                  )}
                  {Array.isArray(test.topics) && test.topics.map((t, i) => (
                    <span key={i} className="inline-block bg-primary-light text-primary text-xs px-2.5 py-1 rounded-full">{t}</span>
                  ))}
                </div>
                <div className="flex items-center gap-4 text-sm text-text-secondary pt-1">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{test.total_time} Min</span>
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{test.total_questions} Q's</span>
                  <span className="flex items-center gap-1.5"><Star className="w-4 h-4" />{test.total_marks} Marks</span>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-semibold text-text-primary mb-2">Questions ({questions.length})</h3>
                {questions.length === 0 ? (
                  <p className="text-sm text-text-secondary">No questions added yet</p>
                ) : (
                  <div className="divide-y divide-border border border-border rounded-xl overflow-hidden">
                    {questions.map((q, idx) => {
                      const qId = q.id || String(idx);
                      const isOpen = expandedQ === qId;
                      return (
                        <div key={qId} className="px-4 py-3">
                          <button onClick={() => setExpandedQ(isOpen ? null : qId)} className="w-full flex items-start gap-3 text-left">
                            <span className="w-6 h-6 rounded-full bg-primary-light text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">{idx + 1}</span>
                            <span className="flex-1 text-sm text-text-primary leading-relaxed" dangerouslySetInnerHTML={{ __html: q.question }} />
                            {isOpen ? <ChevronUp className="w-4 h-4 text-text-secondary flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-text-secondary flex-shrink-0" />}
                          </button>
                          {isOpen && (
                            <div className="mt-3 ml-9 flex flex-col gap-2">
                              {OPTION_KEYS.filter((key) => !!q[key]?.trim()).map((key, i) => {
                                const isCorrect = q.correct_option === key;
                                return (
                                  <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${isCorrect ? 'bg-badge-green-bg text-badge-green-text font-medium' : 'bg-gray-50 dark:bg-gray-700 text-text-primary'}`}>
                                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${isCorrect ? 'bg-success text-white' : 'bg-gray-200 dark:bg-gray-600 text-text-secondary'}`}>
                                      {['A', 'B', 'C', 'D'][i]}
                                    </span>
                                    <span className="flex-1">{q[key]}</span>
                                    {isCorrect && <CheckCircle className="w-3.5 h-3.5 flex-shrink-0" />}
                                  </div>
                                );
                              })}
                              {q.explanation?.trim() && (
                                <div className="mt-1 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                  <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Explanation</p>
                                  <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">{q.explanation}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-secondary">Test not found.</p>
          )}
        </div>

        <div className="px-5 py-4 border-t border-border flex-shrink-0 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
};
