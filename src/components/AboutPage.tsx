
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client'; // Import Supabase client
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Mail, Heart, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const AboutPage = () => {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data, error } = await supabase.functions.invoke('send-telegram-message', {
        body: { name: formData.name, email: formData.email, message: formData.message },
      })

      if (error) {
        console.error('Error invoking Supabase function:', error)
        toast.error(t('about.contactForm.error') + ` (Server: ${error.message || 'Function error'})`);
      } else if (data && data.error) { // Handle errors returned in the function's JSON response
        console.error('Supabase function returned an error:', data.error)
        toast.error(t('about.contactForm.error') + ` (Server: ${data.error})`);
      }
      else {
        toast.success(t('about.contactForm.success'));
        setFormData({ name: '', email: '', message: '' });
      }
    } catch (error) {
      console.error('Failed to invoke Supabase function:', error);
      toast.error(t('about.contactForm.error') + ` (Network or client error)`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold text-foreground">
          {t('about.title')}
        </h1>
      </div>

      {/* Developer Section */}
      <Card className="premium-card">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <Avatar className="h-20 w-20 mx-auto md:mx-0">
              <img
                src="/daria.png"
                alt="Daria"
                className="rounded-full object-cover h-20 w-20 border-2 border-primary"
              />
              <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                👩‍💻
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 space-y-4 text-center md:text-left">
              <h2 className="text-2xl font-semibold text-foreground">
                {t('about.developerTitle')}
              </h2>
              <div className="space-y-3 text-muted-foreground">
                <p>{t('about.developerDescription')}</p>
                <p className="font-medium text-foreground">
                  {t('about.privacyNote')}
                </p>
                <p>{t('about.projectNote')}</p>
                <p className="pt-2">
                  <a href="https://github.com/daxxac/shkalim" target="_blank" rel="noopener noreferrer" className="underline text-primary font-medium">Open Source on GitHub</a>
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Bank Support Section */}
      <Card className="premium-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('about.bankSupportTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            {t('about.bankSupportDescription')}
          </p>
          <ul className="space-y-2 ml-4">
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              {t('about.bankSupportRequirements.providerName')}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              {t('about.bankSupportRequirements.loginLink')}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              {t('about.bankSupportRequirements.sampleExport')}
            </li>
            <li className="flex items-start gap-2">
              <span className="text-primary">•</span>
              {t('about.bankSupportRequirements.extraNotes')}
            </li>
          </ul>
          <div className="pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-4">
              {t('about.contactInfo')}
            </p>
            <Button 
              variant="outline" 
              className="premium-button"
              onClick={() => window.open('mailto:support@shkalim.com')}
            >
              <Mail className="h-4 w-4 mr-2" />
              {t('about.suggestProvider')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Contact Form */}
      {/* (Remove the entire Contact Form Card section) */}

      {/* Footer */}
      <div className="text-center space-y-2 py-8 border-t">
        <p className="flex items-center justify-center gap-2 text-muted-foreground">
          {t('about.footer.builtWith')}
        </p>
        <p className="text-sm text-muted-foreground">
          {t('about.footer.version')}
        </p>
      </div>
    </div>
  );
};

export default AboutPage;
