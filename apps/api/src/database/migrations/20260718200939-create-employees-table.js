'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('employees', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      name: { type: Sequelize.STRING, allowNull: false },
      nik: { type: Sequelize.STRING, allowNull: false, unique: true },
      npwp: { type: Sequelize.STRING, allowNull: true, unique: true },
      ptkp_status: {
        type: Sequelize.ENUM('TK/0', 'TK/1', 'TK/2', 'TK/3', 'K/0', 'K/1', 'K/2', 'K/3'),
        allowNull: false,
      },
      marital_status: {
        type: Sequelize.ENUM('single', 'married'),
        allowNull: false,
      },
      dependent_count: { type: Sequelize.TINYINT, allowNull: false, defaultValue: 0 },
      wife_income_combined: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      ptkp_manually_overridden: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      employment_status: {
        type: Sequelize.ENUM('tetap', 'tidak_tetap'),
        allowNull: false,
      },
      employee_type_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'employee_types', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      position_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'positions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      department_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'departments', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      division_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'divisions', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      location: { type: Sequelize.STRING, allowNull: true },
      bank_name: { type: Sequelize.STRING, allowNull: true },
      bank_account_number: { type: Sequelize.STRING, allowNull: true },
      bank_account_holder_name: { type: Sequelize.STRING, allowNull: true },
      start_date: { type: Sequelize.DATEONLY, allowNull: false },
      end_date: { type: Sequelize.DATEONLY, allowNull: true },
      status: {
        type: Sequelize.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('employees');
  },
};
