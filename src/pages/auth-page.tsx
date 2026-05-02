import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LockKeyhole, UserPlus } from 'lucide-react';
import { HeroShell } from '@/components/layout/hero-shell';
import { MitingoLogo } from '@/components/brand/mitingo-logo';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/store/auth-store';
import { useNotificationsStore } from '@/store/notifications-store';

type AuthPageProps = {
  mode: 'login' | 'register';
};

export function AuthPage({ mode }: AuthPageProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';
  const login = useAuthStore((state) => state.login);
  const register = useAuthStore((state) => state.register);
  const isLoading = useAuthStore((state) => state.isLoading);
  const addNotification = useNotificationsStore((state) => state.addNotification);
  const [form, setForm] = useState({
    username: '',
    password: '',
    firstName: '',
    lastName: '',
  });
  const isRegister = mode === 'register';

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      if (isRegister) {
        await register({
          username: form.username,
          password: form.password,
          firstName: form.firstName,
          lastName: form.lastName,
        });
        addNotification({
          title: 'Account created',
          message: 'You are signed in and ready to start a meeting.',
          variant: 'success',
        });
      } else {
        await login({
          username: form.username,
          password: form.password,
        });
        addNotification({
          title: 'Welcome back',
          message: 'Your meeting workspace is ready.',
          variant: 'success',
        });
      }

      navigate(redirectTo, { replace: true });
    } catch (error) {
      addNotification({
        title: isRegister ? 'Registration failed' : 'Login failed',
        message: error instanceof Error ? error.message : 'Please check your details and try again.',
        variant: 'error',
      });
    }
  }

  return (
    <HeroShell className="items-center justify-center">
      <div className="flex w-full max-w-5xl flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
        <motion.div
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          className="max-w-xl"
        >
          <MitingoLogo />
          <h1 className="mt-8 text-5xl font-semibold tracking-tight text-slate-950">
            {isRegister ? 'Create your meeting identity.' : 'Sign in to your meeting space.'}
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Your account owns rooms, chat history, participant identity, and authenticated WebSocket sync.
          </p>
        </motion.div>

        <Card className="w-full max-w-md">
          <CardContent className="p-6 sm:p-8">
            <div className="mb-6 flex items-center gap-3">
              <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-200 bg-cyan-50 text-cyan-700">
                {isRegister ? <UserPlus className="h-5 w-5" /> : <LockKeyhole className="h-5 w-5" />}
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-950">{isRegister ? 'Register' : 'Login'}</h2>
                <p className="text-sm text-slate-500">Secure account access for your rooms.</p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={(event) => void handleSubmit(event)}>
              {isRegister ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="block space-y-2">
                    <span className="text-sm text-slate-600">First name</span>
                    <Input
                      value={form.firstName}
                      onChange={(event) => setForm((state) => ({ ...state, firstName: event.target.value }))}
                      autoComplete="given-name"
                      required
                    />
                  </label>
                  <label className="block space-y-2">
                    <span className="text-sm text-slate-600">Last name</span>
                    <Input
                      value={form.lastName}
                      onChange={(event) => setForm((state) => ({ ...state, lastName: event.target.value }))}
                      autoComplete="family-name"
                      required
                    />
                  </label>
                </div>
              ) : null}

              <label className="block space-y-2">
                <span className="text-sm text-slate-600">Username</span>
                <Input
                  value={form.username}
                  onChange={(event) => setForm((state) => ({ ...state, username: event.target.value }))}
                  autoComplete="username"
                  required
                />
              </label>

              <label className="block space-y-2">
                <span className="text-sm text-slate-600">Password</span>
                <Input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm((state) => ({ ...state, password: event.target.value }))}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  minLength={isRegister ? 8 : 1}
                  required
                />
              </label>

              <Button className="w-full" variant="accent" size="lg" disabled={isLoading}>
                {isLoading ? 'Please wait...' : isRegister ? 'Create account' : 'Login'}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-slate-500">
              {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
              <Link
                className="font-medium text-cyan-700 transition hover:text-cyan-900"
                to={`${isRegister ? '/login' : '/register'}?redirect=${encodeURIComponent(redirectTo)}`}
              >
                {isRegister ? 'Login' : 'Register'}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </HeroShell>
  );
}
