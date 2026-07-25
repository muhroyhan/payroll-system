'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // §5.8 payslips (CRU only, never delete). `taxable_gross` added beyond
    // §5.8's literal list (the ERD is a "starting point, expand as needed") so
    // the December annual true-up can aggregate the year's taxable income.
    await queryInterface.createTable('payslips', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      payroll_run_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'payroll_runs', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      gross_pay: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      taxable_gross: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      pph21_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      bpjs_kesehatan_employee: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      bpjs_kesehatan_company: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      bpjs_jht_employee: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      bpjs_jht_company: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      bpjs_jp_employee: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      bpjs_jp_company: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      bpjs_jkk_company: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      bpjs_jkm_company: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      net_pay: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      pdf_path: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // P8-T04 idempotency — one payslip per (run, employee). A retried
    // calculation chunk can never insert a second payslip for the same
    // employee; the DB rejects it (same DB-constraint pattern as
    // kasbon_deductions, P5-T02 — not a pre-check-then-insert).
    await queryInterface.addConstraint('payslips', {
      fields: ['payroll_run_id', 'employee_id'],
      type: 'unique',
      name: 'payslips_run_employee_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payslips');
  },
};
