import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { BankAccount, BankType } from '../types/banking';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { AlertTriangle, Plus, Edit, Trash2, RotateCcw } from 'lucide-react';
import { Alert, AlertDescription } from './ui/alert';
import { toast } from '../hooks/use-toast';
import { syncBankAccount } from '../services/bankSyncService';

export const AutoSyncPanel: React.FC = () => {
  const { t } = useTranslation();
  const { bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount } = useFinanceStore();
  
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState({
    bankType: '' as BankType,
    username: '',
    password: '',
    nickname: '',
    isActive: true
  });

  const resetForm = () => {
    setFormData({
      bankType: '' as BankType,
      username: '',
      password: '',
      nickname: '',
      isActive: true
    });
    setIsAddingAccount(false);
    setEditingAccount(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.bankType || !formData.username || !formData.password) {
      toast({
        title: t('auth.error'),
        description: 'Заполните все обязательные поля',
        variant: 'destructive'
      });
      return;
    }

    if (editingAccount) {
      updateBankAccount(editingAccount, {
        ...formData,
        lastSync: new Date().toISOString()
      });
      toast({
        title: 'Успешно',
        description: 'Банковский счет обновлен'
      });
    } else {
      addBankAccount(formData);
      toast({
        title: 'Успешно',
        description: 'Банковский счет добавлен'
      });
    }
    
    resetForm();
  };

  const handleEdit = (account: BankAccount) => {
    setFormData({
      bankType: account.bankType,
      username: account.username,
      password: account.password,
      nickname: account.nickname || '',
      isActive: account.isActive
    });
    setEditingAccount(account.id);
    setIsAddingAccount(true);
  };

  const handleDelete = (accountId: string) => {
    if (window.confirm('Удалить банковский счет?')) {
      deleteBankAccount(accountId);
      toast({
        title: 'Удалено',
        description: 'Банковский счет удален'
      });
    }
  };

  const handleSync = async (account: BankAccount) => {
    setSyncingAccounts(prev => new Set([...prev, account.id]));
    
    try {
      const result = await syncBankAccount(account);
      
      if (result.success) {
        updateBankAccount(account.id, {
          lastSync: new Date().toISOString()
        });
        
        toast({
          title: t('autoSync.syncSuccess'),
          description: `Получено ${result.transactionsCount} транзакций`
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: t('autoSync.syncError'),
        description: error instanceof Error ? error.message : 'Неизвестная ошибка',
        variant: 'destructive'
      });
    } finally {
      setSyncingAccounts(prev => {
        const newSet = new Set(prev);
        newSet.delete(account.id);
        return newSet;
      });
    }
  };

  const getBankName = (bankType: BankType) => {
    return t(`banks.${bankType}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('autoSync.title')}</h2>
          <p className="text-gray-600">{t('autoSync.description')}</p>
        </div>
        
        <Button onClick={() => setIsAddingAccount(true)} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          {t('autoSync.addBank')}
        </Button>
      </div>

      {/* Security Warning */}
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          <strong>{t('autoSync.warning')}</strong><br />
          {t('autoSync.warningText')}
        </AlertDescription>
      </Alert>

      {/* Add/Edit Form */}
      {isAddingAccount && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingAccount ? 'Редактировать счет' : t('autoSync.addBank')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bankType">{t('autoSync.bankName')}</Label>
                  <Select 
                    value={formData.bankType} 
                    onValueChange={(value: BankType) => setFormData(prev => ({ ...prev, bankType: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите банк" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="max">{t('banks.max')}</SelectItem>
                      <SelectItem value="discount">{t('banks.discount')}</SelectItem>
                      <SelectItem value="cal">{t('banks.cal')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="nickname">Название (опционально)</Label>
                  <Input
                    id="nickname"
                    value={formData.nickname}
                    onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                    placeholder="Мой основной счет"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="username">{t('autoSync.username')}</Label>
                  <Input
                    id="username"
                    value={formData.username}
                    onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="password">{t('autoSync.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="submit">
                  {editingAccount ? t('autoSync.save') : t('autoSync.save')}
                </Button>
                <Button type="button" variant="outline" onClick={resetForm}>
                  {t('autoSync.cancel')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Bank Accounts List */}
      <div className="grid gap-4">
        {bankAccounts.map((account) => (
          <Card key={account.id}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div>
                    <h3 className="font-medium">
                      {account.nickname || getBankName(account.bankType)}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {getBankName(account.bankType)} • {account.username}
                    </p>
                    {account.lastSync && (
                      <p className="text-xs text-gray-400">
                        {t('autoSync.lastSync')}: {new Date(account.lastSync).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Badge variant={account.isActive ? "default" : "secondary"}>
                    {account.isActive ? t('autoSync.active') : t('autoSync.inactive')}
                  </Badge>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(account)}
                    disabled={syncingAccounts.has(account.id)}
                    className="flex items-center gap-2"
                  >
                    <RotateCcw className={`h-4 w-4 ${syncingAccounts.has(account.id) ? 'animate-spin' : ''}`} />
                    {syncingAccounts.has(account.id) ? t('autoSync.syncing') : t('autoSync.syncNow')}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEdit(account)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {bankAccounts.length === 0 && !isAddingAccount && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">Банковские счета не добавлены</p>
              <Button onClick={() => setIsAddingAccount(true)}>
                {t('autoSync.addBank')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
