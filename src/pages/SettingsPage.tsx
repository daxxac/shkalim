import React from 'react';
import { useTranslation } from 'react-i18next';
import { DataManagement } from '../components/DataManagement';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';

export const SettingsPage = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 w-full">
      <Card className="premium-card w-full">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">{t('settings.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <DataManagement />
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;