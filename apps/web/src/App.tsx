import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './store';
import { Navbar } from './components/layout/Navbar';
import { HomePage } from './pages/HomePage';
import { MedicationsPage } from './pages/MedicationsPage';
import { AdherencePage } from './pages/AdherencePage';
import { SettingsPage } from './pages/SettingsPage';
import { CaregiverPage } from './pages/CaregiverPage';

function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <main className="py-6">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/medications" element={<MedicationsPage />} />
              <Route path="/adherence" element={<AdherencePage />} />
              <Route path="/caregiver" element={<CaregiverPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </Provider>
  );
}

export default App;
