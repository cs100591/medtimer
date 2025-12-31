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
    { path: '/', label: t('today'), icon: '📅' },
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
    <nav className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <span className="text-2xl">💊</span>
            <span className="font-bold text-xl text-gray-900">MedReminder</span>
          </Link>
          
          <div className="flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  location.pathname === item.path
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{item.icon}</span>
                <span className="hidden sm:inline">{item.label}</span>
              </Link>
            ))}
          </div>

          <div className="flex items-center gap-4">
            {user && (
              <span className="text-sm text-gray-600 hidden md:inline">
                👤 {user.name || user.email}
              </span>
            )}
            <button
              onClick={handleLogout}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              {t('logout')}
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
