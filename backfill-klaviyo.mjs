import mysql from 'mysql2/promise';
import {
  handleSportsDayRegistration,
  handleSportsDayPayment,
} from './server/_core/klaviyo.ts';

async function backfillKlaviyoSync() {
  console.log('[Backfill] Starting Klaviyo sync for all existing registrations...\n');

  let connection;
  try {
    // Connect to database
    connection = await mysql.createConnection(process.env.DATABASE_URL);

    // Get all registrations
    const [registrations] = await connection.query(`
      SELECT 
        email, fullName, team, shirtSize, shirtFit, 
        paymentStatus, revealStatus, createdAt
      FROM sports_day_registrations
      ORDER BY createdAt ASC
    `);

    console.log(`[Backfill] Found ${registrations.length} registrations to sync\n`);

    let updated = 0;
    let failed = 0;
    const failedRecords = [];

    for (const reg of registrations) {
      try {
        console.log(`[Backfill] Processing: ${reg.email} (${reg.fullName})`);

        // Parse full name
        const nameParts = (reg.fullName || 'Unknown User').split(' ');
        const firstName = nameParts[0] || 'Unknown';
        const lastName = nameParts.slice(1).join(' ') || 'User';

        // Determine if paid
        const isPaid = reg.paymentStatus === 'paid';

        // Call the registration handler (marketing consent defaults to false for backfill)
        const result = await handleSportsDayRegistration(
          reg.email,
          firstName,
          lastName,
          reg.team || 'blue',
          reg.shirtSize || null,
          reg.shirtFit || null,
          false, // Default to false for backfill
          reg.createdAt || new Date()
        );

        if (!result) {
          console.log(`  ⚠️  Registration sync failed`);
          failed++;
          failedRecords.push({ email: reg.email, reason: 'registration_sync_failed' });
          continue;
        }

        console.log(`  ✅ Registration synced`);

        // If paid, also sync payment
        if (isPaid) {
          const paymentResult = await handleSportsDayPayment(
            reg.email,
            reg.team || 'blue',
            reg.shirtSize || null,
            reg.shirtFit || null
          );

          if (!paymentResult) {
            console.log(`  ⚠️  Payment sync failed (but registration was synced)`);
          } else {
            console.log(`  ✅ Payment synced`);
          }
        }

        updated++;
      } catch (err) {
        console.error(`  ❌ Error processing ${reg.email}:`, err?.message || String(err));
        failed++;
        failedRecords.push({ email: reg.email, reason: err?.message || 'unknown_error' });
      }
    }

    console.log('\n[Backfill] === SYNC COMPLETE ===');
    console.log(`Total registrations: ${registrations.length}`);
    console.log(`Profiles synced: ${updated}`);
    console.log(`Failed: ${failed}`);

    if (failedRecords.length > 0) {
      console.log('\n[Backfill] Failed records:');
      failedRecords.forEach(rec => {
        console.log(`  - ${rec.email}: ${rec.reason}`);
      });
    }

    console.log('\n[Backfill] ✅ Backfill sync complete!');
    process.exit(0);
  } catch (err) {
    console.error('[Backfill] Fatal error:', err);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

backfillKlaviyoSync();
