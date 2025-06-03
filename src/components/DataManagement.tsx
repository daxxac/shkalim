
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { useFinanceStore } from '../store/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { AlertTriangle, Upload, FileText, Trash2 } from 'lucide-react';
import { toast } from '../hooks/use-toast';

export const DataManagement: React.FC = () => {
  const { t } = useTranslation();
  const { resetAllData, uploadCategoriesCSV, transactions } = useFinanceStore();
  const [uploading, setUploading] = useState(false);

  const onDropCategories = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    try {
      await uploadCategoriesCSV(acceptedFiles[0]);
      toast({
        title: t('categories.uploadSuccess'),
        description: t('categories.uploadSuccessDesc'),
      });
    } catch (error) {
      toast({
        title: t('categories.uploadError'),
        description: t('categories.uploadErrorDesc'),
        variant: "destructive",
      });
    }
    setUploading(false);
  }, [uploadCategoriesCSV, t]);

  const { getRootProps: getCategoriesRootProps, getInputProps: getCategoriesInputProps, isDragActive: isCategoriesDragActive } = useDropzone({
    onDrop: onDropCategories,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleResetData = () => {
    if (window.confirm(t('settings.confirmReset'))) {
      resetAllData();
      toast({
        title: t('settings.resetSuccess'),
        description: t('settings.resetSuccessDesc'),
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Categories Upload */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('categories.uploadTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {t('categories.uploadDescription')}
          </p>
          
          <div
            {...getCategoriesRootProps()}
            className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-all ${
              isCategoriesDragActive
                ? 'border-primary bg-primary/10'
                : 'border-border hover:border-primary/50 hover:bg-muted/50'
            } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getCategoriesInputProps()} />
            
            {uploading ? (
              <div className="space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">{t('categories.processing')}</p>
              </div>
            ) : (
              <div className="space-y-2">
                <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                <p className="text-sm font-medium">
                  {isCategoriesDragActive ? t('categories.dropHere') : t('categories.dragDrop')}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t('categories.csvFormat')}
                </p>
              </div>
            )}
          </div>

          <div className="bg-muted p-3 rounded-lg">
            <p className="text-sm font-medium mb-1">{t('categories.exampleFormat')}</p>
            <code className="text-xs bg-background p-2 rounded block">
              транзакция,категория<br/>
              "магнит","food"<br/>
              "такси","transport"
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Data Reset */}
      <Card className="premium-card border-destructive/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            {t('settings.dangerZone')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium">{t('settings.resetData')}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {t('settings.resetDescription')}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                {t('settings.currentData')}: {transactions.length.toLocaleString()} {t('transactions.transactions')}
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleResetData}
              className="ml-4"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {t('settings.reset')}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
