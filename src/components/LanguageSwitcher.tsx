import { useTranslation } from 'react-i18next';
import { languages } from '@/i18n';

export function LanguageSwitcher() {
  const { i18n } = useTranslation();

  return (
    <select
      value={i18n.language}
      onChange={(e) => i18n.changeLanguage(e.target.value)}
      className="language-switcher"
      aria-label="Select language"
    >
      {languages.map((lang) => (
        <option key={lang} value={lang}>
          {lang === 'en' ? 'English' : '中文'}
        </option>
      ))}
    </select>
  );
}