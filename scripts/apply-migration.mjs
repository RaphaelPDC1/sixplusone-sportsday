import mysql from 'mysql2/promise';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await mysql.createConnection(url);

const statements = [
  `CREATE TABLE IF NOT EXISTS \`power_up_votes\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`voterId\` varchar(36) NOT NULL,
    \`team\` enum('red','blue','pink','orange') NOT NULL,
    \`powerUpId\` varchar(50) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`power_up_votes_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`voter_power_up_idx\` UNIQUE(\`voterId\`,\`powerUpId\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`sd_attendance\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`registrationId\` varchar(36) NOT NULL,
    \`team\` enum('red','blue','pink','orange') NOT NULL,
    \`present\` boolean NOT NULL DEFAULT false,
    \`markedAt\` timestamp,
    \`markedBy\` varchar(64),
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`updatedAt\` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`sd_attendance_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`sd_attendance_registrationId_unique\` UNIQUE(\`registrationId\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`sd_invite_codes\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`code\` varchar(16) NOT NULL,
    \`createdBy\` varchar(64) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`expiresAt\` timestamp,
    \`usedAt\` timestamp,
    \`usedByRegistrationId\` varchar(36),
    \`note\` text,
    \`maxUses\` int NOT NULL DEFAULT 1,
    \`useCount\` int NOT NULL DEFAULT 0,
    CONSTRAINT \`sd_invite_codes_id\` PRIMARY KEY(\`id\`),
    CONSTRAINT \`sd_invite_codes_code_unique\` UNIQUE(\`code\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`sd_power_up_votes\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`powerUpId\` int NOT NULL,
    \`userId\` int NOT NULL,
    \`vote\` boolean NOT NULL,
    \`weight\` varchar(10) NOT NULL,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    CONSTRAINT \`sd_power_up_votes_id\` PRIMARY KEY(\`id\`)
  )`,
  `CREATE TABLE IF NOT EXISTS \`sd_power_ups\` (
    \`id\` int AUTO_INCREMENT NOT NULL,
    \`type\` enum('boost','sabotage','block','double_down','all_in') NOT NULL,
    \`ownerTeam\` enum('red','blue','pink','orange') NOT NULL,
    \`eventId\` int NOT NULL,
    \`status\` enum('pending','active','resolved','blocked','failed') NOT NULL DEFAULT 'pending',
    \`targetTeam\` enum('red','blue','pink','orange'),
    \`targetPlayerId\` int,
    \`createdAt\` timestamp NOT NULL DEFAULT (now()),
    \`resolvedAt\` timestamp,
    CONSTRAINT \`sd_power_ups_id\` PRIMARY KEY(\`id\`)
  )`,
];

for (const sql of statements) {
  try {
    await conn.execute(sql);
    const tableName = sql.match(/CREATE TABLE IF NOT EXISTS `([^`]+)`/)?.[1];
    console.log(`✅ ${tableName} — OK`);
  } catch (err) {
    console.error(`❌ Error:`, err.message);
  }
}

await conn.end();
console.log('Migration complete.');
