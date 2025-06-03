
import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useFinanceStore } from '../store/financeStore';
import { Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from '../hooks/use-toast';

export const UploadZone: React.FC = () => {
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
        title: "הקבצים הועלו בהצלחה",
        description: `${successCount} קבצים עובדו בהצלחה`,
      });
    }

    if (errorCount > 0) {
      toast({
        title: "שגיאה בעיבוד קבצים",
        description: `${errorCount} קבצים לא עובדו`,
        variant: "destructive",
      });
    }
  }, [addTransactions]);

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
      <h2 className="text-lg font-semibold text-gray-900 mb-4">העלאת קבצי בנק</h2>
      
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
              <p className="text-gray-600">מעבד קבצים...</p>
            </>
          ) : (
            <>
              <Upload className="h-12 w-12 text-gray-400 mx-auto" />
              <div>
                <p className="text-lg font-medium text-gray-900">
                  {isDragActive ? 'שחרר לטעינה' : 'גרור קבצים או לחץ לבחירה'}
                </p>
                <p className="text-gray-500 mt-1">
                  תומך בקבצי CSV, XLSX מבנקים: MAX, Discount, CAL
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Supported formats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        <SupportedFormat
          bank="בנק מקס"
          format="CSV, XLSX"
          icon={<FileText className="h-4 w-4" />}
        />
        <SupportedFormat
          bank="בנק דיסקונט"
          format="XLSX"
          icon={<FileText className="h-4 w-4" />}
        />
        <SupportedFormat
          bank="CAL (מזרחי)"
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
