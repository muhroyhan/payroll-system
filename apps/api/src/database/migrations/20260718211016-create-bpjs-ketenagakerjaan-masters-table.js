'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('bpjs_ketenagakerjaan_masters', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      jht_employee_rate: { type: Sequelize.DECIMAL(6, 5), allowNull: false },
      jht_company_rate: { type: Sequelize.DECIMAL(6, 5), allowNull: false },
      jp_employee_rate: { type: Sequelize.DECIMAL(6, 5), allowNull: false },
      jp_company_rate: { type: Sequelize.DECIMAL(6, 5), allowNull: false },
      jp_wage_cap: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      jkk_company_rate: { type: Sequelize.DECIMAL(6, 5), allowNull: false },
      jkm_company_rate: { type: Sequelize.DECIMAL(6, 5), allowNull: false },
      effective_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      effective_end_date: { type: Sequelize.DATEONLY, allowNull: true },
      created_by: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('bpjs_ketenagakerjaan_masters');
  },
};
