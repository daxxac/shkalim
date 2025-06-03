import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { sharingService, ShareableData } from '../services/sharingService'; // Import ShareableData
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { toast } from '../hooks/use-toast';
import { Loader2, KeyRound, ImportIcon, ShieldCheck, AlertTriangle } from 'lucide-react';

const ShareImportPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { shareId } = useParams<{ shareId: string }>();

  const {
    importSharedData,
    isDataLocked: isStoreDataLocked,
    encryptedDataBlob,
    unlockData // Add unlockData action
  } = useFinanceStore(); // Use the hook for actions and reactive state

  const [temporaryPassword, setTemporaryPassword] = useState('');
  const [localUnlockPassword, setLocalUnlockPassword] = useState(''); // For unlocking local store
  const [showUnlockForm, setShowUnlockForm] = useState(false); // To show unlock form
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchedData, setFetchedData] = useState<ShareableData | null>(null); // Use ShareableData type

  useEffect(() => {
    if (!shareId) {
      setError(t('sharingImport.errorNoShareId')); // Add translation
      navigate('/'); // Redirect if no shareId
    }
  }, [shareId, navigate, t]);

  const handleFetchData = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareId || !temporaryPassword) {
      setError(t('sharingImport.errorMissingPassword')); // Add translation
      return;
    }
    setIsLoading(true);
    setError(null);
    setFetchedData(null);
    try {
      const data = await sharingService.getSharedData(shareId, temporaryPassword);
      setFetchedData(data);
      toast({ title: t('sharingImport.dataFetchedTitle') }); // Add translation
    } catch (err) {
      console.error("Error fetching shared data:", err);
      const errorMessage = err instanceof Error ? err.message : t('sharingImport.errorFetchingData'); // Add translation
      setError(errorMessage);
      toast({ title: t('sharingImport.errorFetchingTitle'), description: errorMessage, variant: 'destructive' }); // Add translation
    }
    setIsLoading(false);
  };

  const handleUnlockLocalStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!localUnlockPassword) {
      toast({ title: t('auth.error', 'Error'), description: t('auth.emptyDataPassword', 'Data encryption password cannot be empty.'), variant: "destructive" });
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      await unlockData(localUnlockPassword);
      setLocalUnlockPassword('');
      setShowUnlockForm(false); // Hide form on success
      toast({
        title: t('auth.dataUnlockedTitle', 'Data Unlocked'),
        description: t('auth.dataUnlockedSuccess', 'Your local data has been successfully decrypted. You can now proceed with the import.'),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.wrongDataPassword', 'Incorrect data encryption password.');
      setError(message); // Show error specific to unlock
      toast({
        title: t('auth.error', 'Error'),
        description: message,
        variant: "destructive",
      });
    }
    setIsLoading(false);
  };

  const handleImportData = async () => {
    if (!fetchedData) return;

    if (isStoreDataLocked && encryptedDataBlob) {
      // If store is locked and has data, show unlock form instead of proceeding
      setShowUnlockForm(true);
      setError(t('sharingImport.errorStoreLockedDescription', 'Please unlock your current data before importing new data.'));
      return;
    }
    // Clear any previous unlock-specific error if we are past the lock check
    if (showUnlockForm) setError(null);


    setIsLoading(true);
    setError(null);
    try {
      // Перезаписываем данные в сторе
      // Нам нужны отдельные сеттеры для transactions, categories, upcomingCharges в financeStore
      // или один общий метод для импорта, который их установит.
      // Пока предположим, что у нас есть такие сеттеры или мы их добавим.
      // Для простоты, напрямую вызовем set() из Zustand, но это не лучшая практика для внешнего использования.
      // Лучше иметь специальный action в сторе.
      // --- Используем новый экшен ---
      await importSharedData({
        transactions: fetchedData.transactions || [],
        // Если категории не пришли, можно использовать дефолтные или пустой массив.
        // financeStore.importSharedData уже обрабатывает это с defaultCategories.
        categories: fetchedData.categories || [],
        upcomingCharges: fetchedData.upcomingCharges || [],
      });
      // _updateEncryptedBlob уже вызывается внутри importSharedData
      
      toast({ title: t('sharingImport.importSuccessTitle'), description: t('sharingImport.importSuccessDescription') }); // Add translations
      navigate('/'); // Перенаправляем на главную после успешного импорта
    } catch (err) {
      console.error("Error importing data:", err);
      const errorMessage = err instanceof Error ? err.message : t('sharingImport.errorImportingData'); // Add translation
      setError(errorMessage);
      toast({ title: t('sharingImport.errorImportingTitle'), description: errorMessage, variant: 'destructive' }); // Add translation
    }
    setIsLoading(false);
  };

  if (!shareId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle /> {t('sharingImport.errorTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p>{t('sharingImport.errorNoShareId')}</p>
            <Button onClick={() => navigate('/')} className="mt-4 w-full">{t('sharingImport.goHome')}</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30 p-4">
      <Card className="w-full max-w-md premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImportIcon className="h-6 w-6 text-primary" />
            {t('sharingImport.title')} {/* Add translation */}
          </CardTitle>
          <CardDescription>{t('sharingImport.description', { shareId })}</CardDescription> {/* Add translation */}
        </CardHeader>
        <CardContent className="space-y-6">
          {!fetchedData ? (
            // Form to fetch data with temporary password
            <form onSubmit={handleFetchData} className="space-y-4">
              <div>
                <label htmlFor="tempPasswordImport" className="block text-sm font-medium text-foreground mb-1">
                  {t('sharingImport.temporaryPasswordLabel')}
                </label>
                <div className="relative">
                  <Input
                    id="tempPasswordImport"
                    type="password"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    placeholder={t('sharingImport.temporaryPasswordPlaceholder')}
                    required
                    disabled={isLoading}
                    className="bg-background"
                  />
                  <span className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <KeyRound className="h-5 w-5 text-gray-400" />
                  </span>
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <Button type="submit" disabled={isLoading || !temporaryPassword} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('sharingImport.fetchDataButton')}
              </Button>
            </form>
          ) : (
            // Data fetched, show import options or unlock form
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t('sharingImport.dataReady', {
                      transactions: fetchedData.transactions?.length || 0,
                      categories: fetchedData.categories?.length || 0,
                      charges: fetchedData.upcomingCharges?.length || 0,
                    })}
                  </p>
                </div>
              </div>

              {/* Local Store Unlock Form - Shown if store is locked and data exists */}
              {showUnlockForm ? (
                <form onSubmit={handleUnlockLocalStore} className="space-y-3 p-4 border border-dashed rounded-lg mt-4">
                  <p className="text-sm font-medium text-orange-600">{t('sharingImport.errorStoreLockedTitle', 'Local Store Locked')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('sharingImport.errorStoreLockedDescription', 'Please unlock your current data before importing new data.')}
                  </p>
                  <div>
                    <label htmlFor="localUnlockPasswordImport" className="block text-xs font-medium text-foreground mb-1">
                      {t('auth.dataPasswordPlaceholder', 'Data Encryption Password')}
                    </label>
                    <Input
                      id="localUnlockPasswordImport"
                      type="password"
                      value={localUnlockPassword}
                      onChange={(e) => {
                        setLocalUnlockPassword(e.target.value);
                        if (error) setError(null);
                      }}
                      placeholder={t('auth.dataPasswordPlaceholder', 'Data Encryption Password')}
                      required
                      disabled={isLoading}
                      className="bg-background text-xs"
                    />
                  </div>
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <Button type="submit" disabled={isLoading || !localUnlockPassword} className="w-full text-xs py-1.5 h-auto">
                    {isLoading ? <Loader2 className="mr-2 h-3 w-3 animate-spin" /> : null}
                    {t('auth.unlockDataButton', 'Unlock Data')}
                  </Button>
                </form>
              ) : (
                // Import Button and confirmation - Shown if unlock form is not needed or after successful unlock
                <>
                  {error && <p className="text-sm text-red-500">{error}</p>}
                  <p className="text-sm text-muted-foreground">{t('sharingImport.confirmImportPrompt')}</p>
                  <Button onClick={handleImportData} disabled={isLoading} className="w-full">
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    {t('sharingImport.importButton')}
                  </Button>
                </>
              )}
              
              <Button variant="outline" onClick={() => { setFetchedData(null); setTemporaryPassword(''); setError(null); setShowUnlockForm(false); setLocalUnlockPassword(''); }} className="w-full">
                {t('sharingImport.cancelButton')}
              </Button>
            </div>
          )}
          <Button variant="link" onClick={() => navigate('/')} className="w-full text-sm">
            {t('sharingImport.backToDashboard')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareImportPage;