
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
          title: t('localSync.toast.serverRunningTitle'),
          description: t('localSync.toast.serverRunningDescription')
        });
      } else {
        setServerStatus('stopped');
      }
    } catch (error) {
      setServerStatus('stopped');
      toast({
        title: t('localSync.toast.serverNotFoundTitle'),
        description: t('localSync.toast.serverNotFoundDescription'),
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
            {t('localSync.cardTitle')}
          </CardTitle>
          <CardDescription>
            {t('localSync.cardDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Shield className="h-4 w-4" />
            <AlertDescription dangerouslySetInnerHTML={{ __html: t('localSync.securityInfoAlert') }} />
          </Alert>

          <div className="space-y-3">
            <h4 className="font-medium">{t('localSync.status.heading')}</h4>
            <div className="flex items-center gap-3">
              <Badge variant={serverStatus === 'running' ? 'default' : 'destructive'}>
                {serverStatus === 'running' && <CheckCircle className="h-3 w-3 mr-1" />}
                {serverStatus === 'stopped' && <AlertTriangle className="h-3 w-3 mr-1" />}
                {serverStatus === 'unknown' && <Server className="h-3 w-3 mr-1" />}
                {serverStatus === 'running' ? t('localSync.status.running') :
                 serverStatus === 'stopped' ? t('localSync.status.stopped') : t('localSync.status.unknown')}
              </Badge>
              
              <Button
                variant="outline"
                size="sm"
                onClick={checkServerStatus}
                disabled={isChecking}
              >
                {isChecking ? t('localSync.button.checking') : t('localSync.button.check')}
              </Button>
            </div>
          </div>

          {serverStatus !== 'running' && (
            <div className="space-y-4 p-4 bg-muted rounded-lg">
              <h4 className="font-medium">{t('localSync.setup.heading')}</h4>
              <ol className="list-decimal list-inside space-y-2 text-sm text-muted-foreground">
                <li>{t('localSync.setup.step1_download')}</li>
                <li>{t('localSync.setup.step2_extract')}</li>
                <li>{t('localSync.setup.step3_port')}</li>
                <li>{t('localSync.setup.step4_confirm')}</li>
              </ol>
              
              <Button onClick={downloadSyncServer} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                {t('localSync.setup.step1_download')}
                <ExternalLink className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {serverStatus === 'running' && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                {t('localSync.serverRunningSuccessAlert')}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
