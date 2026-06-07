import { useState } from 'react';
import { NavLink, Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, ClipboardEdit, ListChecks,
  X, ChevronDown, ChevronRight as ChevronR,
  BookOpen, History, LayoutGrid
} from 'lucide-react';
import prepRouteLogo from '../../assets/PrepRoute.png';

const TEST_TYPES = [
  { label: 'Chapter Wise', path: '/create-test/chapterwise', icon: BookOpen },
  { label: 'PYQ', path: '/create-test/pyq', icon: History },
  { label: 'Mock Test', path: '/create-test/mock', icon: LayoutGrid },
];

interface SidebarProps {
  open?: boolean;
  onClose?: () => void;
}

export const Sidebar = ({ open = true, onClose }: SidebarProps) => {
  const location = useLocation();
  const isCreateActive = location.pathname.startsWith('/create-test');
  const [createOpen, setCreateOpen] = useState(isCreateActive);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={onClose} />
      )}

      <aside
        className={`
          w-[220px] flex-shrink-0 h-screen bg-white border-r border-border
          dark:bg-gray-900 dark:border-gray-700
          flex flex-col fixed left-0 top-0 z-30
          transition-transform duration-200
          ${open ? 'translate-x-0' : '-translate-x-full'}
          lg:translate-x-0
        `}
      >
        {/* Logo */}
        <div className="px-6 py-5 border-b border-border flex items-center justify-between">
          <Link to="/dashboard" onClick={onClose}>
            <img src={prepRouteLogo} alt="PrepRoute" className="h-8 w-auto dark:brightness-0 dark:invert" />
          </Link>
          <button onClick={onClose} className="lg:hidden p-1 text-text-secondary hover:text-text-primary rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 overflow-y-auto">
          {/* Dashboard */}
          <NavLink
            to="/dashboard"
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-5 py-3 text-sm font-medium relative transition-colors
              ${isActive
                ? 'text-primary bg-primary-light before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-primary before:rounded-r'
                : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-text-primary'
              }
            `}
          >
            <LayoutDashboard className="w-5 h-5 flex-shrink-0" />
            Dashboard
          </NavLink>

          {/* Test Creation — collapsible group */}
          <div>
            <button
              onClick={() => setCreateOpen((v) => !v)}
              className={`
                w-full flex items-center gap-3 px-5 py-3 text-sm font-medium relative transition-colors
                ${isCreateActive
                  ? 'text-primary bg-primary-light before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-primary before:rounded-r'
                  : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-text-primary'
                }
              `}
            >
              <ClipboardEdit className="w-5 h-5 flex-shrink-0" />
              <span className="flex-1 text-left">Test Creation</span>
              {createOpen
                ? <ChevronDown className="w-4 h-4 flex-shrink-0" />
                : <ChevronR className="w-4 h-4 flex-shrink-0" />
              }
            </button>

            {createOpen && (
              <div className="ml-4 border-l border-border pl-2 py-1">
                {TEST_TYPES.map(({ label, path, icon: Icon }) => (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={onClose}
                    className={({ isActive }) => `
                      flex items-center gap-2.5 px-4 py-2.5 text-sm rounded-lg transition-colors
                      ${isActive
                        ? 'text-primary bg-primary-light font-medium'
                        : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-text-primary'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    {label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>

          {/* Test Tracking */}
          <NavLink
            to="/tracking"
            onClick={onClose}
            className={({ isActive }) => `
              flex items-center gap-3 px-5 py-3 text-sm font-medium relative transition-colors
              ${isActive
                ? 'text-primary bg-primary-light before:absolute before:left-0 before:top-0 before:h-full before:w-[3px] before:bg-primary before:rounded-r'
                : 'text-text-secondary hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-text-primary'
              }
            `}
          >
            <ListChecks className="w-5 h-5 flex-shrink-0" />
            Test Tracking
          </NavLink>
        </nav>

      </aside>
    </>
  );
};
