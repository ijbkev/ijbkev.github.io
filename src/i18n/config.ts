import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import enTranslations from './locales/en.json';
import deTranslations from './locales/de.json';

const resources = {
  en: { translation: enTranslations },
  de: { translation: deTranslations },
};

// Get language from URL or localStorage, default to 'en'
const getInitialLanguage = () => {
  const pathLang = window.location.pathname.split('/')[1];
  if (pathLang === 'en' || pathLang === 'de') {
    return pathLang;
  }
  return localStorage.getItem('i18nextLng') || 'en';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
