import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { login } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useToast } from '../components/ui/Toast';
import loginHero from '../assets/LoginHero.png';
import prepRouteLogo from '../assets/PrepRoute.png';

const schema = z.object({
  userId: z.string().min(1, 'User ID required'),
  password: z.string().min(1, 'Password required'),
});

type FormData = z.infer<typeof schema>;

export const Login = () => {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { showToast } = useToast();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { register, handleSubmit, formState: { errors, isSubmitting } } =
    useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError('');
    try {
      const res = await login(data.userId, data.password);
      const { token, user } = res.data.data;
      setAuth(token, user);
      showToast('Login successful!');
      navigate('/dashboard', { replace: true });
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } };
      const message = err.response?.data?.message || 'Invalid credentials. Please try again.';
      setError(message);
      showToast(message, 'error');
    }
  };

  return (
    <div className="min-h-screen flex bg-[#F0F4FF]">
      {/* Left — illustration */}
      <div className="hidden lg:flex w-1/2 items-center justify-center p-12">
        <img src={loginHero} alt="PrepRoute hero" className="max-h-[380px] w-auto object-contain" />
      </div>

      {/* Right — form card */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-5 sm:p-8">
        <div className="w-full max-w-[420px] bg-white rounded-2xl border border-gray-200 shadow-sm px-8 py-10">

          <div className="mb-7">
            <img src={prepRouteLogo} alt="PrepRoute" className="h-8 w-auto" />
          </div>

          <div className="mb-6">
            <h2 className="text-2xl font-semibold text-text-primary mb-1">Login</h2>
            <p className="text-sm text-text-secondary">
              Use your company provided Login credentials
            </p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-danger text-sm">{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-5">
            <Input
              label="User ID"
              placeholder="Enter User ID"
              error={errors.userId?.message}
              {...register('userId')}
            />

            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-text-primary">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter Password"
                  className={`
                    w-full px-3 py-2.5 pr-10 rounded-lg border text-sm
                    border-border bg-white text-text-primary
                    placeholder:text-text-secondary
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary
                    ${errors.password ? 'border-danger' : ''}
                  `}
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-danger">{errors.password.message}</p>}
            </div>

            <div className="flex justify-start">
              <span className="text-sm text-primary cursor-default">Forgot password?</span>
            </div>

            <Button type="submit" fullWidth size="lg" loading={isSubmitting} className="mt-1">
              Login
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};
