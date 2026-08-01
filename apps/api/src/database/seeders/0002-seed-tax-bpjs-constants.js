'use strict';

const { randomUUID } = require('crypto');
const { getSeedCreatedBy } = require('../seed-helpers');

// Consolidated from the 6 former per-table seeders (PTKP, TER bracket, BPJS
// Kesehatan, BPJS Ketenagakerjaan, Biaya Jabatan, Pasal 17) — squashed
// pre-go-live, one file per domain area instead of one per table. Depends on
// the admin user existing (getSeedCreatedBy), so this must run AFTER
// 0001-seed-admin-user.

// ---------------------------------------------------------------------------
// PTKP (Penghasilan Tidak Kena Pajak)
// Verified against pajak.go.id (PMK 168/2023 groupings) on 2026-07-19.
// Effective since PP 58/2023 / PMK 168/2023 (2024-01-01).
// ---------------------------------------------------------------------------
const PTKP_EFFECTIVE_START_DATE = '2024-01-01';
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

// ---------------------------------------------------------------------------
// TER (Tarif Efektif Rata-rata) brackets
// Verified against the official PMK 168/2023 lampiran (Tarif Efektif
// Rata-rata Bulanan), as published on pajak.go.id, on 2026-07-19. Effective
// 2024-01-01 (PP 58/2023 / PMK 168/2023). Upper bound null = highest/no-bound
// bracket.
// ---------------------------------------------------------------------------
const TER_EFFECTIVE_START_DATE = '2024-01-01';

// prettier-ignore
const TER_A = [
  [0, 5400000, '0.00000'],
  [5400001, 5650000, '0.00250'],
  [5650001, 5950000, '0.00500'],
  [5950001, 6300000, '0.00750'],
  [6300001, 6750000, '0.01000'],
  [6750001, 7500000, '0.01250'],
  [7500001, 8550000, '0.01500'],
  [8550001, 9650000, '0.01750'],
  [9650001, 10050000, '0.02000'],
  [10050001, 10350000, '0.02250'],
  [10350001, 10700000, '0.02500'],
  [10700001, 11050000, '0.03000'],
  [11050001, 11600000, '0.03500'],
  [11600001, 12500000, '0.04000'],
  [12500001, 13750000, '0.05000'],
  [13750001, 15100000, '0.06000'],
  [15100001, 16950000, '0.07000'],
  [16950001, 19750000, '0.08000'],
  [19750001, 24150000, '0.09000'],
  [24150001, 26450000, '0.10000'],
  [26450001, 28000000, '0.11000'],
  [28000001, 30050000, '0.12000'],
  [30050001, 32400000, '0.13000'],
  [32400001, 35400000, '0.14000'],
  [35400001, 39100000, '0.15000'],
  [39100001, 43850000, '0.16000'],
  [43850001, 47800000, '0.17000'],
  [47800001, 51400000, '0.18000'],
  [51400001, 56300000, '0.19000'],
  [56300001, 62200000, '0.20000'],
  [62200001, 68600000, '0.21000'],
  [68600001, 77500000, '0.22000'],
  [77500001, 89000000, '0.23000'],
  [89000001, 103000000, '0.24000'],
  [103000001, 125000000, '0.25000'],
  [125000001, 157000000, '0.26000'],
  [157000001, 206000000, '0.27000'],
  [206000001, 337000000, '0.28000'],
  [337000001, 454000000, '0.29000'],
  [454000001, 550000000, '0.30000'],
  [550000001, 695000000, '0.31000'],
  [695000001, 910000000, '0.32000'],
  [910000001, 1400000000, '0.33000'],
  [1400000001, null, '0.34000'],
];

// prettier-ignore
const TER_B = [
  [0, 6200000, '0.00000'],
  [6200001, 6500000, '0.00250'],
  [6500001, 6850000, '0.00500'],
  [6850001, 7300000, '0.00750'],
  [7300001, 9200000, '0.01000'],
  [9200001, 10750000, '0.01500'],
  [10750001, 11250000, '0.02000'],
  [11250001, 11600000, '0.02500'],
  [11600001, 12600000, '0.03000'],
  [12600001, 13600000, '0.04000'],
  [13600001, 14950000, '0.05000'],
  [14950001, 16400000, '0.06000'],
  [16400001, 18450000, '0.07000'],
  [18450001, 21850000, '0.08000'],
  [21850001, 26000000, '0.09000'],
  [26000001, 27700000, '0.10000'],
  [27700001, 29350000, '0.11000'],
  [29350001, 31450000, '0.12000'],
  [31450001, 33950000, '0.13000'],
  [33950001, 37100000, '0.14000'],
  [37100001, 41100000, '0.15000'],
  [41100001, 45800000, '0.16000'],
  [45800001, 49500000, '0.17000'],
  [49500001, 53800000, '0.18000'],
  [53800001, 58500000, '0.19000'],
  [58500001, 64000000, '0.20000'],
  [64000001, 71000000, '0.21000'],
  [71000001, 80000000, '0.22000'],
  [80000001, 93000000, '0.23000'],
  [93000001, 109000000, '0.24000'],
  [109000001, 129000000, '0.25000'],
  [129000001, 163000000, '0.26000'],
  [163000001, 211000000, '0.27000'],
  [211000001, 374000000, '0.28000'],
  [374000001, 459000000, '0.29000'],
  [459000001, 555000000, '0.30000'],
  [555000001, 704000000, '0.31000'],
  [704000001, 957000000, '0.32000'],
  [957000001, 1405000000, '0.33000'],
  [1405000001, null, '0.34000'],
];

// prettier-ignore
const TER_C = [
  [0, 6600000, '0.00000'],
  [6600001, 6950000, '0.00250'],
  [6950001, 7350000, '0.00500'],
  [7350001, 7800000, '0.00750'],
  [7800001, 8850000, '0.01000'],
  [8850001, 9800000, '0.01250'],
  [9800001, 10950000, '0.01500'],
  [10950001, 11200000, '0.01750'],
  [11200001, 12050000, '0.02000'],
  [12050001, 12950000, '0.03000'],
  [12950001, 14150000, '0.04000'],
  [14150001, 15550000, '0.05000'],
  [15550001, 17050000, '0.06000'],
  [17050001, 19500000, '0.07000'],
  [19500001, 22700000, '0.08000'],
  [22700001, 26600000, '0.09000'],
  [26600001, 28100000, '0.10000'],
  [28100001, 30100000, '0.11000'],
  [30100001, 32600000, '0.12000'],
  [32600001, 35400000, '0.13000'],
  [35400001, 38900000, '0.14000'],
  [38900001, 43000000, '0.15000'],
  [43000001, 47400000, '0.16000'],
  [47400001, 51200000, '0.17000'],
  [51200001, 55800000, '0.18000'],
  [55800001, 60400000, '0.19000'],
  [60400001, 66700000, '0.20000'],
  [66700001, 74500000, '0.21000'],
  [74500001, 83200000, '0.22000'],
  [83200001, 95600000, '0.23000'],
  [95600001, 110000000, '0.24000'],
  [110000001, 134000000, '0.25000'],
  [134000001, 169000000, '0.26000'],
  [169000001, 221000000, '0.27000'],
  [221000001, 390000000, '0.28000'],
  [390000001, 463000000, '0.29000'],
  [463000001, 561000000, '0.30000'],
  [561000001, 709000000, '0.31000'],
  [709000001, 965000000, '0.32000'],
  [965000001, 1419000000, '0.33000'],
  [1419000001, null, '0.34000'],
];

function terRows(category, brackets, createdBy, now) {
  return brackets.map(([lower, upper, rate]) => ({
    id: randomUUID(),
    ter_category: category,
    income_lower_bound: String(lower),
    income_upper_bound: upper === null ? null : String(upper),
    rate,
    effective_start_date: TER_EFFECTIVE_START_DATE,
    effective_end_date: null,
    created_by: createdBy,
    created_at: now,
    updated_at: now,
  }));
}

// ---------------------------------------------------------------------------
// BPJS Kesehatan
// Verified 2026-07-19: Perpres 64/2020, unchanged as of April 2026 (multiple
// sources confirm no increase announced). 5% total (1% employee / 4%
// company), wage cap Rp12,000,000/month.
// ---------------------------------------------------------------------------
const BPJS_KESEHATAN_EFFECTIVE_START_DATE = '2020-07-01';

// ---------------------------------------------------------------------------
// BPJS Ketenagakerjaan
// Verified 2026-07-19 against BPJS Ketenagakerjaan's own circular
// No. B/1226/022026 (25 Feb 2026): the JP wage cap rose from Rp10,547,400
// (effective 2025-03-01) to Rp11,086,300 (effective 2026-03-01), per the
// PP 45/2015 annual GDP-growth adjustment mechanism. JHT/JP/JKM rates are
// unchanged across both periods.
//
// JKK is risk-class dependent (0.24%-1.74%) and genuinely varies per
// company — seeded here at the lowest tier (Risk Class I, 0.24%) as a
// starting point; admin must update it to match this company's actual risk
// classification.
// ---------------------------------------------------------------------------
const BPJS_KETENAGAKERJAAN_ROWS = [
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

// ---------------------------------------------------------------------------
// Biaya Jabatan
// R7 (P7-T01) — 5% of gross, capped Rp 500,000/month = Rp 6,000,000/year.
// Figures per PMK 250/PMK.03/2008; unchanged under UU HPP. This value backs
// WE-05 version (a), confirmed against the official DJP calculator.
// ---------------------------------------------------------------------------
const BIAYA_JABATAN_EFFECTIVE_START_DATE = '2009-01-01';

// ---------------------------------------------------------------------------
// Pasal 17 progressive brackets
// R7 (P7-T01) — per UU HPP (UU 7/2021), effective 2022-01-01. Inclusive
// bounds, upper null = open-ended top bracket (same convention as
// ter_bracket_masters). Backs WE-05 version (a), confirmed against the
// official DJP calculator.
// ---------------------------------------------------------------------------
const PASAL17_EFFECTIVE_START_DATE = '2022-01-01';
// [lower, upper|null, rate]
const PASAL17_BRACKETS = [
  [0, 60000000, '0.05000'],
  [60000001, 250000000, '0.15000'],
  [250000001, 500000000, '0.25000'],
  [500000001, 5000000000, '0.30000'],
  [5000000001, null, '0.35000'],
];

// Guards each table's insert so re-running this seeder (e.g. `pnpm db:seed`
// invoked more than once against the same database — sequelize-cli's default
// json seed-storage tracks completion in a local file, not the database, so
// nothing stops a second run) can't create duplicate effective-dated rows.
// A duplicate open-ended (effectiveEndDate=null) row per category is exactly
// the pre-existing-overlap state closeOverlappingPredecessor refuses to
// auto-resolve (TAX-001).
async function tableIsEmpty(queryInterface, tableName) {
  const [rows] = await queryInterface.sequelize.query(
    `SELECT 1 FROM ${tableName} LIMIT 1`,
  );
  return rows.length === 0;
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const createdBy = await getSeedCreatedBy(queryInterface);
    const now = new Date();

    if (await tableIsEmpty(queryInterface, 'ptkp_masters')) {
      await queryInterface.bulkInsert(
        'ptkp_masters',
        PTKP_AMOUNTS.map((row) => ({
          id: randomUUID(),
          ptkp_status: row.ptkp_status,
          amount: row.amount,
          effective_start_date: PTKP_EFFECTIVE_START_DATE,
          effective_end_date: null,
          created_by: createdBy,
          created_at: now,
          updated_at: now,
        })),
      );
    }

    if (await tableIsEmpty(queryInterface, 'ter_bracket_masters')) {
      await queryInterface.bulkInsert('ter_bracket_masters', [
        ...terRows('A', TER_A, createdBy, now),
        ...terRows('B', TER_B, createdBy, now),
        ...terRows('C', TER_C, createdBy, now),
      ]);
    }

    if (await tableIsEmpty(queryInterface, 'bpjs_kesehatan_masters')) {
      await queryInterface.bulkInsert('bpjs_kesehatan_masters', [
        {
          id: randomUUID(),
          employee_rate: '0.01000',
          company_rate: '0.04000',
          wage_cap: '12000000.00',
          effective_start_date: BPJS_KESEHATAN_EFFECTIVE_START_DATE,
          effective_end_date: null,
          created_by: createdBy,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    if (await tableIsEmpty(queryInterface, 'bpjs_ketenagakerjaan_masters')) {
      await queryInterface.bulkInsert(
        'bpjs_ketenagakerjaan_masters',
        BPJS_KETENAGAKERJAAN_ROWS.map((row) => ({
          id: randomUUID(),
          ...row,
          created_by: createdBy,
          created_at: now,
          updated_at: now,
        })),
      );
    }

    if (await tableIsEmpty(queryInterface, 'biaya_jabatan_masters')) {
      await queryInterface.bulkInsert('biaya_jabatan_masters', [
        {
          id: randomUUID(),
          rate: '0.05000',
          monthly_cap: '500000.00',
          annual_cap: '6000000.00',
          effective_start_date: BIAYA_JABATAN_EFFECTIVE_START_DATE,
          effective_end_date: null,
          created_by: createdBy,
          created_at: now,
          updated_at: now,
        },
      ]);
    }

    if (await tableIsEmpty(queryInterface, 'pasal17_bracket_masters')) {
      await queryInterface.bulkInsert(
        'pasal17_bracket_masters',
        PASAL17_BRACKETS.map(([lower, upper, rate]) => ({
          id: randomUUID(),
          income_lower_bound: String(lower),
          income_upper_bound: upper === null ? null : String(upper),
          rate,
          effective_start_date: PASAL17_EFFECTIVE_START_DATE,
          effective_end_date: null,
          created_by: createdBy,
          created_at: now,
          updated_at: now,
        })),
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.bulkDelete('ptkp_masters', {
      effective_start_date: PTKP_EFFECTIVE_START_DATE,
    });
    await queryInterface.bulkDelete('ter_bracket_masters', {
      effective_start_date: TER_EFFECTIVE_START_DATE,
    });
    await queryInterface.bulkDelete('bpjs_kesehatan_masters', {
      effective_start_date: BPJS_KESEHATAN_EFFECTIVE_START_DATE,
    });
    await queryInterface.bulkDelete('bpjs_ketenagakerjaan_masters', {
      effective_start_date: ['2025-03-01', '2026-03-01'],
    });
    await queryInterface.bulkDelete('biaya_jabatan_masters', {
      effective_start_date: BIAYA_JABATAN_EFFECTIVE_START_DATE,
    });
    await queryInterface.bulkDelete('pasal17_bracket_masters', {
      effective_start_date: PASAL17_EFFECTIVE_START_DATE,
    });
  },
};
