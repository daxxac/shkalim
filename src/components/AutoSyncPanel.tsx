
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { bankSyncService } from '../services/bankSyncService';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, Plus, Sync, Edit, Trash2 } from 'lucide-react';
import { BankAccount } from '../types/banking';
import { toast } from '../hooks/use-toast';

export const AutoSyncPanel: React.FC = () => {
  const { t } = useTranslation();
  const { bankAccounts, addBankAccount, updateBankAccount, deleteBankAccount } = useFinanceStore();
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAccount, setEditingAccount] = useState<string | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    bankType: 'sberbank' as const,
    username: '',
    password: '',
    nickname: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (editingAccount) {
      updateBankAccount(editingAccount, formData);
      setEditingAccount(null);
    } else {
      addBankAccount(formData);
      setShowAddForm(false);
    }
    
    setFormData({ bankType: 'sberbank', username: '', password: '', nickname: '' });
  };

  const handleSync = async (account: BankAccount) => {
    setSyncing(account.id);
    
    try {
      // Используем mock синхронизацию для демонстрации
      const result = await bankSyncService.mockSync(account);
      
      if (result.success) {
        updateBankAccount(account.id, { lastSync: new Date().toISOString() });
        toast({
          title: t('autoSync.syncSuccess'),
          description: `${t('upload.filesProcessed')}: ${result.transactionsCount}`,
        });
      } else {
        toast({
          title: t('autoSync.syncError'),
          description: result.error,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: t('autoSync.syncError'),
        description: 'Неожиданная ошибка',
        variant: "destructive",
      });
    } finally {
      setSyncing(null);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            {t('autoSync.title')}
            <Button onClick={() => setShowAddForm(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              {t('autoSync.addBank')}
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-yellow-800">{t('autoSync.warning')}</h4>
                <p className="text-sm text-yellow-700 mt-1">{t('autoSync.warningText')}</p>
              </div>
            </div>
          </div>

          {(showAddForm || editingAccount) && (
            <Card className="mb-6">
              <CardContent className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('autoSync.bankName')}</label>
                      <Select 
                        value={formData.bankType} 
                        onValueChange={(value: any) => setFormData({...formData, bankType: value})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sberbank">{t('banks.sberbank')}</SelectItem>
                          <SelectItem value="tinkoff">{t('banks.tinkoff')}</SelectItem>
                          <SelectItem value="alfabank">{t('banks.alfabank')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">Псевдоним (опционально)</label>
                      <Input
                        value={formData.nickname}
                        onChange={(e) => setFormData({...formData, nickname: e.target.value})}
                        placeholder="Мой основной счет"
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('autoSync.username')}</label>
                      <Input
                        value={formData.username}
                        onChange={(e) => setFormData({...formData, username: e.target.value})}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium mb-2">{t('autoSync.password')}</label>
                      <Input
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({...formData, password: e.target.value})}
                        required
                      />
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button type="submit">{t('autoSync.save')}</Button>
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => {
                        setShowAddForm(false);
                        setEditingAccount(null);
                        setFormData({ bankType: 'sberbank', username: '', password: '', nickname: '' });
                      }}
                    >
                      {t('autoSync.cancel')}
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {bankAccounts.map((account) => (
              <div key={account.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium">
                      {account.nickname || t(`banks.${account.bankType}`)}
                    </h4>
                    <Badge variant={account.isActive ? "default" : "secondary"}>
                      {account.isActive ? t('autoSync.active') : t('autoSync.inactive')}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{account.username}</p>
                  {account.lastSync && (
                    <p className="text-xs text-gray-500">
                      {t('autoSync.lastSync')}: {new Date(account.lastSync).toLocaleString()}
                    </p>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleSync(account)}
                    disabled={syncing === account.id}
                  >
                    <Sync className={`h-4 w-4 mr-1 ${syncing === account.id ? 'animate-spin' : ''}`} />
                    {syncing === account.id ? t('autoSync.syncing') : t('autoSync.syncNow')}
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingAccount(account.id);
                      setFormData({
                        bankType: account.bankType,
                        username: account.username,
                        password: account.password,
                        nickname: account.nickname || ''
                      });
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => deleteBankAccount(account.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            
            {bankAccounts.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>{t('autoSync.description')}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
