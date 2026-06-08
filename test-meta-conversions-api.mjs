/**
 * Test script for Meta Conversions API integration
 * Tests CompleteRegistration and Purchase events with proper deduplication
 */

import crypto from 'crypto';

const API_URL = 'http://localhost:3000/api/trpc';
const TEST_EMAIL = 'test+sportsday@6plus1.co.uk';

// Helper to make tRPC calls with proper HTTP format
async function callTRPC(procedure, input) {
  const url = `${API_URL}/${procedure}?batch=1`;
  console.log(`\n[tRPC] Calling: ${procedure}`);
  console.log(`[tRPC] Input:`, JSON.stringify(input, null, 2));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify([{ input }]), // tRPC batch format: array of {input} objects
  });

  const data = await response.json();
  console.log(`[tRPC] Response:`, JSON.stringify(data, null, 2));
  
  // Handle batch response format
  if (Array.isArray(data) && data.length > 0) {
    return data[0];
  }
  return data[0] || data;
}

// Test 1: Register a test user to trigger CompleteRegistration event
async function testCompleteRegistrationEvent() {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 1: CompleteRegistration Event');
  console.log('='.repeat(80));

  const eventId = crypto.randomUUID();
  console.log(`[Test] Generated eventId for deduplication: ${eventId}`);

  const registrationInput = {
    fullName: 'Test User Meta API',
    email: TEST_EMAIL,
    instagramHandle: 'testuser',
    attendedBefore: true,
    comingType: 'solo',
    date4July: true,
    date11July: false,
    date18July: false,
    dateAny: false,
    competitiveness: 'balanced',
    teammateType: 'motivator',
    strongestEvent: 'speed',
    fear: 'nothing',
    eventMotivation: 'Test for Meta Conversions API',
    captainVoteInterest: 'maybe',
    shirtSize: 'M',
    shirtFit: 'regular',
    healthNotes: 'Test user',
    contentConsent: 'yes',
    marketingConsent: true,
    eventId, // Pass the UUID for deduplication
  };

  try {
    const result = await callTRPC('sportsday.register', registrationInput);

    if (result.error) {
      console.error('[Error] Registration failed:', result.error);
      return null;
    }

    const registrationId = result.result?.data?.id;
    console.log(`\n[Success] Registration created with ID: ${registrationId}`);
    console.log(`[Success] EventId for CompleteRegistration: ${eventId}`);
    console.log(`[Expected] Meta Conversions API should have received:`);
    console.log(`  - event_name: CompleteRegistration`);
    console.log(`  - event_id: ${eventId}`);
    console.log(`  - email: (SHA-256 hashed)`);

    return { registrationId, eventId };
  } catch (err) {
    console.error('[Error] Registration call failed:', err.message);
    return null;
  }
}

// Test 2: Simulate Stripe webhook to trigger Purchase event
async function testPurchaseEvent(registrationId) {
  console.log('\n' + '='.repeat(80));
  console.log('TEST 2: Purchase Event (via Stripe Webhook Simulation)');
  console.log('='.repeat(80));

  const paymentIntentId = `pi_test_${crypto.randomBytes(16).toString('hex')}`;
  console.log(`[Test] Generated paymentIntentId: ${paymentIntentId}`);

  // Simulate Stripe webhook payload
  const webhookPayload = {
    id: `evt_test_${crypto.randomBytes(16).toString('hex')}`,
    object: 'event',
    type: 'payment_intent.succeeded',
    data: {
      object: {
        id: paymentIntentId,
        object: 'payment_intent',
        amount: 2200, // £22.00 in pence
        currency: 'gbp',
        status: 'succeeded',
        metadata: {
          registration_id: registrationId,
          unlock_token: crypto.randomUUID(),
          registered_email: TEST_EMAIL,
        },
      },
    },
  };

  console.log(`[Webhook] Simulating Stripe webhook:`);
  console.log(JSON.stringify(webhookPayload, null, 2));

  try {
    const response = await fetch('http://localhost:3000/api/stripe/webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'test_signature_ignored_in_test',
      },
      body: JSON.stringify(webhookPayload),
    });

    const result = await response.text();
    console.log(`[Webhook] Response status: ${response.status}`);
    console.log(`[Webhook] Response:`, result);

    console.log(`\n[Expected] Meta Conversions API should have received:`);
    console.log(`  - event_name: Purchase`);
    console.log(`  - event_id: ${paymentIntentId}`);
    console.log(`  - value: 22`);
    console.log(`  - currency: GBP`);
    console.log(`  - email: (SHA-256 hashed)`);

    return paymentIntentId;
  } catch (err) {
    console.error('[Error] Webhook call failed:', err.message);
    return null;
  }
}

// Main test execution
async function runTests() {
  console.log('\n' + '█'.repeat(80));
  console.log('META CONVERSIONS API TEST SUITE');
  console.log('█'.repeat(80));
  console.log(`Test Email: ${TEST_EMAIL}`);
  console.log(`API URL: ${API_URL}`);
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // Test 1: CompleteRegistration
  const reg = await testCompleteRegistrationEvent();
  if (!reg) {
    console.error('\n[Fatal] CompleteRegistration test failed, skipping Purchase test');
    process.exit(1);
  }

  // Wait a moment for async operations to complete
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 2: Purchase
  const paymentIntentId = await testPurchaseEvent(reg.registrationId);

  console.log('\n' + '█'.repeat(80));
  console.log('TEST SUMMARY');
  console.log('█'.repeat(80));
  console.log(`\n✓ CompleteRegistration Event:`);
  console.log(`  - Registration ID: ${reg.registrationId}`);
  console.log(`  - Event ID: ${reg.eventId}`);
  console.log(`  - Email: ${TEST_EMAIL}`);
  console.log(`  - Expected in Meta: 1 event (deduplicated)`);

  if (paymentIntentId) {
    console.log(`\n✓ Purchase Event:`);
    console.log(`  - Payment Intent ID: ${paymentIntentId}`);
    console.log(`  - Amount: £22.00`);
    console.log(`  - Currency: GBP`);
    console.log(`  - Email: ${TEST_EMAIL}`);
    console.log(`  - Expected in Meta: 1 event (deduplicated)`);
  }

  console.log('\n' + '█'.repeat(80));
  console.log('NEXT STEPS:');
  console.log('█'.repeat(80));
  console.log('1. Check Meta Events Manager Test Events tab');
  console.log('2. Search for events with email: ' + TEST_EMAIL);
  console.log('3. Verify CompleteRegistration appears with eventId: ' + reg.eventId);
  console.log('4. Verify Purchase appears with value: 22, currency: GBP');
  console.log('5. Confirm deduplication (1 event per action, not 2)');
  console.log('6. Check data quality score improvement');
  console.log('\n');
}

// Run tests
runTests().catch(err => {
  console.error('[Fatal Error]', err);
  process.exit(1);
});
