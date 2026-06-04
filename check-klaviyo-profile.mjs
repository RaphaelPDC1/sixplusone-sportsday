const apiKey = process.env.KLAVIYO_API_KEY;
if (!apiKey) {
  console.error('[Check] KLAVIYO_API_KEY not set');
  process.exit(1);
}

async function checkProfile() {
  const email = 'test.klaviyo.001@example.com';
  console.log('[Check] Fetching Klaviyo profile for:', email);
  
  try {
    // Use the correct Klaviyo API v3 filter format
    const encodedEmail = encodeURIComponent(email);
    const filterStr = encodeURIComponent(`equals(email,"${email}")`);
    
    const url = `https://a.klaviyo.com/api/profiles?filter=${filterStr}`;
    console.log('[Check] URL:', url);
    
    const profileResponse = await fetch(url, {
      headers: {
        'Authorization': `Klaviyo-API-Key ${apiKey}`,
        'revision': '2024-10-15',
      },
    });

    const profileData = await profileResponse.json();
    console.log('\n[Check] Response:', JSON.stringify(profileData, null, 2));

    if (profileData.data && profileData.data.length > 0) {
      const profile = profileData.data[0];
      console.log('\n✅ Profile Found!');
      console.log('Profile ID:', profile.id);
      console.log('Email:', profile.attributes.email);
      console.log('Properties:', JSON.stringify(profile.attributes.properties, null, 2));
    } else if (profileData.errors) {
      console.log('\n❌ API Error:', profileData.errors[0].detail);
    } else {
      console.log('\n❌ No profiles found');
    }
  } catch (err) {
    console.error('[Check] Error:', err.message);
  }
}

checkProfile();
