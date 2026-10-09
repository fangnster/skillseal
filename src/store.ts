import { DatabaseSync, type SQLInputValue } from 'node:sqlite';
import {
  mkdirSync,
  chmodSync,
  writeFileSync,
  readFileSync,
  existsSync,
  readdirSync,
  statSync,
} from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { encrypt, decrypt } from './crypto.ts';
import type { Version, Order } from './types.ts';

export class Store {
  db: DatabaseSync;
  directory: string;
  masterKey: Buffer;
  constructor(directory: string, masterKey: Buffer) {
    this.directory = directory;
    this.masterKey = masterKey;
    mkdirSync(path.join(directory, 'bundles'), { recursive: true, mode: 0o700 });
    chmodSync(directory, 0o700);
    this.db = new DatabaseSync(path.join(directory, 'vault.sqlite'));
    this.db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS versions (id TEXT PRIMARY KEY, skill TEXT NOT NULL, version TEXT NOT NULL, publisher TEXT NOT NULL, payload TEXT NOT NULL, UNIQUE(publisher,skill,version));
      CREATE TABLE IF NOT EXISTS keys (id TEXT PRIMARY KEY REFERENCES versions(id), ciphertext BLOB NOT NULL);
      CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS challenges (id TEXT PRIMARY KEY, wallet TEXT NOT NULL, action TEXT NOT NULL, resource TEXT NOT NULL, public_key TEXT, message TEXT NOT NULL, expires INTEGER NOT NULL, consumed INTEGER NOT NULL DEFAULT 0);
      CREATE TABLE IF NOT EXISTS leases (id TEXT PRIMARY KEY, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS events (id TEXT PRIMARY KEY, kind TEXT NOT NULL, resource TEXT NOT NULL, time INTEGER NOT NULL, details TEXT NOT NULL, UNIQUE(kind,resource));
      CREATE TABLE IF NOT EXISTS mock_versions (id TEXT PRIMARY KEY, approvals TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS mock_orders (id TEXT PRIMARY KEY, payload TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS mock_balances (wallet TEXT PRIMARY KEY, amount TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS rate_limits (id TEXT PRIMARY KEY, count INTEGER NOT NULL, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS author_approvals (version_id TEXT NOT NULL REFERENCES versions(id), wallet TEXT NOT NULL, PRIMARY KEY(version_id,wallet));
      CREATE TABLE IF NOT EXISTS chain_costs (signature TEXT PRIMARY KEY, resource TEXT NOT NULL, phase TEXT NOT NULL, fee INTEGER NOT NULL, rent INTEGER NOT NULL);
    `);
    chmodSync(path.join(directory, 'vault.sqlite'), 0o600);
  }
  get<T>(sql: string, ...params: SQLInputValue[]) {
    return this.db.prepare(sql).get(...params) as T | undefined;
  }
  all<T>(sql: string, ...params: SQLInputValue[]) {
    return this.db.prepare(sql).all(...params) as T[];
  }
  run(sql: string, ...params: SQLInputValue[]) {
    return this.db.prepare(sql).run(...params);
  }
  transaction<T>(fn: () => T): T {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const value = fn();
      this.db.exec('COMMIT');
      return value;
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }
  version(id: string) {
    const row = this.get<{ payload: string }>('SELECT payload FROM versions WHERE id=?', id);
    return row ? (JSON.parse(row.payload) as Version) : undefined;
  }
  versions() {
    return this.all<{ payload: string }>('SELECT payload FROM versions ORDER BY rowid DESC').map(
      (r) => JSON.parse(r.payload) as Version,
    );
  }
  saveVersion(version: Version) {
    this.run('UPDATE versions SET payload=? WHERE id=?', JSON.stringify(version), version.id);
  }
  insertVersion(version: Version, bundle: Buffer, key: Buffer) {
    const file = path.join(this.directory, 'bundles', version.id + '.enc');
    if (!existsSync(file)) writeFileSync(file, bundle, { mode: 0o600, flag: 'wx' });
    const wrapped = encrypt(key, this.masterKey, 'skill-vault:key:' + version.id).ciphertext;
    this.transaction(() => {
      this.run(
        'INSERT INTO versions VALUES (?,?,?,?,?)',
        version.id,
        version.manifest.skillId,
        version.manifest.version,
        version.manifest.publisher,
        JSON.stringify(version),
      );
      this.run('INSERT INTO keys VALUES (?,?)', version.id, wrapped);
    });
  }
  storageBytes() {
    return readdirSync(path.join(this.directory, 'bundles')).reduce(
      (n, file) => n + statSync(path.join(this.directory, 'bundles', file)).size,
      0,
    );
  }
  bundle(id: string) {
    if (!/^[a-f0-9]{64}$/.test(id)) throw new Error('Invalid bundle id');
    return readFileSync(path.join(this.directory, 'bundles', id + '.enc'));
  }
  key(id: string) {
    const row = this.get<{ ciphertext: Uint8Array }>('SELECT ciphertext FROM keys WHERE id=?', id);
    if (!row) throw new Error('Missing content key');
    return decrypt(row.ciphertext, this.masterKey, 'skill-vault:key:' + id);
  }
  order(id: string) {
    const row = this.get<{ payload: string }>('SELECT payload FROM orders WHERE id=?', id);
    return row ? (JSON.parse(row.payload) as Order) : undefined;
  }
  orders() {
    return this.all<{ payload: string }>('SELECT payload FROM orders').map(
      (r) => JSON.parse(r.payload) as Order,
    );
  }
  saveOrder(order: Order) {
    this.run(
      'INSERT INTO orders VALUES (?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload',
      order.id,
      JSON.stringify(order),
    );
  }
  event(kind: string, resource: string, details: Record<string, unknown> = {}) {
    this.run(
      'INSERT OR IGNORE INTO events VALUES (?,?,?,?,?)',
      randomUUID(),
      kind,
      resource,
      Date.now(),
      JSON.stringify(details),
    );
  }
  lease(id: string, seconds = 90) {
    const now = Date.now();
    return Boolean(
      this.get(
        'INSERT INTO leases VALUES (?,?) ON CONFLICT(id) DO UPDATE SET expires=excluded.expires WHERE leases.expires < ? RETURNING id',
        id,
        now + seconds * 1000,
        now,
      ),
    );
  }
  release(id: string) {
    this.run('DELETE FROM leases WHERE id=?', id);
  }
  limit(id: string, max = 30) {
    return this.transaction(() => {
      const now = Date.now(),
        row = this.get<{ count: number; expires: number }>(
          'SELECT count,expires FROM rate_limits WHERE id=?',
          id,
        );
      if (!row || row.expires < now) {
        this.run(
          'INSERT INTO rate_limits VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET count=1,expires=excluded.expires',
          id,
          1,
          now + 60_000,
        );
        return true;
      }
      if (row.count >= max) return false;
      this.run('UPDATE rate_limits SET count=count+1 WHERE id=?', id);
      return true;
    });
  }
  close() {
    this.db.close();
  }
}
