
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { Upload, FileText, CheckCircle } from 'lucide-react';
import { toast } from '../hooks/use-toast';

export const UploadZone: React.FC = () => {
  const { t } = useTranslation();
  const { addTransactions } = useFinanceStore();
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploading(true);
    let successCount = 0;
    let errorCount = 0;

    for (const file of acceptedFiles) {
      try {
        await addTransactions(file);
        successCount++;
        console.log(`Successfully processed: ${file.name}`);
      } catch (error) {
        errorCount++;
        console.error(`Error processing ${file.name}:`, error);
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
  }, [addTransactions, t]);

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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('upload.title')}</h2>
      
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          {uploading ? (
            <>
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600">{t('upload.processing')}</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? t('upload.dropHere') : t('upload.dragDrop')}
                </p>
                <p className="text-gray-500 mt-1">
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
          bank={t('banks.max')}
          format="CSV, XLSX"
          icon={<FileText className="h-4 w-4" />}
        />
        <SupportedFormat
          bank={t('banks.discount')}
          format="XLSX"
          icon={<FileText className="h-4 w-4" />}
        />
        <SupportedFormat
          bank={t('banks.cal')}
          format="CSV"
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
  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
    <div className="text-green-600">
      <CheckCircle className="h-4 w-4" />
    </div>
    <div className="flex-1">
      <p className="font-medium text-gray-900">{bank}</p>
      <p className="text-gray-500 text-xs">{format}</p>
    </div>
    <div className="text-gray-400">
      {icon}
    </div>
  </div>
);
