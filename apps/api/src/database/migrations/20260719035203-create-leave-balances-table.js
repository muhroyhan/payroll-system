'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('leave_balances', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      leave_type_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'leave_types', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      year: { type: Sequelize.INTEGER, allowNull: false },
      quota: { type: Sequelize.INTEGER, allowNull: false },
      used: { type: Sequelize.INTEGER, allowNull: false, defaultValue: 0 },
      manually_adjusted: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex(
      'leave_balances',
      ['employee_id', 'leave_type_id', 'year'],
      { name: 'leave_balances_unique', unique: true },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('leave_balances');
  },
};
