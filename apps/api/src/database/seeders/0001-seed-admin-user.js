'use strict';

const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

const PASSWORD_SALT_ROUNDS = 10;

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const email = process.env.ADMIN_EMAIL ?? 'admin@payroll-system.local';

    const [existing] = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE email = :email LIMIT 1',
      { replacements: { email } },
    );
    if (existing.length > 0) {
      return;
    }

    const passwordHash = await bcrypt.hash(
      process.env.ADMIN_PASSWORD ?? 'ChangeMe123!',
      PASSWORD_SALT_ROUNDS,
    );

    await queryInterface.bulkInsert('users', [
      {
        id: randomUUID(),
        name: process.env.ADMIN_NAME ?? 'Default Admin',
        email,
        password_hash: passwordHash,
        role: 'admin',
        is_active: true,
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('users', {
      email: process.env.ADMIN_EMAIL ?? 'admin@payroll-system.local',
    });
  },
};
