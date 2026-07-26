'use strict';

// 0002 — Task A (prorate join/resign mid-month) + Task B (reject negative
// take-home without failing the whole run).
//
// Task A: `worked_days`/`total_working_days` on `payslips` record the
// working-days-basis prorate inputs (see prorate.core.ts) so the payslip
// detail screen can render "Prorata (X dari Y hari kerja)". Nullable because
// payslips created before this migration have no such data — that's a true
// "unknown", not zero.
//
// Task B: `payroll_run_excluded_employees` is the new persistence side-
// channel the calculation job writes to instead of failing the run when one
// employee's net pay would be negative (§11-style pattern: the run's state
// machine itself needs no new status — `calculated` still means "every
// eligible employee was either given a payslip or explicitly excluded with a
// reason", not "every employee has a payslip").
//
// Raw SQL (not queryInterface.createTable), same reason as 0001: the FK
// columns must be CHARACTER SET utf8mb4 COLLATE utf8mb4_bin to match
// payroll_runs.id/employees.id exactly — the queryInterface `collate` column
// option is silently dropped by this Sequelize/MySQL dialect combo, which
// makes CREATE TABLE fail with "Referencing column ... incompatible".
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      'ALTER TABLE `payslips` ' +
        'ADD COLUMN `worked_days` decimal(5,2) DEFAULT NULL, ' +
        'ADD COLUMN `total_working_days` int DEFAULT NULL;',
    );

    await queryInterface.sequelize.query(
      'CREATE TABLE `payroll_run_excluded_employees` (\n' +
        '  `id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,\n' +
        '  `payroll_run_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,\n' +
        '  `employee_id` char(36) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,\n' +
        '  `reason` varchar(255) NOT NULL,\n' +
        '  `gross_pay` decimal(15,2) NOT NULL,\n' +
        '  `net_pay` decimal(15,2) NOT NULL,\n' +
        '  `created_at` datetime NOT NULL,\n' +
        '  `updated_at` datetime NOT NULL,\n' +
        '  PRIMARY KEY (`id`),\n' +
        '  UNIQUE KEY `payroll_run_excluded_employees_run_employee_unique` (`payroll_run_id`,`employee_id`),\n' +
        '  KEY `employee_id` (`employee_id`),\n' +
        '  CONSTRAINT `payroll_run_excluded_employees_ibfk_1` FOREIGN KEY (`payroll_run_id`) REFERENCES `payroll_runs` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE,\n' +
        '  CONSTRAINT `payroll_run_excluded_employees_ibfk_2` FOREIGN KEY (`employee_id`) REFERENCES `employees` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE\n' +
        ') ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;',
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.query(
      'DROP TABLE IF EXISTS `payroll_run_excluded_employees`;',
    );
    await queryInterface.sequelize.query(
      'ALTER TABLE `payslips` ' +
        'DROP COLUMN `worked_days`, ' +
        'DROP COLUMN `total_working_days`;',
    );
  },
};
