'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Nullable at the DB level so pre-existing employee rows don't break; the
    // CreateEmployeeDto makes gender required for all NEW employees. §5.1a.
    await queryInterface.addColumn('employees', 'gender', {
      type: Sequelize.ENUM('male', 'female'),
      allowNull: true,
      after: 'marital_status',
    });

    // The Surat Keterangan flag (husband has no income) — flips a married
    // female's derived PTKP from TK to K. Safe to add NOT NULL with a default.
    await queryInterface.addColumn('employees', 'spouse_no_income_certificate', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      after: 'wife_income_combined',
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('employees', 'spouse_no_income_certificate');
    await queryInterface.removeColumn('employees', 'gender');
  },
};
