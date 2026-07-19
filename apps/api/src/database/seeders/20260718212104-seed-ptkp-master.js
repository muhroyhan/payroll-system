'use strict';

const { randomUUID } = require('crypto');
const { getSeedCreatedBy } = require('../seed-helpers');

// Verified against pajak.go.id (Penghasilan Tidak Kena Pajak, PMK 168/2023
// groupings) on 2026-07-19. Effective since PP 58/2023 / PMK 168/2023 (2024-01-01).
const PTKP_AMOUNTS = [
  { ptkp_status: 'TK/0', amount: '54000000.00' },
  { ptkp_status: 'TK/1', amount: '58500000.00' },
  { ptkp_status: 'TK/2', amount: '63000000.00' },
  { ptkp_status: 'TK/3', amount: '67500000.00' },
  { ptkp_status: 'K/0', amount: '58500000.00' },
  { ptkp_status: 'K/1', amount: '63000000.00' },
  { ptkp_status: 'K/2', amount: '67500000.00' },
  { ptkp_status: 'K/3', amount: '72000000.00' },
];

const EFFECTIVE_START_DATE = '2024-01-01';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const createdBy = await getSeedCreatedBy(queryInterface);
    const now = new Date();

    await queryInterface.bulkInsert(
      'ptkp_masters',
      PTKP_AMOUNTS.map((row) => ({
        id: randomUUID(),
        ptkp_status: row.ptkp_status,
        amount: row.amount,
        effective_start_date: EFFECTIVE_START_DATE,
        effective_end_date: null,
        created_by: createdBy,
        created_at: now,
        updated_at: now,
      })),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('ptkp_masters', {
      effective_start_date: EFFECTIVE_START_DATE,
    });
  },
};
