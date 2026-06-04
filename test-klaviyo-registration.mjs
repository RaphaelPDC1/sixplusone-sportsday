const API_URL = 'http://localhost:3000/api/trpc/sportsday.register';

const testData = {
  fullName: 'Test Klaviyo',
  email: 'raphael.togbe@yahoo.com',
  instagramHandle: '@test_klaviyo',
  attendedBefore: false,
  comingType: 'solo',
  competitiveness: 'balanced',
  teammateType: 'strategist',
  strongestEvent: 'endurance',
  fear: 'nothing',
  contentConsent: 'yes',
  shirtSize: 'M',
  shirtFit: 'regular',
};

async function testRegistration() {
  try {
    console.log('[Test] Sending registration request...');
    console.log('[Test] Email:', testData.email);
    
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'sportsday.register',
        params: {
          input: testData,
        },
        id: 1,
      }),
    });

    const result = await response.json();
    console.log('[Test] Full Response:', JSON.stringify(result, null, 2));

    if (result.result?.data) {
      console.log('\n✅ Registration successful!');
      console.log('Registration ID:', result.result.data.id);
      console.log('Team:', result.result.data.team);
      console.log('Referral Code:', result.result.data.referralCode);
      return result.result.data.id;
    } else if (result.error) {
      console.error('\n❌ Error:', result.error.json?.message || result.error);
    }
  } catch (err) {
    console.error('[Test] Failed:', err.message);
  }
}

testRegistration();
