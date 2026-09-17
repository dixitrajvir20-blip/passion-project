/**
 * The auth adapter. The UI only talks to this interface, so a real backend (Better Auth
 * on Cloudflare Workers + D1, or Supabase) can replace the preview provider without
 * touching the sign-in island. See docs/AUTH_AND_ACCOUNTS.md.
 */

export interface Session {
  email: string;
  createdAt: string;
  passkey: boolean;
}

export interface AuthProvider {
  readonly mode: 'preview' | 'live';
  requestCode(email: string): Promise<{ ok: true; previewCode?: string } | { ok: false; error: string }>;
  verifyCode(email: string, code: string): Promise<{ ok: true; session: Session } | { ok: false; error: string }>;
  requestParentConsent(childEmail: string, parentEmail: string): Promise<{ ok: boolean; error?: string }>;
  passkeyAvailable(): Promise<boolean>;
  createPasskey(session: Session): Promise<{ ok: boolean; error?: string }>;
  signInWithPasskey(): Promise<{ ok: true; session: Session } | { ok: false; error: string }>;
  signOut(): Promise<void>;
}

/**
 * Preview provider: no network, nothing stored beyond this page load, the code is shown
 * on screen. It exists so the flow can be designed, tested and reviewed before a backend
 * and the legal sign-off exist. It must never ship as the live provider.
 */
export function createPreviewProvider(): AuthProvider {
  let pendingCode: { email: string; code: string; attempts: number } | null = null;

  const makeCode = () => {
    const buf = new Uint32Array(1);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      crypto.getRandomValues(buf);
      return String(buf[0] % 1_000_000).padStart(6, '0');
    }
    return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
  };

  return {
    mode: 'preview',
    async requestCode(email) {
      const code = makeCode();
      pendingCode = { email: email.trim().toLowerCase(), code, attempts: 0 };
      return { ok: true, previewCode: code };
    },
    async verifyCode(email, code) {
      if (!pendingCode || pendingCode.email !== email.trim().toLowerCase()) {
        return { ok: false, error: 'This code expired. Send a new one?' };
      }
      pendingCode.attempts += 1;
      if (pendingCode.attempts > 5) {
        pendingCode = null;
        return { ok: false, error: 'Too many tries. Request a new code.' };
      }
      if (pendingCode.code !== code) {
        return { ok: false, error: "That code didn't match. Check the newest email." };
      }
      const session: Session = { email: pendingCode.email, createdAt: new Date().toISOString(), passkey: false };
      pendingCode = null;
      return { ok: true, session };
    },
    async requestParentConsent() {
      return { ok: true };
    },
    async passkeyAvailable() {
      try {
        if (typeof window === 'undefined' || !('PublicKeyCredential' in window)) return false;
        return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      } catch {
        return false;
      }
    },
    async createPasskey() {
      return { ok: true };
    },
    async signInWithPasskey() {
      return { ok: false, error: 'Passkeys need the live backend. Use your email for now.' };
    },
    async signOut() {
      pendingCode = null;
    },
  };
}
