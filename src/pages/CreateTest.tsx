import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams, useLocation, NavLink } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { getSubjects, getTopicsBySubject, getSubTopicsByTopics } from '../api/subjects';
import { createTest, updateTest, getTestById } from '../api/tests';
import { useTestStore } from '../store/testStore';
import { useToast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { SpinnerInput } from '../components/ui/SpinnerInput';
import type { Subject, Topic, SubTopic } from '../types';

const schema = z.object({
  name: z.string().min(1, 'Test name required'),
  subject: z.string().min(1, 'Subject required'),
  topics: z.array(z.string()).min(1, 'At least one topic required'),
  sub_topics: z.array(z.string()).optional(),
  type: z.enum(['chapterwise', 'pyq', 'mock']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  total_time: z.number().min(1, 'Duration required'),
  correct_marks: z.number(),
  wrong_marks: z.number(),
  unattempt_marks: z.number(),
  total_questions: z.number().min(1, 'Required'),
});

export type TestFormData = z.infer<typeof schema>;
type TestType = 'chapterwise' | 'pyq' | 'mock';

const TABS = [
  { label: 'Chapterwise', value: 'chapterwise', path: '/create-test/chapterwise' },
  { label: 'PYQ',         value: 'pyq',         path: '/create-test/pyq' },
  { label: 'Mock Test',   value: 'mock',         path: '/create-test/mock' },
] as const;

const getTypeFromPath = (pathname: string): TestType => {
  if (pathname.includes('/pyq'))  return 'pyq';
  if (pathname.includes('/mock')) return 'mock';
  return 'chapterwise';
};

interface CreateTestProps {
  /** When used inside a modal, pass the testId to edit */
  editId?: string;
  onClose?: () => void;
  onSaved?: () => void;
}

export const CreateTest = ({ editId, onClose, onSaved }: CreateTestProps = {}) => {
  const navigate    = useNavigate();
  const location    = useLocation();
  const { id: routeId } = useParams<{ id: string }>();
  const id          = editId || routeId;
  const isEdit      = !!id;
  const isModal     = !!editId;
  const typeFromUrl: TestType = getTypeFromPath(location.pathname);
  const { setCurrentTest, clearAll } = useTestStore();
  const { showToast } = useToast();

  const { register, handleSubmit, control, watch, setValue, reset, formState: { errors } } =
    useForm<TestFormData>({
      resolver: zodResolver(schema),
      defaultValues: {
        type: typeFromUrl,
        difficulty: 'easy',
        correct_marks: 5,
        wrong_marks: -1,
        unattempt_marks: 0,
        total_questions: 0,
        topics: [],
        sub_topics: [],
        total_time: 60,
      },
    });

  const selectedSubject = watch('subject');
  const selectedTopics  = watch('topics');
  const correctMarks    = watch('correct_marks');
  const totalQuestions  = watch('total_questions');
  const currentType     = watch('type');

  useEffect(() => {
    if (!isEdit) setValue('type', typeFromUrl);
  }, [typeFromUrl, isEdit, setValue]);

  const { data: existingTest } = useQuery({
    queryKey: ['test', id],
    queryFn: () => getTestById(id!).then((r) => r.data),
    enabled: isEdit,
  });

  const { data: subjectsData } = useQuery({
    queryKey: ['subjects'],
    queryFn: () => getSubjects().then((r) => r.data),
    staleTime: 5 * 60 * 1000,
  });
  const { data: topicsData } = useQuery({
    queryKey: ['topics', selectedSubject],
    queryFn: () => getTopicsBySubject(selectedSubject).then((r) => r.data),
    enabled: !!selectedSubject,
    staleTime: 5 * 60 * 1000,
  });
  // Only send UUIDs to sub-topics API — older tests store topic names not UUIDs
  const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const validTopicIds = (selectedTopics || []).filter((t) => UUID_RE.test(t));

  const { data: subTopicsData } = useQuery({
    queryKey: ['subtopics', validTopicIds],
    queryFn: () => getSubTopicsByTopics(validTopicIds).then((r) => r.data),
    enabled: validTopicIds.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  const subjects:  Subject[]  = subjectsData?.data  || subjectsData  || [];

  // Reset form when test data loads — wait for subjects so UUID↔name matching works
  useEffect(() => {
    if (!existingTest) return;
    const t = existingTest.data || existingTest;

    // Subject might be stored as UUID or as a name string (older tests)
    let subjectId = t.subject || '';
    if (subjects.length > 0) {
      const matched = subjects.find((s) => s.id === t.subject || s.name === t.subject);
      if (matched) subjectId = matched.id;
    }

    reset({
      name: t.name,
      subject: subjectId,
      topics: t.topics || [],
      sub_topics: t.sub_topics || [],
      type: (t.type as TestType) || 'chapterwise',
      difficulty: t.difficulty || 'easy',
      total_time: t.total_time,
      correct_marks: t.correct_marks,
      wrong_marks: t.wrong_marks,
      unattempt_marks: t.unattempt_marks,
      total_questions: t.total_questions,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existingTest, subjects]);

  const topics:    Topic[]    = topicsData?.data     || topicsData    || [];
  const subTopics: SubTopic[] = subTopicsData?.data  || subTopicsData || [];

  // When topics load, convert any name-based topic values to UUIDs
  useEffect(() => {
    if (!isEdit || !topics.length) return;
    const currentTopics: string[] = watch('topics') || [];
    if (!currentTopics.length) return;

    const resolved = currentTopics.map((val) => {
      if (UUID_RE.test(val)) return val;
      const match = topics.find((tp) => tp.name === val);
      return match ? match.id : null;
    }).filter((v): v is string => !!v);

    if (resolved.length && JSON.stringify(resolved) !== JSON.stringify(currentTopics)) {
      setValue('topics', resolved, { shouldDirty: false });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [topics]);

  const buildPayload = (data: TestFormData, extra: Record<string, unknown> = {}) => {
    const payload: Record<string, unknown> = {
      ...data,
      total_marks: totalQuestions * correctMarks,
      ...extra,
    };
    // API rejects sub_topics as an empty array — omit the field when nothing is selected
    if (!Array.isArray(payload.sub_topics) || (payload.sub_topics as string[]).length === 0) {
      delete payload.sub_topics;
    }
    return payload;
  };

  const createMutation = useMutation({
    mutationFn: (data: TestFormData) =>
      createTest(buildPayload(data, { status: 'draft' })),
    onSuccess: (res) => {
      const test = res.data?.data || res.data;
      setCurrentTest(test);
      clearAll();
      showToast('Test created successfully!');
      navigate(`/add-questions/${test.id}`);
    },
    onError: () => showToast('Failed to create test', 'error'),
  });

  const updateMutation = useMutation({
    mutationFn: (data: TestFormData) =>
      updateTest(id!, buildPayload(data)),
    onSuccess: (res) => {
      const test = res.data?.data || res.data;
      setCurrentTest(test);
      showToast('Test updated successfully!');
      if (isModal) {
        onSaved?.();
        onClose?.();
      } else {
        navigate(`/add-questions/${id}`);
      }
    },
    onError: () => showToast('Failed to update test', 'error'),
  });

  const onSubmit  = (data: TestFormData) => isEdit ? updateMutation.mutate(data) : createMutation.mutate(data);
  const isPending = createMutation.isPending || updateMutation.isPending;
  const totalMarks = (totalQuestions || 0) * (correctMarks || 0);

  const formContent = (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-6">
      {/* Tab bar */}
      <div className="inline-flex border border-border rounded-xl overflow-hidden">
        {isEdit ? (
          TABS.map((tab) => (
            <span key={tab.value}
              className={`px-5 py-2 text-sm font-medium whitespace-nowrap ${
                currentType === tab.value
                  ? 'text-primary border-b-2 border-primary bg-white dark:bg-gray-800'
                  : 'text-text-secondary bg-white dark:bg-gray-800'
              }`}
            >{tab.label}</span>
          ))
        ) : (
          TABS.map((tab) => (
            <NavLink key={tab.value} to={tab.path}
              className={({ isActive }) =>
                `px-5 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                  isActive
                    ? 'text-primary border-b-2 border-primary bg-white dark:bg-gray-800'
                    : 'text-text-secondary bg-white dark:bg-gray-800 hover:text-text-primary'
                }`
              }
            >{tab.label}</NavLink>
          ))
        )}
      </div>

      {/* Form fields — 2 column grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
        <Controller name="subject" control={control} render={({ field }) => (
          <Select
            label="Subject"
            options={subjects.map((s) => ({ value: s.id, label: s.name }))}
            value={field.value || ''}
            onChange={(v) => { field.onChange(v); setValue('topics', []); setValue('sub_topics', []); }}
            placeholder="Choose from Drop-down"
            error={errors.subject?.message}
          />
        )} />

        <Input label="Name of Test" placeholder="Enter name of Test" error={errors.name?.message} {...register('name')} />

        <Controller name="topics" control={control} render={({ field }) => (
          <Select
            label="Topic"
            options={topics.map((t) => ({ value: t.id, label: t.name }))}
            value={field.value || []}
            onChange={(v) => { field.onChange(v); setValue('sub_topics', []); }}
            placeholder="Choose from Drop-down"
            disabled={!selectedSubject}
            error={errors.topics?.message}
            multiple
          />
        )} />

        <Controller name="sub_topics" control={control} render={({ field }) => (
          <Select
            label="Sub Topic"
            options={subTopics.map((s) => ({ value: s.id, label: s.name }))}
            value={field.value || []}
            onChange={field.onChange}
            placeholder="Choose from Drop-down"
            disabled={!selectedTopics?.length}
            multiple
          />
        )} />

        <Controller name="total_time" control={control} render={({ field }) => (
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">Duration (Minutes)</label>
            <input
              type="number" placeholder="Enter the time"
              value={field.value || ''}
              onChange={(e) => field.onChange(Number(e.target.value))}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm border-border bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.total_time ? 'border-danger' : ''}`}
            />
            {errors.total_time && <p className="text-xs text-danger">{errors.total_time.message}</p>}
          </div>
        )} />

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium text-text-primary">Test Difficulty Level</label>
          <div className="flex gap-5 pt-1">
            {(['easy', 'medium', 'hard'] as const).map((d) => (
              <label key={d} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" value={d} {...register('difficulty')} className="w-4 h-4 accent-primary" />
                <span className="text-sm text-text-primary">{d === 'hard' ? 'Difficult' : d.charAt(0).toUpperCase() + d.slice(1)}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {/* Marking Scheme */}
      <div>
        <p className="text-sm font-semibold text-text-primary mb-4">Marking Scheme:</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          <Controller name="wrong_marks" control={control} render={({ field }) => (
            <SpinnerInput label="Wrong Answer" value={field.value} onChange={field.onChange} min={-10} max={0} prefix="-" />
          )} />
          <Controller name="unattempt_marks" control={control} render={({ field }) => (
            <SpinnerInput label="Unattempted" value={field.value} onChange={field.onChange} min={-5} max={5} prefix="+" />
          )} />
          <Controller name="correct_marks" control={control} render={({ field }) => (
            <SpinnerInput label="Correct Answer" value={field.value} onChange={field.onChange} min={0} max={10} prefix="+" />
          )} />
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-primary">No of Questions</label>
            <input type="number" placeholder="Ex:250 Marks"
              {...register('total_questions', { valueAsNumber: true })}
              className={`w-full px-3 py-2.5 rounded-lg border text-sm border-border bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary ${errors.total_questions ? 'border-danger' : ''}`}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text-secondary">Total Marks</label>
            <input type="number" value={totalMarks || ''} disabled placeholder="Ex:250 Marks"
              className="w-full px-3 py-2.5 rounded-lg border text-sm border-border bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-500 text-text-secondary placeholder:text-text-secondary cursor-not-allowed"
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3 pt-2 border-t border-border">
        <Button type="button" variant="ghost"
          onClick={() => isModal ? onClose?.() : navigate('/dashboard')}
        >Cancel</Button>
        <Button type="submit" loading={isPending}>
          {isEdit ? 'Save' : 'Next'}
        </Button>
      </div>
    </form>
  );

  if (isModal) return formContent;

  return <div className="w-full max-w-5xl">{formContent}</div>;
};
