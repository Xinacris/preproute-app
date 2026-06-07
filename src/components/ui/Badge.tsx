type BadgeVariant = 'draft' | 'live' | 'easy' | 'medium' | 'hard' | 'default' | 'dark';

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

const variantClasses: Record<BadgeVariant, string> = {
  draft:   'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300',
  live:    'bg-badge-green-bg text-badge-green-text dark:bg-green-900/40 dark:text-green-300',
  easy:    'bg-badge-green-bg text-badge-green-text dark:bg-green-900/40 dark:text-green-300',
  medium:  'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  hard:    'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  default: 'bg-gray-100 text-text-secondary dark:bg-gray-700 dark:text-gray-300',
  dark:    'bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900',
};

export const Badge = ({ variant = 'default', children, className = '' }: BadgeProps) => (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}>
    {children}
  </span>
);
