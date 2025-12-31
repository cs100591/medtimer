import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { getTranslation, Language } from './translations';

interface TranslationContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: (key: string) => string;
}

const TranslationContext = createContext<TranslationContextType>({
  lang: 'en',
  setLang: () => {},
  t: (key: string) => key,
});

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>(() => {
    const saved = localStorage.getItem('app_language');
    return (saved === 'zh' ? 'zh' : 'en') as Language;
  });

  const setLang = useCallback((newLang: Language) => {
    const validLang = newLang === 'zh' ? 'zh' : 'en';
    setLangState(validLang);
    localStorage.setItem('app_language', validLang);
    document.documentElement.lang = validLang;
    // Force re-render by dispatching a custom event
    window.dispatchEvent(new CustomEvent('languageChange', { detail: validLang }));
  }, []);

  useEffect(() => {
    // Set initial language on document
    document.documentElement.lang = lang;
    
    // Listen for storage changes from other tabs
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'app_language' && e.newValue) {
        const newLang = e.newValue === 'zh' ? 'zh' : 'en';
        setLangState(newLang as Language);
      }
    };
    
    // Listen for custom language change events
    const handleLangChange = (e: CustomEvent) => {
      setLangState(e.detail as Language);
    };
    
    window.addEventListener('storage', handleStorage);
    window.addEventListener('languageChange', handleLangChange as EventListener);
    
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('languageChange', handleLangChange as EventListener);
    };
  }, [lang]);

  const t = useCallback((key: string) => getTranslation(key, lang), [lang]);

  return (
    <TranslationContext.Provider value={{ lang, setLang, t }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
}

export { type Language };
