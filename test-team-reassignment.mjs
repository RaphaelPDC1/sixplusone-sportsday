import { handleSportsDayTeamChange } from './server/_core/klaviyo.ts';

async function testTeamChange() {
  console.log('\n[TEST 2] Team Reassignment Test');
  console.log('================================');
  
  const result = await handleSportsDayTeamChange(
    'test.klaviyo.001@example.com',
    'pink'  // Change from blue to pink
  );

  console.log('[TEST 2] Team change sync result:', result);
  console.log('[TEST 2] ✅ Team should be updated to pink');
}

testTeamChange().catch(err => console.error('[TEST 2] Error:', err));
