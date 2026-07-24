'use strict';

const SCOPE_TYPES = ['employee_type', 'position', 'department', 'division', 'employee'];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payslip_temp_components', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      component_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'payslip_components', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      scope_type: { type: Sequelize.ENUM(...SCOPE_TYPES), allowNull: false },
      scope_value: { type: Sequelize.UUID, allowNull: false },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      period_year: { type: Sequelize.INTEGER, allowNull: false },
      period_month: { type: Sequelize.INTEGER, allowNull: false },
      // Derived from period_year/period_month at write time — see the entity
      // comment. Kept as real columns so the shared ScopeResolverService can
      // query them with the same SQL it uses for every other scope master.
      effective_start_date: { type: Sequelize.DATEONLY, allowNull: false },
      effective_end_date: { type: Sequelize.DATEONLY, allowNull: false },
      created_by: { type: Sequelize.UUID, allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex(
      'payslip_temp_components',
      ['scope_type', 'scope_value'],
      { name: 'payslip_temp_components_scope_idx' },
    );
    await queryInterface.addIndex(
      'payslip_temp_components',
      ['component_id', 'period_year', 'period_month'],
      { name: 'payslip_temp_components_component_period_idx' },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payslip_temp_components');
  },
};
