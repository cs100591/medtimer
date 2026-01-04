import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/authSlice';
import type { RootState } from '../../store';
import { useTranslation } from '../../i18n/TranslationContext';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state: RootState) => state.auth);
  const { t } = useTranslation();

  const navItems = [
    { path: '/', label: t('today'), icon: '🏠' },
    { path: '/medications', label: t('medications'), icon: '💊' },
    { path: '/adherence', label: t('adherence'), icon: '📊' },
    { path: '/caregiver', label: t('caregiver'), icon: '👥' },
    { path: '/settings', label: t('settings'), icon: '⚙️' },
  ];

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <>
      {/* Desktop Header - Premium Glass Nav */}
      <nav className="hidden sm:block glass-nav sticky top-0 z-50 border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 flex items-center justify-center bg-gradient-to-tr from-primary-600 to-primary-400 rounded-xl shadow-lg shadow-primary-500/20 group-hover:shadow-primary-500/30 transition-all duration-300">
                <span className="text-xl text-white transform group-hover:scale-110 transition-transform">💊</span>
              </div>
              <div>
                <span className="font-bold text-xl text-slate-800 tracking-tight">
                  MedTimer
                </span>
                <span className="text-[10px] font-semibold text-primary-600 block leading-none tracking-wider uppercase">
                  Premium Care
                </span>
              </div>
            </Link>

            {/* Desktop Nav - Floating Pills */}
            <div className="flex items-center p-1.5 bg-slate-100/50 backdrop-blur-sm rounded-full border border-white/50 shadow-inner">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`
                      relative px-5 py-2 rounded-full text-sm font-medium transition-all duration-300
                      ${isActive
                        ? 'text-primary-700 bg-white shadow-soft-sm shadow-slate-200/50'
                        : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}
                    `}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`text-base ${isActive ? 'scale-110' : ''} transition-transform duration-200`}>{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-4">
              {user && (
                <div className="hidden md:flex items-center gap-3 pl-4 border-l border-slate-200">
                  <div className="flex flex-col items-end">
                    <span className="text-sm font-semibold text-slate-700">
                      {user.name || user.email}
                    </span>
                    <span className="text-xs text-slate-400">
                      Free Plan
                    </span>
                  </div>
                  <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center ring-2 ring-white shadow-sm">
                    <span className="text-primary-600 font-bold">
                      {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="btn-ghost p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                title={t('logout')}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header - Glass */}
      <nav className="sm:hidden glass-nav sticky top-0 z-50">
        <div className="px-4 h-16 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-primary-600 to-primary-400 rounded-xl flex items-center justify-center shadow-lg shadow-primary-500/20">
              <span className="text-lg">💊</span>
            </div>
            <span className="font-bold text-lg text-slate-800">
              MedTimer
            </span>
          </Link>

          <div className="flex items-center gap-3">
            {user && (
              <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center text-primary-600 font-bold text-sm ring-2 ring-white shadow-sm">
                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Floating Glass */}
      <nav className="sm:hidden mobile-nav pb-safe">
        <div className="flex items-center justify-around px-2 py-3">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  relative flex-1 flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300
                  ${isActive ? 'text-primary-600' : 'text-slate-400 hover:text-slate-600'}
                `}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-primary-50 rounded-2xl shadow-inner -z-10 animate-scale-in" />
                )}
                <span className={`text-2xl mb-1 ${isActive ? 'scale-110' : ''} transition-transform duration-200`}>
                  {item.icon}
                </span>
                <span className="text-[10px] font-semibold tracking-wide">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
