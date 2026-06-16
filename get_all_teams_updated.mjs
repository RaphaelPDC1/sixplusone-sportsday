import { getDb } from './server/db.ts';
import { sportsDayRegistrations } from './drizzle/schema.ts';
import { eq } from 'drizzle-orm';

(async () => {
  const db = await getDb();
  if (!db) {
    console.error('Database connection failed');
    process.exit(1);
  }

  const teams = ['red', 'blue', 'orange', 'pink'];
  const allData = {};
  
  for (const team of teams) {
    const members = await db
      .select({ 
        fullName: sportsDayRegistrations.fullName, 
        email: sportsDayRegistrations.email, 
        revealStatus: sportsDayRegistrations.revealStatus,
        isCaptain: sportsDayRegistrations.isCaptain
      })
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.team, team))
      .orderBy(sportsDayRegistrations.fullName);
    
    allData[team] = members;
  }
  
  // Output as JSON for easy parsing
  console.log(JSON.stringify(allData, null, 2));
  
  process.exit(0);
})();
