import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();
  const navigate = useNavigate();
  const { lang } = useParams<{ lang?: string }>();
  const currentLang = lang || 'en';

  const toggleLanguage = () => {
    const newLang = currentLang === 'en' ? 'de' : 'en';
    i18n.changeLanguage(newLang);
    localStorage.setItem('i18nextLng', newLang);

    // Get the current pathname without the language prefix
    const pathparts = window.location.pathname.split('/').filter(Boolean);
    let newPath = '/';

    if (pathparts.length > 1 && (pathparts[0] === 'en' || pathparts[0] === 'de')) {
      // Remove the language prefix and add the new one
      newPath = '/' + newLang + '/' + pathparts.slice(1).join('/');
    } else {
      // Just add the language prefix
      newPath = '/' + newLang + window.location.pathname;
    }

    navigate(newPath);
  };

  return (
    <Button
      onClick={toggleLanguage}
      variant="ghost"
      size="sm"
      className="gap-2 font-semibold text-muted-foreground hover:text-foreground"
    >
      <Globe size={18} />
      <span>{currentLang === 'en' ? 'Deutsch' : 'English'}</span>
    </Button>
  );
};

export default LanguageSwitcher;
