import type { MiddlewareHandler } from 'hono';
import { createAuth, type Env } from '../lib/auth';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role?: string;
};

export const requireAuth: MiddlewareHandler<{ Bindings: Env; Variables: { user: AuthUser } }> =
  async (c, next) => {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('user', session.user as AuthUser);
    await next();
  };

export const requireAdmin: MiddlewareHandler<{ Bindings: Env; Variables: { user: AuthUser } }> =
  async (c, next) => {
    const auth = createAuth(c.env);
    const session = await auth.api.getSession({ headers: c.req.raw.headers });
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const userRole = (session.user as any).role;
    if (userRole !== 'admin') {
      return c.json({ error: 'Forbidden: Admin access required' }, 403);
    }
    c.set('user', session.user as AuthUser);
    await next();
  };
