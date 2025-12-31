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
      {/* Desktop Header - Glass Nav */}
      <nav className="hidden sm:block glass-nav sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-[var(--primary)] rounded-xl flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow">
                <span className="text-xl">💊</span>
              </div>
              <span className="font-semibold text-xl text-[var(--text-primary)]">
                MedCare
              </span>
            </Link>
            
            {/* Desktop Nav - Segmented Control Style */}
            <div className="segmented-control">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`segmented-item ${isActive ? 'active' : ''}`}
                  >
                    <span className="mr-1.5">{item.icon}</span>
                    <span className="hidden lg:inline">{item.label}</span>
                  </Link>
                );
              })}
            </div>

            {/* User Menu */}
            <div className="flex items-center gap-3">
              {user && (
                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-[var(--surface-secondary)] rounded-full">
                  <div className="w-7 h-7 bg-[var(--primary)] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                    {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <span className="text-sm font-medium text-[var(--text-primary)] max-w-[120px] truncate">
                    {user.name || user.email}
                  </span>
                </div>
              )}
              <button
                onClick={handleLogout}
                className="btn-ghost text-[var(--danger)]"
              >
                {t('logout')}
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <nav className="sm:hidden glass-nav sticky top-0 z-50">
        <div className="px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[var(--primary)] rounded-lg flex items-center justify-center">
              <span className="text-base">💊</span>
            </div>
            <span className="font-semibold text-lg text-[var(--text-primary)]">
              MedCare
            </span>
          </Link>
          
          <div className="flex items-center gap-2">
            {user && (
              <div className="w-8 h-8 bg-[var(--primary)] rounded-full flex items-center justify-center text-white text-sm font-semibold">
                {(user.name || user.email || 'U').charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Glass Style */}
      <nav className="sm:hidden mobile-nav">
        <div className="flex items-center justify-around">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className="mobile-nav-item flex-1"
              >
                <span className={`mobile-nav-icon ${isActive ? 'scale-110' : ''} transition-transform`}>
                  {item.icon}
                </span>
                <span className={`mobile-nav-label ${isActive ? 'text-[var(--primary)]' : 'text-[var(--text-secondary)]'}`}>
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
