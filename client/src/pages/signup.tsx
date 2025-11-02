import React, { useState } from 'react';
import { useLocation } from 'wouter';
import { signup, storeToken } from '../lib/authService';
import { useAuth } from '../lib/authContext';
import { useI18n } from '@/lib/i18n';
import TermsFooter from "@/components/ui/terms-footer";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { user, loading } = useAuth();
  // If already logged in, redirect away from signup
  React.useEffect(() => {
    if (!loading && user) {
      if (user.role === 'admin') setLocation('/admin');
      else if (user.role === 'official') setLocation('/official');
      else setLocation('/dashboard');
    }
  }, [user, loading, setLocation]);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [villageName, setVillageName] = useState('');
  const [district] = useState('');
  const [state] = useState('');
  // public signup always creates a citizen
  const { t } = useI18n();
  const { refreshUser, setUserPublic } = useAuth();

  // simple captcha
  const [a] = useState(() => Math.floor(Math.random()*9)+1);
  const [b] = useState(() => Math.floor(Math.random()*9)+1);
  const [captcha, setCaptcha] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!acceptedTerms) return setError(t('errorAcceptTerms'));
    if (password !== confirm) return setError(t('errorPasswordMatch'));
    if (parseInt(captcha || '0', 10) !== a + b) return setError(t('errorInvalidCaptcha'));

    try {
  const payload: any = { fullName, password, villageName };
      if (email) payload.email = email;
      if (mobileNumber) payload.mobileNumber = mobileNumber;

  const { token, user } = await signup(payload);
  storeToken(token, true);
  // persist the fullName locally so auth decoding can pick it up if token doesn't include it
  try { localStorage.setItem('auth_user_fullName', fullName || user?.fullName || ''); } catch (e) {}
  // set user directly from server response (ensure fullName is present)
  setUserPublic({ ...user, fullName: fullName || user?.fullName || user?.username });
  if (user.role === 'admin') setLocation('/admin');
  else if (user.role === 'official') setLocation('/official');
  else setLocation('/dashboard');
    } catch (err: any) {
      setError((err && err.error) || t('errorSignupFailed'));
    }
  }

  return (
    <div className="max-w-lg mx-auto p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-semibold">{t('signUpTitle')}</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm">{t('fullNameLabel')}</label>
          <input className="w-full border rounded px-3 py-2" value={fullName} onChange={e=>setFullName(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">{t('identifierLabel')}</label>
          <input className="w-full border rounded px-3 py-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" />
          <div className="mt-2 text-xs text-gray-500">Or provide mobile number</div>
          <input className="w-full border rounded px-3 py-2 mt-1" value={mobileNumber} onChange={e=>setMobileNumber(e.target.value)} placeholder="+919XXXXXXXXX" />
        </div>
        <div>
          <label className="block text-sm">{t('passwordLabel')}</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={password} onChange={e=>setPassword(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">{t('confirmLabel')}</label>
          <input type="password" className="w-full border rounded px-3 py-2" value={confirm} onChange={e=>setConfirm(e.target.value)} />
        </div>
        <div>
          <label className="block text-sm">{t('villageLabel')}</label>
          <input className="w-full border rounded px-3 py-2" value={villageName} onChange={e=>setVillageName(e.target.value)} />
        </div>
        {/* role selection removed - public signup creates citizen accounts only */}
        <div>
          <label className="block text-sm">Captcha: {a} + {b} = ?</label>
          <input className="w-full border rounded px-3 py-2" value={captcha} onChange={e=>setCaptcha(e.target.value)} />
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <div className="flex items-center gap-3">
          <input id="accept-terms-signup" type="checkbox" checked={acceptedTerms} onChange={e=>setAcceptedTerms(e.target.checked)} className="w-4 h-4" />
          <label htmlFor="accept-terms-signup" className="text-sm">
            I agree to the <a href="/TC.html" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">Terms &amp; Conditions</a>
          </label>
        </div>
        <div>
          <button className="bg-green-600 text-white px-4 py-2 rounded" type="submit" disabled={!acceptedTerms}>{t('signUpButton')}</button>
        </div>
      </form>
      <TermsFooter />
    </div>
  );
}
