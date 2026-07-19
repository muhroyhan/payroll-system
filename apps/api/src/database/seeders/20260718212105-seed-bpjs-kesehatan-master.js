'use strict';

const { randomUUID } = require('crypto');
const { getSeedCreatedBy } = require('../seed-helpers');

// Verified 2026-07-19: Perpres 64/2020, unchanged as of April 2026 (multiple
// sources confirm no increase announced). 5% total (1% employee / 4% company),
// wage cap Rp12,000,000/month.
const EFFECTIVE_START_DATE = '2020-07-01';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const createdBy = await getSeedCreatedBy(queryInterface);
    const now = new Date();

    await queryInterface.bulkInsert('bpjs_kesehatan_masters', [
      {
        id: randomUUID(),
        employee_rate: '0.01000',
        company_rate: '0.04000',
        wage_cap: '12000000.00',
        effective_start_date: EFFECTIVE_START_DATE,
        effective_end_date: null,
        created_by: createdBy,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('bpjs_kesehatan_masters', {
      effective_start_date: EFFECTIVE_START_DATE,
    });
  },
};
