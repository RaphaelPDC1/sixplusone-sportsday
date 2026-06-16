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
    
    console.log(`\n=== ${team.toUpperCase()} TEAM (${members.length} members) ===\n`);
    members.forEach((m, i) => {
      const captain = m.isCaptain ? ' [CAPTAIN]' : '';
      const status = m.revealStatus === 'unlocked' ? '✅' : '🔒';
      console.log(`${i + 1}. ${m.fullName}${captain} (${m.email}) ${status}`);
    });
  }
  
  process.exit(0);
})();
