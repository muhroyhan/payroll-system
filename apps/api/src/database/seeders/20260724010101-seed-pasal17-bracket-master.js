'use strict';

const { randomUUID } = require('crypto');
const { getSeedCreatedBy } = require('../seed-helpers');

// R7 (P7-T01) — progressive Pasal 17 brackets per UU HPP (UU 7/2021),
// effective 2022-01-01. Inclusive bounds, upper null = open-ended top bracket
// (same convention as ter_bracket_masters). Backs WE-05 version (a), confirmed
// against the official DJP calculator; re-verify at build time (P7-T04).
// [lower, upper|null, rate]
const BRACKETS = [
  [0, 60000000, '0.05000'],
  [60000001, 250000000, '0.15000'],
  [250000001, 500000000, '0.25000'],
  [500000001, 5000000000, '0.30000'],
  [5000000001, null, '0.35000'],
];

const EFFECTIVE_START_DATE = '2022-01-01';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const createdBy = await getSeedCreatedBy(queryInterface);
    const now = new Date();

    await queryInterface.bulkInsert(
      'pasal17_bracket_masters',
      BRACKETS.map(([lower, upper, rate]) => ({
        id: randomUUID(),
        income_lower_bound: String(lower),
        income_upper_bound: upper === null ? null : String(upper),
        rate,
        effective_start_date: EFFECTIVE_START_DATE,
        effective_end_date: null,
        created_by: createdBy,
        created_at: now,
        updated_at: now,
      })),
    );
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('pasal17_bracket_masters', {
      effective_start_date: EFFECTIVE_START_DATE,
    });
  },
};
