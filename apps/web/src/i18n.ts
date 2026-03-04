import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

i18n.use(initReactI18next).init({
  resources: {
    en: {
      translation: {
        welcome: 'Welcome',
        search: 'Search',
        homepage: 'Homepage',
      },
    },
    vi: {
      translation: {
        welcome: 'Chào mừng',
        search: 'Tìm kiếm',
        homepage: 'Trang chủ',
      },
    },
  },
  lng: 'vi',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
