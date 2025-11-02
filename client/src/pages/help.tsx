import React from 'react';
import TermsFooter from "@/components/ui/terms-footer";
import { useI18n } from '@/lib/i18n';

export default function HelpPage() {
  const { t } = useI18n();
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h2 className="text-2xl font-semibold mb-6">{t('helpCenter')}</h2>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-2">{t('overviewTitle')}</h3>
        <p className="text-sm text-muted-foreground">{t('overviewDesc')}</p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">{t('howToSubmitTitle')}</h3>
        <ol className="list-decimal pl-6 space-y-2 text-sm">
          <li>{t('howToSubmitStep1')}</li>
          <li>{t('howToSubmitStep2')}</li>
          <li>{t('howToSubmitStep3')}</li>
          <li>{t('howToSubmitStep4')}</li>
          <li>{t('howToSubmitStep5')}</li>
        </ol>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">{t('communityVerificationTitle')}</h3>
        <p className="text-sm text-muted-foreground mb-2">{t('communityVerificationDesc1')}</p>
        <p className="text-sm text-muted-foreground">{t('communityVerificationDesc2')}</p>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">{t('faqTitle')}</h3>

        <div className="space-y-4 text-sm">
          <div>
            <div className="font-medium">{t('faqWhoCanSubmitQ')}</div>
            <div className="text-muted-foreground">{t('faqWhoCanSubmitA')}</div>
          </div>

          <div>
            <div className="font-medium">{t('faqResolutionTimeQ')}</div>
            <div className="text-muted-foreground">{t('faqResolutionTimeA')}</div>
          </div>

          <div>
            <div className="font-medium">{t('faqAnonymousQ')}</div>
            <div className="text-muted-foreground">{t('faqAnonymousA')}</div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">{t('contactSupportTitle')}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 border rounded">
            <div className="font-medium">{t('localHelplineLabel')}</div>
            <div className="text-muted-foreground">{t('localHelplineNumber')}</div>
            <div className="text-xs mt-2">{t('localHelplineHours')}</div>
          </div>

          <div className="p-4 border rounded">
            <div className="font-medium">{t('emailSupportLabel')}</div>
            <div className="text-muted-foreground">{t('emailSupportAddress')}</div>
            <div className="text-xs mt-2">{t('emailSupportResponse')}</div>
          </div>
        </div>
      </section>

      <section className="mb-8">
        <h3 className="text-lg font-semibold mb-3">{t('usefulLinksTitle')}</h3>
        <ul className="list-disc pl-6 text-sm text-muted-foreground space-y-1">
          <li><a className="text-blue-600" href="/">{t('linkHome')}</a></li>
          <li><a className="text-blue-600" href="/submit">{t('linkSubmit')}</a></li>
          <li><a className="text-blue-600" href="/dashboard">{t('linkDashboard')}</a></li>
        </ul>
      </section>

      <div className="text-xs text-muted-foreground">{t('furtherHelp')}</div>
      <TermsFooter />
    </div>
  );
}
