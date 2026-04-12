import type { MiddlewareHandler } from 'hono';
import { getSessionFromRequest, type SimpleAuthEnv } from '../lib/simple-auth';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  role?: string;
};

export const requireAuth: MiddlewareHandler<{ Bindings: SimpleAuthEnv; Variables: { user: AuthUser } }> =
  async (c, next) => {
    const session = await getSessionFromRequest(c.env, c.req.raw);
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    c.set('user', session.user as AuthUser);
    await next();
  };

export const requireAdmin: MiddlewareHandler<{ Bindings: SimpleAuthEnv; Variables: { user: AuthUser } }> =
  async (c, next) => {
    const session = await getSessionFromRequest(c.env, c.req.raw);
    if (!session) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    const userRole = session.user.role;
    if (userRole !== 'admin') {
      return c.json({ error: 'Forbidden: Admin access required' }, 403);
    }
    c.set('user', session.user as AuthUser);
    await next();
  };
