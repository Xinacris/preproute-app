# Dashboard Filtering & Sorting — Design

## Goal

Add search, filtering, and sorting to the Dashboard test list (`src/pages/Dashboard.tsx`) so admins can find a specific test quickly without scrolling through the full table. No backend changes — purely client-side, derived from the already-fetched `tests` array.

## Background

`Dashboard.tsx` currently fetches all tests via `getAllTests()` with no pagination, and renders them directly in a desktop `<table>` and a mobile card list. There is no search, filter, or sort today. The dataset size is small enough (an internal admin tool's test bank) that client-side filtering is appropriate — no new API calls are needed.

`Test.status` is typed as `'draft' | 'live' | 'unpublished' | 'scheduled' | 'expired' | null`, not just draft/live, so the Status filter must be driven by whatever values actually appear in the data rather than a hardcoded two-value list.

## Scope

In scope:
- Free-text search by test name
- Sort by name (A-Z / Z-A) and by creation date (Newest / Oldest)
- Filter by Type (Chapter Wise / PYQ / Mock), Subject, Status, Difficulty
- A "Clear Filters" action
- A distinct empty state for "no results match the current filters" vs. the existing "no tests at all" empty state

Out of scope (not requested, not implementing):
- Server-side filtering/pagination
- Persisting filter state across reloads or in the URL
- Saved filter presets

## State

New local `useState` in `Dashboard`:

```ts
const [search, setSearch] = useState('');
const [typeFilter, setTypeFilter] = useState('');
const [subjectFilter, setSubjectFilter] = useState('');
const [statusFilter, setStatusFilter] = useState('');
const [difficultyFilter, setDifficultyFilter] = useState('');
const [sortBy, setSortBy] = useState(''); // '' = API's natural order
```

Empty string means "All" / "no sort override" for every filter, consistent with how the existing `Select` component already treats an empty value as "show placeholder."

## Derived data

```ts
const subjectOptions = useMemo(
  () => [...new Set(tests.map(t => t.subject).filter(Boolean))].sort(),
  [tests]
);
const statusOptions = useMemo(
  () => [...new Set(tests.map(t => t.status).filter(Boolean))],
  [tests]
);

const filteredTests = useMemo(() => {
  let result = tests.filter(t =>
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
```

Subject and Status options are derived from the actual `tests` data (whatever string the table already displays in those columns), not from a separate `/subjects` API call — this keeps the filter values guaranteed consistent with what's shown in the table, and avoids an extra request.

## UI

A new toolbar row, inline in `Dashboard.tsx`, placed between the header (`Test Creation` / `Create New Test`) and the table/card list:

- A search `<input>` styled to match existing form inputs (e.g. the style used in `CreateTest.tsx`'s text inputs), with a search icon from `lucide-react`
- Five `Select` components (reusing `src/components/ui/Select.tsx`, not native `<select>`, for visual consistency with the rest of the app) for Type, Subject, Status, Difficulty, and Sort — each with an empty-string "placeholder" option representing "All" / default
- A "Clear Filters" `Button` (variant="ghost" or "secondary"), rendered only when any of the six state values is non-default

Layout: `flex flex-wrap gap-2` so it wraps naturally on narrow viewports, consistent with the existing responsive approach (desktop table vs. mobile cards already coexist in this file).

Both the desktop `<table>` and the mobile card list switch from mapping over `tests` to mapping over `filteredTests`.

## Empty states

- `tests.length === 0` → existing `EmptyState` component, unchanged ("No tests found. Create your first test!")
- `tests.length > 0 && filteredTests.length === 0` → new empty state: "No tests match your filters." + a "Clear Filters" button, shown in both the table (`colSpan={8}` row) and the mobile card container

## Files touched

- Modify: `src/pages/Dashboard.tsx` only

## Testing / verification

No test runner configured in this repo (per existing project convention — verification is `npm run build` + manual check in `npm run dev`). Manual verification:
- Type a partial test name → list narrows to matches, case-insensitive
- Pick a Type filter → only that type shows; combine with Subject filter → both apply together (AND)
- Pick a Status filter → only matching status shows (including non-draft/live values if present)
- Pick a Difficulty filter → only matching difficulty shows
- Sort by Name (A-Z) and (Z-A) → order changes correctly; sort by Date (Newest/Oldest) → order changes correctly
- Apply a filter combination that matches nothing → "No tests match your filters" empty state appears with a working Clear Filters button
- Clear Filters → all controls reset, full list returns
- Resize to mobile width → toolbar wraps cleanly, filtered list shows correctly in the card layout
