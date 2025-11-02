import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { 
  FileText, 
  Shield, 
  Users, 
  CheckCircle, 
  AlertCircle, 
  Globe, 
  Lock,
  Phone,
  ArrowRight
} from "lucide-react";

import TermsFooter from "@/components/ui/terms-footer";
import { useI18n } from '@/lib/i18n';

export default function Home() {
  const { t } = useI18n();
  return (
    <div className="min-h-screen">
      <section className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4 text-base px-4 py-2">
              <Shield className="w-4 h-4 mr-2" />
              {t('securedByBlockchain')}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6">{t('heroTitle')}</h1>
            <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-3xl mx-auto">
              {t('heroSubtitle')}
            </p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/submit">
                <Button size="lg" variant="secondary" className="text-lg px-8 py-6" data-testid="button-submit-grievance-home">
                  <FileText className="w-5 h-5 mr-2" />
                  {t('submitGrievance')}
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm" data-testid="button-track-status-home">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {t('trackStatus')}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('whyChooseTitle')}</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">{t('whyChooseSubtitle')}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <Card className="border-2">
                <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>{t('feature1Title')}</CardTitle>
                <CardDescription className="text-base">{t('feature1Desc')}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 bg-status-resolved/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-status-resolved" />
                </div>
                <CardTitle>{t('feature2Title')}</CardTitle>
                <CardDescription className="text-base">{t('feature2Desc')}</CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2">
              <CardHeader>
                <div className="w-12 h-12 bg-secondary/10 rounded-lg flex items-center justify-center mb-4">
                  <Globe className="w-6 h-6 text-secondary" />
                </div>
                <CardTitle>{t('feature3Title')}</CardTitle>
                <CardDescription className="text-base">{t('feature3Desc')}</CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-muted/30">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('howItWorks')}</h2>
            <p className="text-lg text-muted-foreground">{t('howItWorksSubtitle')}</p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">
            {[
                {
                step: 1,
                title: t('step1Title'),
                description: t('step1Desc'),
                icon: FileText,
              },
              {
                step: 2,
                title: t('step2Title'),
                description: t('step2Desc'),
                icon: Users,
              },
              {
                step: 3,
                title: t('step3Title'),
                description: t('step3Desc'),
                icon: AlertCircle,
              },
              {
                step: 4,
                title: t('step4Title'),
                description: t('step4Desc'),
                icon: CheckCircle,
              },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="mb-4 flex justify-center">
                  <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold">
                    {item.step}
                  </div>
                </div>
                <item.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                <h3 className="text-xl font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-background">
        <div className="container mx-auto max-w-6xl">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('falseClosuresTitle')}</h2>
              <p className="text-lg text-muted-foreground mb-6">{t('falseClosuresDesc')}</p>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-status-resolved flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold mb-1">{t('validation1')}</div>
                    <div className="text-muted-foreground">{t('validation1Desc')}</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-status-resolved flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold mb-1">{t('validation2')}</div>
                    <div className="text-muted-foreground">{t('validation2Desc')}</div>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-6 h-6 text-status-resolved flex-shrink-0 mt-0.5" />
                  <div>
                    <div className="font-semibold mb-1">{t('validation3')}</div>
                    <div className="text-muted-foreground">{t('validation3Desc')}</div>
                  </div>
                </li>
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-status-overdue mb-2">6.3%</div>
                  <div className="text-sm text-muted-foreground">{t('metric1Title')}</div>
                </CardContent>
              </Card>
              <Card className="border-2 bg-status-resolved text-white">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold mb-2">85%+</div>
                  <div className="text-sm opacity-90">{t('metric2Title')}</div>
                </CardContent>
              </Card>
              <Card className="border-2">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold text-primary mb-2">100%</div>
                  <div className="text-sm text-muted-foreground">{t('metric3Title')}</div>
                </CardContent>
              </Card>
              <Card className="border-2 bg-secondary text-secondary-foreground">
                <CardContent className="pt-6">
                  <div className="text-4xl font-bold mb-2">24/7</div>
                  <div className="text-sm opacity-90">{t('metric4Title')}</div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-primary text-primary-foreground">
        <div className="container mx-auto max-w-4xl text-center">
          <Lock className="w-16 h-16 mx-auto mb-6" />
          <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('hero2Title')}</h2>
          <p className="text-xl mb-8 text-primary-foreground/90">{t('hero2Subtitle')}</p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Link href="/submit">
              <Button size="lg" variant="secondary" className="text-lg px-8 py-6" data-testid="button-get-started">
                {t('getStartedNow')}
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
            </Link>
            <Button size="lg" variant="outline" className="text-lg px-8 py-6 bg-white/10 hover:bg-white/20 border-white/30 text-white backdrop-blur-sm" data-testid="button-call-helpline">
              <Phone className="w-5 h-5 mr-2" />
              {t('callHelpline')} 1800-XXX-XXXX
            </Button>
          </div>
        </div>
      </section>

      <TermsFooter />
    </div>
  );
}
