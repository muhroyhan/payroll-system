'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('kasbon', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      request_date: { type: Sequelize.DATEONLY, allowNull: false },
      installment_count: { type: Sequelize.INTEGER, allowNull: false },
      installment_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      remaining_balance: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'rejected', 'paid_off'),
        allowNull: false,
        defaultValue: 'pending',
      },
      approved_by: { type: Sequelize.UUID, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('kasbon');
  },
};
