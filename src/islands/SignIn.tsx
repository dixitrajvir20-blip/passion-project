import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import {
  ageDecision,
  ageFromBirthYear,
  isCompleteCode,
  isValidEmail,
  normaliseCode,
  RESEND_COOLDOWN_S,
  type ConsentRegion,
} from '../lib/auth/validate';
import { createPreviewProvider, type AuthProvider, type Session } from '../lib/auth/provider';
import { exportCode, importCode, loadProgress, merge, saveProgress } from '../lib/progress';
import './signin.css';

type Step = 'entry' | 'age' | 'local' | 'parent' | 'parent-sent' | 'email' | 'code' | 'passkey' | 'merge' | 'done' | 'sync';

interface Props {
  homeHref: string;
  live: boolean;
}

const REGION_OPTIONS: { value: ConsentRegion; label: string }[] = [
  { value: 'in', label: 'India' },
  { value: 'eu', label: 'European Union' },
  { value: 'uk', label: 'United Kingdom' },
  { value: 'us', label: 'United States' },
  { value: 'other', label: 'Somewhere else' },
];

function guessRegion(): ConsentRegion {
  try {
    const saved = window.localStorage.getItem('lp:region');
    if (saved === 'in' || saved === 'eu' || saved === 'us') return saved;
  } catch {
    // No preference stored.
  }
  return 'other';
}

const AGE_GATE_KEY = 'lp:agegate';

export default function SignIn({ homeHref, live }: Props) {
  const provider: AuthProvider = useMemo(() => createPreviewProvider(), []);
  const [step, setStep] = useState<Step>('entry');
  const [region, setRegion] = useState<ConsentRegion>('other');
  const [birthYear, setBirthYear] = useState('');
  const [email, setEmail] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [code, setCode] = useState('');
  const [previewCode, setPreviewCode] = useState('');
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [session, setSession] = useState<Session | null>(null);
  const [passkeyOk, setPasskeyOk] = useState(false);
  const [syncInput, setSyncInput] = useState('');
  const [syncMsg, setSyncMsg] = useState('');
  const [hydrated, setHydrated] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const localProgress = typeof window === 'undefined' ? null : loadProgress(window.localStorage);
  const localCount = localProgress?.done.length ?? 0;

  useEffect(() => {
    setRegion(guessRegion());
    setHydrated(true);
  }, []);

  // Move focus to each new screen's heading so screen readers announce the change.
  // Not on first render: the page's own H1 already carries the context.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
    setError('');
  }, [step]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(t);
  }, [cooldown]);

  const go = (next: Step) => {
    setStatus('');
    setStep(next);
  };

  /** Email sign-in starts at the age screen, unless this session already answered it. */
  const startEmail = () => {
    let earlier: string | null = null;
    try {
      earlier = window.sessionStorage.getItem(AGE_GATE_KEY);
    } catch {
      // No storage: ask.
    }
    if (earlier === 'parent') go('parent');
    else if (earlier === 'none') go('local');
    else go('age');
  };

  const submitAge = (e: Event) => {
    e.preventDefault();
    const year = Number(birthYear);
    const age = ageFromBirthYear(year);
    if (age === null) {
      setError('Enter the four-digit year you were born, like 2009.');
      return;
    }
    const decision = ageDecision(age, region);
    // A neutral age screen is only neutral if it cannot be re-answered until it says yes (FTC
    // COPPA guidance). Remember a "not yet" for this browser session; never store a "yes",
    // and never store the year itself.
    if (decision !== 'self') {
      try {
        window.sessionStorage.setItem(AGE_GATE_KEY, decision === 'parent' ? 'parent' : 'none');
      } catch {
        // Storage blocked; the answer still applies for this visit.
      }
    }
    if (decision === 'self') go('email');
    else if (decision === 'parent') go('parent');
    else go('local');
  };

  const sendCode = async (e?: Event) => {
    e?.preventDefault();
    if (!isValidEmail(email)) {
      setError("That doesn't look like an email address.");
      return;
    }
    setBusy(true);
    const res = await provider.requestCode(email);
    setBusy(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }
    setPreviewCode(res.previewCode ?? '');
    setCode('');
    setCooldown(RESEND_COOLDOWN_S);
    setStatus(`Code sent to ${email.trim()}.`);
    if (step !== 'code') go('code');
  };

  const submitCode = async (e: Event) => {
    e.preventDefault();
    if (!isCompleteCode(code)) {
      setError('Enter the six-digit code from the email.');
      return;
    }
    setBusy(true);
    setStatus('Checking…');
    const res = await provider.verifyCode(email, code);
    setBusy(false);
    if (!res.ok) {
      setStatus('');
      setError(res.error);
      return;
    }
    setSession(res.session);
    setStatus('Signed in.');
    const ok = await provider.passkeyAvailable();
    setPasskeyOk(ok);
    go(ok ? 'passkey' : 'merge');
  };

  const submitParent = async (e: Event) => {
    e.preventDefault();
    if (!isValidEmail(email)) {
      setError("Your email doesn't look right.");
      return;
    }
    if (!isValidEmail(parentEmail)) {
      setError("The parent's email doesn't look right.");
      return;
    }
    if (parentEmail.trim().toLowerCase() === email.trim().toLowerCase()) {
      setError("Use a parent's or guardian's address, not your own.");
      return;
    }
    setBusy(true);
    const res = await provider.requestParentConsent(email, parentEmail);
    setBusy(false);
    if (!res.ok) {
      setError(res.error ?? 'Could not send the request. Try again.');
      return;
    }
    go('parent-sent');
  };

  const createPasskey = async () => {
    if (!session) return;
    setBusy(true);
    const res = await provider.createPasskey(session);
    setBusy(false);
    if (res.ok) {
      setSession({ ...session, passkey: true });
      setStatus('Passkey saved on this device.');
    } else {
      setStatus(res.error ?? 'Couldn’t create a passkey. You can add one the next time you sign in.');
    }
    go('merge');
  };

  const copySync = async () => {
    if (!localProgress) return;
    try {
      await navigator.clipboard.writeText(exportCode(localProgress));
      setSyncMsg('Code copied. Paste it on your other device.');
    } catch {
      setSyncMsg('Select the code and copy it.');
    }
  };

  const importSync = (e: Event) => {
    e.preventDefault();
    const incoming = importCode(syncInput);
    if (!incoming) {
      setSyncMsg("That code isn't a Business Lab sync code. It starts with LP1.");
      return;
    }
    if (!localProgress) return;
    const merged = merge(localProgress, incoming);
    saveProgress(window.localStorage, merged);
    setSyncMsg(`Done. ${merged.done.length} lessons are now on this device.`);
    setSyncInput('');
  };

  const heading = (text: string) => (
    <h2 ref={headingRef} tabindex={-1}>
      {text}
    </h2>
  );

  return (
    <div class="signin" data-hydrated={hydrated ? 'true' : undefined}>
      {!live && (
        <p class="preview-note">
          <strong>Preview.</strong>
          <span>
            Accounts aren’t live yet. Nothing you type here is sent or stored, and the code appears on
            this screen instead of in an email.
          </span>
        </p>
      )}

      <div class="signin-card box">
        {step === 'entry' && (
          <div>
            {heading('Keep your progress on every device.')}
            <p>Sign in with your email. No password needed.</p>
            <div class="signin-actions">
              <button type="button" class="btn" onClick={startEmail}>
                Continue with email
              </button>
              <button type="button" class="btn btn-secondary" onClick={() => go('sync')}>
                Use a sync code instead
              </button>
            </div>
            <p class="signin-alt">
              <a class="btn-link" href={homeHref}>
                Keep going without an account
              </a>
            </p>
          </div>
        )}

        {step === 'age' && (
          <form onSubmit={submitAge} novalidate>
            {heading('A couple of details first.')}
            <p class="field">
              <label for="si-year">What year were you born?</label>
              <input
                id="si-year"
                type="text"
                inputMode="numeric"
                autocomplete="bday-year"
                pattern="[0-9]{4}"
                maxLength={4}
                value={birthYear}
                onInput={(e) => setBirthYear((e.currentTarget as HTMLInputElement).value.replace(/\D/g, '').slice(0, 4))}
                aria-describedby={error ? 'si-year-error' : undefined}
                aria-invalid={error ? 'true' : undefined}
                required
              />
              {error && (
                <span class="error" id="si-year-error">
                  {error}
                </span>
              )}
            </p>
            <p class="field">
              <label for="si-region">Where do you live?</label>
              <select id="si-region" value={region} onChange={(e) => setRegion((e.currentTarget as HTMLSelectElement).value as ConsentRegion)}>
                {REGION_OPTIONS.map((o) => (
                  <option value={o.value}>{o.label}</option>
                ))}
              </select>
              <span class="hint">Rules about accounts differ by country, so we ask rather than guess.</span>
            </p>
            <div class="signin-actions">
              <button type="submit" class="btn">
                Continue
              </button>
              <button type="button" class="btn-link" onClick={() => go('entry')}>
                Back
              </button>
            </div>
          </form>
        )}

        {step === 'local' && (
          <div>
            {heading('Your progress stays on this device.')}
            <p>
              Accounts aren’t available for you right now. Everything you finish is saved in this
              browser, and you can move it to another device with a sync code.
            </p>
            <div class="signin-actions">
              <button type="button" class="btn" onClick={() => go('sync')}>
                Get a sync code
              </button>
              <a class="btn btn-secondary" href={homeHref}>
                Back to lessons
              </a>
            </div>
          </div>
        )}

        {step === 'parent' && (
          <form onSubmit={submitParent} novalidate>
            {heading('A parent or guardian needs to set this up.')}
            <p>
              Where you live, an adult has to agree before we can keep an account for you. We’ll
              email them a link; nothing is created until they confirm.
            </p>
            <p class="field">
              <label for="si-email-child">Your email</label>
              <input id="si-email-child" type="email" autocomplete="email" value={email} onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)} required />
            </p>
            <p class="field">
              <label for="si-email-parent">Parent or guardian’s email</label>
              <input id="si-email-parent" type="email" autocomplete="off" value={parentEmail} onInput={(e) => setParentEmail((e.currentTarget as HTMLInputElement).value)} required aria-describedby={error ? 'si-parent-error' : undefined} aria-invalid={error ? 'true' : undefined} />
              {error && (
                <span class="error" id="si-parent-error">
                  {error}
                </span>
              )}
            </p>
            <div class="signin-actions">
              <button type="submit" class="btn" disabled={busy}>
                Send request
              </button>
              <button type="button" class="btn-link" onClick={() => go('local')}>
                Keep progress on this device instead
              </button>
            </div>
          </form>
        )}

        {step === 'parent-sent' && (
          <div>
            {heading('Request sent.')}
            <p>
              We’ve emailed <span class="email-echo">{parentEmail.trim()}</span>. Once they confirm,
              you’ll get an email to finish signing in. Until then your progress stays on this device.
            </p>
            <div class="signin-actions">
              <a class="btn" href={homeHref}>
                Back to lessons
              </a>
            </div>
          </div>
        )}

        {step === 'email' && (
          <form onSubmit={sendCode} novalidate>
            {heading('What’s your email?')}
            <p>We’ll send a six-digit code. No password, nothing to remember.</p>
            <p class="field">
              <label for="si-email">Email</label>
              <input
                id="si-email"
                type="email"
                autocomplete="email webauthn"
                value={email}
                onInput={(e) => setEmail((e.currentTarget as HTMLInputElement).value)}
                aria-describedby={error ? 'si-email-error' : undefined}
                aria-invalid={error ? 'true' : undefined}
                required
              />
              {error && (
                <span class="error" id="si-email-error">
                  {error}
                </span>
              )}
            </p>
            <div class="signin-actions">
              <button type="submit" class="btn" disabled={busy}>
                Continue
              </button>
              <button type="button" class="btn-link" onClick={() => go('entry')}>
                Back
              </button>
            </div>
          </form>
        )}

        {step === 'code' && (
          <form onSubmit={submitCode} novalidate>
            {heading('Check your email.')}
            <p>
              Enter the code we sent to <span class="email-echo">{email.trim()}</span>.
            </p>
            {!live && previewCode && (
              <p class="preview-note">
                <strong>Preview code</strong>
                <span class="preview-code" aria-label={`Preview code ${previewCode.split('').join(' ')}`}>
                  {previewCode}
                </span>
              </p>
            )}
            <p class="field">
              <label for="si-code">Six-digit code</label>
              <input
                id="si-code"
                class="code-input"
                type="text"
                inputMode="numeric"
                autocomplete="one-time-code"
                maxLength={6}
                value={code}
                onInput={(e) => setCode(normaliseCode((e.currentTarget as HTMLInputElement).value))}
                aria-describedby={error ? 'si-code-error' : 'si-code-hint'}
                aria-invalid={error ? 'true' : undefined}
                required
              />
              <span class="hint" id="si-code-hint">
                Pasting works. The code expires in 10 minutes.
              </span>
              {error && (
                <span class="error" id="si-code-error">
                  {error}
                </span>
              )}
            </p>
            <div class="signin-actions">
              <button type="submit" class="btn" disabled={busy}>
                Sign in
              </button>
              <button type="button" class="btn btn-secondary" onClick={() => sendCode()} disabled={cooldown > 0 || busy}>
                {cooldown > 0 ? `Resend code (${cooldown}s)` : 'Resend code'}
              </button>
              <button type="button" class="btn-link" onClick={() => go('email')}>
                Use a different email
              </button>
            </div>
          </form>
        )}

        {step === 'passkey' && (
          <div>
            {heading('Sign in faster next time.')}
            <p>
              Passkeys are encrypted digital keys you create using your fingerprint, face, or screen
              lock. No code to type.
            </p>
            <div class="signin-actions">
              <button type="button" class="btn" onClick={createPasskey} disabled={busy || !passkeyOk}>
                Create a passkey
              </button>
              <button type="button" class="btn-link" onClick={() => go('merge')}>
                Not now
              </button>
            </div>
          </div>
        )}

        {step === 'merge' && (
          <div>
            {heading('Combine progress from this device?')}
            <div class="merge-counts numbers">
              <div>
                <p class="figure">{localCount}</p>
                <p class="hint">lessons on this device</p>
              </div>
              <div>
                <p class="figure">0</p>
                <p class="hint">in your account</p>
              </div>
            </div>
            <div class="signin-actions">
              <button type="button" class="btn" onClick={() => go('done')}>
                Combine
              </button>
              <button type="button" class="btn btn-secondary" onClick={() => go('done')}>
                Keep this device only
              </button>
            </div>
          </div>
        )}

        {step === 'done' && (
          <div>
            {heading('You’re signed in.')}
            <p>
              Signed in as <span class="email-echo">{session?.email}</span>. Your progress will follow
              you to any device you sign in on.
            </p>
            <div class="signin-actions">
              <a class="btn" href={homeHref}>
                Back to lessons
              </a>
            </div>
          </div>
        )}

        {step === 'sync' && (
          <form onSubmit={importSync} novalidate>
            {heading('Move progress with a code.')}
            <p>
              No account, no email. Copy this code, paste it on your other device, and your progress
              comes with it. Anyone with the code can read it, so treat it like a key.
            </p>
            <p class="field">
              <label for="si-sync-out">Your code</label>
              <textarea id="si-sync-out" class="sync-code" readOnly value={localProgress ? exportCode(localProgress) : ''} />
            </p>
            <div class="signin-actions">
              <button type="button" class="btn btn-secondary" onClick={copySync}>
                Copy code
              </button>
            </div>
            <hr />
            <p class="field">
              <label for="si-sync-in">Paste a code from another device</label>
              <textarea id="si-sync-in" class="sync-code" value={syncInput} onInput={(e) => setSyncInput((e.currentTarget as HTMLTextAreaElement).value)} placeholder="LP1.…" />
            </p>
            <div class="signin-actions">
              <button type="submit" class="btn">
                Add that progress here
              </button>
              <button type="button" class="btn-link" onClick={() => go('entry')}>
                Back
              </button>
            </div>
            <p class="signin-status" role="status" aria-live="polite">
              {syncMsg}
            </p>
          </form>
        )}

        {step !== 'sync' && (
          <p class="signin-status" role="status" aria-live="polite">
            {status}
          </p>
        )}
      </div>
    </div>
  );
}
