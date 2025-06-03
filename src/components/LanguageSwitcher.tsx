
import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { Button } from './ui/button';
import { Globe } from 'lucide-react';

export const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  const { currentLanguage, setLanguage } = useFinanceStore();

  const toggleLanguage = () => {
    const newLang = currentLanguage === 'ru' ? 'en' : 'ru';
    setLanguage(newLang);
    i18n.changeLanguage(newLang);
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleLanguage}
      className="flex items-center gap-2"
    >
      <Globe className="h-4 w-4" />
      {currentLanguage === 'ru' ? 'EN' : 'RU'}
    </Button>
  );
};
