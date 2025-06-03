
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Download, Server, Shield, AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react';
import { toast } from '../hooks/use-toast';

export const LocalSyncSetup: React.FC = () => {
  const { t } = useTranslation();
  const [serverStatus, setServerStatus] = useState<'unknown' | 'running' | 'stopped'>('unknown');
  const [isChecking, setIsChecking] = useState(false);

  const checkServerStatus = async () => {
    setIsChecking(true);
    try {
      const response = await fetch('http://localhost:3001/health');
      if (response.ok) {
        setServerStatus('running');
        toast({
          title: 'Сервер запущен',
          description: 'Локальный сервер синхронизации работает'
        });
      } else {
        setServerStatus('stopped');
      }
    } catch (error) {
      setServerStatus('stopped');
      toast({
        title: 'Сервер не найден',
        description: 'Локальный сервер синхронизации не запущен',
        variant: 'destructive'
      });
    } finally {
      setIsChecking(false);
    }
  };

  const downloadSyncServer = () => {
    // В реальном проекте здесь будет ссылка на GitHub releases
    window.open('https://github.com/your-org/shkalim-sync-server/releases', '_blank');
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-green-600" />
            Локальная синхронизация банков
          </CardTitle>
          <CardDescription>
            Безопасная синхронизация без передачи паролей на внешние серверы
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription>
              <strong>Безопасность:</strong> Все данные остаются на вашем компьютере. 
              Пароли не передаются в интернет.
            </AlertDescription>
          </Alert>

          <div className="space-y-3">
            <h4 className="font-medium">Статус локального сервера:</h4>
            <div className="flex items-center gap-3">
              <Badge variant={serverStatus === 'running' ? 'default' : 'destructive'}>
                {serverStatus === 'running' && <CheckCircle className="h-3 w-3 mr-1" />}
                {serverStatus === 'stopped' && <AlertTriangle className="h-3 w-3 mr-1" />}
                {serverStatus === 'unknown' && <Server className="h-3 w-3 mr-1" />}
                {serverStatus === 'running' ? 'Запущен' : 
                 serverStatus === 'stopped' ? 'Остановлен' : 'Неизвестно'}
              </Badge>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={checkServerStatus}
                disabled={isChecking}
              >
                {isChecking ? 'Проверка...' : 'Проверить'}
              </Button>
            </div>
          </div>

          {serverStatus !== 'running' && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">Установка локального сервера:</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>Скачайте локальный сервер синхронизации</li>
                <li>Разархивируйте и запустите файл</li>
                <li>Сервер будет работать на порту 3001</li>
                <li>Нажмите "Проверить" для подтверждения</li>
              </ol>
              
              <Button onClick={downloadSyncServer} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Скачать сервер синхронизации
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {serverStatus === 'running' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Сервер запущен! Теперь вы можете добавлять банковские счета для синхронизации.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
