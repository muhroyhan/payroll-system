import { Sequelize } from 'sequelize-typescript';
import { Fingerprint } from './fingerprint.entity';
import { Employee } from '../../employees/entities/employee.entity';
import { EmployeeType } from '../../organization/employee-types/entities/employee-type.entity';
import { Position } from '../../organization/positions/entities/position.entity';
import { Department } from '../../organization/departments/entities/department.entity';
import { Division } from '../../organization/divisions/entities/division.entity';

// Regression guard for the P3-T01 bug: creating a Fingerprint without an
// explicit enrolledAt crashed with MySQL's ER_NO_DEFAULT_FOR_FIELD because the
// column had no @Default. This registers the model (and everything its
// @BelongsTo associations resolve to) against an in-memory Sequelize instance
// — no real connection opened — and asserts the column definition itself
// carries a default, so if the decorator is ever removed again, this fails
// without needing a live database.
describe('Fingerprint entity', () => {
  it('enrolledAt has a default value configured', () => {
    const sequelize = new Sequelize({
      dialect: 'mysql',
      models: [
        Fingerprint,
        Employee,
        EmployeeType,
        Position,
        Department,
        Division,
      ],
    });
    try {
      const attribute = Fingerprint.getAttributes().enrolledAt;
      expect(attribute.defaultValue).toBeDefined();
    } finally {
      void sequelize.close();
    }
  });
});
