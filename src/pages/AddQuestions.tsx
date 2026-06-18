import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Papa from 'papaparse';
import ReactQuill from 'react-quill-new';
import {
  ChevronRight, ChevronLeft, Trash2, Pencil,
  Clock, FileText, Star, AlertTriangle, List, X, Plus, Upload,
} from 'lucide-react';
import { getTestById, updateTest } from '../api/tests';
import { bulkCreateQuestions, fetchBulkQuestions, updateQuestionById } from '../api/questions';
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

const OPTS = ['option1', 'option2', 'option3', 'option4'] as const;

const quillModules = {
  toolbar: [
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};

// ─── QuestionManagerModal ────────────────────────────────────────────────────
// Modal layout: test details at top, question list (left) + form (right) below.

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialIndex?: number | null;
  testId?: string;
  test: Test | null;
  totalQuestions: number;
  onEditTest: () => void;
}

const QuestionManagerModal = ({
  isOpen, onClose, initialIndex = null, testId, test, totalQuestions, onEditTest,
}: ModalProps) => {
  const { questions, addQuestion, updateQuestion, removeQuestion } = useTestStore();
  const { showToast } = useToast();

  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [form, setForm] = useState<Question>({ ...BLANK_QUESTION });
  const [isEditing, setIsEditing] = useState(false);
  const [deletedOptions, setDeletedOptions] = useState<Set<string>>(new Set());
  const [fieldErrors, setFieldErrors] = useState<{ question?: string; options?: string }>({});
  const mediaFileInputRef = useRef<HTMLInputElement>(null);

  const handleMediaFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('Please choose an image file', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setForm((f) => ({ ...f, media_url: reader.result as string }));
    reader.onerror = () => showToast('Failed to read image file', 'error');
    reader.readAsDataURL(file);
  };

  const markDeleted = (opt: string) =>
    setDeletedOptions((prev) => new Set([...prev, opt]));
  const unmarkDeleted = (opt: string) =>
    setDeletedOptions((prev) => { const s = new Set(prev); s.delete(opt); return s; });

  const doLoadQuestion = (index: number, qs: Question[]) => {
    const q = qs[index];
    if (!q) return;
    setCurrentIndex(index);
    setForm({ ...q });
    setIsEditing(true);
    const deleted = new Set<string>();
    OPTS.forEach((o) => { if (!q[o]?.trim()) deleted.add(o); });
    setDeletedOptions(deleted);
    setFieldErrors({});
  };

  const doClearForm = () => {
    setForm({ ...BLANK_QUESTION, test_id: testId, subject: test?.subject });
    setCurrentIndex(null);
    setIsEditing(false);
    setDeletedOptions(new Set());
    setFieldErrors({});
  };

  useEffect(() => {
    if (!isOpen) return;
    if (initialIndex !== null && initialIndex >= 0 && initialIndex < questions.length) {
      doLoadQuestion(initialIndex, questions);
    } else {
      doClearForm();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialIndex]);

  const saveCurrentToList = async () => {
    const nextErrors: { question?: string; options?: string } = {};
    const questionIsEmpty = !form.question.trim() || form.question.trim() === '<p><br></p>';
    if (questionIsEmpty) nextErrors.question = 'Question text is required';

    const filledOpts = OPTS.filter((o) => !deletedOptions.has(o) && form[o].trim());
    if (filledOpts.length < 2) nextErrors.options = 'At least 2 options are required';

    setFieldErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (!isEditing && questions.length >= totalQuestions) {
      showToast(`Warning: exceeding the ${totalQuestions}-question limit.`, 'error');
    }

    const qWithTest = { ...form, test_id: testId };
    if (isEditing && currentIndex !== null) {
      updateQuestion(currentIndex, qWithTest);
      // If the question already exists in the API, update it there too
      if (form.id) {
        try {
          // Send only editable fields — omit id/test_id/subject (causes 400)
          await updateQuestionById(form.id, {
            type: form.type,
            question: form.question,
            option1: form.option1?.trim() || ' ',
            option2: form.option2?.trim() || ' ',
            option3: form.option3?.trim() || ' ',
            option4: form.option4?.trim() || ' ',
            correct_option: form.correct_option,
            explanation: form.explanation ?? '',
            difficulty: form.difficulty,
            ...(form.topic    ? { topic: form.topic }       : {}),
            ...(form.sub_topic ? { sub_topic: form.sub_topic } : {}),
            ...(form.media_url?.trim() ? { media_url: form.media_url.trim() } : {}),
          });
          showToast('Question updated!');
        } catch {
          showToast('Failed to update question', 'error');
        }
      } else {
        showToast('Question updated!');
      }
    } else {
      addQuestion(qWithTest);
      showToast('Question added!');
      doClearForm();
    }
  };

  const deleteQuestion = (index: number) => {
    removeQuestion(index);
    if (currentIndex === index) {
      doClearForm();
    } else if (currentIndex !== null && index < currentIndex) {
      setCurrentIndex((prev) => (prev !== null ? prev - 1 : null));
    }
  };

  const navigateQuestion = (dir: 'prev' | 'next') => {
    if (questions.length === 0) return;
    if (dir === 'prev') {
      const idx = currentIndex !== null ? Math.max(0, currentIndex - 1) : questions.length - 1;
      doLoadQuestion(idx, questions);
    } else {
      if (currentIndex !== null && currentIndex < questions.length - 1) {
        doLoadQuestion(currentIndex + 1, questions);
      } else {
        doClearForm();
      }
    }
  };

  const displayIndex = isEditing && currentIndex !== null
    ? currentIndex + 1
    : questions.length + 1;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl h-[92vh] flex flex-col">

        {/* Modal header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border dark:border-gray-700 flex-shrink-0">
          <h2 className="text-base font-semibold text-text-primary">Test Questions</h2>
          <button
            onClick={onClose}
            className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Test details ──────────────────────────────────────────────── */}
          {test && (
            <div className="px-6 py-5 border-b border-border dark:border-gray-700">
              <div className="flex items-start justify-between gap-3">
                <div className="flex flex-col gap-2 flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="dark">
                      {test.type === 'chapterwise' ? 'Chapter Wise'
                        : test.type === 'pyq' ? 'PYQ'
                        : test.type === 'mock' ? 'Mock Test'
                        : test.type || 'Chapter Wise'}
                    </Badge>
                    <Badge variant={test.difficulty as 'easy' | 'medium' | 'hard'}>
                      {test.difficulty
                        ? test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)
                        : 'Easy'}
                    </Badge>
                  </div>
                  <h3 className="text-base font-semibold text-text-primary">{test.name}</h3>
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
                  <div className="flex items-center gap-4 text-xs text-text-secondary">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{test.total_time} min</span>
                    <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{test.total_questions} questions</span>
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{test.total_marks} marks</span>
                  </div>
                </div>
                <button
                  onClick={onEditTest}
                  className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-light rounded-lg flex-shrink-0"
                  title="Edit test details"
                >
                  <Pencil className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* ── Question manager ──────────────────────────────────────────── */}
          <div className="flex" style={{ minHeight: '0' }}>

            {/* Left: question list */}
            <div className="w-[200px] flex-shrink-0 border-r border-border dark:border-gray-700 flex flex-col sticky top-0 self-start" style={{ maxHeight: 'calc(92vh - 185px)', overflowY: 'auto' }}>
              <div className="p-3 border-b border-border dark:border-gray-700 flex items-center justify-between">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                  {questions.length}/{totalQuestions}
                </span>
                <button
                  onClick={doClearForm}
                  className="p-1 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-lg transition-colors"
                  title="New question"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="py-1">
                {questions.map((_, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-1 px-2 py-2 transition-colors ${
                      isEditing && currentIndex === i
                        ? 'bg-primary-light'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <button
                      className="flex items-center gap-2 flex-1 min-w-0 text-left"
                      onClick={() => doLoadQuestion(i, questions)}
                    >
                      <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-[9px] font-bold">{i + 1}</span>
                      </div>
                      <span className="text-xs text-text-primary truncate">Q{i + 1}</span>
                    </button>
                    <button
                      onClick={() => deleteQuestion(i)}
                      className="p-1 text-text-secondary hover:text-danger rounded flex-shrink-0"
                      title="Delete"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {questions.length === 0 && (
                  <p className="px-3 py-6 text-center text-xs text-text-secondary">No questions added yet</p>
                )}
              </div>
            </div>

            {/* Right: question form */}
            <div className="flex-1 p-5 flex flex-col gap-4">
              {/* Form header */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <span className="text-sm font-semibold text-text-primary">
                  Question <span className="text-primary">{displayIndex}</span>/{totalQuestions}
                  {questions.length >= totalQuestions && !isEditing && (
                    <span className="ml-2 text-xs font-normal text-warning">over limit</span>
                  )}
                </span>
                {isEditing && (
                  <button
                    type="button"
                    onClick={doClearForm}
                    className="text-xs text-text-secondary hover:text-primary hover:underline"
                  >
                    + New question
                  </button>
                )}
              </div>

              {/* Question rich text editor */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">Question</label>
                <div className="quill-wrapper rounded-lg border border-border dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-700">
                  <ReactQuill
                    theme="snow"
                    value={form.question}
                    onChange={(html) => setForm((f) => ({ ...f, question: html }))}
                    placeholder="Type the question here..."
                    modules={quillModules}
                  />
                </div>
                {fieldErrors.question && <p className="text-xs text-danger mt-1">{fieldErrors.question}</p>}
              </div>

              {/* Options */}
              <div className="flex flex-col gap-3">
                <label className="text-sm font-medium text-text-primary">Options</label>
                {OPTS.map((opt, i) => {
                  const isDeleted = deletedOptions.has(opt);
                  return (
                    <div
                      key={opt}
                      className={`flex items-center gap-2 transition-opacity ${isDeleted ? 'opacity-50' : ''}`}
                      onClick={isDeleted ? () => unmarkDeleted(opt) : undefined}
                      style={isDeleted ? { cursor: 'pointer' } : undefined}
                      title={isDeleted ? 'Click to re-enable' : undefined}
                    >
                      <input
                        type="radio"
                        name="modal_correct_option"
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
                          if (isDeleted) { unmarkDeleted(opt); return; }
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
                            : 'text-text-secondary hover:text-danger hover:bg-red-50 dark:hover:bg-red-900/20'
                        }`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
              {fieldErrors.options && <p className="text-xs text-danger mt-1">{fieldErrors.options}</p>}

              {/* Explanation */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-text-primary">Solution (optional)</label>
                  <button
                    type="button"
                    onClick={() => setForm((f) => ({ ...f, explanation: '' }))}
                    className="p-1 text-text-secondary hover:text-danger rounded"
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

              {/* Media URL */}
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-text-primary">Media URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={form.media_url || ''}
                    onChange={(e) => setForm((f) => ({ ...f, media_url: e.target.value }))}
                    placeholder="https://example.com/image.png"
                    className="flex-1 px-3 py-2.5 rounded-lg border border-border dark:border-gray-600 bg-white dark:bg-gray-700 text-sm text-text-primary dark:text-gray-100 placeholder:text-text-secondary dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
                  />
                  <Button type="button" variant="secondary" onClick={() => mediaFileInputRef.current?.click()}>
                    <Upload className="w-4 h-4" />
                    Upload
                  </Button>
                  <input
                    ref={mediaFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleMediaFile}
                    className="hidden"
                  />
                </div>
                {form.media_url?.trim() && (
                  <img src={form.media_url} alt="" className="max-h-40 rounded-lg mt-2" />
                )}
              </div>

              {/* Question settings */}
              <div className="border-t border-border pt-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Question Settings</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Select
                    label="Difficulty"
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

              {/* Nav + save */}
              <div className="flex items-center justify-between pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => navigateQuestion('prev')}
                  disabled={questions.length === 0}
                  className="p-2 rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-40"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <Button type="button" variant="secondary" onClick={saveCurrentToList}>
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
          </div>
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-border dark:border-gray-700 flex-shrink-0 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
};

// ─── AddQuestions ─────────────────────────────────────────────────────────────

export const AddQuestions = () => {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { questions, addQuestion, removeQuestion, clearAll, setCurrentTest } = useTestStore();

  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [existingLoaded, setExistingLoaded] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editorInitialIndex, setEditorInitialIndex] = useState<number | null>(null);

  const [csvImporting, setCsvImporting] = useState(false);
  const csvInputRef = useRef<HTMLInputElement>(null);

  const handleCsvFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setCsvImporting(true);
    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        setCsvImporting(false);
        const rows = result.data;
        const required = ['question', 'option1', 'option2', 'option3', 'option4', 'correct_option'];
        const valid = rows.filter((row) => required.every((key) => row[key]?.trim()));

        if (valid.length === 0) {
          showToast('Invalid CSV format — check required columns', 'error');
          return;
        }

        valid.forEach((row) => {
          addQuestion({
            type: 'mcq',
            question: row.question.trim(),
            option1: row.option1.trim(),
            option2: row.option2.trim(),
            option3: row.option3.trim(),
            option4: row.option4.trim(),
            correct_option: row.correct_option.trim() as Question['correct_option'],
            explanation: row.explanation?.trim() || '',
            difficulty: (row.difficulty?.trim() as Question['difficulty']) || 'easy',
          });
        });

        showToast(`${valid.length} questions imported from CSV`);
      },
      error: () => {
        setCsvImporting(false);
        showToast('Failed to parse CSV file', 'error');
      },
    });
  };

  const { data: testData } = useQuery({
    queryKey: ['test', testId],
    queryFn: () => getTestById(testId!).then((r) => r.data),
    enabled: !!testId,
    staleTime: 0,
  });

  const test: Test | null = testData?.data || testData || null;
  const existingQuestionIds: string[] = Array.isArray(test?.questions)
    ? (test.questions as string[])
    : [];

  const { data: existingQData, isLoading: loadingExisting } = useQuery({
    queryKey: ['questions', existingQuestionIds.join(',')],
    queryFn: () => fetchBulkQuestions(existingQuestionIds).then((r) => r.data),
    enabled: existingQuestionIds.length > 0 && !existingLoaded,
    staleTime: 0,
  });

  useEffect(() => {
    if (existingQData && !existingLoaded) {
      const fetched: Question[] = existingQData?.data || existingQData || [];
      if (fetched.length > 0 && questions.length === 0) {
        clearAll();
        fetched.forEach((q) => addQuestion(q));
        setExistingLoaded(true);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingQData, existingLoaded]);

  useEffect(() => {
    if (test) setCurrentTest(test);
  }, [test]);

  const totalQuestions = test?.total_questions || 50;

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (questions.length === 0) throw new Error('Add at least one question before saving.');

      const existingOnes = questions.filter((q) => !!q.id);
      const newOnes      = questions.filter((q) => !q.id);
      let allIds: string[] = existingOnes.map((q) => q.id as string);

      if (newOnes.length > 0) {
        const payload = newOnes.map((q) => {
          const { media_url, ...rest } = q;
          return {
            ...rest,
            test_id: testId,
            subject: q.subject || test?.subject,
            option1: q.option1?.trim() || ' ',
            option2: q.option2?.trim() || ' ',
            option3: q.option3?.trim() || ' ',
            option4: q.option4?.trim() || ' ',
            explanation: q.explanation ?? '',
            ...(media_url?.trim() ? { media_url: media_url.trim() } : {}),
          };
        });
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

  const openEditor = (index?: number) => {
    setEditorInitialIndex(index ?? null);
    setEditorOpen(true);
  };

  const QuestionList = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 border-b border-border flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Questions</h3>
          <p className="text-xs text-text-secondary mt-0.5">{questions.length} / {totalQuestions}</p>
        </div>
        <button
          onClick={() => openEditor()}
          className="p-1.5 text-primary bg-primary-light hover:bg-primary hover:text-white rounded-lg transition-colors"
          title="Add new question"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto py-1">
        {loadingExisting && (
          <div className="flex items-center gap-2 px-4 py-3">
            <Spinner size="sm" />
            <span className="text-xs text-text-secondary">Loading…</span>
          </div>
        )}
        {questions.map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-1 px-2 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <button
              className="flex items-center gap-2 flex-1 min-w-0 text-left"
              onClick={() => openEditor(i)}
            >
              <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center flex-shrink-0">
                <span className="text-white text-[9px] font-bold">{i + 1}</span>
              </div>
              <span className="text-xs text-text-primary truncate">Question {i + 1}</span>
              <ChevronRight className="w-3 h-3 text-text-secondary ml-auto flex-shrink-0" />
            </button>
            <button
              onClick={() => removeQuestion(i)}
              className="p-1 text-text-secondary hover:text-danger rounded flex-shrink-0"
              title="Delete"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
        {questions.length === 0 && !loadingExisting && (
          <div className="px-4 py-6 text-center">
            <p className="text-xs text-text-secondary mb-2">No questions added yet</p>
            <button onClick={() => openEditor()} className="text-xs text-primary hover:underline">
              Add first question
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-4 md:flex-row md:gap-5 md:h-[calc(100vh-120px)]">

      {/* Mobile: question list toggle */}
      <div className="md:hidden flex items-center gap-2">
        <button
          onClick={() => setShowLeftPanel(true)}
          className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary"
        >
          <List className="w-4 h-4" />
          Questions ({questions.length})
        </button>
      </div>

      {/* Mobile sliding panel */}
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

      {/* Right panel */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto">

        {/* Test summary (read-only, outside modal) */}
        {test && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-4 md:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-2 flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="dark">
                    {test.type === 'chapterwise' ? 'Chapter Wise'
                      : test.type === 'pyq' ? 'PYQ'
                      : test.type === 'mock' ? 'Mock Test'
                      : test.type || 'Chapter Wise'}
                  </Badge>
                  <Badge variant={test.difficulty as 'easy' | 'medium' | 'hard'}>
                    {test.difficulty
                      ? test.difficulty.charAt(0).toUpperCase() + test.difficulty.slice(1)
                      : 'Easy'}
                  </Badge>
                </div>
                <h2 className="text-base font-semibold text-text-primary truncate">{test.name}</h2>
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
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
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

        {/* Manage questions CTA */}
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-border p-8 flex flex-col items-center justify-center gap-4 flex-1">
          <div className="text-center">
            <p className="text-lg font-semibold text-text-primary">
              {questions.length} / {totalQuestions} Questions
            </p>
            <p className="text-sm text-text-secondary mt-1">
              {questions.length === 0 ? 'No questions added yet' : `${questions.length} question${questions.length !== 1 ? 's' : ''} ready`}
            </p>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => openEditor()}>
              <Plus className="w-4 h-4" />
              {questions.length === 0 ? 'Add Questions' : 'Manage Questions'}
            </Button>
            <Button variant="secondary" loading={csvImporting} onClick={() => csvInputRef.current?.click()}>
              <Upload className="w-4 h-4" />
              CSV
            </Button>
          </div>
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            onChange={handleCsvFile}
            className="hidden"
          />
        </div>

        {/* Bottom actions */}
        <div className="flex justify-between pb-4 flex-wrap gap-3">
          <Button variant="danger" onClick={() => { clearAll(); navigate('/dashboard'); }}>
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">Exit Test Creation</span>
            <span className="sm:hidden">Exit</span>
          </Button>
          <Button
            loading={submitMutation.isPending}
            disabled={questions.length === 0}
            onClick={() => submitMutation.mutate()}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Question manager modal (test details + question form) */}
      <QuestionManagerModal
        isOpen={editorOpen}
        onClose={() => setEditorOpen(false)}
        initialIndex={editorInitialIndex}
        testId={testId}
        test={test}
        totalQuestions={totalQuestions}
        onEditTest={() => { setEditorOpen(false); navigate(`/create-test/edit/${testId}`); }}
      />
    </div>
  );
};
