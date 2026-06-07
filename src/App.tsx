import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ui/Toast';
import { ProtectedRoute } from './router/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CreateTest } from './pages/CreateTest';
import { AddQuestions } from './pages/AddQuestions';
import { Preview } from './pages/Preview';
import { TestTracking } from './pages/TestTracking';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Migrate old localStorage key — removes any stale 'theme' key that stored plain "dark" string
if (localStorage.getItem('theme') === 'dark' || localStorage.getItem('theme') === 'light') {
  localStorage.removeItem('theme');
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<Dashboard />} />

              {/* Create routes per type */}
              <Route path="create-test" element={<Navigate to="/create-test/chapterwise" replace />} />
              <Route path="create-test/chapterwise" element={<CreateTest />} />
              <Route path="create-test/pyq" element={<CreateTest />} />
              <Route path="create-test/mock" element={<CreateTest />} />

              {/* Edit route */}
              <Route path="create-test/edit/:id" element={<CreateTest />} />

              <Route path="add-questions/:testId" element={<AddQuestions />} />
              <Route path="preview/:testId" element={<Preview />} />
              <Route path="tracking" element={<TestTracking />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
