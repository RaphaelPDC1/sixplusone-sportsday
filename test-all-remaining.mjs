import { handleSportsDayTeamChange, handleSportsDayShirtUpdate, handleSportsDayAutoUnlock } from './server/_core/klaviyo.ts';

const EMAIL = 'test.klaviyo.001@example.com';

async function checkProfile() {
  const filterStr = encodeURIComponent(`equals(email,"${EMAIL}")`);
  const r = await fetch(`https://a.klaviyo.com/api/profiles?filter=${filterStr}`, {
    headers: { 'Authorization': `Klaviyo-API-Key ${process.env.KLAVIYO_API_KEY}`, 'revision': '2024-10-15' }
  });
  const d = await r.json();
  return d.data?.[0]?.attributes?.properties || null;
}

async function runTests() {
  // TEST 2: Team Reassignment
  console.log('\n[TEST 2] Team Reassignment: blue → pink');
  const t2 = await handleSportsDayTeamChange(EMAIL, 'pink');
  console.log('[TEST 2] Result:', t2);
  const p2 = await checkProfile();
  console.log('[TEST 2] Properties:', JSON.stringify({
    sports_day_002_team: p2?.sports_day_002_team,
    sports_day_002_team_updated_at: p2?.sports_day_002_team_updated_at
  }, null, 2));

  // TEST 3: Shirt Update
  console.log('\n[TEST 3] Shirt Update: size=L, fit=oversized');
  const t3 = await handleSportsDayShirtUpdate(EMAIL, 'L', 'oversized');
  console.log('[TEST 3] Result:', t3);
  const p3 = await checkProfile();
  console.log('[TEST 3] Properties:', JSON.stringify({
    sports_day_002_shirt_size: p3?.sports_day_002_shirt_size,
    sports_day_002_shirt_fit: p3?.sports_day_002_shirt_fit,
    sports_day_002_shirt_confirmed_at: p3?.sports_day_002_shirt_confirmed_at
  }, null, 2));

  // TEST 4: Auto-Unlock
  console.log('\n[TEST 4] Auto-Unlock (July 11th simulation)');
  const t4 = await handleSportsDayAutoUnlock(EMAIL, 'pink');
  console.log('[TEST 4] Result:', t4);
  const p4 = await checkProfile();
  console.log('[TEST 4] Properties:', JSON.stringify({
    sports_day_002_unlock_status: p4?.sports_day_002_unlock_status,
    sports_day_002_auto_unlocked: p4?.sports_day_002_auto_unlocked,
    sports_day_002_auto_unlocked_at: p4?.sports_day_002_auto_unlocked_at
  }, null, 2));

  console.log('\n✅ All 3 tests complete!');
}

runTests().catch(err => console.error('Error:', err));
