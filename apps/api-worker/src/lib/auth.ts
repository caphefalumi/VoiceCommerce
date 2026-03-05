import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin } from 'better-auth/plugins';
import { bearer } from 'better-auth/plugins';
import { getDb } from '../db';
import * as authSchema from '../db/auth-schema';

export type Env = {
  DB: D1Database;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL: string;
  MAILERSEND_API_KEY: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
};

export function createAuth(env: Env) {
  const db = getDb(env.DB);

  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: '/api/auth',

    database: drizzleAdapter(db, { provider: 'sqlite', schema: authSchema }),

    // ── Email + Password ──────────────────────────────────────────────────────
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      maxPasswordLength: 256,
      requireEmailVerification: false,
      revokeSessionsOnPasswordReset: true,
      resetPasswordTokenExpiresIn: 60 * 30,
      password: {
        hash: async (password) => {
          const enc = new TextEncoder();
          const keyMaterial = await crypto.subtle.importKey(
            'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
          );
          const salt = crypto.getRandomValues(new Uint8Array(16));
          const bits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
            keyMaterial, 256,
          );
          const hashHex = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
          const saltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');
          return `pbkdf2:${saltHex}:${hashHex}`;
        },
        verify: async ({ hash, password }) => {
          const [, saltHex, hashHex] = hash.split(':');
          const salt = new Uint8Array(saltHex.match(/.{2}/g)!.map(h => parseInt(h, 16)));
          const enc = new TextEncoder();
          const keyMaterial = await crypto.subtle.importKey(
            'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits'],
          );
          const bits = await crypto.subtle.deriveBits(
            { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100_000 },
            keyMaterial, 256,
          );
          const candidate = Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
          return candidate === hashHex;
        },
      },
      sendResetPassword: async ({ user, url }) => {
        await sendEmail(env.MAILERSEND_API_KEY, {
          to: user.email,
          subject: 'Đặt lại mật khẩu TGDD',
          html: `<p>Xin chào ${user.name},</p><p>Nhấn vào <a href="${url}">đây</a> để đặt lại mật khẩu. Link hết hạn sau 30 phút.</p><p>Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này.</p>`,
        });
      },
    },

    // ── Social Providers ──────────────────────────────────────────────────────
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },

    // ── Account Linking ───────────────────────────────────────────────────────
    account: {
      accountLinking: { enabled: true, trustedProviders: ['google'] },
      skipStateCookieCheck: true,
    },

    // ── Session ───────────────────────────────────────────────────────────────
    session: {
      expiresIn: 60 * 60 * 24 * 7,  // 7 days
      updateAge: 60 * 60 * 24,       // refresh daily
      cookieCache: {
        enabled: true,
        maxAge: 60 * 5,              // 5-minute local cache
      },
    },

    // ── Security ──────────────────────────────────────────────────────────────
    trustedOrigins: [
      'https://tgdd-frontend.pages.dev',
      'http://localhost:5173',
    ],
    advanced: {
      useSecureCookies: true,
      cookiePrefix: 'tgdd',
      ipAddress: { ipAddressHeaders: ['cf-connecting-ip', 'x-forwarded-for'] },
      defaultCookieAttributes: {
        sameSite: 'None',
        secure: true,
      },
    },

    // ── Plugins ───────────────────────────────────────────────────────────────
    plugins: [
      admin(),  // Roles: 'admin', 'user'
      bearer(), // Allow Authorization: Bearer <token> for AI worker API calls
    ],

    // ── Audit Hooks ───────────────────────────────────────────────────────────
    databaseHooks: {
      session: {
        create: {
          after: async (session: { userId: string }) => {
            console.log(`[audit] session.created userId=${session.userId}`);
          },
        },
      },
      user: {
        update: {
          after: async function(user: { id: string; email: string }) {
            console.log(`[audit] user.updated userId=${user.id}`);
          },
        },
      },
    },
  });
}

// ── MailerSend email helper (via fetch — no SDK needed on CF Workers) ──────────
async function sendEmail(
  apiKey: string,
  opts: { to: string; subject: string; html: string },
) {
  const res = await fetch('https://api.mailersend.com/v1/email', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
    body: JSON.stringify({
      from: { email: 'no-reply@tgdd.app', name: 'TGDD' },
      to: [{ email: opts.to }],
      subject: opts.subject,
      html: opts.html,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`[email] MailerSend error ${res.status}: ${text}`);
  }
}

export type Auth = ReturnType<typeof createAuth>;
