'use strict';

const SOURCES = [
  'salary_master',
  'incentive_master',
  'temp_component',
  'kasbon',
  'sanction',
  'overtime',
  'tax',
  'bpjs',
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // §5.8 payslip_line_items — the auditable breakdown. `amount` is SIGNED
    // (earnings +, deductions −) so Σ line items = net_pay. component_id is
    // nullable: populated for temp_component / sanction (which map to a
    // payslip_component_master row), null for the others. source + source_id
    // are the primary traceability and back the PayslipReferenceChecker lock.
    await queryInterface.createTable('payslip_line_items', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      payslip_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'payslips', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      component_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: { model: 'payslip_components', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
      },
      source: { type: Sequelize.ENUM(...SOURCES), allowNull: false },
      // No FK — polymorphic across salary_master/incentive_master/kasbon/
      // surat_peringatan/overtime_letter/temp_components; null for tax/bpjs.
      source_id: { type: Sequelize.UUID, allowNull: true },
      amount: { type: Sequelize.DECIMAL(15, 2), allowNull: false },
      created_at: { type: Sequelize.DATE, allowNull: false },
      updated_at: { type: Sequelize.DATE, allowNull: false },
    });
    await queryInterface.addIndex('payslip_line_items', ['payslip_id'], {
      name: 'payslip_line_items_payslip_idx',
    });
    // Backs PayslipReferenceChecker.isReferencedByPayslip(source, source_id).
    await queryInterface.addIndex(
      'payslip_line_items',
      ['source', 'source_id'],
      { name: 'payslip_line_items_source_idx' },
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payslip_line_items');
  },
};
