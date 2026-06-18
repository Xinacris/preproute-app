import { useEffect, useState } from 'react';
import { X, ChevronDown, ChevronUp, CheckCircle, Pencil } from 'lucide-react';
import { useQueryClient, useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { CreateTest } from '../../pages/CreateTest';
import { getTestById } from '../../api/tests';
import { fetchBulkQuestions } from '../../api/questions';
import { Spinner } from './Spinner';
import { Badge } from './Badge';
import { Button } from './Button';
import type { Test, Question } from '../../types';
import { sanitizeHtml } from '../../utils/sanitizeHtml';

const OPTION_KEYS = ['option1', 'option2', 'option3', 'option4'] as const;

interface EditTestModalProps {
  testId: string;
  onClose: () => void;
}

export const EditTestModal = ({ testId, onClose }: EditTestModalProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [expandedQ, setExpandedQ] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const { data, isLoading } = useQuery({
    queryKey: ['editModalQuestions', testId],
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
    refetchOnMount: 'always',
  });

  const questions: Question[] = data?.questions || [];

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['tests'] });
    queryClient.invalidateQueries({ queryKey: ['editModalQuestions', testId] });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div
        className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-4xl z-10 flex flex-col"
        style={{ maxHeight: '94vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border flex-shrink-0">
          <h3 className="text-base font-semibold text-text-primary">Edit Test</h3>
          <button onClick={onClose} className="p-1 text-text-secondary hover:text-text-primary rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content — test details then questions */}
        <div className="overflow-y-auto flex-1">

          {/* ── Test details (editable form) ── */}
          <div className="p-5 sm:p-6">
            <CreateTest editId={testId} onClose={onClose} onSaved={handleSaved} />
          </div>

          {/* ── Questions section ── */}
          <div className="border-t border-border">
            {/* Section header */}
            <div className="px-5 py-3 bg-gray-50 dark:bg-gray-700 flex items-center justify-between">
              <span className="text-sm font-medium text-text-primary flex items-center gap-2">
                Questions
                {isLoading
                  ? <Spinner size="sm" />
                  : <span className="bg-primary-light text-primary text-xs px-1.5 py-0.5 rounded-full">{questions.length}</span>
                }
              </span>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => { onClose(); navigate(`/add-questions/${testId}`); }}
              >
                <Pencil className="w-3.5 h-3.5" />
                Edit / Add Questions
              </Button>
            </div>

            {/* Question accordion list */}
            {isLoading ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : questions.length === 0 ? (
              <div className="px-6 py-10 text-center">
                <p className="text-sm text-text-secondary mb-3">No questions added yet.</p>
                <Button size="sm" onClick={() => { onClose(); navigate(`/add-questions/${testId}`); }}>
                  Add Questions
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {questions.map((q, idx) => {
                  const qId = q.id || String(idx);
                  const isOpen = expandedQ === qId;
                  return (
                    <div key={qId} className="px-5 py-4">
                      <button
                        onClick={() => setExpandedQ(isOpen ? null : qId)}
                        className="w-full flex items-start gap-3 text-left"
                      >
                        <span className="w-6 h-6 rounded-full bg-primary-light text-primary text-xs font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="flex-1 text-sm text-text-primary leading-relaxed" dangerouslySetInnerHTML={{ __html: sanitizeHtml(q.question) }} />
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {q.difficulty && (
                            <Badge variant={q.difficulty === 'medium' ? 'medium' : q.difficulty === 'hard' ? 'hard' : 'easy'}>
                              {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                            </Badge>
                          )}
                          {isOpen
                            ? <ChevronUp className="w-4 h-4 text-text-secondary" />
                            : <ChevronDown className="w-4 h-4 text-text-secondary" />
                          }
                        </div>
                      </button>

                      {isOpen && (
                        <div className="mt-3 ml-9 flex flex-col gap-2">
                          {q.media_url?.trim() && (
                            <img src={q.media_url} alt="" className="max-h-48 rounded-lg" />
                          )}
                          {OPTION_KEYS.filter((key) => !!q[key]?.trim()).map((key, i) => {
                            const isCorrect = q.correct_option === key;
                            return (
                              <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${
                                isCorrect
                                  ? 'bg-badge-green-bg text-badge-green-text font-medium'
                                  : 'bg-gray-50 dark:bg-gray-700 text-text-primary'
                              }`}>
                                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${
                                  isCorrect ? 'bg-success text-white' : 'bg-gray-200 dark:bg-gray-600 text-text-secondary'
                                }`}>
                                  {['A','B','C','D'][i]}
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
      </div>
    </div>
  );
};
