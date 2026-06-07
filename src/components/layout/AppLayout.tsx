import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

const getBreadcrumbs = (pathname: string): string[] => {
  if (pathname.startsWith('/dashboard')) return ['Dashboard'];
  if (pathname.includes('/create-test/edit')) return ['Dashboard', 'Test Creation', 'Edit Test'];
  if (pathname.includes('/create-test/pyq')) return ['Dashboard', 'Test Creation', 'PYQ'];
  if (pathname.includes('/create-test/mock')) return ['Dashboard', 'Test Creation', 'Mock Test'];
  if (pathname.startsWith('/create-test')) return ['Dashboard', 'Test Creation', 'Chapter Wise'];
  if (pathname.startsWith('/add-questions')) return ['Dashboard', 'Test Creation', 'Add Questions'];
  if (pathname.startsWith('/preview')) return ['Dashboard', 'Test Creation', 'Preview'];
  if (pathname.startsWith('/tracking')) return ['Dashboard', 'Test Tracking'];
  return ['Dashboard'];
};

export const AppLayout = () => {
  const location = useLocation();
  const breadcrumbs = getBreadcrumbs(location.pathname);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex flex-col flex-1 lg:ml-[220px] min-h-screen overflow-hidden">
        <Header breadcrumbs={breadcrumbs} onMenuClick={() => setSidebarOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-gray-900">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
