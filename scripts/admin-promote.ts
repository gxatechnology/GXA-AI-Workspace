import dotenv from 'dotenv';
import os from 'os';
import path from 'path';
import { setCanonicalAccountRole } from '../server/admin.js';
import { ApplicationPersistence } from '../server/persistence/index.js';

dotenv.config({ path: '.env.local', override: true, quiet: true });
dotenv.config({ quiet: true });

const valueFor = (name: string) => process.argv.find(argument => argument.startsWith(`${name}=`))?.slice(name.length + 1) || '';
const email = valueFor('--email');
const role = valueFor('--role');
if (!email || !role) throw new Error('Use --email="<existing-user-email>" --role=user|admin|super_admin.');
if (String(process.env.PERSISTENCE_PROVIDER || '').toLowerCase() !== 'postgres') throw new Error('Administrator role changes require PostgreSQL persistence.');

const persistence = new ApplicationPersistence(process.env, path.join(os.tmpdir(), 'gxa-ai-workspace', 'admin-cli-unused.json'));
try {
  await persistence.initialize();
  if (persistence.provider !== 'postgres') throw new Error('PostgreSQL is unavailable. No administrator role was changed.');
  const result = await persistence.runStandalone(db => {
    const changed = setCanonicalAccountRole(db, email, role);
    persistence.write(db);
    return changed;
  });
  console.log(JSON.stringify({ success: true, userId: result.userId, role: result.role, previousRole: result.previousRole, auditEventId: result.eventId, duplicate: result.duplicate }, null, 2));
} finally {
  await persistence.close();
}
