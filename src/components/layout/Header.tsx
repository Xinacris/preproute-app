import { useEffect, useRef, useState } from 'react';
import { Bell, ChevronDown, ChevronRight, Menu, Sun, Moon, BellOff, LogOut } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';
import { useNotificationStore } from '../../store/notificationStore';

interface HeaderProps {
  breadcrumbs: string[];
  onMenuClick?: () => void;
}

export const Header = ({ breadcrumbs, onMenuClick }: HeaderProps) => {
  const user   = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const { dark, toggle } = useThemeStore();
  const { notifications, markAllRead } = useNotificationStore();

  const unread = notifications.filter((n) => !n.read).length;

  const [notifOpen, setNotifOpen]     = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const notifRef   = useRef<HTMLDivElement>(null);
  const userRef    = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setNotifOpen(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setUserMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AU';

  const colors   = ['bg-violet-500', 'bg-blue-500', 'bg-emerald-500', 'bg-orange-500'];
  const colorIdx = (user?.name?.charCodeAt(0) ?? 0) % colors.length;

  return (
    <header className="h-[64px] bg-white border-b border-border flex items-center justify-between px-4 md:px-6 flex-shrink-0 dark:bg-gray-900 dark:border-gray-700">
      {/* Left: hamburger + breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 text-text-secondary hover:text-text-primary hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg flex-shrink-0"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-1.5 text-sm min-w-0">
          {breadcrumbs.map((crumb, i) => (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />}
              <span className={`truncate ${i === breadcrumbs.length - 1 ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                {crumb}
              </span>
            </span>
          ))}
        </div>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-1 md:gap-2 flex-shrink-0">

        {/* Dark / Light mode toggle */}
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-text-secondary hover:text-text-primary hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {dark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>

        {/* Notification button + dropdown */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => {
              setNotifOpen((v) => !v);
              if (!notifOpen && unread > 0) markAllRead();
            }}
            className="relative p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            title="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full" />
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-11 z-50 w-72 sm:w-80 bg-white dark:bg-gray-800 border border-border rounded-xl shadow-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                <span className="text-sm font-semibold text-text-primary">Notifications</span>
                {notifications.length > 0 && (
                  <span className="text-xs text-primary cursor-pointer hover:underline" onClick={markAllRead}>
                    Mark all read
                  </span>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-8 px-4">
                  <BellOff className="w-8 h-8 text-text-secondary opacity-40" />
                  <p className="text-sm text-text-secondary">No notifications</p>
                </div>
              ) : (
                <div className="max-h-72 overflow-y-auto divide-y divide-border">
                  {notifications.map((n) => (
                    <div key={n.id} className={`px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${!n.read ? 'bg-primary-light' : ''}`}>
                      <div className="flex items-start gap-2">
                        {!n.read && <span className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-1.5" />}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-text-primary">{n.title}</p>
                          <p className="text-xs text-text-secondary mt-0.5">{n.body}</p>
                          <p className="text-xs text-text-secondary mt-1">{n.createdAt}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={userRef}>
          <button
            onClick={() => setUserMenuOpen((v) => !v)}
            className="flex items-center gap-2 hover:bg-gray-50 dark:hover:bg-gray-800 px-2 py-1.5 rounded-lg transition-colors"
          >
            <div className={`w-8 h-8 rounded-full ${colors[colorIdx]} flex items-center justify-center text-white text-xs font-semibold flex-shrink-0`}>
              {initials}
            </div>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium text-text-primary leading-tight">
                {user?.name || 'Admin User'}
              </p>
              <p className="text-xs text-text-secondary leading-tight">
                {user?.role || 'Admin'}
              </p>
            </div>
            <ChevronDown className={`w-4 h-4 text-text-secondary hidden md:block transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 top-12 z-50 w-56 bg-white dark:bg-gray-800 border border-border rounded-xl shadow-lg overflow-hidden">
              {/* Profile info */}
              <div className="px-4 py-4 flex items-center gap-3 border-b border-border">
                <div className={`w-10 h-10 rounded-full ${colors[colorIdx]} flex items-center justify-center text-white text-sm font-semibold flex-shrink-0`}>
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{user?.name || 'Admin User'}</p>
                  <p className="text-xs text-text-secondary capitalize">{user?.role || 'Admin'}</p>
                </div>
              </div>
              {/* Logout */}
              <button
                onClick={() => { setUserMenuOpen(false); logout(); }}
                className="flex items-center gap-2.5 w-full px-4 py-3 text-sm text-danger hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
