import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, MoreVertical, Search } from 'lucide-react';
import { getAllTests, deleteTest } from '../api/tests';
import type { Test } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { EditTestModal } from '../components/ui/EditTestModal';
import { ViewTestModal } from '../components/ui/ViewTestModal';
import { Select } from '../components/ui/Select';
import { useToast } from '../components/ui/Toast';

const TYPE_LABELS: Record<string, { label: string; className: string }> = {
  chapterwise: { label: 'Chapter Wise', className: 'bg-primary-light text-primary' },
  pyq:         { label: 'PYQ',          className: 'bg-purple-100 text-purple-700' },
  mock:        { label: 'Mock Test',    className: 'bg-orange-100 text-orange-700' },
};

const TYPE_OPTIONS = [
  { value: 'chapterwise', label: 'Chapter Wise' },
  { value: 'pyq', label: 'PYQ' },
  { value: 'mock', label: 'Mock Test' },
];

const DIFFICULTY_OPTIONS = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' },
];

const SORT_OPTIONS = [
  { value: 'name_asc', label: 'Name (A-Z)' },
  { value: 'name_desc', label: 'Name (Z-A)' },
  { value: 'date_desc', label: 'Date (Newest)' },
  { value: 'date_asc', label: 'Date (Oldest)' },
];

const TypeBadge = ({ type }: { type?: string }) => {
  const t = type ? TYPE_LABELS[type] : null;
  if (!t) return <span className="text-xs text-text-secondary">—</span>;
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${t.className}`}>{t.label}</span>;
};

const statusBadge = (status: Test['status']) => {
  if (status === 'live')  return <Badge variant="live">Live</Badge>;
  if (status === 'draft') return <Badge variant="draft">Draft</Badge>;
  return <Badge variant="default">—</Badge>;
};

const diffBadge = (d?: string) => {
  if (!d) return null;
  return <Badge variant={d === 'easy' ? 'easy' : d === 'medium' ? 'medium' : 'hard'}>
    {d.charAt(0).toUpperCase() + d.slice(1)}
  </Badge>;
};

const formatDate = (s?: string) => {
  if (!s) return '—';
  const date = new Date(s);
  const now = new Date();
  const isToday = date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate();
  if (isToday) {
    const hours = date.getHours();
    const displayHour = hours % 12 || 12;
    const displayMinute = date.getMinutes().toString().padStart(2, '0');
    const period = hours >= 12 ? 'pm' : 'am';
    return `Today at ${displayHour}:${displayMinute}${period}`;
  }
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

export const Dashboard = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [deleteId, setDeleteId]   = useState<string | null>(null);
  const [editId, setEditId]       = useState<string | null>(null);
  const [viewId, setViewId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [subjectFilter, setSubjectFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [difficultyFilter, setDifficultyFilter] = useState('');
  const [sortBy, setSortBy] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: () => getAllTests().then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTest(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tests'] });
      showToast('Test deleted successfully');
      setDeleteId(null);
    },
    onError: () => showToast('Failed to delete test', 'error'),
  });

  const tests: Test[] = data?.data || data || [];

  const subjectOptions = useMemo(
    () => [...new Set(tests.map((t) => t.subject).filter(Boolean))]
      .sort()
      .map((s) => ({ value: s, label: s })),
    [tests]
  );

  const statusOptions = useMemo(
    () => [...new Set(tests.map((t) => t.status).filter(Boolean))]
      .map((s) => ({ value: s as string, label: (s as string).charAt(0).toUpperCase() + (s as string).slice(1) })),
    [tests]
  );

  const hasActiveFilters = !!(search || typeFilter || subjectFilter || statusFilter || difficultyFilter || sortBy);

  const clearFilters = () => {
    setSearch('');
    setTypeFilter('');
    setSubjectFilter('');
    setStatusFilter('');
    setDifficultyFilter('');
    setSortBy('');
  };

  const filteredTests = useMemo(() => {
    let result = tests.filter((t) =>
      (!search || t.name.toLowerCase().includes(search.toLowerCase())) &&
      (!typeFilter || t.type === typeFilter) &&
      (!subjectFilter || t.subject === subjectFilter) &&
      (!statusFilter || t.status === statusFilter) &&
      (!difficultyFilter || t.difficulty === difficultyFilter)
    );
    if (sortBy === 'name_asc')  result = [...result].sort((a, b) => a.name.localeCompare(b.name));
    if (sortBy === 'name_desc') result = [...result].sort((a, b) => b.name.localeCompare(a.name));
    if (sortBy === 'date_desc') result = [...result].sort((a, b) => new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime());
    if (sortBy === 'date_asc')  result = [...result].sort((a, b) => new Date(a.created_at ?? 0).getTime() - new Date(b.created_at ?? 0).getTime());
    return result;
  }, [tests, search, typeFilter, subjectFilter, statusFilter, difficultyFilter, sortBy]);

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-xl md:text-2xl font-semibold text-text-primary">Test Creation</h1>
        <Button onClick={() => navigate('/create-test')} size="md">
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">Create New Test</span>
          <span className="sm:hidden">New</span>
        </Button>
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap gap-2 items-start">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by test name..."
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border text-sm border-border bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder-gray-500 text-text-primary placeholder:text-text-secondary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
          />
        </div>
        <div className="w-full sm:w-40">
          <Select options={TYPE_OPTIONS} value={typeFilter} onChange={(v) => setTypeFilter(v as string)} placeholder="All Types" />
        </div>
        <div className="w-full sm:w-44">
          <Select options={subjectOptions} value={subjectFilter} onChange={(v) => setSubjectFilter(v as string)} placeholder="All Subjects" />
        </div>
        <div className="w-full sm:w-36">
          <Select options={statusOptions} value={statusFilter} onChange={(v) => setStatusFilter(v as string)} placeholder="All Statuses" />
        </div>
        <div className="w-full sm:w-36">
          <Select options={DIFFICULTY_OPTIONS} value={difficultyFilter} onChange={(v) => setDifficultyFilter(v as string)} placeholder="All Difficulties" />
        </div>
        <div className="w-full sm:w-44">
          <Select options={SORT_OPTIONS} value={sortBy} onChange={(v) => setSortBy(v as string)} placeholder="Sort by" />
        </div>
        {hasActiveFilters && (
          <Button variant="ghost" onClick={clearFilters}>Clear Filters</Button>
        )}
      </div>

      {/* Desktop table */}
      <div className="hidden md:block bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 overflow-hidden overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-gray-50 dark:bg-gray-700 border-b border-border dark:border-gray-600">
            <tr>
              {['Test Name','Type','Subject','Topics','Difficulty','Status','Created','Actions'].map(h => (
                <th key={h} className="px-4 py-3 text-left font-medium text-text-secondary whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border last:border-0">
                  {Array.from({ length: 8 }).map((_, j) => (
                    <td key={j} className="px-4 py-3"><div className="h-4 bg-gray-100 dark:bg-gray-600 rounded animate-pulse" /></td>
                  ))}
                </tr>
              ))
            ) : tests.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center"><EmptyState onNavigate={() => navigate('/create-test')} /></td></tr>
            ) : filteredTests.length === 0 ? (
              <tr><td colSpan={8} className="py-16 text-center"><NoResultsState onClear={clearFilters} /></td></tr>
            ) : (
              filteredTests.map((test) => (
                <tr key={test.id} className="border-b border-border last:border-0 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-3 font-medium text-text-primary max-w-[180px] truncate">{test.name}</td>
                  <td className="px-4 py-3"><TypeBadge type={test.type} /></td>
                  <td className="px-4 py-3 text-text-secondary text-xs max-w-[120px] truncate">{test.subject || '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1 max-w-[150px]">
                      {Array.isArray(test.topics) && test.topics.slice(0, 2).map((t, i) => (
                        <span key={i} className="bg-primary-light text-primary text-xs px-2 py-0.5 rounded-full">{t}</span>
                      ))}
                      {Array.isArray(test.topics) && test.topics.length > 2 && (
                        <span className="text-xs text-text-secondary">+{test.topics.length - 2}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3">{diffBadge(test.difficulty)}</td>
                  <td className="px-4 py-3">{statusBadge(test.status)}</td>
                  <td className="px-4 py-3 text-text-secondary text-xs whitespace-nowrap">{formatDate(test.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setEditId(test.id)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-light rounded-lg transition-colors" title="Edit"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => test.status === 'live' ? setViewId(test.id) : navigate(`/preview/${test.id}`)} className="p-1.5 text-text-secondary hover:text-primary hover:bg-primary-light rounded-lg transition-colors" title="View"><Eye className="w-4 h-4" /></button>
                      <button onClick={() => setDeleteId(test.id)} className="p-1.5 text-text-secondary hover:text-danger hover:bg-red-50 rounded-lg transition-colors" title="Delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className="md:hidden flex flex-col gap-3">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-4 animate-pulse">
              <div className="h-4 bg-gray-100 dark:bg-gray-600 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-100 dark:bg-gray-600 rounded w-1/2" />
            </div>
          ))
        ) : tests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-8">
            <EmptyState onNavigate={() => navigate('/create-test')} />
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-8">
            <NoResultsState onClear={clearFilters} />
          </div>
        ) : (
          filteredTests.map((test) => (
            <div key={test.id} className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-text-primary text-sm truncate">{test.name}</p>
                  <p className="text-xs text-text-secondary mt-0.5 truncate">{test.subject || '—'}</p>
                </div>
                <div className="relative flex-shrink-0">
                  <button onClick={() => setOpenMenuId(openMenuId === test.id ? null : test.id)} className="p-1.5 text-text-secondary hover:text-text-primary rounded-lg">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                  {openMenuId === test.id && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setOpenMenuId(null)} />
                      <div className="absolute right-0 top-8 z-20 bg-white dark:bg-gray-800 border border-border rounded-xl shadow-lg overflow-hidden min-w-[140px]">
                        <button onClick={() => { setEditId(test.id); setOpenMenuId(null); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50 dark:hover:bg-gray-700"><Pencil className="w-4 h-4" /> Edit</button>
                        <button onClick={() => { test.status === 'live' ? setViewId(test.id) : navigate(`/preview/${test.id}`); setOpenMenuId(null); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-text-primary hover:bg-gray-50 dark:hover:bg-gray-700"><Eye className="w-4 h-4" /> View</button>
                        <button onClick={() => { setDeleteId(test.id); setOpenMenuId(null); }} className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="w-4 h-4" /> Delete</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-1.5 mt-3">
                <TypeBadge type={test.type} />
                {statusBadge(test.status)}
                {diffBadge(test.difficulty)}
              </div>
              {Array.isArray(test.topics) && test.topics.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {test.topics.slice(0, 3).map((t, i) => (
                    <span key={i} className="bg-primary-light text-primary text-xs px-2 py-0.5 rounded-full">{t}</span>
                  ))}
                  {test.topics.length > 3 && <span className="text-xs text-text-secondary self-center">+{test.topics.length - 3}</span>}
                </div>
              )}
              <p className="text-xs text-text-secondary mt-2">{formatDate(test.created_at)}</p>
            </div>
          ))
        )}
      </div>

      {/* Edit modal */}
      {editId && <EditTestModal testId={editId} onClose={() => setEditId(null)} />}

      {/* View modal (live tests) */}
      {viewId && <ViewTestModal testId={viewId} onClose={() => setViewId(null)} />}

      {/* Delete confirm modal */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Test">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-text-secondary">Are you sure you want to delete this test? This cannot be undone.</p>
          <div className="flex gap-3 justify-end">
            <Button variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="danger" loading={deleteMutation.isPending} onClick={() => deleteId && deleteMutation.mutate(deleteId)}>Delete</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const EmptyState = ({ onNavigate }: { onNavigate: () => void }) => (
  <div className="flex flex-col items-center gap-3 text-text-secondary">
    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
      <Plus className="w-6 h-6 text-gray-400" />
    </div>
    <p className="font-medium text-sm">No tests found. Create your first test!</p>
    <Button size="sm" onClick={onNavigate}>Create New Test</Button>
  </div>
);

const NoResultsState = ({ onClear }: { onClear: () => void }) => (
  <div className="flex flex-col items-center gap-3 text-text-secondary">
    <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
      <Search className="w-6 h-6 text-gray-400" />
    </div>
    <p className="font-medium text-sm">No tests match your filters.</p>
    <Button size="sm" variant="ghost" onClick={onClear}>Clear Filters</Button>
  </div>
);
