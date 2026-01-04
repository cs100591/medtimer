import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store, RootState } from './store';
import { setUser } from './store/authSlice';
import { TranslationProvider } from './i18n/TranslationContext';
import { Navbar } from './components/layout/Navbar';
import { ProfileSetupModal } from './components/ProfileSetupModal';
import { HomePage } from './pages/HomePage';
import { MedicationsPage } from './pages/MedicationsPage';
import { AdherencePage } from './pages/AdherencePage';
import { SettingsPage } from './pages/SettingsPage';
import { CaregiverPage } from './pages/CaregiverPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check if profile setup is complete
    const profileComplete = localStorage.getItem('profile_setup_complete') === 'true';
    
    if (!profileComplete) {
      // First launch - show profile setup
      setShowProfileSetup(true);
      setIsLoading(false);
    } else if (!isAuthenticated) {
      // Profile complete but not authenticated - create anonymous user
      const userId = localStorage.getItem('user_id') || `user-${Date.now()}`;
      const user = {
        id: userId,
        email: 'guest@medtimer.local',
        name: 'Guest User',
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
      localStorage.setItem('user_id', userId);
      localStorage.setItem('is_anonymous_user', 'true');
      dispatch(setUser(user));
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [dispatch, isAuthenticated]);

  const handleProfileSetupComplete = () => {
    // Create anonymous user after profile setup
    const userId = localStorage.getItem('user_id') || `user-${Date.now()}`;
    const user = {
      id: userId,
      email: 'guest@medtimer.local',
      name: 'Guest User',
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
    dispatch(setUser(user));
    setShowProfileSetup(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center">
        <div className="animate-spin text-4xl">⏳</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--bg-primary)]">
      {showProfileSetup && (
        <ProfileSetupModal onComplete={handleProfileSetupComplete} />
      )}
      
      {!showProfileSetup && (
        <>
          <Navbar />
          <main className="content-with-nav sm:pb-8 pt-4 sm:pt-6">
            <Routes>
              {/* Auth routes (for users who want to login) */}
              <Route path="/login" element={
                <AuthRoute><LoginPage /></AuthRoute>
              } />
              <Route path="/register" element={
                <AuthRoute><RegisterPage /></AuthRoute>
              } />
              
              {/* Main routes - no longer protected */}
              <Route path="/" element={<HomePage />} />
              <Route path="/medications" element={<MedicationsPage />} />
              <Route path="/adherence" element={<AdherencePage />} />
              <Route path="/caregiver" element={<CaregiverPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              
              {/* Catch all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
        </>
      )}
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <TranslationProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TranslationProvider>
    </Provider>
  );
}

export default App;
