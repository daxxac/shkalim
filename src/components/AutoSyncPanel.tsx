
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useFinanceStore } from '../store/financeStore';
import { BankAccount, BankType } from '../types/banking';
import { Button } from './ui/button';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Plus, Edit, Trash2, RotateCcw, Shield } from 'lucide-react';
import { toast } from '../hooks/use-toast';
import { syncBankAccount } from '../services/bankSyncService';
import { BankConnectionForm } from './BankConnectionForm';
import { LocalSyncSetup } from './LocalSyncSetup';

export const AutoSyncPanel: React.FC = () => {
  const { t } = useTranslation();
  const { 
    bankAccounts, 
    addBankAccount, 
    updateBankAccount, 
    deleteBankAccount,
    addTransactionsFromSync
  } = useFinanceStore();
  
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [syncingAccounts, setSyncingAccounts] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<string>("accounts");
  
  const handleSubmitAccount = (data: Omit<BankAccount, 'id' | 'lastSync'>) => {
    if (editingAccount) {
      updateBankAccount(editingAccount.id, {
        ...data,
        lastSync: editingAccount.lastSync
      });
      toast({
        title: t('autoSync.success'),
        description: t('autoSync.accountUpdated')
      });
      setEditingAccount(null);
    } else {
      addBankAccount(data);
      toast({
        title: t('autoSync.success'),
        description: t('autoSync.accountAdded')
      });
    }
    
    setIsAddingAccount(false);
  };

  const handleEdit = (account: BankAccount) => {
    setEditingAccount(account);
    setIsAddingAccount(true);
  };

  const handleDelete = (accountId: string) => {
    if (window.confirm(t('autoSync.confirmDelete'))) {
      deleteBankAccount(accountId);
      toast({
        title: t('autoSync.deleted'),
        description: t('autoSync.accountDeleted')
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

        // Добавляем транзакции в store, если они есть
        if (result.transactions && result.transactions.length > 0) {
          addTransactionsFromSync(result.transactions);
        }
        
        toast({
          title: t('autoSync.syncSuccess'),
          description: t('autoSync.transactionsReceived', { count: result.transactionsCount })
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      toast({
        title: t('autoSync.syncError'),
        description: error instanceof Error ? error.message : t('autoSync.unknownError'),
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

  const resetForm = () => {
    setIsAddingAccount(false);
    setEditingAccount(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">{t('autoSync.title')}</h2>
          <p className="text-muted-foreground">{t('autoSync.description')}</p>
        </div>
        
        {!isAddingAccount && activeTab === "accounts" && (
          <Button onClick={() => setIsAddingAccount(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t('autoSync.addBank')}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:w-[400px]">
          <TabsTrigger value="accounts" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            {t('autoSync.accounts')}
          </TabsTrigger>
          <TabsTrigger value="setup" className="flex items-center gap-2">
            {t('autoSync.setup')}
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="setup" className="pt-4">
          <LocalSyncSetup />
        </TabsContent>
        
        <TabsContent value="accounts" className="pt-4 space-y-6">
          {isAddingAccount ? (
            <BankConnectionForm 
              onSubmit={handleSubmitAccount}
              onCancel={resetForm}
              editingAccount={editingAccount || undefined}
            />
          ) : (
            <>
              {/* Bank Accounts List */}
              <div className="grid gap-4">
                {bankAccounts.map((account) => (
                  <Card key={account.id}>
                    <CardContent className="pt-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div>
                            <h3 className="font-medium text-foreground">
                              {account.nickname || getBankName(account.bankType)}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {getBankName(account.bankType)} • {account.username}
                            </p>
                            {account.lastSync && (
                              <p className="text-xs text-muted-foreground">
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

              {bankAccounts.length === 0 && (
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-8">
                      <p className="text-muted-foreground mb-4">{t('autoSync.noAccounts')}</p>
                      <Button onClick={() => setIsAddingAccount(true)}>
                        {t('autoSync.addBank')}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
