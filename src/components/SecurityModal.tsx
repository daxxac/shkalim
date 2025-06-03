
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Shield, AlertTriangle } from 'lucide-react';
import { Button } from './ui/button';

interface SecurityModalProps {
  onClose: () => void;
  onPasswordSet: (password: string) => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ onClose, onPasswordSet }) => {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (password.length < 8) {
      alert(t('security.passwordMinLength'));
      return;
    }
    
    if (password !== confirmPassword) {
      alert(t('security.passwordMismatch'));
      return;
    }
    
    onPasswordSet(password);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full border">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">{t('security.title')}</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div className="text-sm text-blue-800 dark:text-blue-200">
                <p className="font-medium mb-1">{t('security.dataProtection')}</p>
                <p>{t('security.encryptionInfo')}</p>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('security.newPassword')}
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('security.passwordPlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">
              {t('security.confirmPassword')}
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder={t('security.confirmPasswordPlaceholder')}
              className="w-full px-3 py-2 border border-border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-background text-foreground"
              required
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="showPassword"
              checked={showPassword}
              onChange={(e) => setShowPassword(e.target.checked)}
              className="ml-2"
            />
            <label htmlFor="showPassword" className="text-sm text-muted-foreground">
              {t('security.showPassword')}
            </label>
          </div>

          <div className="bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">{t('security.importantRemember')}</p>
                <p>{t('security.noRecovery')}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              {t('security.cancel')}
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!password || !confirmPassword || password.length < 8}
            >
              {t('security.setPassword')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
