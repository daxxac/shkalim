
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

    // Read from environment variables
    const botToken = import.meta.env.VITE_TELEGRAM_BOT_TOKEN;
    const chatId = import.meta.env.VITE_TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      console.error('Telegram bot token or chat ID is missing. Please set VITE_TELEGRAM_BOT_TOKEN and VITE_TELEGRAM_CHAT_ID environment variables.');
      toast.error(t('about.contactForm.error') + ' (Configuration error)');
      setIsSubmitting(false);
      return;
    }

    const telegramApiUrl = `https://api.telegram.org/bot${botToken}/sendMessage`;
    const messageText = `New Contact Form Submission:\nName: ${formData.name}\nEmail: ${formData.email}\nMessage: ${formData.message}`;

    try {
      const response = await fetch(telegramApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chat_id: chatId,
          text: messageText,
        }),
      });

      if (response.ok) {
        toast.success(t('about.contactForm.success'));
        setFormData({ name: '', email: '', message: '' });
      } else {
        const errorData = await response.json();
        console.error('Telegram API error:', errorData);
        toast.error(t('about.contactForm.error') + ` (Telegram: ${errorData.description || 'Unknown error'})`);
      }
    } catch (error) {
      console.error('Failed to send message to Telegram:', error);
      toast.error(t('about.contactForm.error') + ` (Network error)`);
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
      <Card className="premium-card">
        <CardHeader>
          <CardTitle>{t('about.contactForm.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('about.contactForm.name')}</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">{t('about.contactForm.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="message">{t('about.contactForm.message')}</Label>
              <Textarea
                id="message"
                name="message"
                rows={5}
                value={formData.message}
                onChange={handleChange}
                required
                disabled={isSubmitting}
              />
            </div>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full md:w-auto premium-button"
            >
              {isSubmitting ? t('about.contactForm.submitting') : t('about.contactForm.submit')}
            </Button>
          </form>
        </CardContent>
      </Card>

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
