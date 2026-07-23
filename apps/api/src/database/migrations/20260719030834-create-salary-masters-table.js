'use strict';

const SCOPE_TYPES = ['employee_type', 'position', 'department', 'division', 'employee'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('salary_masters', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      scope_type: { type: Sequelize.ENUM(...SCOPE_TYPES), allowNull: false },
      scope_value: { type: Sequelize.UUID, allowNull: false },
      base_salary: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      effective_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      effective_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    // §2.2 — resolver queries by (scope_type, scope_value).
    await queryInterface.addIndex('salary_masters', ['scope_type', 'scope_value'], {
      name: 'salary_masters_scope_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('salary_masters');
  },
};
