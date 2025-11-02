import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { login, storeToken } from '../lib/authService';
import { useAuth } from '../lib/authContext';
import { useI18n } from '@/lib/i18n';
import TermsFooter from "@/components/ui/terms-footer";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  // If already logged in, redirect to appropriate dashboard
  React.useEffect(() => {
    if (!loading && user) {
      switch (user.role) {
        case 'admin':
          setLocation('/admin');
          break;
        case 'official':
          setLocation('/official');
          break;
        default:
          setLocation('/dashboard');
      }
    }
  }, [user, loading, setLocation]);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const { t } = useI18n();
  const { refreshUser, setUserPublic } = useAuth();

  // simple math captcha
  const [a] = useState(() => Math.floor(Math.random()*9)+1);
  const [b] = useState(() => Math.floor(Math.random()*9)+1);
  const [captcha, setCaptcha] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptedTerms) {
      setError(t('errorAcceptTerms'));
      return;
    }
    if (parseInt(captcha || '0', 10) !== a + b) {
      setError(t('errorInvalidCaptcha'));
      return;
    }

    try {
      const { token, user } = await login(identifier, password);
  storeToken(token, remember);
  // persist fullName if provided by server
  try { if (user?.fullName) localStorage.setItem('auth_user_fullName', user.fullName); } catch (e) {}
  // set user directly from server response
  setUserPublic({ ...user, fullName: user?.fullName || user?.username });
  // ensure token-based refresh is in sync (decoding will merge stored fullName)
  refreshUser();
      // redirect based on role
      if (user.role === 'admin') setLocation('/admin');
      else if (user.role === 'official') setLocation('/official');
      else setLocation('/dashboard');
    } catch (err: any) {
      setError((err && err.error) || t('errorLoginFailed'));
    }
  }

  return (
    <div className="max-w-md mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">{t('loginTitle')}</h2>
      </div>
  <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm">{t('identifierLabel')}</label>
          <input className="w-full border rounded px-3 py-2" value={identifier} onChange={e => setIdentifier(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">{t('passwordLabel')}</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">{t('captchaLabel')}: {a} + {b} = ?</label>
          <input className="w-full border rounded px-3 py-2" value={captcha} onChange={e => setCaptcha(e.target.value)} />
        </div>
        <div className="flex items-center gap-2">
          <input id="remember" type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)} />
          <label htmlFor="remember">{t('rememberLabel')}</label>
        </div>
        <div className="flex items-center gap-3">
          <input id="accept-terms-login" type="checkbox" checked={acceptedTerms} onChange={e => setAcceptedTerms(e.target.checked)} className="w-4 h-4" />
          <label htmlFor="accept-terms-login" className="text-sm">I agree to the <a href="/TC.html" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Terms &amp; Conditions</a></label>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div>
          <button className="bg-blue-600 text-white px-4 py-2 rounded" type="submit" disabled={!acceptedTerms}>{t('loginButton')}</button>
        </div>
      </form>
      <div className="mt-4 text-sm">
        <a href="/signup" className="text-blue-600">{t('createAccountLink')}</a>
      </div>
      <TermsFooter />
    </div>
  );
}
