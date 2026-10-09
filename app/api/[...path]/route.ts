import { server } from '../../../src/server.ts';
import { AppError } from '../../../src/service.ts';
import { DEVNET_USDC } from '../../../src/types.ts';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Context = { params: Promise<{ path: string[] }> };
function json(data: unknown, status = 200) {
  return Response.json(data, { status, headers: { 'Cache-Control': 'no-store' } });
}
async function body(request: Request) {
  if (!request.body) throw new AppError(400, 'INVALID_BODY', 'JSON request body required');
  const reader = request.body.getReader(),
    parts: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > 24 * 1024 * 1024) {
      await reader.cancel();
      throw new AppError(413, 'TOO_LARGE', 'Request exceeds 24 MiB');
    }
    parts.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  } catch {
    throw new AppError(400, 'INVALID_JSON', 'Invalid JSON body');
  }
}
async function handle(request: Request, context: Context) {
  try {
    const { service, config } = server(),
      segments = (await context.params).path;
    const [area, id, operation] = segments,
      method = request.method;
    if (method === 'POST') {
      const origin = request.headers.get('origin');
      if (origin && origin !== config.origin)
        throw new AppError(403, 'ORIGIN', 'Cross-origin requests are not accepted');
      if (!service.store.limit(area + ':' + (id || 'global'), area === 'versions' ? 20 : 120))
        throw new AppError(429, 'RATE_LIMIT', 'Too many requests; retry in a minute');
    }
    if (method === 'GET' && area === 'config')
      return json({
        origin: config.origin,
        backend: config.backend,
        issuer: service.payments.issuer,
        mint: DEVNET_USDC,
        network: 'devnet',
        programId: config.programId,
      });
    if (method === 'GET' && area === 'versions' && !id) return json(service.store.versions());
    if (method === 'GET' && area === 'versions' && id && operation === 'bundle') {
      service.version(id);
      return new Response(new Uint8Array(service.store.bundle(id)), {
        headers: {
          'Content-Type': 'application/octet-stream',
          'Content-Disposition': `attachment; filename="${id}.skill.enc"`,
          'Cache-Control': 'public, max-age=31536000, immutable',
        },
      });
    }
    if (method === 'GET' && area === 'versions' && id) return json(service.version(id));
    if (method === 'POST' && area === 'versions' && !id)
      return json(await service.publish(await body(request)), 201);
    if (method === 'POST' && area === 'versions' && operation === 'approve') {
      const b = await body(request);
      return json(await service.approve(id, b.wallet, b.signature));
    }
    if (method === 'POST' && area === 'versions' && operation === 'sync')
      return json(await service.refreshVersion(id));
    if (method === 'POST' && area === 'orders' && !id) {
      const b = await body(request);
      return json(await service.createOrder(b.versionId, b.encryptionPublicKey), 201);
    }
    if (method === 'GET' && area === 'orders' && id)
      return json(service.publicOrder(service.order(id)));
    if (method === 'POST' && area === 'orders' && operation === 'challenge') {
      const b = await body(request);
      return json(service.challenge(id, b.wallet));
    }
    if (method === 'POST' && area === 'orders' && operation === 'bind') {
      const b = await body(request);
      return json(await service.bind(id, b.challengeId, b.signature));
    }
    if (method === 'POST' && area === 'orders' && operation === 'pay')
      return json(await service.payment(id));
    if (method === 'POST' && area === 'orders' && operation === 'sync')
      return json(await service.sync(id));
    if (method === 'POST' && area === 'orders' && operation === 'claim')
      return json(await service.claim(id));
    if (method === 'POST' && area === 'orders' && operation === 'refund')
      return json(await service.refund(id));
    if (method === 'POST' && area === 'demo' && operation === 'fund')
      return json(await service.demoFund(id));
    if (method === 'GET' && area === 'metrics') return json(service.metrics());
    throw new AppError(404, 'NOT_FOUND', 'API endpoint not found');
  } catch (error) {
    if (error instanceof AppError)
      return json({ error: error.message, code: error.code }, error.status);
    // Never serialize internal exceptions, input bodies or key material into API errors.
    return json(
      {
        error: 'Service unavailable. Check configuration or retry the same order.',
        code: 'SERVICE_UNAVAILABLE',
      },
      503,
    );
  }
}
export const GET = handle;
export const POST = handle;
