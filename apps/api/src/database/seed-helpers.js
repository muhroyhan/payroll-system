'use strict';

// Shared by the constant-table seeders (P1-T10) — not itself a seed file, so it
// lives outside src/database/seeders/ (sequelize-cli would try to run every
// file in that folder as a migration/seed).
async function getSeedCreatedBy(queryInterface) {
  const email = process.env.ADMIN_EMAIL ?? 'admin@payroll-system.local';
  const [rows] = await queryInterface.sequelize.query(
    'SELECT id FROM users WHERE email = :email LIMIT 1',
    { replacements: { email } },
  );
  if (rows.length === 0) {
    throw new Error(
      `Cannot seed constants: no user found for ${email}. Run the seed-admin-user seeder first.`,
    );
  }
  return rows[0].id;
}

module.exports = { getSeedCreatedBy };
