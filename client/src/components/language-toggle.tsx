import React from 'react';
import { useI18n } from '@/lib/i18n';

export default function LanguageToggle() {
  const { lang, setLang, t } = useI18n() as any;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="language-select" className="sr-only">
        {t('languageSelectLabel') || 'Select language'}
      </label>
      <select
        id="language-select"
        value={lang}
        onChange={(e) => setLang(e.target.value as any)}
        className="rounded-md border bg-transparent px-2 py-1 text-sm"
        aria-label="Language selector"
      >
        <option value="en">English</option>
        <option value="hi">हिंदी</option>
        <option value="gu">ગુજરાતી</option>
      </select>
    </div>
  );
}
