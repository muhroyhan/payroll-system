'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendance_records', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      date: { type: Sequelize.DATEONLY, allowNull: false },
      clock_in: { type: Sequelize.DATE, allowNull: true },
      clock_out: { type: Sequelize.DATE, allowNull: true },
      overtime_hours: { type: Sequelize.DECIMAL(5, 2), allowNull: false, defaultValue: 0 },
      is_holiday: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      is_on_leave: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      has_permission: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      has_missed_clock_out: { type: Sequelize.BOOLEAN, allowNull: false, defaultValue: false },
      source: {
        type: Sequelize.ENUM('fingerprint', 'manual', 'csv_import'),
        allowNull: false,
      },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    // §2.2 — composite index for (employee_id, period) queries; also enforces
    // TC-ATT-07's "exactly one row per employee/date" at the DB level.
    await queryInterface.addIndex('attendance_records', ['employee_id', 'date'], {
      name: 'attendance_records_employee_date_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attendance_records');
  },
};
