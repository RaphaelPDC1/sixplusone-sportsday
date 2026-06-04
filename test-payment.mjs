import { handleSportsDayPayment } from './server/_core/klaviyo.ts';

async function testPayment() {
  console.log('\n[TEST 1] Payment Webhook Test');
  console.log('================================');
  
  const result = await handleSportsDayPayment(
    'test.klaviyo.001@example.com',
    'blue'
  );

  console.log('[TEST 1] Payment sync result:', result);
  console.log('[TEST 1] ✅ Payment event should be fired');
}

testPayment().catch(err => console.error('[TEST 1] Error:', err));
