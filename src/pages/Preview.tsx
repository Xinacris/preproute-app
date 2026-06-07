import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  CheckCircle, Clock, FileText, Star, Pencil,
  ChevronDown, ChevronUp, ChevronRight, Calendar
} from 'lucide-react';
import { getTestById, publishTest, updateTest } from '../api/tests';
import { fetchBulkQuestions } from '../api/questions';
import { useTestStore } from '../store/testStore';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';
import type { Test, Question } from '../types';

type Duration = 'always' | '1_week' | '2_weeks' | '3_weeks' | '1_month' | 'custom';

const DURATION_OPTIONS: { value: Duration; label: string }[] = [
  { value: 'always',  label: 'Always Available' },
  { value: '1_week',  label: '1 Week' },
  { value: '2_weeks', label: '2 Weeks' },
  { value: '3_weeks', label: '3 Weeks' },
  { value: '1_month', label: '1 Month' },
  { value: 'custom',  label: 'Custom Duration' },
];

const OPTION_KEYS = ['option1', 'option2', 'option3', 'option4'] as const;

export const Preview = () => {
  const { testId }  = useParams<{ testId: string }>();
  const navigate    = useNavigate();
  const { clearAll } = useTestStore();
  const { showToast } = useToast();

  const [selectedDuration, setSelectedDuration] = useState<Duration>('always');
  const [activePublishTab, setActivePublishTab]  = useState<'now' | 'schedule'>('now');
  const [scheduleDate, setScheduleDate]          = useState('');
  const [scheduleTime, setScheduleTime]          = useState('');
  const [endDate, setEndDate]                    = useState('');
  const [endTime, setEndTime]                    = useState('');
  const [expandedQuestion, setExpandedQuestion]  = useState<string | null>(null);
  const [showQuestions, setShowQuestions]        = useState(true);

  const { data, isLoading: pageLoading } = useQuery({
    queryKey: ['previewPage', testId],
    queryFn: async () => {
      const testRes = await getTestById(testId!);
      const test: Test = testRes.data?.data || testRes.data;
      const ids: string[] = Array.isArray(test?.questions) ? (test.questions as string[]) : [];
      let questions: Question[] = [];
      if (ids.length > 0) {
        const qRes = await fetchBulkQuestions(ids);
        questions = qRes.data?.data || qRes.data || [];
      }
      return { test, questions };
    },
    enabled: !!testId,
    staleTime: 0,
    refetchOnMount: 'always',
  });

  const test: Test | null = data?.test || null;
  const questions: Question[] = data?.questions || [];
  const questionCount = questions.length || test?.total_questions || 0;

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (activePublishTab === 'schedule' && scheduleDate) {
        await updateTest(testId!, {
          status: 'scheduled',
          scheduled_date: `${scheduleDate}T${scheduleTime || '00:00'}`,
          expiry_date: endDate ? `${endDate}T${endTime || '23:59'}` : undefined,
        });
      } else {
        await publishTest(testId!);
      }
    },
    onSuccess: () => {
      showToast('Test published successfully!');
      clearAll();
      navigate('/dashboard');
    },
    onError: () => showToast('Failed to publish test', 'error'),
  });

  const typeLabel = test?.type === 'chapterwise' ? 'Chapter Wise'
    : test?.type === 'pyq' ? 'PYQ'
    : test?.type === 'mock' ? 'Mock Test'
    : test?.type || 'Chapter Wise';

  return (
    <div className="flex flex-col lg:flex-row gap-5 min-h-full">
      {/* Left question panel — visible md+ */}
      <div className="hidden md:flex w-full md:w-[200px] flex-shrink-0 bg-white dark:bg-gray-900 border border-border rounded-xl flex-col overflow-hidden" style={{ maxHeight: '70vh' }}>
        <div className="px-4 py-4 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">Question creation</h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Total Questions . <span className="font-medium text-text-primary">{questionCount}</span>
            </p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          {pageLoading ? (
            <div className="flex justify-center py-6"><Spinner size="sm" /></div>
          ) : questions.length === 0 ? (
            <p className="text-xs text-text-secondary px-4 py-4">No questions</p>
          ) : (
            questions.map((q, i) => (
              <button
                key={q.id || i}
                onClick={() => setExpandedQuestion(expandedQuestion === (q.id || String(i)) ? null : (q.id || String(i)))}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-primary-light transition-colors"
              >
                <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-[9px] font-bold">{i + 1}</span>
                </div>
                <span className="text-xs text-text-primary flex-1 truncate">Question {i + 1}</span>
                <ChevronRight className="w-3 h-3 text-text-secondary flex-shrink-0" />
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col gap-5 min-w-0">
        {/* Header */}
        <div>
          <p className="text-sm text-text-secondary mb-1">Test creation</p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-semibold text-text-primary">Test created</h1>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-badge-green-bg text-badge-green-text text-xs font-medium">
              <CheckCircle className="w-3.5 h-3.5" />
              All {questionCount} Questions done
            </span>
          </div>
        </div>

        {/* Test Summary Card */}
        {test && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-3 flex-1 min-w-0">
                <Badge variant="dark">{typeLabel}</Badge>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-text-primary">{test.name}</h2>
                  <Badge variant={test.difficulty as 'easy' | 'medium' | 'hard'}>
                    {test.difficulty ? test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1) : 'Easy'}
                  </Badge>
                </div>
                <div className="flex flex-col gap-1 text-sm">
                  {test.subject && (
                    <div className="flex items-start gap-2">
                      <span className="text-text-secondary w-16 flex-shrink-0">Subject</span>
                      <span className="text-text-secondary">:</span>
                      <span className="text-text-primary">{test.subject}</span>
                    </div>
                  )}
                  {Array.isArray(test.topics) && test.topics.length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-text-secondary w-16 flex-shrink-0">Topic</span>
                      <span className="text-text-secondary">:</span>
                      <div className="flex flex-wrap gap-1">
                        {test.topics.map((t, i) => (
                          <span key={i} className="inline-block border border-warning text-warning text-xs px-2 py-0.5 rounded">{t}</span>
                        ))}
                      </div>
                    </div>
                  )}
                  {Array.isArray(test.sub_topics) && test.sub_topics.filter(Boolean).length > 0 && (
                    <div className="flex items-start gap-2">
                      <span className="text-text-secondary w-16 flex-shrink-0">Sub Topic</span>
                      <span className="text-text-secondary">:</span>
                      <div className="flex flex-wrap gap-1">
                        {test.sub_topics.filter(Boolean).map((s, i) => (
                          <span key={i} className="inline-block border border-warning text-warning text-xs px-2 py-0.5 rounded">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-4 text-sm text-text-secondary pt-1">
                  <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" />{test.total_time} Min</span>
                  <span className="flex items-center gap-1.5"><FileText className="w-4 h-4" />{test.total_questions} Q's</span>
                  <span className="flex items-center gap-1.5"><Star className="w-4 h-4" />{test.total_marks} Marks</span>
                </div>
              </div>
              <button onClick={() => navigate(`/create-test/edit/${testId}`)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-light rounded-lg flex-shrink-0">
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Questions accordion */}
        {questionCount > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-border overflow-hidden">
            <button
              onClick={() => setShowQuestions((v) => !v)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-text-primary">Questions</span>
                <span className="bg-primary-light text-primary text-xs font-medium px-2 py-0.5 rounded-full">{questionCount}</span>
              </div>
              {showQuestions ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
            </button>

            {showQuestions && (
              <div className="border-t border-border divide-y divide-border">
                {pageLoading ? (
                  <div className="flex justify-center py-8"><Spinner /></div>
                ) : (
                  questions.map((q, idx) => {
                    const qId = q.id || String(idx);
                    const isOpen = expandedQuestion === qId;
                    return (
                      <div key={qId} className="px-5 py-4">
                        <button onClick={() => setExpandedQuestion(isOpen ? null : qId)} className="w-full flex items-start gap-3 text-left">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-light text-primary text-xs font-semibold flex items-center justify-center mt-0.5">{idx + 1}</span>
                          <span className="flex-1 text-sm text-text-primary font-medium leading-relaxed">{q.question}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {q.difficulty && (
                              <Badge variant={q.difficulty === 'medium' ? 'medium' : q.difficulty === 'hard' ? 'hard' : 'easy'}>
                                {q.difficulty.charAt(0).toUpperCase() + q.difficulty.slice(1)}
                              </Badge>
                            )}
                            {isOpen ? <ChevronUp className="w-4 h-4 text-text-secondary" /> : <ChevronDown className="w-4 h-4 text-text-secondary" />}
                          </div>
                        </button>
                        {isOpen && (
                          <div className="mt-4 ml-9 flex flex-col gap-2">
                            {OPTION_KEYS.filter((key) => !!q[key]?.trim()).map((key, i) => {
                              const isCorrect = q.correct_option === key;
                              return (
                                <div key={key} className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm ${isCorrect ? 'bg-badge-green-bg text-badge-green-text font-medium' : 'bg-gray-50 dark:bg-gray-700 text-text-primary'}`}>
                                  <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0 ${isCorrect ? 'bg-success text-white' : 'bg-gray-200 dark:bg-gray-600 text-text-secondary'}`}>
                                    {['A','B','C','D'][i]}
                                  </span>
                                  {q[key]}
                                  {isCorrect && <CheckCircle className="w-3.5 h-3.5 ml-auto flex-shrink-0" />}
                                </div>
                              );
                            })}
                            {q.explanation?.trim() && (
                              <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
                                <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Explanation</p>
                                <p className="text-xs text-blue-600 dark:text-blue-400 leading-relaxed">{q.explanation}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </div>
        )}

        {/* Publish Card */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-border overflow-hidden">
          {/* Publish tabs */}
          <div className="flex border-b border-border">
            {[{ key: 'now', label: 'Publish Now' }, { key: 'schedule', label: 'Schedule Publish' }].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActivePublishTab(key as 'now' | 'schedule')}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activePublishTab === key ? 'border-primary text-primary' : 'border-transparent text-text-secondary hover:text-text-primary'
                }`}
              >{label}</button>
            ))}
          </div>

          <div className="p-6 flex flex-col gap-5">
            {/* Schedule — date & time pickers */}
            {activePublishTab === 'schedule' && (
              <div>
                <p className="text-sm font-semibold text-text-primary mb-3">Select Date and Time</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="relative">
                    <input
                      type="date"
                      value={scheduleDate}
                      onChange={(e) => setScheduleDate(e.target.value)}
                      placeholder="Select Date"
                      className="w-full px-3 py-2.5 pr-10 rounded-lg border border-border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-text-primary dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                    />
                    <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                  </div>
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    placeholder="Select Time"
                    className="w-full px-3 py-2.5 rounded-lg border border-border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-text-primary dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                </div>
              </div>
            )}

            {/* Live Until */}
            <div>
              <p className="text-sm font-semibold text-text-primary mb-1">Live Until</p>
              <p className="text-xs text-text-secondary mb-4">Choose how long this test should remain available on the platform.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {DURATION_OPTIONS.map(({ value, label }) => (
                  <label key={value} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name="duration"
                      value={value}
                      checked={selectedDuration === value}
                      onChange={() => setSelectedDuration(value)}
                      className="w-4 h-4 accent-primary"
                    />
                    <span className="text-sm text-text-primary">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom end date/time */}
            {selectedDuration === 'custom' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="relative">
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    placeholder="Select End Date"
                    className="w-full px-3 py-2.5 pr-10 rounded-lg border border-border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-text-primary dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
                </div>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  placeholder="Select End Time"
                  className="w-full px-3 py-2.5 rounded-lg border border-border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-text-primary dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pb-4">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>Cancel</Button>
          <Button loading={publishMutation.isPending} onClick={() => publishMutation.mutate()}>Confirm</Button>
        </div>
      </div>
    </div>
  );
};
