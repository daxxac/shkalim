import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useDropzone } from 'react-dropzone';
import { useFinanceStore } from '../store/financeStore';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AlertTriangle, Upload, FileText, Trash2, Share2, Copy, Check, Lock } from 'lucide-react'; // Added Lock
import { toast } from '../hooks/use-toast';
import { sharingService } from '../services/sharingService';

export const DataManagement: React.FC = () => {
  console.log('[DataManagement] rendered'); // Debug: check if component mounts
  const { t } = useTranslation();
  const { resetAllData, uploadCategoriesCSV, transactions, isSupabaseAuthenticated } = useFinanceStore(); // Added isSupabaseAuthenticated
  const [uploadingCategories, setUploadingCategories] = useState(false);

  // States for data sharing
  const [isCreatingLink, setIsCreatingLink] = useState(false);
  const [shareTemporaryPassword, setShareTemporaryPassword] = useState('');
  const [generatedShareLink, setGeneratedShareLink] = useState<string | null>(null);
  const [shareError, setShareError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);


  const onDropCategories = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    setUploadingCategories(true);
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
    setUploadingCategories(false);
  }, [uploadCategoriesCSV, t]);

  const handleCreateShareLink = async () => {
    if (!shareTemporaryPassword || shareTemporaryPassword.length < 8) {
      setShareError(t('sharing.errorPasswordMinLength')); // Add this translation key
      return;
    }
    setIsCreatingLink(true);
    setShareError(null);
    setGeneratedShareLink(null);
    try {
      const shareId = await sharingService.createShareLink(shareTemporaryPassword);
      // Предполагаем, что ваше приложение доступно по текущему window.location.origin
      // и у вас будет маршрут /share/:shareId
      const link = `${window.location.origin}/share/${shareId}`;
      setGeneratedShareLink(link);
      toast({
        title: t('sharing.linkCreatedTitle'), // Add this translation key
        description: t('sharing.linkCreatedDescription'), // Add this translation key
      });
    } catch (error) {
      console.error("Error creating share link:", error);
      if (error instanceof Error) {
        setShareError(error.message);
      } else {
        setShareError(t('sharing.errorUnknown')); // Add this translation key
      }
      toast({
        title: t('sharing.errorCreatingLink'), // Add this translation key
        description: error instanceof Error ? error.message : t('sharing.errorUnknown'),
        variant: "destructive",
      });
    }
    setIsCreatingLink(false);
  };
  
  const copyToClipboard = (text: string, type: 'link' | 'password') => {
    navigator.clipboard.writeText(text).then(() => {
      if (type === 'link') setCopiedLink(true);
      if (type === 'password') setCopiedPassword(true);
      setTimeout(() => {
        if (type === 'link') setCopiedLink(false);
        if (type === 'password') setCopiedPassword(false);
      }, 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
      toast({ title: t('sharing.copyError'), variant: 'destructive' }); // Add this translation key
    });
  };


  const { getRootProps: getCategoriesRootProps, getInputProps: getCategoriesInputProps, isDragActive: isCategoriesDragActive } = useDropzone({
    onDrop: onDropCategories,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false
  });

  const handleResetData = async () => {
    const userConfirmed = window.confirm(t('settings.confirmReset'));
    if (userConfirmed) {
      console.log('[DataManagement] User confirmed data reset. Calling resetAllData from store...');
      try {
        await resetAllData(); // This should trigger a reload if successful
        // The toast below will likely not be seen due to the immediate reload.
        // This is acceptable as the reload itself is strong feedback.
        console.log('[DataManagement] resetAllData store function call completed (reload should be in progress).');
        // toast({
        //   title: t('settings.resetSuccess'),
        //   description: t('settings.resetSuccessDesc'),
        // });
      } catch (error) {
        console.error('[DataManagement] Error during resetAllData call:', error);
        toast({
          title: t('settings.resetErrorTitle', 'Reset Failed'),
          description: error instanceof Error ? error.message : t('settings.resetErrorDesc', 'An unexpected error occurred during data reset.'),
          variant: "destructive",
        });
      }
    } else {
      console.log('[DataManagement] User cancelled data reset.');
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
            } ${uploadingCategories ? 'pointer-events-none opacity-50' : ''}`}
          >
            <input {...getCategoriesInputProps()} />
            
            {uploadingCategories ? (
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

          <p className="text-xs text-muted-foreground mt-3">
            {t('categories.privacyNote')}
          </p>

          <div className="bg-muted p-3 rounded-lg">
            {/* Example format title */}
            <p className="text-sm font-medium mb-1">{t('categories.exampleFormatTitle')}</p>
            <code className="text-xs bg-background p-2 rounded block">
              {t('categories.exampleFormatObj.header')}<br/>
              {t('categories.exampleFormatObj.line1', { categoryId: '"food"'})}<br/>
              {t('categories.exampleFormatObj.line2', { categoryId: '"transport"'})}
            </code>
          </div>
        </CardContent>
      </Card>

      {/* Share Data Card */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {isSupabaseAuthenticated ? <Share2 className="h-5 w-5" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
            {t('sharing.title')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isSupabaseAuthenticated ? (
            <div className="text-center p-4 border border-dashed rounded-lg bg-muted/50">
              <Lock className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-muted-foreground">
                {t('sharing.authRequiredTitle', 'Login Required')}
              </p>
              <p className="text-xs text-muted-foreground">
                {t('sharing.authRequiredDescription', 'Please log in or sign up to share your data.')}
              </p>
              {/* Optionally, add a button here to navigate to login/signup if you have a separate auth page */}
              {/* <Button size="sm" className="mt-3" onClick={() => { /* navigate to login * / }}>{t('sharing.loginButton', 'Login / Sign Up')}</Button> */}
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                {t('sharing.description')}
              </p>
              
              {!generatedShareLink ? (
                <>
                  <div>
                    <label htmlFor="tempPasswordShare" className="block text-sm font-medium mb-1">
                      {t('sharing.temporaryPasswordLabel')}
                    </label>
                    <Input
                      id="tempPasswordShare"
                      type="password"
                      value={shareTemporaryPassword}
                      onChange={(e) => {
                        setShareTemporaryPassword(e.target.value);
                        if (shareError) setShareError(null); // Clear error on input change
                      }}
                      placeholder={t('sharing.temporaryPasswordPlaceholder')}
                      minLength={8}
                      disabled={isCreatingLink}
                      className="bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">{t('sharing.temporaryPasswordHint')}</p>
                  </div>

                  {shareError && (
                    <p className="text-sm text-red-600 dark:text-red-400">{shareError}</p>
                  )}

                  <Button
                    onClick={handleCreateShareLink}
                    disabled={isCreatingLink || !shareTemporaryPassword || shareTemporaryPassword.length < 8}
                    className="w-full"
                  >
                    {isCreatingLink ? t('sharing.creatingLink') : t('sharing.createLinkButton')}
                  </Button>
                </>
              ) : (
                <div className="space-y-3 p-4 border border-dashed rounded-lg bg-muted/50">
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">{t('sharing.linkReady')}</p>
                  
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{t('sharing.shareThisLink')}</label>
                    <div className="flex items-center gap-2">
                      <Input type="text" value={generatedShareLink} readOnly className="bg-background" />
                      <Button variant="outline" size="icon" onClick={() => copyToClipboard(generatedShareLink, 'link')} aria-label={t('sharing.copyLinkAriaLabel', { link: generatedShareLink })}>
                        {copiedLink ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-muted-foreground mb-1">{t('sharing.shareThisPassword')}</label>
                    <div className="flex items-center gap-2">
                      <Input type="text" value={shareTemporaryPassword} readOnly className="bg-background" />
                       <Button variant="outline" size="icon" onClick={() => copyToClipboard(shareTemporaryPassword, 'password')} aria-label={t('sharing.copyPasswordAriaLabel')}>
                        {copiedPassword ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <p className="text-xs text-muted-foreground">{t('sharing.linkExpires')}</p>
                  
                  <Button variant="outline" onClick={() => {
                    setGeneratedShareLink(null);
                    setShareTemporaryPassword('');
                    setCopiedLink(false);
                    setCopiedPassword(false);
                    setShareError(null);
                  }} className="w-full mt-2">
                    {t('sharing.createAnotherLink')}
                  </Button>
                </div>
              )}
            </>
          )}
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
              onClick={() => { console.log('CLICK!'); handleResetData(); }}
              className="ml-4"
              style={{ pointerEvents: 'auto', opacity: 1, zIndex: 9999, border: '2px solid red' }} // Debug styles
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
