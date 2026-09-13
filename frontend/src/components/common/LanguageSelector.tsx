import { Languages } from 'lucide-react';
import { LANGUAGES, isLanguage, useLanguage } from '../../lib/i18n';

export default function LanguageSelector() {
  const { language, setLanguage, t } = useLanguage();
  return (
    <label className="language-selector">
      <Languages size={16} aria-hidden="true" />
      <span className="sr-only">{t('Language')}</span>
      <select value={language} onChange={(event) => {
        if (isLanguage(event.target.value)) setLanguage(event.target.value);
      }}>
        {LANGUAGES.map(({ code, name }) => <option key={code} value={code} lang={code}>{name}</option>)}
      </select>
    </label>
  );
}
