
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BankAccount, BankType } from '../types/banking';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Shield, Eye, EyeOff, AlertTriangle, HelpCircle } from 'lucide-react';
import { toast } from '../hooks/use-toast';

interface BankConnectionFormProps {
  onSubmit: (data: Omit<BankAccount, 'id' | 'lastSync'>) => void;
  onCancel: () => void;
  editingAccount?: BankAccount;
}

export const BankConnectionForm: React.FC<BankConnectionFormProps> = ({
  onSubmit,
  onCancel,
  editingAccount
}) => {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    bankType: editingAccount?.bankType || '' as BankType,
    username: editingAccount?.username || '',
    password: editingAccount?.password || '',
    nickname: editingAccount?.nickname || '',
    isActive: editingAccount?.isActive ?? true
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bankType || !formData.username || !formData.password) {
      toast({
        title: t('auth.error'),
        description: t('autoSync.fillFields'),
        variant: 'destructive'
      });
      return;
    }

    onSubmit(formData);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-foreground flex items-center">
          <Shield className="h-5 w-5 mr-2 text-primary" />
          {editingAccount ? t('autoSync.editAccount') : t('autoSync.addBank')}
        </CardTitle>
        <CardDescription>
          {t('autoSync.formDescription')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Alert className="mb-4">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {t('autoSync.credentialsSecurity')}
          </AlertDescription>
        </Alert>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bankType" className="flex items-center gap-2">
                {t('autoSync.bankName')}
                <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" 
                  title={t('autoSync.bankHelp')} />
              </Label>
              <Select 
                value={formData.bankType} 
                onValueChange={(value: BankType) => setFormData(prev => ({ ...prev, bankType: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t('autoSync.selectBank')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="max">{t('banks.max')}</SelectItem>
                  <SelectItem value="discount">{t('banks.discount')}</SelectItem>
                  <SelectItem value="cal">{t('banks.cal')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="nickname" className="flex items-center gap-2">
                {t('autoSync.nickname')} 
                <span className="text-xs text-muted-foreground">({t('autoSync.optional')})</span>
              </Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                placeholder={t('autoSync.nicknamePlaceholder')}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="username" className="flex items-center gap-2">
              {t('autoSync.username')}
              {formData.bankType === 'discount' && (
                <Badge variant="outline" className="text-xs font-normal">
                  {t('autoSync.idNumber')}
                </Badge>
              )}
            </Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
              required
              className="font-mono"
            />
          </div>

          <div>
            <Label htmlFor="password">
              {formData.bankType === 'discount' ? t('autoSync.password') : t('autoSync.password')}
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                className="pr-10 font-mono"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-1 h-8 w-8 p-0"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button type="submit">
              {editingAccount ? t('autoSync.save') : t('autoSync.addAccount')}
            </Button>
            <Button type="button" variant="outline" onClick={onCancel}>
              {t('autoSync.cancel')}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};
