import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

export const UploadZone: React.FC = () => {
  const { t } = useTranslation();
  const { addTransactions } = useFinanceStore();
  const [uploading, setUploading] = useState(false);
  const [selectedBankType, setSelectedBankType] = useState<string>('auto');

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of acceptedFiles) {
      try {
        await addTransactions(file, selectedBankType === 'auto' ? undefined : selectedBankType);
        successCount++;
        console.log(`Successfully processed: ${file.name}`);
      } catch (error) {
        errorCount++;
        console.error(`Error processing ${file.name}:`, error);
        toast({
          title: t('upload.error'),
          description: `${file.name}: ${error instanceof Error ? error.message : String(error)}`,
          variant: "destructive",
        });
      }
    }

    setUploading(false);

    if (successCount > 0) {
      toast({
        title: t('upload.success'),
        description: `${successCount} ${t('upload.filesProcessed')}`,
      });
    }

    if (errorCount > 0) {
      toast({
        title: t('upload.error'),
        description: `${errorCount} ${t('upload.filesNotProcessed')}`,
        variant: "destructive",
      });
    }
  }, [addTransactions, t, selectedBankType]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    multiple: true
  });

  return (
    <div className="premium-card p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">{t('upload.title')}</h2>
      
      {/* Bank Type Selection */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('upload.bankTypeLabel')}
        </label>
        <Select value={selectedBankType} onValueChange={setSelectedBankType}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder={t('upload.bankTypes.auto')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="auto">{t('upload.bankTypes.auto')}</SelectItem>
            <SelectItem value="discount-transactions">{t('upload.bankTypes.discountTransactions')}</SelectItem>
            <SelectItem value="discount-credit">{t('upload.bankTypes.discountCredit')}</SelectItem>
            <SelectItem value="max-shekel">{t('upload.bankTypes.maxShekel')}</SelectItem>
            <SelectItem value="max-foreign">{t('upload.bankTypes.maxForeign')}</SelectItem>
            <SelectItem value="cal">{t('upload.bankTypes.cal')}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-primary bg-primary/10'
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">{t('upload.processing')}</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-muted-foreground mx-auto" />
              <div>
                <p className="text-lg font-medium text-foreground">
                  {isDragActive ? t('upload.dropHere', 'Drop files here') : t('upload.dragDrop')}
                </p>
                <p className="text-muted-foreground mt-1">
                  {t('upload.supportedFormats')}
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Supported formats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <SupportedFormat
          bank={t('upload.supportedFormats.discountTransactions')}
          format="XLSX"
          icon={<FileText className="h-4 w-4" />}
        />
        <SupportedFormat
          bank={t('upload.supportedFormats.discountCredit')}
          format="XLSX"
          icon={<FileText className="h-4 w-4" />}
        />
        <SupportedFormat
          bank={t('upload.supportedFormats.maxPayments')}
          format="XLSX"
          icon={<FileText className="h-4 w-4" />}
        />
      </div>
    </div>
  );
};

interface SupportedFormatProps {
  bank: string;
  format: string;
  icon: React.ReactNode;
}

const SupportedFormat: React.FC<SupportedFormatProps> = ({ bank, format, icon }) => (
  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
    <div className="text-green-600">
      <CheckCircle className="h-4 w-4" />
    </div>
    <div className="flex-1">
      <p className="font-medium text-foreground">{bank}</p>
      <p className="text-muted-foreground text-xs">{format}</p>
    </div>
    <div className="text-muted-foreground">
      {icon}
    </div>
  </div>
);
