'use strict';

const { randomUUID } = require('crypto');
const { getSeedCreatedBy } = require('../seed-helpers');

// Verified 2026-07-19 against BPJS Ketenagakerjaan's own circular
// No. B/1226/022026 (25 Feb 2026): the JP wage cap rose from Rp10,547,400
// (effective 2025-03-01) to Rp11,086,300 (effective 2026-03-01), per the
// PP 45/2015 annual GDP-growth adjustment mechanism. JHT/JP/JKM rates are
// unchanged across both periods.
//
// JKK is risk-class dependent (0.24%-1.74%) and genuinely varies per company —
// seeded here at the lowest tier (Risk Class I, 0.24%) as a starting point;
// admin must update it to match this company's actual risk classification.
const ROWS = [
  {
    jht_employee_rate: '0.02000',
    jht_company_rate: '0.03700',
    jp_employee_rate: '0.01000',
    jp_company_rate: '0.02000',
    jp_wage_cap: '10547400.00',
    jkk_company_rate: '0.00240',
    jkm_company_rate: '0.00300',
    effective_start_date: '2025-03-01',
    effective_end_date: '2026-02-28',
  },
  {
    jht_employee_rate: '0.02000',
    jht_company_rate: '0.03700',
    jp_employee_rate: '0.01000',
    jp_company_rate: '0.02000',
    jp_wage_cap: '11086300.00',
    jkk_company_rate: '0.00240',
    jkm_company_rate: '0.00300',
    effective_start_date: '2026-03-01',
    effective_end_date: null,
  },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const createdBy = await getSeedCreatedBy(queryInterface);
    const now = new Date();

    await queryInterface.bulkInsert(
      'bpjs_ketenagakerjaan_masters',
      ROWS.map((row) => ({
        id: randomUUID(),
        ...row,
        created_by: createdBy,
        created_at: now,
        updated_at: now,
      })),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('bpjs_ketenagakerjaan_masters', {
      effective_start_date: ['2025-03-01', '2026-03-01'],
    });
  },
};
