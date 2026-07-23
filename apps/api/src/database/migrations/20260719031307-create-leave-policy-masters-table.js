'use strict';

const SCOPE_TYPES = ['employee_type', 'position', 'department', 'division', 'employee'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('leave_policy_masters', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      leave_type_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'leave_types', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      scope_type: { type: Sequelize.ENUM(...SCOPE_TYPES), allowNull: false },
      scope_value: { type: Sequelize.UUID, allowNull: false },
      annual_quota: { type: Sequelize.INTEGER, allowNull: false },
      effective_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      effective_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('leave_policy_masters', ['scope_type', 'scope_value'], {
      name: 'leave_policy_masters_scope_idx',
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('leave_policy_masters');
  },
};
