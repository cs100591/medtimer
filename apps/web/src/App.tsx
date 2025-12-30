import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Provider, useSelector } from 'react-redux';
import { store, RootState } from './store';
import { Navbar } from './components/layout/Navbar';
import { HomePage } from './pages/HomePage';
import { MedicationsPage } from './pages/MedicationsPage';
import { AdherencePage } from './pages/AdherencePage';
import { SettingsPage } from './pages/SettingsPage';
import { CaregiverPage } from './pages/CaregiverPage';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return <>{children}</>;
}

function AuthRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  return (
    <div className="min-h-screen bg-gray-50">
      {isAuthenticated && <Navbar />}
      <main className={isAuthenticated ? "py-6" : ""}>
        <Routes>
          {/* Auth routes */}
          <Route path="/login" element={
            <AuthRoute><LoginPage /></AuthRoute>
          } />
          <Route path="/register" element={
            <AuthRoute><RegisterPage /></AuthRoute>
          } />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute><HomePage /></ProtectedRoute>
          } />
          <Route path="/medications" element={
            <ProtectedRoute><MedicationsPage /></ProtectedRoute>
          } />
          <Route path="/adherence" element={
            <ProtectedRoute><AdherencePage /></ProtectedRoute>
          } />
          <Route path="/caregiver" element={
            <ProtectedRoute><CaregiverPage /></ProtectedRoute>
          } />
          <Route path="/settings" element={
            <ProtectedRoute><SettingsPage /></ProtectedRoute>
          } />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </Provider>
  );
}

export default App;
