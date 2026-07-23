'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendance_raw_logs', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      device_user_id: { type: Sequelize.STRING, allowNull: false },
      device_id: { type: Sequelize.STRING, allowNull: false },
      scan_time: { type: Sequelize.DATE, allowNull: false },
      scan_type: { type: Sequelize.ENUM('in', 'out'), allowNull: true },
      created_at: { type: Sequelize.DATE, allowNull: false },
    });
    // §2.2 — reconciliation queries by (device_user_id, device_id, scan_time range).
    await queryInterface.addIndex(
      'attendance_raw_logs',
      ['device_user_id', 'device_id', 'scan_time'],
      { name: 'attendance_raw_logs_device_scan_idx' },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attendance_raw_logs');
  },
};
