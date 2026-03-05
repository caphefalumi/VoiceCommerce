import { createAuthClient } from 'better-auth/react';
import { adminClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
  // Point to same-origin /api for proxy
  baseURL: '',  // Empty = same origin
  basePath: '/api/auth',
  plugins: [adminClient()],
  fetchOptions: {
    credentials: 'include',
  },
});
