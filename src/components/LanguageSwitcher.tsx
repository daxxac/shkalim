import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { Globe } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from './ui/select';

export const LanguageSwitcher: React.FC = () => {
  const { i18n, t } = useTranslation();
  const { currentLanguage, setLanguage } = useFinanceStore() as {
    currentLanguage: 'ru' | 'en' | 'he';
    setLanguage: (lang: 'ru' | 'en' | 'he') => void;
  };

  const languageLabels = {
    en: t('languageSwitcher.en'),
    ru: t('languageSwitcher.ru'),
    he: 'HE',
  };

  const languages: Array<'ru' | 'en' | 'he'> = ['ru', 'en', 'he'];

  const handleChange = (lang: 'ru' | 'en' | 'he') => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    if (lang === 'he') {
      document.documentElement.setAttribute('dir', 'rtl');
    } else {
      document.documentElement.setAttribute('dir', 'ltr');
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Globe className="h-4 w-4" />
      <Select value={currentLanguage} onValueChange={handleChange}>
        <SelectTrigger className="w-24">
          <SelectValue>{languageLabels[currentLanguage]}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {languages.map((lang) => (
            <SelectItem key={lang} value={lang}>
              {languageLabels[lang]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};
