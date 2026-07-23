'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('fingerprints', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      employee_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'employees', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      device_user_id: { type: Sequelize.STRING, allowNull: false },
      device_id: { type: Sequelize.STRING, allowNull: false },
      enrolled_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('fingerprints', ['device_user_id', 'device_id'], {
      name: 'fingerprints_device_user_device_unique',
      unique: true,
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('fingerprints');
  },
};
