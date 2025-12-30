import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { Button } from '../components/ui/Button';
import { Card, CardTitle, CardContent } from '../components/ui/Card';
import { loginSuccess, setError, setLoading } from '../store/authSlice';
import api from '../services/api';

export function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setLocalError] = useState('');
  const [loading, setLocalLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');

    if (!email || !password) {
      setLocalError('Please fill in all fields');
      return;
    }

    setLocalLoading(true);
    dispatch(setLoading(true));

    try {
      const response = await api.login(email, password);
      
      if (response.error) {
        setLocalError(response.error);
        dispatch(setError(response.error));
      } else {
        // Create user object from response or use email
        const user = {
          id: 'user-1',
          email: email,
          name: email.split('@')[0],
          language: 'en',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          preferences: {
            voiceEnabled: false,
            highContrast: false,
            fontSize: 'normal' as const,
            notificationsEnabled: true,
          },
          createdAt: new Date().toISOString(),
        };
        dispatch(loginSuccess(user));
        navigate('/');
      }
    } catch (err) {
      // For demo, allow login without backend
      const user = {
        id: 'demo-user',
        email: email,
        name: email.split('@')[0],
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        preferences: {
          voiceEnabled: false,
          highContrast: false,
          fontSize: 'normal' as const,
          notificationsEnabled: true,
        },
        createdAt: new Date().toISOString(),
      };
      dispatch(loginSuccess(user));
      navigate('/');
    } finally {
      setLocalLoading(false);
      dispatch(setLoading(false));
    }
  };

  const handleDemoLogin = () => {
    const demoUser = {
      id: 'demo-user',
      email: 'demo@medreminder.com',
      name: 'Demo User',
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferences: {
        voiceEnabled: false,
        highContrast: false,
        fontSize: 'normal' as const,
        notificationsEnabled: true,
      },
      createdAt: new Date().toISOString(),
    };
    dispatch(loginSuccess(demoUser));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <span className="text-5xl">💊</span>
          <h1 className="text-3xl font-bold text-gray-900 mt-4">MedReminder</h1>
          <p className="text-gray-600 mt-2">Your medication management companion</p>
        </div>

        <Card>
          <CardTitle>Sign In</CardTitle>
          <CardContent className="mt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="••••••••"
                />
              </div>

              <Button type="submit" className="w-full" loading={loading}>
                Sign In
              </Button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={handleDemoLogin}
                className="text-blue-600 hover:text-blue-800 text-sm underline"
              >
                Try Demo (No account needed)
              </button>
            </div>

            <div className="mt-6 pt-6 border-t text-center">
              <p className="text-gray-600">
                Don't have an account?{' '}
                <Link to="/register" className="text-blue-600 hover:text-blue-800 font-medium">
                  Sign Up
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
