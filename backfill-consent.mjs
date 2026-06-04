import mysql from 'mysql2/promise';

const pool = mysql.createPool({
  host: process.env.DATABASE_HOST || 'localhost',
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'sportsday',
  waitForConnections: true,
  connectionLimit: 5,
  queueLimit: 0,
});

async function backfillConsent() {
  const conn = await pool.getConnection();
  try {
    console.log('Starting consent backfill...');

    // Get all registrations
    const [registrations] = await conn.query(`
      SELECT id, email, marketingConsent, operationalConsent 
      FROM sports_day_registrations
    `);

    console.log(`Found ${registrations.length} registrations`);

    let updated = 0;
    let skipped = 0;

    for (const reg of registrations) {
      // Set operational consent = true, marketing consent = false for all
      await conn.query(`
        UPDATE sports_day_registrations 
        SET 
          operationalConsent = true,
          operationalConsentReason = 'Submitting means we can contact you about Sports Day 002',
          operationalConsentSource = 'Sports Day 002 registration form',
          operationalConsentCapturedAt = NOW(),
          marketingConsent = false
        WHERE id = ?
      `, [reg.id]);

      updated++;
      if (updated % 10 === 0) {
        console.log(`✅ Updated ${updated} registrations...`);
      }
    }

    console.log(`\n✅ BACKFILL COMPLETE`);
    console.log(`Total registrations: ${registrations.length}`);
    console.log(`Total updated: ${updated}`);
    console.log(`All users now have: operational_consent=true, marketing_consent=false`);

  } catch (err) {
    console.error('Backfill failed:', err);
  } finally {
    await conn.release();
    await pool.end();
  }
}

backfillConsent();
