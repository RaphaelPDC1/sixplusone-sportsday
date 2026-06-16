import { getDb } from './server/db.ts';
import { sportsDayRegistrations } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  const sen = await db
    .select()
    .from(sportsDayRegistrations)
    .where(eq(sportsDayRegistrations.email, 'raphael.togbe@yahoo.com'))
    .limit(1);

  if (sen.length > 0) {
    console.log(`Name: ${sen[0].fullName}`);
    console.log(`Email: ${sen[0].email}`);
    console.log(`Team: ${sen[0].team}`);
    console.log(`Status: ${sen[0].revealStatus}`);
  }
  
  process.exit(0);
})();
