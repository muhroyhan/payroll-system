'use strict';

const { randomUUID } = require('crypto');
const { getSeedCreatedBy } = require('../seed-helpers');

// R7 (P7-T01) — biaya jabatan 5% of gross, capped Rp 500,000/month =
// Rp 6,000,000/year. Figures per PMK 250/PMK.03/2008; unchanged under UU HPP.
// ⚠️ This value backs WE-05 version (a), which is confirmed against the
// official DJP calculator — but re-verify at build time when the tax engine
// (P7-T04) starts consuming it.
const EFFECTIVE_START_DATE = '2009-01-01';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const createdBy = await getSeedCreatedBy(queryInterface);
    const now = new Date();

    await queryInterface.bulkInsert('biaya_jabatan_masters', [
      {
        id: randomUUID(),
        rate: '0.05000',
        monthly_cap: '500000.00',
        annual_cap: '6000000.00',
        effective_start_date: EFFECTIVE_START_DATE,
        effective_end_date: null,
        created_by: createdBy,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('biaya_jabatan_masters', {
      effective_start_date: EFFECTIVE_START_DATE,
    });
  },
};
