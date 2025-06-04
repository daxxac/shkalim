
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { useTheme } from '../hooks/useTheme';
import { useIsMobile } from '../hooks/use-mobile';
import { Button } from './ui/button';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeToggle';
import { 
  BarChart3,
  Upload,
  Settings,
  Calendar,
  LogIn as LogInIcon,
  Lock,
  Menu,
  X,
  Info
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from './ui/drawer';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';

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
  const { theme } = useTheme();
  const isMobile = useIsMobile();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleAuthAction = async () => {
    if (isSupabaseAuthenticated) {
      lockData();
      await handleSupabaseLogout();
    } else {
      await handleSupabaseLogout();
    }
  };

  const navigationItems = [
    {
      value: 'dashboard',
      label: t('navigation.dashboard'),
      icon: BarChart3,
    },
    {
      value: 'upload',
      label: t('navigation.upload'),
      icon: Upload,
    },
    {
      value: 'upcomingCharges',
      label: t('navigation.upcomingCharges'),
      icon: Calendar,
    },
    {
      value: 'about',
      label: t('navigation.about'),
      icon: Info,
    },
    {
      value: 'settings',
      label: t('navigation.settings'),
      icon: Settings,
    },
  ];

  const MobileNavigation = () => (
    <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
      <DrawerTrigger asChild>
        <Button variant="ghost" size="sm" className="md:hidden">
          <Menu className="h-5 w-5" />
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle className="flex items-center justify-between">
            <span>{t('navigation.menu', 'Menu')}</span>
            <DrawerClose asChild>
              <Button variant="ghost" size="sm">
                <X className="h-4 w-4" />
              </Button>
            </DrawerClose>
          </DrawerTitle>
        </DrawerHeader>
        <div className="px-4 pb-6">
          <div className="grid gap-3">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <Button
                  key={item.value}
                  variant={activeTab === item.value ? "default" : "ghost"}
                  className="justify-start gap-3 h-12"
                  onClick={() => {
                    onTabChange(item.value);
                    setIsDrawerOpen(false);
                  }}
                >
                  <IconComponent className="h-5 w-5" />
                  {item.label}
                </Button>
              );
            })}
          </div>
          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium">{t('navigation.settings', 'Settings')}</span>
            </div>
            <div className="flex gap-2 mb-4">
              <ThemeToggle />
              <LanguageSwitcher />
            </div>
            <Button
              variant="outline"
              className="w-full premium-button"
              onClick={handleAuthAction}
            >
              {isSupabaseAuthenticated ? <Lock className="h-4 w-4 mr-2" /> : <LogInIcon className="h-4 w-4 mr-2" />}
              {isSupabaseAuthenticated ? t('navigation.lockSystem', 'Lock & Logout') : t('navigation.loginSignUp', 'Login / Sign Up')}
            </Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );

  const DesktopNavigation = () => (
    <Tabs value={activeTab} onValueChange={onTabChange} className="space-y-6">
      <TabsList className="grid w-full grid-cols-5 premium-card">
        {navigationItems.map((item) => {
          const IconComponent = item.icon;
          return (
            <TabsTrigger 
              key={item.value}
              value={item.value} 
              className="flex items-center gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground"
            >
              <IconComponent className="h-4 w-4" />
              {item.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
      <TabsContent value={activeTab} className="space-y-6">
        {children}
      </TabsContent>
    </Tabs>
  );

  const MobileTabs = () => (
    <div className="mb-6">
      <div className="flex justify-center">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="premium-button w-64">
              {navigationItems.find(item => item.value === activeTab)?.icon && (
                React.createElement(navigationItems.find(item => item.value === activeTab)!.icon, { className: "h-4 w-4 mr-2" })
              )}
              {navigationItems.find(item => item.value === activeTab)?.label}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent 
            align="center" 
            side="bottom" 
            className="w-64 bg-background border shadow-lg z-50"
            sideOffset={8}
          >
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              return (
                <DropdownMenuItem
                  key={item.value}
                  onClick={() => onTabChange(item.value)}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <IconComponent className="h-4 w-4" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );

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
            
            {/* Mobile Navigation */}
            {isMobile ? (
              <div className="flex items-center space-x-2">
                <ThemeToggle />
                <MobileNavigation />
              </div>
            ) : (
              /* Desktop Navigation */
              <div className="flex items-center space-x-4">
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
            )}
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {isMobile ? (
          <>
            <MobileTabs />
            <div className="space-y-6">
              {children}
            </div>
          </>
        ) : (
          <DesktopNavigation />
        )}
      </main>
      
      <footer className="w-full border-t bg-background/80 text-xs text-muted-foreground py-4 text-center mt-8">
        © {new Date().getFullYear()} Shkalim. All rights reserved.
      </footer>
    </div>
  );
};

export default DashboardLayout;
