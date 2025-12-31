import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { translations, getTranslation } from './translations';

interface TranslationContextType {
  lang: string;
  setLang: (lang: string) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
});

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState(() => localStorage.getItem('app_language') || 'en');

  const setLang = (newLang: string) => {
    setLangState(newLang);
    localStorage.setItem('app_language', newLang);
    document.documentElement.lang = newLang;
  };

  useEffect(() => {
    // Listen for storage changes from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app_language' && e.newValue) {
        setLangState(e.newValue);
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  const t = (key: string) => getTranslation(key, lang);

  return (
    <TranslationContext.Provider value={{ lang, setLang, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  return useContext(TranslationContext);
}
