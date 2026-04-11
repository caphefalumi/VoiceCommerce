export type SimpleAuthEnv = {
  DB: D1Database;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
};

export type SimpleAuthUser = {
  id: string;
  email: string;
  name: string;
  role: string;
  image?: string | null;
  emailVerified?: boolean;
};

type SessionRecord = {
  token: string;
  user: SimpleAuthUser;
};

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function nowMs() {
  return Date.now();
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function fromHex(hex: string): Uint8Array {
  const pairs = hex.match(/.{2}/g) ?? [];
  return new Uint8Array(pairs.map((p) => Number.parseInt(p, 16)));
}

function toBase64Url(bytes: Uint8Array): string {
  const b64 = btoa(String.fromCharCode(...bytes));
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export function createRandomToken(byteLength = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function hashPassword(password: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
    keyMaterial,
    256,
  );
  return `pbkdf2:${toHex(salt)}:${toHex(new Uint8Array(bits))}`;
}

export async function verifyPassword(storedHash: string, password: string): Promise<boolean> {
  const [scheme, saltHex, hashHex] = storedHash.split(':');
  if (scheme !== 'pbkdf2' || !saltHex || !hashHex) return false;

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromHex(saltHex), iterations: 100_000 },
    keyMaterial,
    256,
  );
  return toHex(new Uint8Array(bits)) === hashHex;
}

function mapUserRow(row: Record<string, unknown>): SimpleAuthUser {
  return {
    id: String(row.id),
    email: String(row.email),
    name: String(row.name ?? ''),
    role: String(row.role ?? 'user'),
    image: typeof row.image === 'string' ? row.image : null,
    emailVerified: Boolean(row.email_verified),
  };
}

export function readBearerToken(req: Request): string | null {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const [scheme, value] = auth.split(' ');
  if (scheme?.toLowerCase() !== 'bearer' || !value) return null;
  return value.trim();
}

function readCookieToken(req: Request): string | null {
  const cookie = req.headers.get('cookie') ?? '';
  const match = cookie.match(/(?:^|;\s*)tgdd_session_token=([^;]+)/);
  return match?.[1] ?? null;
}

export async function getSessionFromRequest(env: SimpleAuthEnv, req: Request): Promise<SessionRecord | null> {
  const token = readBearerToken(req) ?? readCookieToken(req);
  if (!token) return null;

  const row = await env.DB.prepare(
    `SELECT s.token, s.expires_at, u.id, u.email, u.name, u.role, u.image, u.email_verified
     FROM session s
     INNER JOIN "user" u ON u.id = s.user_id
     WHERE s.token = ?
     LIMIT 1`,
  ).bind(token).first<Record<string, unknown>>();

  if (!row) return null;
  const expiresAt = Number(row.expires_at ?? 0);
  if (!Number.isFinite(expiresAt) || expiresAt <= nowMs()) {
    await env.DB.prepare('DELETE FROM session WHERE token = ?').bind(token).run();
    return null;
  }

  return { token, user: mapUserRow(row) };
}

export async function createSession(env: SimpleAuthEnv, userId: string): Promise<string> {
  const token = createRandomToken();
  const id = crypto.randomUUID();
  const now = nowMs();
  const expiresAt = now + SESSION_MAX_AGE_SECONDS * 1000;
  await env.DB.prepare(
    `INSERT INTO session (id, token, user_id, expires_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).bind(id, token, userId, expiresAt, now, now).run();
  return token;
}

export function buildSessionCookie(token: string): string {
  return `tgdd_session_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_MAX_AGE_SECONDS}`;
}

export function buildClearSessionCookie(): string {
  return 'tgdd_session_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0';
}

export async function findUserByEmail(env: SimpleAuthEnv, email: string): Promise<SimpleAuthUser | null> {
  const row = await env.DB.prepare(
    'SELECT id, email, name, role, image, email_verified FROM "user" WHERE email = ? LIMIT 1',
  ).bind(email.toLowerCase().trim()).first<Record<string, unknown>>();
  return row ? mapUserRow(row) : null;
}

export async function findCredentialAccountByEmail(env: SimpleAuthEnv, email: string): Promise<Record<string, unknown> | null> {
  return env.DB.prepare(
    `SELECT a.id, a.user_id, a.password, u.email_verified
     FROM account a
     INNER JOIN "user" u ON u.id = a.user_id
     WHERE a.provider_id = 'credential' AND a.account_id = ?
     LIMIT 1`,
  ).bind(email.toLowerCase().trim()).first<Record<string, unknown>>();
}

export async function createCredentialUser(env: SimpleAuthEnv, name: string, email: string, password: string): Promise<SimpleAuthUser> {
  const userId = crypto.randomUUID();
  const accountId = crypto.randomUUID();
  const now = nowMs();
  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = await hashPassword(password);

  await env.DB.prepare(
    `INSERT INTO "user" (id, name, email, email_verified, role, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(userId, name.trim(), normalizedEmail, 0, 'user', now, now).run();

  await env.DB.prepare(
    `INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  ).bind(accountId, normalizedEmail, 'credential', userId, passwordHash, now, now).run();

  return {
    id: userId,
    email: normalizedEmail,
    name: name.trim(),
    role: 'user',
    emailVerified: false,
  };
}

export async function upsertGoogleUser(
  env: SimpleAuthEnv,
  profile: { id: string; email: string; name?: string; picture?: string },
): Promise<SimpleAuthUser> {
  const normalizedEmail = profile.email.toLowerCase().trim();
  let user = await findUserByEmail(env, normalizedEmail);
  const now = nowMs();

  if (!user) {
    const userId = crypto.randomUUID();
    await env.DB.prepare(
      `INSERT INTO "user" (id, name, email, email_verified, image, role, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      userId,
      profile.name?.trim() || normalizedEmail.split('@')[0],
      normalizedEmail,
      1,
      profile.picture ?? null,
      'user',
      now,
      now,
    ).run();

    await env.DB.prepare(
      `INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    ).bind(crypto.randomUUID(), profile.id, 'google', userId, now, now).run();

    user = {
      id: userId,
      email: normalizedEmail,
      name: profile.name?.trim() || normalizedEmail.split('@')[0],
      role: 'user',
      image: profile.picture ?? null,
      emailVerified: true,
    };
  } else {
    await env.DB.prepare(
      'UPDATE "user" SET name = COALESCE(?, name), image = COALESCE(?, image), email_verified = 1, updated_at = ? WHERE id = ?',
    ).bind(profile.name?.trim() || null, profile.picture ?? null, now, user.id).run();

    const existingGoogleAccount = await env.DB.prepare(
      'SELECT id FROM account WHERE provider_id = ? AND account_id = ? LIMIT 1',
    ).bind('google', profile.id).first<Record<string, unknown>>();

    if (!existingGoogleAccount) {
      await env.DB.prepare(
        `INSERT INTO account (id, account_id, provider_id, user_id, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      ).bind(crypto.randomUUID(), profile.id, 'google', user.id, now, now).run();
    }

    user = { ...user, name: profile.name?.trim() || user.name, image: profile.picture ?? user.image, emailVerified: true };
  }

  return user;
}

export async function storeResetToken(env: SimpleAuthEnv, email: string): Promise<string> {
  const token = createRandomToken();
  const now = nowMs();
  const expiresAt = now + 30 * 60 * 1000;
  await env.DB.prepare(
    'INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(token, 'password_reset', email.toLowerCase().trim(), expiresAt, now, now).run();
  return token;
}

export async function consumeResetToken(env: SimpleAuthEnv, token: string): Promise<string | null> {
  const row = await env.DB.prepare(
    'SELECT id, value, expires_at FROM verification WHERE id = ? AND identifier = ? LIMIT 1',
  ).bind(token, 'password_reset').first<Record<string, unknown>>();
  if (!row) return null;

  await env.DB.prepare('DELETE FROM verification WHERE id = ?').bind(token).run();

  const expiresAt = Number(row.expires_at ?? 0);
  if (!Number.isFinite(expiresAt) || expiresAt < nowMs()) return null;
  return String(row.value ?? '').toLowerCase().trim();
}

export async function consumeEmailVerifyToken(env: SimpleAuthEnv, token: string): Promise<string | null> {
  const row = await env.DB.prepare(
    'SELECT id, value, expires_at FROM verification WHERE id = ? AND identifier = ? LIMIT 1',
  ).bind(token, 'email_verify').first<Record<string, unknown>>();
  if (!row) return null;

  await env.DB.prepare('DELETE FROM verification WHERE id = ?').bind(token).run();

  const expiresAt = Number(row.expires_at ?? 0);
  if (!Number.isFinite(expiresAt) || expiresAt < nowMs()) return null;
  return String(row.value ?? '').toLowerCase().trim();
}

export async function createEmailVerifyToken(env: SimpleAuthEnv, email: string): Promise<string> {
  const token = createRandomToken();
  const now = nowMs();
  const expiresAt = now + 24 * 60 * 60 * 1000;
  await env.DB.prepare(
    'INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(token, 'email_verify', email.toLowerCase().trim(), expiresAt, now, now).run();
  return token;
}

export async function createOAuthState(env: SimpleAuthEnv, callbackURL: string): Promise<string> {
  const state = createRandomToken(24);
  const now = nowMs();
  const expiresAt = now + 10 * 60 * 1000;
  await env.DB.prepare(
    'INSERT INTO verification (id, identifier, value, expires_at, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).bind(state, 'oauth_state', callbackURL, expiresAt, now, now).run();
  return state;
}

export async function consumeOAuthState(env: SimpleAuthEnv, state: string): Promise<string | null> {
  const row = await env.DB.prepare(
    'SELECT id, value, expires_at FROM verification WHERE id = ? AND identifier = ? LIMIT 1',
  ).bind(state, 'oauth_state').first<Record<string, unknown>>();
  if (!row) return null;

  await env.DB.prepare('DELETE FROM verification WHERE id = ?').bind(state).run();

  const expiresAt = Number(row.expires_at ?? 0);
  if (!Number.isFinite(expiresAt) || expiresAt < nowMs()) return null;
  return String(row.value ?? '');
}

export function buildGoogleOAuthUrl(params: {
  clientId: string;
  redirectUri: string;
  state: string;
}) {
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.searchParams.set('client_id', params.clientId);
  url.searchParams.set('redirect_uri', params.redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'openid email profile');
  url.searchParams.set('access_type', 'offline');
  url.searchParams.set('prompt', 'select_account');
  url.searchParams.set('state', params.state);
  return url.toString();
}

export async function exchangeGoogleCode(params: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<{ id: string; email: string; name?: string; picture?: string }> {
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code: params.code,
      client_id: params.clientId,
      client_secret: params.clientSecret,
      redirect_uri: params.redirectUri,
      grant_type: 'authorization_code',
    }).toString(),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    throw new Error(`Google token exchange failed: ${tokenRes.status} ${detail}`);
  }

  const tokenData = await tokenRes.json() as { access_token?: string };
  if (!tokenData.access_token) {
    throw new Error('Google token exchange returned no access token');
  }

  const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!profileRes.ok) {
    const detail = await profileRes.text();
    throw new Error(`Google userinfo failed: ${profileRes.status} ${detail}`);
  }

  const profile = await profileRes.json() as {
    id?: string;
    email?: string;
    name?: string;
    picture?: string;
  };

  if (!profile.id || !profile.email) {
    throw new Error('Google account profile is missing id/email');
  }

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name,
    picture: profile.picture,
  };
}
