import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronRight, ChevronLeft, Trash2, Pencil,
  Clock, FileText, Star, AlertTriangle, List
} from 'lucide-react';
import { getTestById, updateTest } from '../api/tests';
import { bulkCreateQuestions, fetchBulkQuestions } from '../api/questions';
import { useTestStore } from '../store/testStore';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Select } from '../components/ui/Select';
import { Spinner } from '../components/ui/Spinner';
import type { Question, Test } from '../types';

const BLANK_QUESTION: Question = {
  type: 'mcq',
  question: '',
  option1: '',
  option2: '',
  option3: '',
  option4: '',
  correct_option: 'option1',
  explanation: '',
  difficulty: 'easy',
};

export const AddQuestions = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { questions, addQuestion, updateQuestion, removeQuestion, clearAll, setCurrentTest } = useTestStore();

  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Question>({ ...BLANK_QUESTION });
  const [isEditing, setIsEditing] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [existingLoaded, setExistingLoaded] = useState(false);
  // Tracks which options the user explicitly deleted (trash icon)
  const [deletedOptions, setDeletedOptions] = useState<Set<string>>(new Set());

  const OPTS = ['option1', 'option2', 'option3', 'option4'] as const;

  const markDeleted = (opt: string) =>
    setDeletedOptions((prev) => new Set([...prev, opt]));

  const unmarkDeleted = (opt: string) =>
    setDeletedOptions((prev) => { const s = new Set(prev); s.delete(opt); return s; });

  const resetDeletedOptions = (q?: Question) => {
    // When loading an existing question, treat space-only values as deleted
    const deleted = new Set<string>();
    if (q) {
      OPTS.forEach((o) => { if (!q[o]?.trim()) deleted.add(o); });
    }
    setDeletedOptions(deleted);
  };

  const { data: testData } = useQuery({
    queryKey: ['test', testId],
    queryFn: () => getTestById(testId!).then((r) => r.data),
    enabled: !!testId,
    staleTime: 0,
  });

  const test: Test | null = testData?.data || testData || null;
  const existingQuestionIds: string[] = Array.isArray(test?.questions) ? (test.questions as string[]) : [];

  // Fetch existing questions from API
  const { data: existingQData, isLoading: loadingExisting } = useQuery({
    queryKey: ['questions', existingQuestionIds.join(',')],
    queryFn: () => fetchBulkQuestions(existingQuestionIds).then((r) => r.data),
    enabled: existingQuestionIds.length > 0 && !existingLoaded,
    staleTime: 0,
  });

  // Populate store with existing questions once loaded
  useEffect(() => {
    if (existingQData && !existingLoaded) {
      const fetched: Question[] = existingQData?.data || existingQData || [];
      if (fetched.length > 0 && questions.length === 0) {
        clearAll();
        fetched.forEach((q) => addQuestion(q));
        setExistingLoaded(true);
      }
    }
  }, [existingQData, existingLoaded]);

  useEffect(() => {
    if (test) {
      setCurrentTest(test);
      setForm((f) => ({ ...f, test_id: test.id, subject: test.subject }));
    }
  }, [test]);

  const totalQuestions = test?.total_questions || 50;
  const atLimit = questions.length >= totalQuestions;

  const submitMutation = useMutation({
    mutationFn: async () => {
      // Always use the store — never the live form state (prevents stale-closure deletion bugs)
      if (questions.length === 0) throw new Error('Add at least one question before saving.');

      // Existing questions (already have IDs) — keep as-is, don't re-create
      const existingOnes = questions.filter((q) => !!q.id);
      const newOnes      = questions.filter((q) => !q.id);

      let allIds: string[] = existingOnes.map((q) => q.id as string);

      if (newOnes.length > 0) {
        const payload = newOnes.map((q) => ({
          ...q,
          test_id: testId,
          subject: q.subject || test?.subject,
          // API requires all 4 options to be non-empty strings; use single space for deleted ones
          option1: q.option1?.trim() || ' ',
          option2: q.option2?.trim() || ' ',
          option3: q.option3?.trim() || ' ',
          option4: q.option4?.trim() || ' ',
          // Send empty string for explanation if deleted
          explanation: q.explanation ?? '',
        }));
        const res = await bulkCreateQuestions(payload);
        const newIds: string[] = (res.data?.data || res.data || []).map(
          (q: { id: string }) => q.id
        );
        allIds = [...allIds, ...newIds];
      }

      await updateTest(testId!, { questions: allIds });
      await queryClient.invalidateQueries({ queryKey: ['test', testId] });
      await queryClient.invalidateQueries({ queryKey: ['previewPage', testId] });
      return allIds;
    },
    onSuccess: () => {
      showToast('Questions saved successfully!');
      navigate(`/preview/${testId}`);
    },
    onError: (err: Error) => {
      showToast(err.message || 'Failed to save questions', 'error');
    },
  });

  const saveCurrentToList = () => {
    if (!form.question.trim()) {
      showToast('Question text is required', 'error');
      return;
    }
    const filledOpts = OPTS.filter((o) => !deletedOptions.has(o) && form[o].trim());
    if (filledOpts.length < 2) {
      showToast('At least 2 options are required', 'error');
      return;
    }
    // Enforce limit only when adding new (not updating existing)
    if (!isEditing && atLimit) {
      showToast(`Maximum ${totalQuestions} questions reached for this test.`, 'error');
      return;
    }
    const questionWithTest = { ...form, test_id: testId };
    if (isEditing && currentIndex !== null) {
      updateQuestion(currentIndex, questionWithTest);
      setIsEditing(false);
      setCurrentIndex(null);
    } else {
      addQuestion(questionWithTest);
    }
    setForm({ ...BLANK_QUESTION, test_id: testId, subject: test?.subject });
    resetDeletedOptions();
  };

  const loadQuestion = (index: number) => {
    const q = questions[index];
    setCurrentIndex(index);
    setForm({ ...q });
    setIsEditing(true);
    setShowLeftPanel(false);
    resetDeletedOptions(q);
  };

  const clearForm = () => {
    setForm({ ...BLANK_QUESTION, test_id: testId, subject: test?.subject });
    setCurrentIndex(null);
    setIsEditing(false);
    resetDeletedOptions();
  };

  const navigateQuestion = (dir: 'prev' | 'next') => {
    if (questions.length === 0) return;
    if (dir === 'prev') {
      const idx = currentIndex !== null ? Math.max(0, currentIndex - 1) : questions.length - 1;
      loadQuestion(idx);
    } else {
      if (currentIndex !== null && currentIndex < questions.length - 1) {
        loadQuestion(currentIndex + 1);
      } else {
        clearForm();
      }
    }
  };

  const displayIndex = isEditing && currentIndex !== null
    ? currentIndex + 1
    : questions.length + 1;

  const QuestionList = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-text-primary">Question creation</h3>
        <p className="text-xs text-text-secondary mt-1">
          Total Questions: <span className="font-medium text-text-primary">{totalQuestions}</span>
        </p>
        {loadingExisting && (
          <div className="flex items-center gap-2 mt-2">
            <Spinner size="sm" />
            <span className="text-xs text-text-secondary">Loading questions…</span>
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto py-2">
        {questions.map((_q, i) => (
          <button
            key={i}
            onClick={() => loadQuestion(i)}
            className={`w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-primary-light transition-colors ${
              isEditing && currentIndex === i ? 'bg-primary-light' : ''
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-bold">{i + 1}</span>
            </div>
            <span className="text-xs text-text-primary flex-1 truncate">Question {i + 1}</span>
            <ChevronRight className="w-3 h-3 text-text-secondary flex-shrink-0" />
          </button>
        ))}
        {questions.length === 0 && !loadingExisting && (
          <div className="px-4 py-6 text-center text-xs text-text-secondary">
            No questions yet
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-5 md:h-[calc(100vh-120px)]">
      {/* Mobile only: question list toggle button */}
      <div className="md:hidden flex items-center gap-2">
        <button
          onClick={() => setShowLeftPanel(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary"
        >
          <List className="w-4 h-4" />
          Questions ({questions.length})
        </button>
      </div>

      {/* Mobile: sliding left panel overlay */}
      {showLeftPanel && (
        <div className="fixed inset-0 z-40 md:hidden flex">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowLeftPanel(false)} />
          <div className="relative w-[260px] h-full bg-white dark:bg-gray-900 flex flex-col shadow-xl z-50">
            <QuestionList />
          </div>
        </div>
      )}

      {/* Tablet+: left panel */}
      <div className="hidden md:flex w-[200px] flex-shrink-0 bg-white dark:bg-gray-900 rounded-xl border border-border flex-col overflow-hidden">
        <QuestionList />
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {/* Test Summary Card */}
        {test && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="dark">
                    {test.type === 'chapterwise' ? 'Chapter Wise' : test.type === 'pyq' ? 'PYQ' : test.type === 'mock' ? 'Mock Test' : test.type || 'Chapter Wise'}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base font-semibold text-text-primary truncate">{test.name}</h2>
                  <Badge variant={test.difficulty as 'easy' | 'medium' | 'hard'}>
                    {test.difficulty ? test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1) : 'Easy'}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  {test.subject && (
                    <span className="inline-block bg-blue-50 text-blue-600 text-xs px-2.5 py-1 rounded-full font-medium">
                      {test.subject}
                    </span>
                  )}
                  {Array.isArray(test.topics) && test.topics.map((t, i) => (
                    <span key={i} className="inline-block bg-primary-light text-primary text-xs px-2.5 py-1 rounded-full">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => navigate(`/create-test/edit/${testId}`)}
                  className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-light rounded-lg"
                >
                  <Pencil className="w-4 h-4" />
                </button>
                <div className="flex flex-wrap justify-end gap-3 text-xs text-text-secondary">
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{test.total_time}m</span>
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{test.total_questions}Q</span>
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{test.total_marks}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Question Form */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-4 md:p-5 flex flex-col gap-4 md:gap-5">
          {/* Form header */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-text-primary">
                Question <span className="text-primary">{displayIndex}</span>/{totalQuestions}
              </span>
              {atLimit ? (
                <span className="text-xs text-danger font-medium">Limit reached ({totalQuestions}/{totalQuestions})</span>
              ) : (
                <span className="text-xs text-text-secondary">{questions.length}/{totalQuestions} added</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  clearForm();
                  if (currentIndex !== null) removeQuestion(currentIndex);
                }}
                className="flex items-center gap-1 text-xs text-danger hover:underline"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete All Edits
              </button>
            </div>
          </div>

          {/* Question textarea */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-text-primary">Question</label>
            <textarea
              value={form.question}
              onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              placeholder="Type the question here..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-lg border border-border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-text-primary dark:text-gray-100 placeholder:text-text-secondary dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          {/* Options */}
          <div className="flex flex-col gap-3">
            <label className="text-sm font-medium text-text-primary">Type the options below</label>
            {OPTS.map((opt, i) => {
              const isDeleted = deletedOptions.has(opt);
              return (
                <div
                  key={opt}
                  className={`flex items-center gap-2 md:gap-3 transition-opacity ${isDeleted ? 'opacity-50' : ''}`}
                  onClick={isDeleted ? () => unmarkDeleted(opt) : undefined}
                  style={isDeleted ? { cursor: 'pointer' } : undefined}
                  title={isDeleted ? 'Click to re-enable this option' : undefined}
                >
                  <input
                    type="radio"
                    name="correct_option"
                    value={opt}
                    checked={form.correct_option === opt}
                    disabled={isDeleted}
                    onChange={() => setForm((f) => ({ ...f, correct_option: opt }))}
                    onClick={(e) => e.stopPropagation()}
                    className="w-4 h-4 accent-primary flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={form[opt]}
                    disabled={isDeleted}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val) unmarkDeleted(opt);
                      setForm((f) => {
                        let correct = f.correct_option;
                        if (!val.trim() && f.correct_option === opt) {
                          const first = OPTS.find((o) => o !== opt && !deletedOptions.has(o) && f[o].trim());
                          if (first) correct = first;
                        }
                        return { ...f, [opt]: val, correct_option: correct };
                      });
                    }}
                    onClick={(e) => { if (isDeleted) { e.stopPropagation(); unmarkDeleted(opt); } }}
                    placeholder={`Option ${i + 1}`}
                    className="flex-1 px-3 py-2 rounded-lg border border-border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-text-primary dark:text-gray-100 placeholder:text-text-secondary dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary min-w-0 disabled:bg-white dark:disabled:bg-gray-700 disabled:cursor-pointer"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isDeleted) {
                        unmarkDeleted(opt);
                        return;
                      }
                      markDeleted(opt);
                      setForm((f) => {
                        let correct = f.correct_option;
                        if (f.correct_option === opt) {
                          const first = OPTS.find((o) => o !== opt && !deletedOptions.has(o) && f[o].trim());
                          if (first) correct = first;
                        }
                        return { ...f, [opt]: '', correct_option: correct };
                      });
                    }}
                    className={`p-1.5 rounded-lg flex-shrink-0 transition-colors ${
                      isDeleted
                        ? 'text-primary bg-primary-light hover:bg-primary hover:text-white'
                        : 'text-text-secondary hover:text-danger hover:bg-red-50'
                    }`}
                    title={isDeleted ? 'Click to re-enable' : 'Remove option'}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Explanation */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-text-primary">Add Solution</label>
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, explanation: '' }))}
                className="p-1 text-text-secondary hover:text-danger rounded"
                title="Remove solution"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
            <textarea
              value={form.explanation || ''}
              onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              placeholder="Explain the correct answer… (optional)"
              rows={2}
              className="w-full px-3 py-2.5 rounded-lg border border-border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-text-primary dark:text-gray-100 placeholder:text-text-secondary dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
            />
          </div>

          {/* Question Settings */}
          <div className="border-t border-border pt-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">Question Settings</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Select
                label="Level of Difficulty"
                options={[
                  { value: 'easy', label: 'Easy' },
                  { value: 'medium', label: 'Medium' },
                  { value: 'hard', label: 'Hard' },
                ]}
                value={form.difficulty || 'easy'}
                onChange={(v) => setForm((f) => ({ ...f, difficulty: v as 'easy' | 'medium' | 'hard' }))}
              />
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-primary">Topic ID</label>
                <input
                  type="text"
                  value={form.topic || ''}
                  onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))}
                  placeholder="Topic UUID"
                  className="w-full px-3 py-2.5 rounded-lg border border-border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-text-primary dark:text-gray-100 placeholder:text-text-secondary dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-text-primary">Sub-topic ID</label>
                <input
                  type="text"
                  value={form.sub_topic || ''}
                  onChange={(e) => setForm((f) => ({ ...f, sub_topic: e.target.value }))}
                  placeholder="Sub-topic UUID"
                  className="w-full px-3 py-2.5 rounded-lg border border-border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-text-primary dark:text-gray-100 placeholder:text-text-secondary dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                />
              </div>
            </div>
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <button
              type="button"
              onClick={() => navigateQuestion('prev')}
              disabled={questions.length === 0}
              className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <Button
              type="button"
              variant="secondary"
              onClick={saveCurrentToList}
            >
              {isEditing ? 'Update Question' : 'Add Question'}
            </Button>
            <button
              type="button"
              onClick={() => navigateQuestion('next')}
              className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="flex justify-between pb-4 flex-wrap gap-3">
          <Button
            variant="danger"
            onClick={() => {
              clearAll();
              navigate('/dashboard');
            }}
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Test Creation</span>
            <span className="sm:hidden">Exit</span>
          </Button>
          <Button
            loading={submitMutation.isPending}
            onClick={() => {
              if (isEditing) {
                showToast('Please click "Update Question" to save your current edit first.', 'error');
                return;
              }
              submitMutation.mutate();
            }}
            disabled={questions.length === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
};
