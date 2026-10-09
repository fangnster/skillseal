import { server } from '../../../src/server.ts';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export async function GET() {
  try {
    const { service, config } = server();
    service.store.versions();
    return Response.json(
      { status: 'ready', backend: config.backend, network: 'devnet' },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch {
    return Response.json(
      { status: 'unavailable' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
}
