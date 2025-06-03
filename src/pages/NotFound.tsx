import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from 'react-i18next'; // Added

const NotFound = () => {
  const location = useLocation();
  const { t } = useTranslation(); // Added

  useEffect(() => {
    console.error(
      t('notFound.consoleError'),
      location.pathname
    );
  }, [location.pathname, t]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">{t('notFound.title')}</h1>
        <p className="text-xl text-gray-600 mb-4">{t('notFound.message')}</p>
        <a href="/" className="text-blue-500 hover:text-blue-700 underline">
          {t('notFound.returnHomeLink')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
