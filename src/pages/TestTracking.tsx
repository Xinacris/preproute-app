import { useQuery } from '@tanstack/react-query';
import { Clock, FileText, Star, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getAllTests } from '../api/tests';
import type { Test } from '../types';
import { Badge } from '../components/ui/Badge';
import { Spinner } from '../components/ui/Spinner';

const formatTimeLeft = (test: Test): string => {
  // If the test has an expiry date, calculate time left
  const expiry = (test as Test & { expiry_date?: string; scheduled_date?: string }).expiry_date;
  if (!expiry) return 'Always available';
  const diff = new Date(expiry).getTime() - Date.now();
  if (diff <= 0) return 'Expired';
  const days  = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  if (days > 0) return `${days}d ${hours}h left`;
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${mins}m left` : `${mins}m left`;
};

export const TestTracking = () => {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery({
    queryKey: ['tests'],
    queryFn: () => getAllTests().then((r) => r.data),
  });

  const allTests: Test[] = data?.data || data || [];
  const liveTests = allTests.filter((t) => t.status === 'live');

  return (
    <div className="flex flex-col gap-4 md:gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-semibold text-text-primary dark:text-gray-100">Test Tracking</h1>
          <p className="text-sm text-text-secondary dark:text-gray-400 mt-0.5">Currently live tests and their remaining time</p>
        </div>
        <span className="bg-badge-green-bg dark:bg-green-900/40 text-badge-green-text dark:text-green-300 text-xs font-semibold px-3 py-1.5 rounded-full">
          {liveTests.length} Live
        </span>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16"><Spinner /></div>
      ) : liveTests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-16 text-center">
          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-text-secondary dark:text-gray-400" />
          </div>
          <p className="text-sm font-medium text-text-secondary dark:text-gray-400">No live tests at the moment.</p>
          <p className="text-xs text-text-secondary dark:text-gray-500 mt-1">Publish a test to see it here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {liveTests.map((test) => {
            const timeLeft = formatTimeLeft(test);
            const isExpiring = timeLeft !== 'Always available' && timeLeft !== 'Expired' &&
              (timeLeft.includes('h') || timeLeft.includes('m left'));

            return (
              <div key={test.id} className="bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-text-primary dark:text-gray-100 truncate">{test.name}</p>
                    <p className="text-xs text-text-secondary dark:text-gray-400 mt-0.5 truncate">{test.subject || '—'}</p>
                  </div>
                  <Badge variant="live">Live</Badge>
                </div>

                {/* Time left */}
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
                  timeLeft === 'Always available'
                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-300'
                    : isExpiring
                    ? 'bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-300'
                    : 'bg-badge-green-bg dark:bg-green-900/20 text-badge-green-text dark:text-green-300'
                }`}>
                  <Clock className="w-4 h-4 flex-shrink-0" />
                  {timeLeft}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-4 text-xs text-text-secondary dark:text-gray-400 pt-1 border-t border-border dark:border-gray-700">
                  <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5" />{test.total_questions} Qs</span>
                  <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{test.total_marks} Marks</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{test.total_time} Min</span>
                </div>

                {/* Action */}
                <button
                  onClick={() => navigate(`/preview/${test.id}`)}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm text-primary font-medium border border-primary/30 rounded-lg hover:bg-primary-light dark:hover:bg-gray-700 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  View Test
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
