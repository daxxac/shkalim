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
    importSharedData, // Use the new action
    isLocked: isStoreLocked,
    masterPasswordHash
  } = useFinanceStore.getState();

  const [temporaryPassword, setTemporaryPassword] = useState('');
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

  const handleImportData = async () => {
    if (!fetchedData) return;

    if (isStoreLocked && masterPasswordHash) {
        toast({ title: t('sharingImport.errorStoreLockedTitle'), description: t('sharingImport.errorStoreLockedDescription'), variant: 'destructive' }); // Add translations
        return;
    }

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
            <form onSubmit={handleFetchData} className="space-y-4">
              <div>
                <label htmlFor="tempPasswordImport" className="block text-sm font-medium text-foreground mb-1">
                  {t('sharingImport.temporaryPasswordLabel')} {/* Add translation */}
                </label>
                <div className="relative">
                  <Input
                    id="tempPasswordImport"
                    type="password"
                    value={temporaryPassword}
                    onChange={(e) => setTemporaryPassword(e.target.value)}
                    placeholder={t('sharingImport.temporaryPasswordPlaceholder')}
                    // {/* Add translation for placeholder via i18n key */}
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
                {t('sharingImport.fetchDataButton')} {/* Add translation */}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <p className="text-sm text-green-700 dark:text-green-300">
                    {t('sharingImport.dataReady', { // Add translation
                      transactions: fetchedData.transactions?.length || 0,
                      categories: fetchedData.categories?.length || 0,
                      charges: fetchedData.upcomingCharges?.length || 0,
                    })}
                  </p>
                </div>
              </div>
              {error && <p className="text-sm text-red-500">{error}</p>}
              <p className="text-sm text-muted-foreground">{t('sharingImport.confirmImportPrompt')}</p> {/* Add translation */}
              <Button onClick={handleImportData} disabled={isLoading} className="w-full">
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {t('sharingImport.importButton')} {/* Add translation */}
              </Button>
              <Button variant="outline" onClick={() => { setFetchedData(null); setTemporaryPassword(''); setError(null); }} className="w-full">
                {t('sharingImport.cancelButton')} {/* Add translation */}
              </Button>
            </div>
          )}
           <Button variant="link" onClick={() => navigate('/')} className="w-full text-sm">
             {t('sharingImport.backToDashboard')} {/* Add translation */}
           </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default ShareImportPage;