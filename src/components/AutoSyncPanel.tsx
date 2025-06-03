
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent } from './ui/card';
import { AlertTriangle, Upload } from 'lucide-react';

export const AutoSyncPanel: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('autoSync.title')}</h2>
          <p className="text-muted-foreground">{t('autoSync.description')}</p>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500 mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {t('autoSync.temporarilyDisabled')}
            </h3>
            <p className="text-muted-foreground mb-4">
              {t('autoSync.manualUploadFocus')}
            </p>
            <div className="flex items-center justify-center gap-2 text-primary">
              <Upload className="h-4 w-4" />
              <span className="text-sm font-medium">
                {t('autoSync.useUploadTab')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
