import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { loginSuccess, setLoading } from '../store/authSlice';
import api from '../services/api';
import { useTranslation } from '../i18n/TranslationContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { t, lang } = useTranslation();
  const isZh = lang === 'zh';
  const [formData, setFormData] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLocalLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const createUserFromForm = () => ({
    id: 'user-' + Date.now(),
    email: formData.email,
    name: `${formData.firstName} ${formData.lastName}`.trim(),
    language: lang,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    preferences: { voiceEnabled: false, highContrast: false, fontSize: 'normal' as const, notificationsEnabled: true },
    createdAt: new Date().toISOString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.firstName || !formData.email || !formData.password) { setError(t('fillAllFields')); return; }
    if (formData.password.length < 8) { setError(t('passwordMinLength')); return; }
    if (formData.password !== formData.confirmPassword) { setError(t('passwordMismatch')); return; }
    if (!/[A-Z]/.test(formData.password)) { setError(t('passwordUppercase')); return; }
    if (!/[0-9]/.test(formData.password)) { setError(t('passwordNumber')); return; }

    setLocalLoading(true);
    dispatch(setLoading(true));

    try {
      const response = await api.register(formData.email, formData.password, formData.firstName, formData.lastName);
      if (response.error) { console.log('API error, using offline mode'); }
      const user = createUserFromForm();
      dispatch(loginSuccess(user));
      navigate('/');
    } catch (err) {
      console.log('Network error, using offline mode');
      const user = createUserFromForm();
      dispatch(loginSuccess(user));
      navigate('/');
    } finally {
      setLocalLoading(false);
      dispatch(setLoading(false));
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo & Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-[var(--primary)] rounded-[var(--radius-xl)] flex items-center justify-center mx-auto shadow-lg">
            <span className="text-4xl">💊</span>
          </div>
          <h1 className="text-3xl font-semibold mt-6 text-[var(--text-primary)]">
            MedCare
          </h1>
          <p className="text-[var(--text-secondary)] mt-2">{t('createAccount')}</p>
        </div>

        {/* Register Card */}
        <div className="card-elevated p-8">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">{isZh ? '创建账户' : 'Get Started'}</h2>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-[rgba(255,59,48,0.1)] text-[var(--danger)] px-4 py-3 rounded-[var(--radius-md)] text-sm font-medium flex items-center gap-2">
                <span>⚠️</span> {error}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('firstName')} *</label>
                <input type="text" name="firstName" value={formData.firstName} onChange={handleChange}
                  className="input" placeholder={isZh ? '名' : 'John'} />
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('lastName')}</label>
                <input type="text" name="lastName" value={formData.lastName} onChange={handleChange}
                  className="input" placeholder={isZh ? '姓' : 'Doe'} />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('email')} *</label>
              <input type="email" name="email" value={formData.email} onChange={handleChange}
                className="input" placeholder="you@example.com" />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('password')} *</label>
              <input type="password" name="password" value={formData.password} onChange={handleChange}
                className="input" placeholder="••••••••" />
              <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
                {isZh ? '至少8位，包含大写字母和数字' : 'Min 8 chars, 1 uppercase, 1 number'}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">{t('confirmPassword')} *</label>
              <input type="password" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange}
                className="input" placeholder="••••••••" />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-4 mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {isZh ? '创建中...' : 'Creating...'}
                </span>
              ) : t('createAccount')}
            </button>
          </form>

          {/* Login Link */}
          <div className="mt-8 pt-6 border-t border-[var(--divider)] text-center">
            <p className="text-[var(--text-secondary)]">
              {t('haveAccount')}{' '}
              <Link to="/login" className="text-[var(--primary)] font-semibold hover:underline">
                {t('login')}
              </Link>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-[var(--text-tertiary)] text-sm mt-8">
          {isZh ? '安全 · 私密 · 可靠' : 'Secure · Private · Reliable'}
        </p>
      </div>
    </div>
  );
}
