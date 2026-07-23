'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kasbon_deductions', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      kasbon_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'kasbon', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      // No FK — payroll_runs doesn't exist until Phase 8.
      payroll_run_id: { type: Sequelize.UUID, allowNull: false },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });

    // TC-KASBON-02 — the actual idempotency guarantee: the same payroll run
    // can never insert a second deduction row for the same kasbon, even
    // under concurrent/retried calls, because the DB itself rejects it.
    await queryInterface.addConstraint('kasbon_deductions', {
      fields: ['kasbon_id', 'payroll_run_id'],
      type: 'unique',
      name: 'kasbon_deductions_kasbon_id_payroll_run_id_unique',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kasbon_deductions');
  },
};
