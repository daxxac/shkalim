import React, { useState, useEffect } from 'react'; // Removed useMemo as stats are moved
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router-dom'; // Import Outlet
import { useFinanceStore } from '../store/financeStore';
import { Input } from '../components/ui/input';
// DashboardLayout and specific page content components are removed as they are handled by routing
import { SecurityModal } from '../components/SecurityModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Button } from '../components/ui/button';
// Card, CardHeader, CardTitle, CardContent might still be used for lock screen
import { Shield, AlertTriangle, Mail, LogIn as LogInIcon, Loader2, UserPlus, CreditCard } from 'lucide-react';
import { toast } from '../hooks/use-toast';
// UpcomingCharges, UploadZone, DashboardTransactions, TransactionFilters, AnalyticsPanel, DataManagement removed

export interface DateFilter {
  start?: Date;
  end?: Date;
}

const Index = () => {
  const { t } = useTranslation();
  const {
    isDataLocked,
    unlockData,
    panicMode,
    // transactions, upcomingCharges, categories are no longer directly used here for rendering main content
    isInitialized,
    initializeStore,
    isSupabaseAuthenticated,
    handleSupabaseLogin,
    handleSupabaseSignUp,
    encryptedDataBlob,
    setDataEncryptionPassword 
  } = useFinanceStore();

  console.log('[IndexPage] Rendering - isDataLocked:', isDataLocked, 'isSupabaseAuthenticated:', isSupabaseAuthenticated, 'isInitialized:', isInitialized, 'encryptedDataBlob exists:', !!encryptedDataBlob);

  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [dataEncryptionPasswordInput, setDataEncryptionPasswordInput] = useState('');
  // activeTab, searchText, categoryFilter, dateFilter, incomeFilter, expenseFilter, dateFilterType are removed

  const [email, setEmail] = useState('');
  const [supabasePassword, setSupabasePassword] = useState('');
  const [confirmSupabasePassword, setConfirmSupabasePassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authUiMode, setAuthUiMode] = useState<'login' | 'register'>('login');
  
  const [securityModalMode, setSecurityModalMode] = useState<'set_initial_data_password' | 'unlock_data' | 'change_data_password'>('unlock_data');

  // Removed searchText, categoryFilter, dateFilter, incomeFilter, expenseFilter, dateFilterType states
  // Removed useEffect for dateFilter initialization
  // Removed stats and filteredCharges useMemo hooks

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  useEffect(() => {
    if (isSupabaseAuthenticated && isDataLocked && !encryptedDataBlob && !showSecurityModal) {
      openSecurityModal('set_initial_data_password');
    }
  }, [isSupabaseAuthenticated, isDataLocked, encryptedDataBlob, showSecurityModal]);

  const handleUnlockDataSubmit = async () => {
    if (!dataEncryptionPasswordInput) {
      toast({ title: t('auth.error', 'Error'), description: t('auth.emptyDataPassword', 'Data encryption password cannot be empty.'), variant: "destructive" });
      return;
    }
    try {
      await unlockData(dataEncryptionPasswordInput);
      setDataEncryptionPasswordInput('');
      toast({
        title: t('auth.dataUnlockedTitle', 'Data Unlocked'),
        description: t('auth.dataUnlockedSuccess', 'Your data has been successfully decrypted.'),
      });
    } catch (error) {
      toast({
        title: t('auth.error', 'Error'),
        description: error instanceof Error ? error.message : t('auth.wrongDataPassword', 'Incorrect data encryption password.'),
        variant: "destructive",
      });
    }
  };

  const handleSupabaseLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !supabasePassword) {
      setAuthError(t('auth.emptyCredentials', 'Email and password cannot be empty.'));
      return;
    }
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      await handleSupabaseLogin(email, supabasePassword);
      toast({
        title: t('auth.loginSuccessTitle', 'Login Successful'),
        description: t('auth.welcomeBack', 'Welcome back!'),
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.loginFailedError', 'Login failed. Please check your credentials.');
      setAuthError(message);
      toast({
        title: t('auth.loginErrorTitle', 'Login Failed'),
        description: message,
        variant: "destructive",
      });
    }
    setIsAuthLoading(false);
  };
  
  const handleSupabaseSignUpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (supabasePassword !== confirmSupabasePassword) {
      setAuthError(t('auth.passwordMismatch', 'Passwords do not match.'));
      return;
    }
    if (!email || !supabasePassword) {
      setAuthError(t('auth.emptyCredentials', 'Email and password cannot be empty.'));
      return;
    }
    setAuthError(null);
    setIsAuthLoading(true);
    try {
      await handleSupabaseSignUp(email, supabasePassword);
      toast({
        title: t('auth.signupSuccessTitle', 'Sign Up Successful'),
        description: t('auth.signupSuccessDescription', 'Please check your email to confirm your account if required, or try logging in.'),
      });
      setAuthUiMode('login'); 
    } catch (err) {
      const message = err instanceof Error ? err.message : t('auth.signupFailedError', 'Sign up failed. Please try again.');
      setAuthError(message);
      toast({
        title: t('auth.signupErrorTitle', 'Sign Up Failed'),
        description: message,
        variant: "destructive",
      });
    }
    setIsAuthLoading(false);
  };

  const openSecurityModal = (mode: 'set_initial_data_password' | 'unlock_data' | 'change_data_password') => {
    setSecurityModalMode(mode);
    setShowSecurityModal(true);
  };

  const handlePanicMode = async () => {
    const confirmText = t('auth.confirmDelete');
    console.log('[PANIC] confirmText:', confirmText);
    toast({
      title: t('auth.panicMode'),
      description: confirmText,
      action: (
        <div style={{ display: 'flex', gap: 8 }}>
          <Button variant="destructive" size="sm" onClick={async () => {
            await panicMode();
          }}>
            {t('common.yes', 'Да')}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { /* just close toast */ }}>
            {t('common.no', 'Нет')}
          </Button>
        </div>
      ),
      duration: 10000,
    });
  };

  if (!isInitialized) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">{t('dashboard.loading')}</p>
        </div>
      </div>
    );
  }

  // This block is removed to allow core functionality without Supabase auth first.
  // if (!isSupabaseAuthenticated) {
  //   return (
  //     <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
  //       <div className="premium-card p-8 max-w-md w-full mx-4">
  //         <div className="absolute top-4 right-4">
  //           <LanguageSwitcher />
  //         </div>
  //         <div className="text-center mb-6">
  //           {authUiMode === 'login' ?
  //             <LogInIcon className="mx-auto h-12 w-12 text-primary mb-4" /> :
  //             <UserPlus className="mx-auto h-12 w-12 text-primary mb-4" />
  //           }
  //           <h1 className="text-2xl font-bold text-foreground mb-2">SHKALIM</h1>
  //           <p className="text-xs text-muted-foreground mb-4">{t('alt.byDaxxac')}</p>
  //           <p className="text-muted-foreground">
  //             {authUiMode === 'login'
  //               ? t('auth.supabaseLoginPrompt', 'Please log in to continue')
  //               : t('auth.supabaseSignUpPrompt', 'Create an account to get started')}
  //           </p>
  //         </div>

  //         {authUiMode === 'login' ? (
  //           <form onSubmit={handleSupabaseLoginSubmit} className="space-y-4">
  //             <div>
  //               <label htmlFor="email_login" className="block text-sm font-medium text-foreground mb-1">{t('auth.emailLabel', 'Email')}</label>
  //               <div className="relative">
  //                 <Input id="email_login" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholderLogin', 'your@email.com')} required className="bg-background" disabled={isAuthLoading} />
  //                 <span className="absolute inset-y-0 right-0 pr-3 flex items-center"><Mail className="h-5 w-5 text-gray-400" /></span>
  //               </div>
  //             </div>
  //             <div>
  //               <label htmlFor="supabasePassword_login" className="block text-sm font-medium text-foreground mb-1">{t('auth.passwordLabel', 'Password')}</label>
  //               <div className="relative">
  //                 <Input id="supabasePassword_login" type="password" value={supabasePassword} onChange={(e) => setSupabasePassword(e.target.value)} placeholder={t('auth.passwordPlaceholderLogin', 'Enter your password')} required className="bg-background" disabled={isAuthLoading} />
  //                 <span className="absolute inset-y-0 right-0 pr-3 flex items-center"><CreditCard className="h-5 w-5 text-gray-400" /></span>
  //               </div>
  //             </div>
  //             {authError && <p className="text-sm text-red-500 text-center">{authError}</p>}
  //             <Button type="submit" className="w-full premium-button" disabled={isAuthLoading || !email || !supabasePassword}>
  //               {isAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  //               {t('auth.loginButton', 'Log In')}
  //             </Button>
  //             <Button variant="link" type="button" onClick={() => { setAuthUiMode('register'); setAuthError(null); setEmail(''); setSupabasePassword(''); setConfirmSupabasePassword(''); }} className="w-full">
  //               {t('auth.switchToSignUp', "Don't have an account? Sign Up")}
  //             </Button>
  //           </form>
  //         ) : ( // Registration form
  //           <form onSubmit={handleSupabaseSignUpSubmit} className="space-y-4">
  //             <div>
  //               <label htmlFor="email_signup" className="block text-sm font-medium text-foreground mb-1">{t('auth.emailLabel', 'Email')}</label>
  //               <div className="relative">
  //                 <Input id="email_signup" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t('auth.emailPlaceholderSignup', 'your@email.com')} required className="bg-background" disabled={isAuthLoading} />
  //                 <span className="absolute inset-y-0 right-0 pr-3 flex items-center"><Mail className="h-5 w-5 text-gray-400" /></span>
  //               </div>
  //             </div>
  //             <div>
  //               <label htmlFor="supabasePassword_signup" className="block text-sm font-medium text-foreground mb-1">{t('auth.passwordLabel', 'Password')}</label>
  //               <div className="relative">
  //                 <Input id="supabasePassword_signup" type="password" value={supabasePassword} onChange={(e) => setSupabasePassword(e.target.value)} placeholder={t('auth.passwordPlaceholderSignup', 'Create a password (min. 6 characters)')} required className="bg-background" disabled={isAuthLoading} minLength={6}/>
  //                 <span className="absolute inset-y-0 right-0 pr-3 flex items-center"><CreditCard className="h-5 w-5 text-gray-400" /></span>
  //               </div>
  //             </div>
  //             <div>
  //               <label htmlFor="confirmSupabasePassword_signup" className="block text-sm font-medium text-foreground mb-1">{t('auth.confirmPasswordLabel', 'Confirm Password')}</label>
  //               <div className="relative">
  //                 <Input id="confirmSupabasePassword_signup" type="password" value={confirmSupabasePassword} onChange={(e) => setConfirmSupabasePassword(e.target.value)} placeholder={t('auth.confirmPasswordPlaceholderSignup', 'Confirm your password')} required className="bg-background" disabled={isAuthLoading} minLength={6}/>
  //                 <span className="absolute inset-y-0 right-0 pr-3 flex items-center"><CreditCard className="h-5 w-5 text-gray-400" /></span>
  //               </div>
  //             </div>
  //             {authError && <p className="text-sm text-red-500 text-center">{authError}</p>}
  //             <Button type="submit" className="w-full premium-button" disabled={isAuthLoading || !email || !supabasePassword || !confirmSupabasePassword || supabasePassword !== confirmSupabasePassword}>
  //               {isAuthLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
  //               {t('auth.signUpButton', 'Sign Up')}
  //             </Button>
  //             <Button variant="link" type="button" onClick={() => { setAuthUiMode('login'); setAuthError(null); setEmail(''); setSupabasePassword(''); }} className="w-full">
  //               {t('auth.switchToLogin', 'Already have an account? Log In')}
  //             </Button>
  //           </form>
  //         )}
  //       </div>
  //     </div>
  //   );
  // }

  if (isDataLocked) {
    // This condition now implicitly means isSupabaseAuthenticated is true OR we are allowing non-Supabase users
    // to access local data encryption.
    if (isSupabaseAuthenticated && isDataLocked && !encryptedDataBlob) { 
      // This case is for a Supabase authenticated user setting up their *first* data encryption password.
      return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
              <div className="text-center premium-card p-8 max-w-md w-full mx-4">
                  <Shield className="mx-auto h-12 w-12 text-primary mb-4" />
                  <h2 className="text-xl font-semibold">{t('auth.initialDataSetupTitle', 'Initial Data Setup Required')}</h2>
                  <p className="text-muted-foreground mb-4">{t('auth.initialDataSetupPrompt', 'Please set your data encryption password to proceed.')}</p>
                  <Button onClick={() => openSecurityModal('set_initial_data_password')}>
                      {t('auth.setDataEncryptionPasswordButton', 'Set Data Encryption Password')}
                  </Button>
                  {showSecurityModal && securityModalMode === 'set_initial_data_password' && (
                    <SecurityModal
                      mode="set_initial_data_password"
                      onClose={() => {
                        setShowSecurityModal(false);
                      }}
                      onSuccess={() => {
                        setShowSecurityModal(false);
                        toast({
                          title: t('auth.dataPasswordSetTitle', 'Data Encryption Password Set'),
                          description: t('auth.dataNowSecure', 'Your data is now encrypted and secured.'),
                        });
                      }}
                    />
                  )}
              </div>
          </div>
      );
    }
     // This case is for a user (Supabase authenticated or not) who has no encrypted data yet.
     // The top-level useEffect (around line 82) will trigger the modal if they are also Supabase authenticated.
     // If they are NOT Supabase authenticated, they still need to set up a local data password.
    if (!encryptedDataBlob && !showSecurityModal) { 
        // This screen is a placeholder or a more explicit prompt if the modal isn't auto-triggered by the useEffect
        // (e.g. if Supabase auth is false, the useEffect on L82 won't trigger it).
        return ( 
             <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
                <div className="text-center premium-card p-8 max-w-md w-full mx-4">
                    <Shield className="mx-auto h-12 w-12 text-primary mb-4" />
                    <h2 className="text-xl font-semibold">{t('auth.initialDataSetupTitle', 'Initial Data Setup Required')}</h2>
                    <p className="text-muted-foreground mb-4">{t('auth.initialDataSetupPrompt', 'Please set your data encryption password to proceed.')}</p>
                     <Button onClick={() => openSecurityModal('set_initial_data_password')}>
                        {t('auth.setDataEncryptionPasswordButton', 'Set Data Encryption Password')}
                    </Button>
                    {/* The modal will be shown via the button click or the useEffect if conditions met */}
                </div>
            </div>
        );
    }


    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted/30">
        <div className="premium-card p-8 max-w-md w-full mx-4">
          <div className="absolute top-4 right-4">
            <LanguageSwitcher />
          </div>
          <div className="text-center mb-6">
            <Shield className="mx-auto h-12 w-12 text-primary mb-4" />
            <h1 className="text-2xl font-bold text-foreground mb-2">SHKALIM</h1>
            <p className="text-xs text-muted-foreground mb-4">{t('alt.byDaxxac')}</p>
            <p className="text-muted-foreground">{t('auth.enterDataPasswordPrompt', 'Enter your Data Encryption Password')}</p>
          </div>
          <div className="space-y-4">
            <Button
              onClick={() => openSecurityModal('unlock_data')}
              className="w-full premium-button"
            >
              {t('auth.unlockDataButton', 'Unlock Data')}
            </Button>
            <div className="flex justify-between items-center pt-4 border-t border-border">
               <Button
                variant="outline"
                onClick={() => openSecurityModal('change_data_password')}
                className="text-sm"
              >
                {t('auth.changeDataPassword', 'Change Data Password')}
              </Button>
              <div className="fixed bottom-8 right-8 z-[9999]">
                <Button
                  variant="destructive"
                  style={{ border: '3px solid red', zIndex: 9999 }}
                  onClick={() => { console.log('PANIC CLICK!'); handlePanicMode(); }}
                  className="flex items-center gap-2"
                >
                  <AlertTriangle className="h-4 w-4" />
                  {t('auth.panicMode')}
                </Button>
              </div>
            </div>
          </div>
        </div>
        {showSecurityModal && (securityModalMode === 'change_data_password' || securityModalMode === 'unlock_data' || securityModalMode === 'set_initial_data_password') && (
          <SecurityModal
            mode={securityModalMode}
            onClose={() => setShowSecurityModal(false)}
            onSuccess={() => {
              setShowSecurityModal(false);
              toast({
                title: t('auth.operationSuccessful', 'Operation Successful'),
              });
               if (securityModalMode === 'unlock_data') setDataEncryptionPasswordInput('');
            }}
          />
        )}
      </div>
    );
  }

  // The main content rendering (DashboardLayout and its children based on activeTab) is removed.
  // This component now only handles the initial checks and then renders Outlet for routed content.
  return <Outlet />;
};
export default Index;
