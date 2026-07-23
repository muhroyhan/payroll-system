'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('surat_peringatan', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      level: { type: Sequelize.ENUM('SP1', 'SP2', 'SP3'), allowNull: false },
      violation_description: { type: Sequelize.TEXT, allowNull: false },
      issue_date: { type: Sequelize.DATEONLY, allowNull: false },
      sanction_component_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'payslip_components', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      sanction_amount: { type: Sequelize.DECIMAL(15, 2), allowNull: true },
      issued_by: { type: Sequelize.UUID, allowNull: false },
      pdf_path: { type: Sequelize.STRING, allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('surat_peringatan');
  },
};
