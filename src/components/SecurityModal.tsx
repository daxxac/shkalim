
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Shield, AlertTriangle, KeyRound, LogIn } from 'lucide-react'; // Added KeyRound, LogIn
import { Button } from './ui/button';
import { useFinanceStore } from '../store/financeStore'; // Import the store

interface SecurityModalProps {
  mode: 'set' | 'unlock'; // 'set' for initial password, 'unlock' for unlocking
  onClose: () => void;
  onSuccess?: () => void; // Optional: callback on successful operation
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ mode, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { setMasterPassword, unlock } = useFinanceStore.getState(); // Get actions from store

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // Only used in 'set' mode
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form on mode change
  useEffect(() => {
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setShowPassword(false);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    if (password.length < 8) {
      setError(t('security.passwordMinLength'));
      setIsLoading(false);
      return;
    }

    if (mode === 'set') {
      if (password !== confirmPassword) {
        setError(t('security.passwordMismatch'));
        setIsLoading(false);
        return;
      }
      try {
        await setMasterPassword(password);
        onSuccess?.();
        onClose();
      } catch (err) {
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(t('security.unknownError'));
        }
      }
    } else if (mode === 'unlock') {
      try {
        await unlock(password);
        onSuccess?.();
        onClose();
      } catch (err) {
         if (err instanceof Error) {
          setError(err.message); // Error from unlock (e.g., "Invalid password")
        } else {
          setError(t('security.unlockError'));
        }
      }
    }
    setIsLoading(false);
  };

  const title = mode === 'set' ? t('security.title') : t('security.unlockTitle');
  const submitButtonText = mode === 'set' ? t('security.setPassword') : t('security.unlockButton');
  const Icon = mode === 'set' ? Shield : LogIn;


  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full border">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Icon className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            disabled={isLoading}
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {mode === 'set' && (
            <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="text-sm text-blue-800 dark:text-blue-200">
                  <p className="font-medium mb-1">{t('security.dataProtection')}</p>
                  <p>{t('security.encryptionInfo')}</p>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400" />
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div> {/* Закрываем div для flex items-center */}
            </div>
          )}

          {/* Этот блок был ошибочным, удаляем его. Следующий div для пароля корректен. */}
          {/* <div>
            </div>
          )} */}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {mode === 'set' ? t('security.newPassword') : t('security.passwordLabel')}
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('security.passwordPlaceholder')}
                className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                required
                minLength={8}
                disabled={isLoading}
              />
              <span className="absolute inset-y-0 right-0 pr-3 flex items-center">
                <KeyRound className="h-5 w-5 text-gray-400" />
              </span>
            </div>
          </div>

          {mode === 'set' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">
                {t('security.confirmPassword')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder={t('security.confirmPasswordPlaceholder')}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
                  required
                  disabled={isLoading}
                />
                <span className="absolute inset-y-0 right-0 pr-3 flex items-center">
                  <KeyRound className="h-5 w-5 text-gray-400" />
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showPassword"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="ml-2 h-4 w-4 text-primary border-gray-300 rounded focus:ring-primary"
              disabled={isLoading}
            />
            <label htmlFor="showPassword" className="ml-2 block text-sm text-muted-foreground">
              {t('security.showPassword')}
            </label>
          </div>

          {mode === 'set' && (
            <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium mb-1">{t('security.importantRemember')}</p>
                  <p>{t('security.noRecovery')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Удаляем этот лишний блок div, который был здесь */}
          {/* <div className="flex gap-3 pt-4">
            </div>
          </div> */}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={isLoading}
            >
              {t('security.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isLoading || !password || (mode === 'set' && !confirmPassword) || password.length < 8}
            >
              {isLoading ? t('security.processing') : submitButtonText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
