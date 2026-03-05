const WORKER_URL = 'https://api-worker.dangduytoan13l.workers.dev';

export const onRequest = async (ctx: { request: Request }) => {
  const url = new URL(ctx.request.url);
  const target = new URL(url.pathname + url.search, WORKER_URL);

  const req = new Request(target, {
    method: ctx.request.method,
    headers: ctx.request.headers,
    body: ['GET', 'HEAD'].includes(ctx.request.method) ? undefined : ctx.request.body,
    redirect: 'follow',
  });

  const res = await fetch(req);

  const headers = new Headers(res.headers);
  headers.delete('access-control-allow-origin');
  headers.delete('access-control-allow-credentials');

  return new Response(res.body, {
    status: res.status,
    statusText: res.statusText,
    headers,
  });
};
