import { getDb } from './server/db.ts';
import { sportsDayRegistrations } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  const slew = await db
    .select()
    .from(sportsDayRegistrations)
    .where(eq(sportsDayRegistrations.email, 'jorom3slew@icloud.com'))
    .limit(1);

  if (slew.length > 0) {
    console.log(`Name: ${slew[0].fullName}`);
    console.log(`Email: ${slew[0].email}`);
    console.log(`Team: ${slew[0].team}`);
    console.log(`Captain: ${slew[0].isCaptain ? 'Yes' : 'No'}`);
  }
  
  process.exit(0);
})();
