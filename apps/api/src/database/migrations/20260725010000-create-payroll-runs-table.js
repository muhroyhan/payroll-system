'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // §5.8 — schema exactly as documented. processed_count/total_count are
    // P8-T02 (calculation job) and are added there, not here.
    await queryInterface.createTable('payroll_runs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      period: { type: Sequelize.STRING, allowNull: false },
      status: {
        type: Sequelize.ENUM('draft', 'calculated', 'approved', 'disbursed'),
        allowNull: false,
        defaultValue: 'draft',
      },
      created_by: { type: Sequelize.UUID, allowNull: false },
      approved_by: { type: Sequelize.UUID, allowNull: true },
      locked_at: { type: Sequelize.DATE, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('payroll_runs', ['period'], {
      name: 'payroll_runs_period_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payroll_runs');
  },
};
