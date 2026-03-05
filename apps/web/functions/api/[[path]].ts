const WORKER_URL = 'https://api-worker.dangduytoan13l.workers.dev';

export const onRequest = async (ctx: { request: Request }) => {
  const url = new URL(ctx.request.url);
  const target = new URL(url.pathname + url.search, WORKER_URL);

  const req = new Request(target, {
    method: ctx.request.method,
    headers: ctx.request.headers,
    body: ['GET', 'HEAD'].includes(ctx.request.method) ? undefined : ctx.request.body,
    redirect: 'manual',
  });

  const res = await fetch(req);

  const headers = new Headers();

  for (const [key, value] of res.headers.entries()) {
    const lower = key.toLowerCase();
    if (lower === 'set-cookie') continue;
    if (lower === 'access-control-allow-origin') continue;
    if (lower === 'access-control-allow-credentials') continue;
    headers.append(key, value);
  }

  const rawSetCookie = res.headers.get('set-cookie');
  if (rawSetCookie) {
    const allCookies = (res.headers as unknown as { getAll(name: string): string[] }).getAll('set-cookie');
    const cookiesToProcess = allCookies.length > 0 ? allCookies : [rawSetCookie];
    for (const cookie of cookiesToProcess) {
      const cleaned = cookie
        .replace(/;\s*domain=[^;]*/gi, '')
        .replace(/;\s*samesite=[^;]*/gi, '')
        + '; SameSite=None; Secure';
      headers.append('set-cookie', cleaned);
    }
  }

  headers.set('access-control-allow-origin', url.origin);
  headers.set('access-control-allow-credentials', 'true');

  return new Response(
    res.status >= 300 && res.status < 400 ? null : res.body,
    { status: res.status, statusText: res.statusText, headers }
  );
};
