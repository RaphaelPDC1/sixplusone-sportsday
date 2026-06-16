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
  const stats = {};

  for (const team of teams) {
    const members = await db
      .select({ id: sportsDayRegistrations.id, revealStatus: sportsDayRegistrations.revealStatus })
      .from(sportsDayRegistrations)
      .where(eq(sportsDayRegistrations.team, team));
    
    const unlocked = members.filter(m => m.revealStatus === 'unlocked').length;
    stats[team] = {
      total: members.length,
      unlocked: unlocked,
      locked: members.length - unlocked
    };
  }

  console.log('Team Balance Report\n');
  console.log('Team    | Total | Unlocked | Locked');
  console.log('--------|-------|----------|--------');
  
  for (const team of teams) {
    const s = stats[team];
    console.log(`${team.padEnd(7)}| ${s.total.toString().padEnd(5)} | ${s.unlocked.toString().padEnd(8)} | ${s.locked}`);
  }

  const totals = teams.reduce((acc, t) => ({
    total: acc.total + stats[t].total,
    unlocked: acc.unlocked + stats[t].unlocked,
    locked: acc.locked + stats[t].locked
  }), { total: 0, unlocked: 0, locked: 0 });

  console.log('--------|-------|----------|--------');
  console.log(`TOTAL   | ${totals.total.toString().padEnd(5)} | ${totals.unlocked.toString().padEnd(8)} | ${totals.locked}`);
  console.log(`\nBalance: ${Math.max(...teams.map(t => stats[t].total)) - Math.min(...teams.map(t => stats[t].total))} member difference between largest and smallest team`);
  
  process.exit(0);
})();
