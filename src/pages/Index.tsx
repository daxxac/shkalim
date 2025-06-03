
import React, { useState, useEffect } from 'react';
import { useFinanceStore } from '../store/financeStore';
import { DashboardLayout } from '../components/DashboardLayout';
import { UploadZone } from '../components/UploadZone';
import { TransactionTable } from '../components/TransactionTable';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { SecurityModal } from '../components/SecurityModal';
import { Button } from '../components/ui/button';
import { Shield, AlertTriangle } from 'lucide-react';
import { toast } from '../hooks/use-toast';

const Index = () => {
  const { 
    isLocked, 
    unlock, 
    panicMode, 
    transactions, 
    isInitialized,
    initializeStore 
  } = useFinanceStore();
  
  const [showSecurity, setShowSecurity] = useState(false);
  const [masterPassword, setMasterPassword] = useState('');

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  const handleUnlock = async () => {
    try {
      await unlock(masterPassword);
      setMasterPassword('');
      toast({
        title: "ברוכים הבאים!",
        description: "המערכת נפתחה בהצלחה",
      });
    } catch (error) {
      toast({
        title: "שגיאה",
        description: "סיסמה שגויה",
        variant: "destructive",
      });
    }
  };

  const handlePanicMode = () => {
    if (window.confirm('האם אתה בטוח שברצונך למחוק את כל הנתונים? פעולה זו בלתי הפיכה!')) {
      panicMode();
      toast({
        title: "נתונים נמחקו",
        description: "כל הנתונים נמחקו מהמכשיר",
        variant: "destructive",
      });
    }
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">טוען מערכת...</p>
        </div>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-green-50">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <Shield className="mx-auto h-12 w-12 text-blue-600 mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">מנהל הכספים האישי</h1>
            <p className="text-gray-600">הזן סיסמת אב לגישה למערכת</p>
          </div>
          
          <div className="space-y-4">
            <input
              type="password"
              value={masterPassword}
              onChange={(e) => setMasterPassword(e.target.value)}
              placeholder="סיסמת אב"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-right"
              onKeyPress={(e) => e.key === 'Enter' && handleUnlock()}
            />
            
            <Button 
              onClick={handleUnlock} 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={!masterPassword}
            >
              פתח מערכת
            </Button>
            
            <div className="flex justify-between items-center pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowSecurity(true)}
                className="text-sm"
              >
                הגדרות אבטחה
              </Button>
              
              <Button
                variant="destructive"
                size="sm"
                onClick={handlePanicMode}
                className="flex items-center gap-2"
              >
                <AlertTriangle className="h-4 w-4" />
                מצב חירום
              </Button>
            </div>
          </div>
        </div>
        
        {showSecurity && (
          <SecurityModal
            onClose={() => setShowSecurity(false)}
            onPasswordSet={(password) => {
              // Handle password setting logic here
              setShowSecurity(false);
            }}
          />
        )}
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-2">סך הכל עסקאות</h3>
            <p className="text-3xl font-bold text-gray-900">{transactions.length.toLocaleString()}</p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-2">יתרה נוכחית</h3>
            <p className="text-3xl font-bold text-green-600">
              ₪{transactions
                .reduce((sum, t) => sum + t.amount, 0)
                .toLocaleString('he-IL', { minimumFractionDigits: 2 })}
            </p>
          </div>
          
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
            <h3 className="text-sm font-medium text-gray-500 mb-2">עסקאות החודש</h3>
            <p className="text-3xl font-bold text-blue-600">
              {transactions.filter(t => {
                const now = new Date();
                const transactionDate = new Date(t.date);
                return transactionDate.getMonth() === now.getMonth() && 
                       transactionDate.getFullYear() === now.getFullYear();
              }).length}
            </p>
          </div>
        </div>

        {/* Upload Zone */}
        <UploadZone />

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TransactionTable />
          </div>
          <div>
            <AnalyticsPanel />
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Index;
