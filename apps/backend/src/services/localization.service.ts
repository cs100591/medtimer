import { SupportedLanguage } from '../types/shared-types';
import { logger } from '../utils/logger';

export interface LocaleConfig {
  language: SupportedLanguage;
  dateFormat: string;
  timeFormat: string;
  numberFormat: { decimal: string; thousands: string };
  measurementSystem: 'metric' | 'imperial';
  isRTL: boolean;
  currencySymbol: string;
  currencyCode: string;
}

const LOCALE_CONFIGS: Record<SupportedLanguage, LocaleConfig> = {
  [SupportedLanguage.EN]: {
    language: SupportedLanguage.EN,
    dateFormat: 'MM/DD/YYYY',
    timeFormat: 'h:mm A',
    numberFormat: { decimal: '.', thousands: ',' },
    measurementSystem: 'imperial',
    isRTL: false,
    currencySymbol: '$',
    currencyCode: 'USD',
  },
  [SupportedLanguage.ES]: {
    language: SupportedLanguage.ES,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousands: '.' },
    measurementSystem: 'metric',
    isRTL: false,
    currencySymbol: '€',
    currencyCode: 'EUR',
  },
  [SupportedLanguage.ZH]: {
    language: SupportedLanguage.ZH,
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousands: ',' },
    measurementSystem: 'metric',
    isRTL: false,
    currencySymbol: '¥',
    currencyCode: 'CNY',
  },
  [SupportedLanguage.HI]: {
    language: SupportedLanguage.HI,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'h:mm A',
    numberFormat: { decimal: '.', thousands: ',' },
    measurementSystem: 'metric',
    isRTL: false,
    currencySymbol: '₹',
    currencyCode: 'INR',
  },
  [SupportedLanguage.AR]: {
    language: SupportedLanguage.AR,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousands: ',' },
    measurementSystem: 'metric',
    isRTL: true,
    currencySymbol: 'ر.س',
    currencyCode: 'SAR',
  },
  [SupportedLanguage.FR]: {
    language: SupportedLanguage.FR,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousands: ' ' },
    measurementSystem: 'metric',
    isRTL: false,
    currencySymbol: '€',
    currencyCode: 'EUR',
  },
  [SupportedLanguage.PT]: {
    language: SupportedLanguage.PT,
    dateFormat: 'DD/MM/YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousands: '.' },
    measurementSystem: 'metric',
    isRTL: false,
    currencySymbol: 'R$',
    currencyCode: 'BRL',
  },
  [SupportedLanguage.RU]: {
    language: SupportedLanguage.RU,
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousands: ' ' },
    measurementSystem: 'metric',
    isRTL: false,
    currencySymbol: '₽',
    currencyCode: 'RUB',
  },
  [SupportedLanguage.JA]: {
    language: SupportedLanguage.JA,
    dateFormat: 'YYYY-MM-DD',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: '.', thousands: ',' },
    measurementSystem: 'metric',
    isRTL: false,
    currencySymbol: '¥',
    currencyCode: 'JPY',
  },
  [SupportedLanguage.DE]: {
    language: SupportedLanguage.DE,
    dateFormat: 'DD.MM.YYYY',
    timeFormat: 'HH:mm',
    numberFormat: { decimal: ',', thousands: '.' },
    measurementSystem: 'metric',
    isRTL: false,
    currencySymbol: '€',
    currencyCode: 'EUR',
  },
};

const BASE_TRANSLATIONS: Record<string, string> = {
  'common.save': 'Save',
  'common.cancel': 'Cancel',
  'common.delete': 'Delete',
  'medication.title': 'Medications',
  'reminder.title': 'Reminders',
  'reminder.take': 'Time to take {{medication}}',
  'adherence.title': 'Adherence',
  'settings.title': 'Settings',
};

const TRANSLATIONS: Record<SupportedLanguage, Record<string, string>> = {
  [SupportedLanguage.EN]: BASE_TRANSLATIONS,
  [SupportedLanguage.ES]: { ...BASE_TRANSLATIONS, 'common.save': 'Guardar' },
  [SupportedLanguage.ZH]: { ...BASE_TRANSLATIONS, 'common.save': '保存' },
  [SupportedLanguage.HI]: { ...BASE_TRANSLATIONS },
  [SupportedLanguage.AR]: { ...BASE_TRANSLATIONS },
  [SupportedLanguage.FR]: { ...BASE_TRANSLATIONS, 'common.save': 'Sauvegarder' },
  [SupportedLanguage.PT]: { ...BASE_TRANSLATIONS, 'common.save': 'Salvar' },
  [SupportedLanguage.RU]: { ...BASE_TRANSLATIONS, 'common.save': 'Сохранить' },
  [SupportedLanguage.JA]: { ...BASE_TRANSLATIONS, 'common.save': '保存' },
  [SupportedLanguage.DE]: { ...BASE_TRANSLATIONS, 'common.save': 'Speichern' },
};

export class LocalizationService {
  private currentLanguage: SupportedLanguage = SupportedLanguage.EN;

  setLanguage(language: SupportedLanguage): void {
    this.currentLanguage = language;
    logger.info(`Language set to: ${language}`);
  }

  getLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  getLocaleConfig(language?: SupportedLanguage): LocaleConfig {
    const lang = language || this.currentLanguage;
    return LOCALE_CONFIGS[lang] || LOCALE_CONFIGS[SupportedLanguage.EN];
  }

  translate(key: string, variables?: Record<string, string>, language?: SupportedLanguage): string {
    const lang = language || this.currentLanguage;
    const translations = TRANSLATIONS[lang] || TRANSLATIONS[SupportedLanguage.EN];
    const translation = translations[key] || BASE_TRANSLATIONS[key] || key;
    return this.interpolate(translation, variables);
  }

  t(key: string, variables?: Record<string, string>, language?: SupportedLanguage): string {
    return this.translate(key, variables, language);
  }

  private interpolate(text: string, variables?: Record<string, string>): string {
    if (!variables) return text;
    let result = text;
    for (const [key, value] of Object.entries(variables)) {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value);
    }
    return result;
  }

  formatDate(date: Date, language?: SupportedLanguage): string {
    const config = this.getLocaleConfig(language);
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString();
    return config.dateFormat.replace('DD', day).replace('MM', month).replace('YYYY', year);
  }

  formatTime(date: Date, language?: SupportedLanguage): string {
    const config = this.getLocaleConfig(language);
    const d = new Date(date);
    const hours24 = d.getHours();
    const hours12 = hours24 % 12 || 12;
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours24 >= 12 ? 'PM' : 'AM';
    if (config.timeFormat.includes('A')) {
      return config.timeFormat.replace('h', hours12.toString()).replace('mm', minutes).replace('A', ampm);
    }
    return config.timeFormat.replace('HH', hours24.toString().padStart(2, '0')).replace('mm', minutes);
  }

  isRTL(language?: SupportedLanguage): boolean {
    return this.getLocaleConfig(language).isRTL;
  }

  detectLanguage(acceptLanguageHeader?: string): SupportedLanguage {
    if (!acceptLanguageHeader) return SupportedLanguage.EN;
    const lang = acceptLanguageHeader.split(',')[0].split(';')[0].trim().substring(0, 2).toLowerCase();
    const map: Record<string, SupportedLanguage> = {
      'en': SupportedLanguage.EN, 'es': SupportedLanguage.ES, 'zh': SupportedLanguage.ZH,
      'hi': SupportedLanguage.HI, 'ar': SupportedLanguage.AR, 'fr': SupportedLanguage.FR,
      'pt': SupportedLanguage.PT, 'ru': SupportedLanguage.RU, 'ja': SupportedLanguage.JA, 'de': SupportedLanguage.DE,
    };
    return map[lang] || SupportedLanguage.EN;
  }
}

export const localizationService = new LocalizationService();
