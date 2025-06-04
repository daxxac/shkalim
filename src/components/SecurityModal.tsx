import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Shield, AlertTriangle, KeyRound, LogIn, LockKeyhole } from 'lucide-react';
import { Button } from './ui/button';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';
import { useFinanceStore } from '../store/financeStore';

interface SecurityModalProps {
  mode: 'set_initial_data_password' | 'unlock_data' | 'change_data_password';
  onClose: () => void;
  onSuccess?: () => void;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({ mode, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const { setDataEncryptionPassword, unlockData } = useFinanceStore.getState();

  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [oldPin, setOldPin] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset form on mode change
  useEffect(() => {
    setPin('');
    setConfirmPin('');
    setOldPin('');
    setError(null);
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    // PIN length validation
    if ((mode === 'set_initial_data_password' || mode === 'change_data_password') && pin.length !== 4) {
      setError(t('security.pinMustBe4Digits', 'PIN must be exactly 4 digits'));
      setIsLoading(false);
      return;
    }

    if (mode === 'unlock_data' && pin.length !== 4) {
      setError(t('security.pinMustBe4Digits', 'PIN must be exactly 4 digits'));
      setIsLoading(false);
      return;
    }

    // Confirm PIN validation
    if ((mode === 'set_initial_data_password' || mode === 'change_data_password') && pin !== confirmPin) {
      setError(t('security.pinMismatch', 'PINs do not match'));
      setIsLoading(false);
      return;
    }
    
    // Old PIN required for changing PIN
    if (mode === 'change_data_password' && oldPin.length !== 4) {
      setError(t('security.oldPinRequired', 'Current PIN is required and must be 4 digits'));
      setIsLoading(false);
      return;
    }

    try {
      if (mode === 'set_initial_data_password') {
        await setDataEncryptionPassword(pin);
        onSuccess?.();
        onClose();
      } else if (mode === 'change_data_password') {
        await setDataEncryptionPassword(pin, oldPin);
        onSuccess?.();
        onClose();
      } else if (mode === 'unlock_data') {
        await unlockData(pin);
        onSuccess?.();
        onClose();
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t('security.unknownError'));
      }
    }
    setIsLoading(false);
  };
  
  let titleText = '';
  let submitButtonText = '';
  let PageIcon = Shield;

  if (mode === 'set_initial_data_password') {
    titleText = t('security.setPinTitle', 'Set Data Encryption PIN');
    submitButtonText = t('security.setPinButton', 'Set PIN');
    PageIcon = Shield;
  } else if (mode === 'unlock_data') {
    titleText = t('security.unlockDataTitle', 'Unlock Data');
    submitButtonText = t('security.unlockButton', 'Unlock');
    PageIcon = LogIn;
  } else if (mode === 'change_data_password') {
    titleText = t('security.changePinTitle', 'Change Data Encryption PIN');
    submitButtonText = t('security.changePinButton', 'Change PIN');
    PageIcon = LockKeyhole;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-background rounded-xl shadow-xl max-w-md w-full border">
        <div className="flex justify-between items-center p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <PageIcon className="h-6 w-6 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">{titleText}</h2>
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
          {(mode === 'set_initial_data_password' || mode === 'change_data_password') && (
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
              </div>
            </div>
          )}

          {mode === 'change_data_password' && (
            <div>
              <label htmlFor="oldPin" className="block text-sm font-medium text-foreground mb-2">
                {t('security.currentPin', 'Current PIN')}
              </label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={oldPin}
                  onChange={(value) => setOldPin(value)}
                  disabled={isLoading}
                  render={({ slots }) => (
                    <InputOTPGroup>
                      {slots.map((slot, index) => (
                        <InputOTPSlot 
                          key={index} 
                          {...slot} 
                          index={index}
                          className="h-12 w-12 text-lg"
                        >
                          {slot.char ? '•' : ''}
                        </InputOTPSlot>
                      ))}
                    </InputOTPGroup>
                  )}
                />
              </div>
            </div>
          )}

          <div>
            <label htmlFor="pin" className="block text-sm font-medium text-foreground mb-2">
              {mode === 'unlock_data'
                ? t('security.pinLabel', 'Data Encryption PIN')
                : t('security.newPin', 'New PIN')}
            </label>
            <div className="flex justify-center">
              <InputOTP
                maxLength={4}
                value={pin}
                onChange={(value) => setPin(value)}
                disabled={isLoading}
                render={({ slots }) => (
                  <InputOTPGroup>
                    {slots.map((slot, index) => (
                      <InputOTPSlot 
                        key={index} 
                        {...slot} 
                        index={index}
                        className="h-12 w-12 text-lg"
                      >
                        {slot.char ? '•' : ''}
                      </InputOTPSlot>
                    ))}
                  </InputOTPGroup>
                )}
              />
            </div>
          </div>
          
          {(mode === 'set_initial_data_password' || mode === 'change_data_password') && (
            <div>
              <label htmlFor="confirmPin" className="block text-sm font-medium text-foreground mb-2">
                {t('security.confirmPin', 'Confirm PIN')}
              </label>
              <div className="flex justify-center">
                <InputOTP
                  maxLength={4}
                  value={confirmPin}
                  onChange={(value) => setConfirmPin(value)}
                  disabled={isLoading}
                  render={({ slots }) => (
                    <InputOTPGroup>
                      {slots.map((slot, index) => (
                        <InputOTPSlot 
                          key={index} 
                          {...slot} 
                          index={index}
                          className="h-12 w-12 text-lg"
                        >
                          {slot.char ? '•' : ''}
                        </InputOTPSlot>
                      ))}
                    </InputOTPGroup>
                  )}
                />
              </div>
            </div>
          )}

          {(mode === 'set_initial_data_password' || mode === 'change_data_password') && (
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
              disabled={
                isLoading ||
                pin.length !== 4 ||
                ((mode === 'set_initial_data_password' || mode === 'change_data_password') && confirmPin.length !== 4) ||
                (mode === 'change_data_password' && oldPin.length !== 4)
              }
            >
              {isLoading ? t('security.processing', 'Processing...') : submitButtonText}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
