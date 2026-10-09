import { server } from '../src/server.ts';
const { service } = server();
let stopped = false;
process.on('SIGINT', () => {
  stopped = true;
});
process.on('SIGTERM', () => {
  stopped = true;
});
console.log('Settlement worker started. Key material and input bodies are never logged.');
while (!stopped) {
  for (const version of service.store.versions().filter((v) => !v.active)) {
    try {
      await service.refreshVersion(version.id);
    } catch {
      /* retry registration/approval on next tick */
    }
  }
  for (const order of service.store
    .orders()
    .filter(
      (o) =>
        o.buyer &&
        ((o.status !== 'granted' && o.status !== 'refunded') ||
          (service.payments.costs &&
            !service.store.get(
              'SELECT id FROM events WHERE kind=? AND resource=?',
              'costs_recorded',
              o.id,
            ))),
    )) {
    try {
      await service.sync(order.id);
    } catch {
      /* Metrics record a safe failure code; recover after RPC restarts. */
    }
  }
  await new Promise((r) => setTimeout(r, 3000));
}
service.store.close();
