import React, { useState }                                                               from 'react';
import { useTranslation }                                                                from 'react-i18next';
import { Outlet, NavLink, useNavigate, useLocation }                                     from 'react-router-dom';
import { useFinanceStore }                                                               from '../store/financeStore';
import { useTheme }                                                                      from '../hooks/useTheme';
import { useIsMobile }                                                                   from '../hooks/use-mobile';
import { Button }                                                                        from './ui/button';
import { LanguageSwitcher }                                                              from './LanguageSwitcher';
import { ThemeToggle }                                                                   from './ThemeToggle';
import { BarChart3, Calendar, Lock, LogIn as LogInIcon, Menu, Settings, Upload, X }      from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger }                                      from './ui/tabs';
import { Drawer, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, } from './ui/drawer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, }     from './ui/dropdown-menu';

// No props needed for DashboardLayout as it uses Outlet
// interface DashboardLayoutProps {} // This can be removed

export const DashboardLayout: React.FC = () => { // Changed to React.FC as no specific props
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const { lockData, handleSupabaseLogout, isSupabaseAuthenticated } = useFinanceStore();
    const { theme } = useTheme();
    const isMobile = useIsMobile();
    const [ isDrawerOpen, setIsDrawerOpen ] = useState(false);

    const handleAuthAction = async () => {
        if ( isSupabaseAuthenticated ) {
            lockData();
            await handleSupabaseLogout();
        } else {
            await handleSupabaseLogout();
        }
    };

    const navigationItems = [
        {
            value: 'dashboard',
            path: '/dashboard',
            label: t('navigation.dashboard'),
            icon: BarChart3,
        },
        {
            value: 'upload',
            path: '/upload',
            label: t('navigation.upload'),
            icon: Upload,
        },
        {
            value: 'upcomingCharges',
            path: '/upcoming-charges',
            label: t('navigation.upcomingCharges'),
            icon: Calendar,
        },
        {
            value: 'settings',
            path: '/settings',
            label: t('navigation.settings'),
            icon: Settings,
        },
    ];

    const MobileNavigation = () => (
        <Drawer open={ isDrawerOpen } onOpenChange={ setIsDrawerOpen }>
            <DrawerTrigger asChild>
                <Button variant="ghost" size="sm" className="md:hidden">
                    <Menu className="h-5 w-5"/>
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader className="text-left">
                    <DrawerTitle className="flex items-center justify-between">
                        <span>{ t('navigation.menu', 'Menu') }</span>
                        <DrawerClose asChild>
                            <Button variant="ghost" size="sm">
                                <X className="h-4 w-4"/>
                            </Button>
                        </DrawerClose>
                    </DrawerTitle>
                </DrawerHeader>
                <div className="px-4 pb-6">
                    <div className="grid gap-3">
                        { navigationItems.map((item) => {
                            const IconComponent = item.icon;
                            return (
                                <NavLink
                                    key={item.value}
                                    to={item.path}
                                    onClick={() => setIsDrawerOpen(false)}
                                    className={({ isActive }) =>
                                        `flex items-center justify-start gap-3 h-12 px-3 rounded-md text-sm font-medium ${
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`
                                    }
                                >
                                    <IconComponent className="h-5 w-5" />
                                    {item.label}
                                </NavLink>
                            );
                        }) }
                    </div>
                    <div className="mt-6 pt-6 border-t">
                        <NavLink
                            to="/about"
                            onClick={() => setIsDrawerOpen(false)}
                            className={({ isActive }) =>
                                `flex items-center justify-start gap-3 h-12 px-3 rounded-md text-sm font-medium ${
                                    isActive
                                        ? 'bg-primary text-primary-foreground'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                } w-full mb-4`
                            }
                        >
                            {/* <Info className="h-5 w-5" /> TODO: Add an icon for About if desired */}
                            {t('navigation.about', 'About')}
                        </NavLink>

                        <div className="flex gap-2 mb-4">
                            <ThemeToggle/>
                            <LanguageSwitcher/>
                        </div>
                        <Button
                            variant="outline"
                            className="w-full premium-button"
                            onClick={ handleAuthAction }
                        >
                            { isSupabaseAuthenticated ? <Lock className="h-4 w-4 mr-2"/> :
                                <LogInIcon className="h-4 w-4 mr-2"/> }
                            { isSupabaseAuthenticated ? t('navigation.lockSystem', 'Lock & Logout') : t('navigation.loginSignUp', 'Login / Sign Up') }
                        </Button>
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );

    const DesktopNavigation = () => (
        <nav className="grid w-full grid-cols-4 premium-card mb-6">
            {navigationItems.map((item) => {
                const IconComponent = item.icon;
                return (
                    <NavLink
                        key={item.value}
                        to={item.path}
                        className={({ isActive }) =>
                            `flex items-center justify-center gap-2 py-3 px-4 rounded-md text-sm font-medium ${
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'hover:bg-muted hover:text-foreground'
                            }`
                        }
                    >
                        <IconComponent className="h-4 w-4" />
                        {item.label}
                    </NavLink>
                );
            })}
        </nav>
    );

    const MobileTabsDropdown = () => {
        const currentItem = navigationItems.find(item => location.pathname.startsWith(item.path));
        return (
            <div className="mb-6">
                <div className="flex justify-center">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="premium-button w-64">
                                {currentItem?.icon && React.createElement(currentItem.icon, { className: 'h-4 w-4 mr-2' })}
                                {currentItem?.label || t('navigation.selectPage', 'Select Page')}
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
                                        onClick={() => navigate(item.path)}
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
    };
    
    return (
        <div className="min-h-screen flex flex-col bg-gradient-to-br from-background via-background to-muted/30">
            <header className="glass-effect border-b sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <img
                                src="logo.png"
                                alt={ t('alt.logo') }
                                className="h-12 w-auto mr-3"
                            />
                            <div>
                                <h1 className="text-xl font-bold text-foreground logo">
                                    SHKALIM
                                </h1>
                                <p className="text-xs text-muted-foreground logo-sub">
                                    <img className="h-[20px] w-auto"
                                         src={ theme === 'light' ? '/dark.webp' : '/light.webp' }
                                         alt={ t('alt.byDaxxac') }/>
                                </p>
                            </div>
                        </div>

                        {/* Mobile Navigation */ }
                        { isMobile ? (
                            <div className="flex items-center space-x-2">
                                <ThemeToggle/>
                                <MobileNavigation/>
                            </div>
                        ) : (
                            /* Desktop Navigation */
                            <div className="flex items-center space-x-4">
                                <NavLink
                                    to="/about"
                                    className={({ isActive }) =>
                                        `px-3 py-2 rounded-md text-sm font-medium ${
                                            isActive
                                                ? 'bg-muted text-foreground'
                                                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                        }`
                                    }
                                >
                                    {t('navigation.about')}
                                </NavLink>
                                <ThemeToggle/>
                                <LanguageSwitcher/>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={ handleAuthAction }
                                    className="premium-button"
                                >
                                    { isSupabaseAuthenticated ? <Lock className="h-4 w-4 mr-2"/> :
                                        <LogInIcon className="h-4 w-4 mr-2"/> }
                                    { isSupabaseAuthenticated ? t('navigation.lockSystem', 'Lock & Logout') : t('navigation.loginSignUp', 'Login / Sign Up') }
                                </Button>
                            </div>
                        ) }
                    </div>
                </div>
            </header>

            <main className="flex-grow max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
                {isMobile ? (
                    <>
                        <MobileTabsDropdown />
                        <div className="space-y-6">
                            <Outlet /> {/* Render child routes here */}
                        </div>
                    </>
                ) : (
                    <>
                        <DesktopNavigation />
                        <Outlet /> {/* Render child routes here */}
                    </>
                )}
            </main>

            <footer className="w-full border-t bg-background/80 text-xs text-muted-foreground py-4 text-center mt-8">
                © { new Date().getFullYear() } Shkalim. All rights reserved.
            </footer>
        </div>
    );
};

export default DashboardLayout;
