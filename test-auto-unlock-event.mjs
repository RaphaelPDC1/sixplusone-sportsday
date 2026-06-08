#!/usr/bin/env node

/**
 * Test script to fire "Sports Day 002 Auto Unlocked" event to Klaviyo
 * Usage: node test-auto-unlock-event.mjs
 */

import https from 'https';

const KLAVIYO_API_KEY = process.env.KLAVIYO_API_KEY;
const TEST_EMAIL = 'test+autounlock@6plus1.co.uk';
const EVENT_NAME = 'Sports Day 002 Auto Unlocked';

if (!KLAVIYO_API_KEY) {
  console.error('❌ KLAVIYO_API_KEY not set');
  process.exit(1);
}

function fireKlaviyoEvent(email, eventName, properties = {}) {
  return new Promise((resolve, reject) => {
    const payload = {
      data: {
        type: 'event',
        attributes: {
          metric: {
            data: {
              type: 'metric',
              attributes: {
                name: eventName,
              },
            },
          },
          profile: {
            data: {
              type: 'profile',
              attributes: {
                email: email,
              },
            },
          },
          properties: {
            sports_day_002_auto_unlocked: true,
            sports_day_002_unlock_status: 'auto_unlocked',
            sports_day_002_auto_unlocked_at: new Date().toISOString(),
            ...properties,
          },
        },
      },
    };

    const options = {
      hostname: 'a.klaviyo.com',
      port: 443,
      path: '/api/events/',
      method: 'POST',
      headers: {
        'Authorization': `Klaviyo-API-Key ${KLAVIYO_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'revision': '2024-10-15',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        if (res.statusCode === 201 || res.statusCode === 202 || res.statusCode === 204) {
          resolve({ success: true, status: res.statusCode, data });
        } else {
          reject(new Error(`Klaviyo API error: ${res.statusCode} - ${data}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

async function main() {
  try {
    console.log(`🚀 Firing test event: "${EVENT_NAME}"`);
    console.log(`📧 Email: ${TEST_EMAIL}`);
    console.log('');

    const result = await fireKlaviyoEvent(TEST_EMAIL, EVENT_NAME, {
      test_event: true,
      timestamp: new Date().toISOString(),
    });

    console.log('✅ Event fired successfully to Klaviyo!');
    console.log(`📊 Status: ${result.status}`);
    console.log('');
    console.log('📋 Event details:');
    console.log(`  - Event: "${EVENT_NAME}"`);
    console.log(`  - Email: ${TEST_EMAIL}`);
    console.log(`  - Properties:`);
    console.log(`    • sports_day_002_auto_unlocked: true`);
    console.log(`    • sports_day_002_unlock_status: auto_unlocked`);
    console.log(`    • sports_day_002_auto_unlocked_at: ${new Date().toISOString()}`);
    console.log('');
    console.log('✨ The event should now appear in Klaviyo flow trigger dropdown!');
    console.log('');
    console.log('🔗 Check Klaviyo: https://www.klaviyo.com/account/lists');
  } catch (error) {
    console.error('❌ Error firing event:', error.message);
    process.exit(1);
  }
}

main();
