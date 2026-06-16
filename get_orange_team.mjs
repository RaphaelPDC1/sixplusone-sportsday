import { getDb } from './server/db.ts';
import { sportsDayRegistrations } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  const members = await db
    .select({ fullName: sportsDayRegistrations.fullName, email: sportsDayRegistrations.email, revealStatus: sportsDayRegistrations.revealStatus })
    .from(sportsDayRegistrations)
    .where(eq(sportsDayRegistrations.team, 'orange'))
    .orderBy(sportsDayRegistrations.fullName);

  members.forEach((m, i) => {
    console.log(`${i + 1}. ${m.fullName} (${m.email}) - ${m.revealStatus}`);
  });
  console.log(`\nTotal: ${members.length} members`);
  process.exit(0);
})();
