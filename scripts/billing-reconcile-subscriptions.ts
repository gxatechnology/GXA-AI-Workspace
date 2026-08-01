import dotenv from 'dotenv';
import os from 'os';
import path from 'path';
import { reconcileSubscriptions } from '../server/billing.js';
import { ApplicationPersistence } from '../server/persistence/index.js';

dotenv.config({ path: '.env.local', override: true, quiet: true });
dotenv.config({ quiet: true });

const jsonFallback = path.join(os.tmpdir(), 'gxa-ai-workspace', 'db.json');
const persistence = new ApplicationPersistence(process.env, jsonFallback);

try {
  await persistence.initialize();
  if (persistence.provider !== 'postgres') throw new Error('Reconciliation requires active PostgreSQL persistence.');
  const result = await persistence.runStandalone(async database => {
    const reconciled = await reconcileSubscriptions(database);
    persistence.write(database);
    return reconciled;
  });
  console.info(JSON.stringify({ event: 'billing.reconciliation_complete', inspected: result.inspected, repaired: result.repaired, failed: result.failed }));
  if (result.failed) process.exitCode = 1;
} catch (error) {
  console.error(JSON.stringify({ event: 'billing.reconciliation_failed', code: 'RECONCILIATION_FAILED', message: error instanceof Error ? error.message : 'Reconciliation failed.' }));
  process.exitCode = 1;
} finally {
  await persistence.close();
}
