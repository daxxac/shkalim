import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { Input } from '../components/ui/input';
import { DashboardLayout } from '../components/DashboardLayout';
import { UploadZone } from '../components/UploadZone';
import { DashboardTransactions } from '../components/DashboardTransactions';
import { TransactionFilters } from '../components/TransactionFilters';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { SecurityModal } from '../components/SecurityModal';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { DataManagement } from '../components/DataManagement';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, Wallet, Calendar, DollarSign, CreditCard, Mail, LogIn as LogInIcon, Loader2, UserPlus } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { UpcomingCharges } from '../components/UpcomingCharges';

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
    transactions,
    upcomingCharges,
    isInitialized,
    initializeStore,
    categories,
    isSupabaseAuthenticated,
    handleSupabaseLogin,
    handleSupabaseSignUp,
    encryptedDataBlob,
    setDataEncryptionPassword 
  } = useFinanceStore();

  console.log('[IndexPage] Rendering - isDataLocked:', isDataLocked, 'isSupabaseAuthenticated:', isSupabaseAuthenticated, 'isInitialized:', isInitialized, 'encryptedDataBlob exists:', !!encryptedDataBlob);

  const [showSecurityModal, setShowSecurityModal] = useState(false);
  const [dataEncryptionPasswordInput, setDataEncryptionPasswordInput] = useState('');
  const [activeTab, setActiveTab] = useState('dashboard');

  const [email, setEmail] = useState('');
  const [supabasePassword, setSupabasePassword] = useState('');
  const [confirmSupabasePassword, setConfirmSupabasePassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [authUiMode, setAuthUiMode] = useState<'login' | 'register'>('login');
  
  const [securityModalMode, setSecurityModalMode] = useState<'set_initial_data_password' | 'unlock_data' | 'change_data_password'>('unlock_data');

  const [searchText, setSearchText] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [dateFilter, setDateFilter] = useState<DateFilter>({});
  const [incomeFilter, setIncomeFilter] = useState(false);
  const [expenseFilter, setExpenseFilter] = useState(false);
  const [dateFilterType, setDateFilterType] = useState<'transaction' | 'charge'>('transaction');

  useEffect(() => {
    initializeStore();
  }, [initializeStore]);

  useEffect(() => {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    setDateFilter({ start: startOfMonth, end: endOfMonth });
  }, []);

  useEffect(() => {
    if (isSupabaseAuthenticated && isDataLocked && !encryptedDataBlob && !showSecurityModal) {
      openSecurityModal('set_initial_data_password');
    }
  }, [isSupabaseAuthenticated, isDataLocked, encryptedDataBlob, showSecurityModal]);

  const stats = useMemo(() => {
    const startDate = dateFilter.start;
    const endDate = dateFilter.end;
    let transactionsForPeriodBasedOnFilterType = transactions;
    if (startDate || endDate) {
      transactionsForPeriodBasedOnFilterType = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const chargeDate = t.chargeDate ? new Date(t.chargeDate) : transactionDate;
        const filterDate = dateFilterType === 'charge' ? chargeDate : transactionDate;
        if (startDate && endDate) return filterDate >= startDate && filterDate <= endDate;
        if (startDate) return filterDate >= startDate;
        if (endDate) return filterDate <= endDate;
        return true;
      });
    }
    const incomeBasedOnFilterType = transactionsForPeriodBasedOnFilterType
      .filter(t => t.amount > 0)
      .reduce((sum, t) => sum + t.amount, 0);
    const expensesBasedOnFilterType = Math.abs(transactionsForPeriodBasedOnFilterType
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));
    let spentTransactions = transactions;
    if (startDate || endDate) {
      spentTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        if (startDate && endDate) return transactionDate >= startDate && transactionDate <= endDate;
        if (startDate) return transactionDate >= startDate;
        if (endDate) return transactionDate <= endDate;
        return true;
      });
    }
    const actuallySpentInPeriod = Math.abs(spentTransactions
      .filter(t => t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0));
    const discountBankTransactions = transactions
      .filter(t => t.bank?.toLowerCase() === 'discount')
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const currentBalance = discountBankTransactions.length > 0 ? discountBankTransactions[0].balance || 0 : 0;
    return {
      income: incomeBasedOnFilterType,
      expenses: expensesBasedOnFilterType,
      actuallySpentInPeriod,
      currentBalance
    };
  }, [transactions, dateFilter, dateFilterType]);

  const filteredCharges = useMemo(() => {
    let filtered = upcomingCharges;
    if (searchText) {
      filtered = filtered.filter(t =>
        t.description.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    if (categoryFilter && categoryFilter !== 'all') {
      filtered = filtered.filter(t => t.category === categoryFilter);
    }
    return filtered;
  }, [upcomingCharges, searchText, categoryFilter]);
  const scheduledToChargeInPeriod = filteredCharges.reduce((sum, charge) => sum + Math.abs(charge.amount), 0);

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
            <Input
              type="password"
              value={dataEncryptionPasswordInput}
              onChange={(e) => setDataEncryptionPasswordInput(e.target.value)}
              placeholder={t('auth.dataPasswordPlaceholder', 'Data Encryption Password')}
              className="w-full px-4 py-3 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-right bg-background text-foreground"
              onKeyPress={(e) => e.key === 'Enter' && handleUnlockDataSubmit()}
            />
            <Button
              onClick={handleUnlockDataSubmit}
              className="w-full premium-button"
              disabled={!dataEncryptionPasswordInput}
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

  // Calculate dashboard stats - only use regular transactions, not upcoming charges
  const totalBalance = transactions.reduce((sum, t) => sum + t.amount, 0);
  const currentMonth = new Date();
  const monthTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate.getMonth() === currentMonth.getMonth() &&
      transactionDate.getFullYear() === currentMonth.getFullYear();
  });

  const monthIncome = monthTransactions
    .filter(t => t.amount > 0)
    .reduce((sum, t) => sum + t.amount, 0);

  const monthExpenses = Math.abs(monthTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0));

  const currentWeek = new Date();
  const weekStart = new Date(currentWeek.setDate(currentWeek.getDate() - currentWeek.getDay()));
  const weekTransactions = transactions.filter(t => {
    const transactionDate = new Date(t.date);
    return transactionDate >= weekStart;
  });

  const weekExpenses = Math.abs(weekTransactions
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + t.amount, 0));

  return (
    <DashboardLayout activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-foreground mb-2">
              {t('dashboard.welcome')}
            </h1>
            <p className="text-lg text-muted-foreground">
              {t('dashboard.subtitle')}
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-2">{t('dashboard.stats.currentBalanceDiscount')}</div>
                <div className="text-2xl font-bold text-foreground">
                  ₪{stats.currentBalance.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-2">{t('dashboard.stats.incomeForPeriod')}</div>
                <div className="text-2xl font-bold text-green-600">
                  ₪{stats.income.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-2">{t('dashboard.stats.spentByTransactionDate')}</div>
                <div className="text-2xl font-bold text-red-600">
                  ₪{stats.actuallySpentInPeriod.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card className="premium-card">
              <CardContent className="p-6">
                <div className="text-sm text-muted-foreground mb-2">{t('dashboard.stats.chargedByChargeDate')}</div>
                <div className="text-2xl font-bold text-orange-600">
                  ₪{scheduledToChargeInPeriod.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>
          <TransactionFilters
            dateFilter={dateFilter}
            onDateFilterChange={setDateFilter}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            categoryFilter={categoryFilter}
            onCategoryFilterChange={setCategoryFilter}
            categories={categories}
            incomeFilter={incomeFilter}
            expenseFilter={expenseFilter}
            onIncomeFilterChange={setIncomeFilter}
            onExpenseFilterChange={setExpenseFilter}
            dateFilterType={dateFilterType}
            onDateFilterTypeChange={setDateFilterType}
          />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="text-xl font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {t('transactions.recentTransactions')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <DashboardTransactions
                    searchText={searchText}
                    categoryFilter={categoryFilter}
                    dateFilter={dateFilter}
                    incomeFilter={incomeFilter}
                    expenseFilter={expenseFilter}
                    dateFilterType={dateFilterType}
                  />
                </CardContent>
              </Card>
            </div>
            <div className="space-y-6">
              <AnalyticsPanel />
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{t('dashboard.quickStats')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('dashboard.weekExpenses')}</span>
                    <span className="font-semibold text-red-600">
                      ₪{weekExpenses.toLocaleString('he-IL', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">{t('dashboard.avgTransaction')}</span>
                    <span className="font-semibold">
                      ₪{transactions.length > 0 ? (totalBalance / transactions.length).toLocaleString('he-IL', { minimumFractionDigits: 2 }) : '0.00'}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upload' && (
        <div className="space-y-6">
          <UploadZone />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="premium-card">
                <CardHeader>
                  <CardTitle>{t('transactions.allTransactions')}</CardTitle>
                </CardHeader>
                <CardContent>
                  <DashboardTransactions
                    searchText={searchText}
                    categoryFilter={categoryFilter}
                    dateFilter={dateFilter}
                    incomeFilter={incomeFilter}
                    expenseFilter={expenseFilter}
                    dateFilterType={dateFilterType}
                  />
                </CardContent>
              </Card>
            </div>
            <div>
              <AnalyticsPanel />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'upcomingCharges' && (
        <UpcomingCharges />
      )}

      {activeTab === 'settings' && (
        <div className="space-y-6 w-full"> {/* Ensure this div also takes full width */}
          <Card className="premium-card w-full"> {/* Make the card take full width */}
            <CardHeader>
              <CardTitle className="text-2xl font-bold">{t('settings.title')}</CardTitle>
            </CardHeader>
            <CardContent>
              <DataManagement />
            </CardContent>
          </Card>
        </div>
      )}

      {activeTab === 'autoSync' && (
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">
            {t('autoSync.title')}
          </h2>
          <p className="text-muted-foreground">
            {t('autoSync.description')}
          </p>
        </div>
      )}
    </DashboardLayout>
  );
};
export default Index;
