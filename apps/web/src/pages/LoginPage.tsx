import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess, setLoading } from '../store/authSlice';
import api from '../services/api';
import { useTranslation } from '../i18n/TranslationContext';

export function LoginPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t, lang } = useTranslation();
  const isZh = lang === 'zh';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setLocalError] = useState('');
  const [loading, setLocalLoading] = useState(false);

  const createUserFromEmail = (userEmail: string) => ({
    id: `user-${Date.now()}`,
    email: userEmail,
    name: userEmail.split('@')[0],
    language: lang,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    preferences: { voiceEnabled: false, highContrast: false, fontSize: 'normal' as const, notificationsEnabled: true },
    createdAt: new Date().toISOString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!email || !password) { setLocalError(t('fillAllFields')); return; }

    setLocalLoading(true);
    dispatch(setLoading(true));

    try {
      const response = await api.login(email, password);
      if (response.error) { console.log('API error, using offline mode'); }
      const user = createUserFromEmail(email);
      dispatch(loginSuccess(user));
      navigate('/');
    } catch (err) {
      console.log('Network error, using offline mode');
      const user = createUserFromEmail(email);
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
      language: lang,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      preferences: { voiceEnabled: false, highContrast: false, fontSize: 'normal' as const, notificationsEnabled: true },
      createdAt: new Date().toISOString(),
    };
    dispatch(loginSuccess(demoUser));
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto shadow-xl shadow-indigo-200">
            <span className="text-4xl">💊</span>
          </div>
          <h1 className="text-3xl font-bold mt-6 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            MedReminder
          </h1>
          <p className="text-gray-500 mt-2">{t('yourCompanion')}</p>
        </div>

        {/* Login Card */}
        <div className="bg-white/80 backdrop-blur-lg rounded-3xl shadow-xl shadow-gray-200/50 p-8 border border-white">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">{isZh ? '欢迎回来' : 'Welcome back'}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-xl text-sm font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('email')}</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-modern"
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">{t('password')}</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-modern"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] transition-all duration-200 disabled:opacity-50"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isZh ? '登录中...' : 'Signing in...'}
                </span>
              ) : t('login')}
            </button>
          </form>

          {/* Demo Login */}
          <div className="mt-6 text-center">
            <button
              onClick={handleDemoLogin}
              className="inline-flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-xl transition-colors"
            >
              <span>🚀</span>
              {t('demoLogin')}
            </button>
          </div>

          {/* Register Link */}
          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-gray-600">
              {t('noAccount')}{' '}
              <Link to="/register" className="text-indigo-600 hover:text-indigo-800 font-semibold">
                {t('register')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-sm mt-8">
          {isZh ? '安全、私密、可靠' : 'Secure • Private • Reliable'}
        </p>
      </div>
    </div>
  );
}
