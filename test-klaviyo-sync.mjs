import { handleSportsDayRegistration } from './server/_core/klaviyo.ts';

async function testSync() {
  console.log('[Test] Triggering Klaviyo sync for test registration...');
  
  const result = await handleSportsDayRegistration(
    'test.klaviyo.001@example.com',
    'Test Klaviyo',
    'blue',
    null,
    'M',
    'unpaid',
    true
  );

  console.log('[Test] Sync result:', result);
  console.log('[Test] Check Klaviyo profile for: test.klaviyo.001@example.com');
}

testSync().catch(err => console.error('[Test] Error:', err));
