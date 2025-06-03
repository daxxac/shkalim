import React from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { useTheme } from '../hooks/useTheme'; // Added import
import { Button } from './ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { 
  BarChart3,
  Upload,
  Settings,
  RotateCcw,
  Lock,
  Calendar,
  LogIn as LogInIcon // Added for login button
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface DashboardLayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  activeTab,
  onTabChange,
}) => {
  const { t } = useTranslation();
  const { lockData, handleSupabaseLogout, isSupabaseAuthenticated } = useFinanceStore();
  const { theme } = useTheme(); // Added useTheme hook

  const handleAuthAction = async () => {
    if (isSupabaseAuthenticated) {
      lockData(); // Lock local data
      await handleSupabaseLogout(); // Logout from Supabase
    } else {
      // If not authenticated, calling logout will ensure isSupabaseAuthenticated is false,
      // which should lead to the login/signup screen on Index page.
      await handleSupabaseLogout();
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
      <header className="glass-effect border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <img 
                src="logo.png"
                alt={t('alt.logo')}
                className="h-12 w-auto mr-3"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground logo">
                  SHKALIM
                </h1>
                <p className="text-xs text-muted-foreground logo-sub">
                  <img className="h-[20px] w-auto" src={theme === 'light' ? "/dark.webp" : "/light.webp"} alt={t('alt.byDaxxac')} />
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <ThemeToggle />
              <LanguageSwitcher />
              <Button
                variant="outline"
                size="sm"
                onClick={handleAuthAction}
                className="premium-button"
              >
                {isSupabaseAuthenticated ? <Lock className="h-4 w-4 mr-2" /> : <LogInIcon className="h-4 w-4 mr-2" />}
                {isSupabaseAuthenticated ? t('navigation.lockSystem', 'Lock & Logout') : t('navigation.loginSignUp', 'Login / Sign Up')}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4 premium-card">
            <TabsTrigger value="dashboard" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <BarChart3 className="h-4 w-4" />
              {t('navigation.dashboard')}
            </TabsTrigger>
            <TabsTrigger value="upload" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Upload className="h-4 w-4" />
              {t('navigation.upload')}
            </TabsTrigger>
            <TabsTrigger value="upcomingCharges" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Calendar className="h-4 w-4" />
              {t('navigation.upcomingCharges')}
            </TabsTrigger>
            {/* <TabsTrigger value="autoSync" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <RotateCcw className="h-4 w-4" />
              {t('navigation.autoSync')}
            </TabsTrigger> */}
            <TabsTrigger value="settings" className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Settings className="h-4 w-4" />
              {t('navigation.settings')}
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {children}
          </TabsContent>
        </Tabs>
      </main>
      <footer className="w-full border-t bg-background/80 text-xs text-muted-foreground py-4 text-center mt-8">
        © {new Date().getFullYear()} Shkalim. All rights reserved.
      </footer>
    </div>
  );
};

export default DashboardLayout;
