import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/auth-schema.ts',
  out: './drizzle',
  dialect: 'sqlite',
  driver: 'd1-http',
  dbCredentials: {
    accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
    databaseId: '92130798-781f-4f84-b289-f94cf781dd0f',
    token: process.env.CLOUDFLARE_API_TOKEN!,
  },
} satisfies Config;
