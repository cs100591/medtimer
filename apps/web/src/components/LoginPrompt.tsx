import { useState } from 'react';
import { useDispatch } from 'react-redux';
import { useTranslation } from '../i18n/TranslationContext';
import { setUser } from '../store/authSlice';

interface LoginPromptProps {
  title: string;
  description: string;
}

export function LoginPrompt({ title, description }: LoginPromptProps) {
  const { lang } = useTranslation();
  const isZh = lang === 'zh';
  const dispatch = useDispatch();
  
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes('@')) {
      alert(isZh ? '请输入有效邮箱' : 'Please enter a valid email');
      return;
    }
    if (!password || password.length < 6) {
      alert(isZh ? '密码至少6位' : 'Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      // Create user (offline mode - always succeeds)
      const user = {
        id: `user-${Date.now()}`,
        email,
        name: firstName ? `${firstName} ${lastName || ''}`.trim() : email.split('@')[0],
        language: 'en',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
        preferences: {
          voiceEnabled: false,
          highContrast: false,
          fontSize: 'normal' as const,
          notificationsEnabled: true,
        },
        createdAt: new Date().toISOString(),
      };
      
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('user_token', `token_${Date.now()}`);
      localStorage.setItem('is_anonymous_user', 'false');
      
      dispatch(setUser(user));
      setShowAuthModal(false);
    } catch (error) {
      alert(isZh ? '操作失败，请重试' : 'Failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh] p-4">
      <div className="card-elevated w-full max-w-md p-8 text-center">
        {/* Lock Icon */}
        <div className="w-20 h-20 bg-[rgba(0,122,255,0.12)] rounded-full flex items-center justify-center mx-auto mb-5">
          <span className="text-4xl">🔐</span>
        </div>

        {/* Title */}
        <h2 className="text-xl font-bold text-[var(--text-primary)] mb-3">{title}</h2>

        {/* Description */}
        <p className="text-[var(--text-secondary)] mb-6 leading-relaxed">{description}</p>

        {/* Login Button */}
        <button
          onClick={() => { setIsLogin(true); setShowAuthModal(true); }}
          className="btn-primary w-full py-3 mb-3"
        >
          {isZh ? '登录' : 'Login'}
        </button>

        {/* Sign Up Button */}
        <button
          onClick={() => { setIsLogin(false); setShowAuthModal(true); }}
          className="btn-secondary w-full py-3"
        >
          {isZh ? '注册' : 'Sign Up'}
        </button>
      </div>

      {/* Auth Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="card-elevated w-full max-w-md p-6">
            <form onSubmit={handleSubmit}>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--text-primary)]">
                  {isLogin ? (isZh ? '登录' : 'Login') : (isZh ? '注册' : 'Sign Up')}
                </h2>
                <button
                  type="button"
                  onClick={() => setShowAuthModal(false)}
                  className="btn-ghost"
                >
                  ✕
                </button>
              </div>

              {/* Name fields (signup only) */}
              {!isLogin && (
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      {isZh ? '名' : 'First Name'}
                    </label>
                    <input
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className="input"
                      placeholder={isZh ? '名' : 'First'}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                      {isZh ? '姓' : 'Last Name'}
                    </label>
                    <input
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className="input"
                      placeholder={isZh ? '姓' : 'Last'}
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  {isZh ? '邮箱' : 'Email'}
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="email@example.com"
                  required
                />
              </div>

              {/* Password */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-[var(--text-primary)] mb-1">
                  {isZh ? '密码' : 'Password'}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary w-full py-3"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    {isZh ? '处理中...' : 'Processing...'}
                  </span>
                ) : (
                  isLogin ? (isZh ? '登录' : 'Login') : (isZh ? '创建账户' : 'Create Account')
                )}
              </button>

              {/* Toggle */}
              <p className="text-center text-sm text-[var(--text-secondary)] mt-4">
                {isLogin ? (isZh ? '没有账户？' : "Don't have an account?") : (isZh ? '已有账户？' : 'Already have an account?')}
                <button
                  type="button"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-[var(--primary)] font-medium ml-1"
                >
                  {isLogin ? (isZh ? '注册' : 'Sign Up') : (isZh ? '登录' : 'Login')}
                </button>
              </p>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
