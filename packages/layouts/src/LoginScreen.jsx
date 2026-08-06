'use client';
import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn, sendPasswordReset, onAuthChange } from '@cocarr/auth-sdk';

// THE SIGN-IN SCREEN, shared by all three apps.
//
// Styling is COCARR-ADMIN's: the #151515 field, the gold #ECC032 button, the
// logo above the form. `label` names which site you are signing into — with
// three hosts, "it works for my colleague" is usually them being on a different
// one, and the answer should be readable before the password is typed.
//
// ── There is no panel check here, deliberately ──
// The legacy screen called /admin/me before navigating so a wrong-panel account
// was signed straight back out. That existed because one build served every
// panel. Now each app is its own deployment and access is decided by the IAM
// payload the dashboard loads, so a person who may not use this site sees an
// honest "no access" INSIDE the app rather than being bounced at the door with
// a guess about why.
export function LoginScreen({ label = '', logoSrc = '/logo.png', redirectTo = '/dashboard' }) {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // `?expired=1` is set by the auth guard when a live session ends. Saying so is
  // the difference between "we signed you out" and the app appearing to have
  // forgotten who you are.
  useEffect(() => {
    if (params?.get('expired')) setNotice('Your session ended. Please sign in again.');
  }, [params]);

  // Already signed in — go straight through. Covers the back button and a
  // second tab, where landing on a login form you no longer need is confusing.
  useEffect(() => onAuthChange((user) => { if (user) router.replace(redirectTo); }), [router, redirectTo]);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await signIn(email.trim(), password);
      router.replace(redirectTo);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reset = async () => {
    if (!email.trim()) { setError('Enter your email address first.'); return; }
    setBusy(true); setError('');
    try {
      await sendPasswordReset(email.trim());
      // Says "if that address has an account" on purpose: confirming which
      // addresses exist turns this into an account-enumeration tool.
      setNotice('If that address has an account, a reset link is on its way.');
    } catch {
      setNotice('If that address has an account, a reset link is on its way.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className='min-h-screen bg-[#151515] flex items-center justify-center px-4'>
      <div className='w-full max-w-[380px]'>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt='Cocarr' src={logoSrc} className='h-[46px] w-auto mx-auto mb-8' />

        <div className='bg-[#1c1c1c] border border-[#2a2a2a] rounded-[10px] p-6'>
          <h1 className='text-[16px] font-semibold text-[#e3e3e3]'>Sign in</h1>
          <p className='text-[12px] text-[#757575] mt-0.5 mb-5'>{label}</p>

          {notice && (
            <p className='mb-4 text-[12px] text-[#c2a13a] bg-[#2a2410] border border-[#3a3418] rounded-[6px] px-3 py-2'>
              {notice}
            </p>
          )}
          {error && (
            <p role='alert' className='mb-4 text-[12px] text-[#e07a7a] bg-[#2a1414] border border-[#3a1818] rounded-[6px] px-3 py-2'>
              {error}
            </p>
          )}

          <form onSubmit={submit}>
            <label htmlFor='email' className='block text-[11px] text-[#959595] mb-1'>Email</label>
            <input
              id='email' type='email' autoComplete='username' value={email} required
              onChange={(e) => setEmail(e.target.value)}
              className='w-full mb-4 bg-[#151515] border border-[#2a2a2a] rounded-[6px] px-3 py-2 text-[13px] text-[#e3e3e3] focus:outline-none focus:border-[#3a3a3a]'
            />

            <label htmlFor='password' className='block text-[11px] text-[#959595] mb-1'>Password</label>
            <input
              id='password' type='password' autoComplete='current-password' value={password} required
              onChange={(e) => setPassword(e.target.value)}
              className='w-full mb-5 bg-[#151515] border border-[#2a2a2a] rounded-[6px] px-3 py-2 text-[13px] text-[#e3e3e3] focus:outline-none focus:border-[#3a3a3a]'
            />

            <button
              type='submit' disabled={busy}
              className='w-full bg-[#ECC032] text-black text-[13px] font-semibold rounded-[6px] py-2.5 disabled:opacity-60'
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <button
            type='button' onClick={reset} disabled={busy}
            className='mt-3 w-full text-[12px] text-[#757575] hover:text-[#e3e3e3] py-1'
          >
            Forgot your password?
          </button>
        </div>

        <p className='text-center text-[11px] text-[#5a5a5a] mt-6'>
          Staff accounts are created by an administrator.
        </p>
      </div>
    </div>
  );
}
