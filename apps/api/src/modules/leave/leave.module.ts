import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ScopeResolverModule } from '../scope-resolver/scope-resolver.module';
import { EmployeesModule } from '../employees/employees.module';
import { Employee } from '../employees/entities/employee.entity';
import { LeaveType } from './leave-types/entities/leave-type.entity';
import { LeaveTypesService } from './leave-types/leave-types.service';
import { LeaveTypesController } from './leave-types/leave-types.controller';
import { LeavePolicyMaster } from './leave-policy-master/entities/leave-policy-master.entity';
import { LeavePolicyMasterService } from './leave-policy-master/leave-policy-master.service';
import { LeavePolicyMasterController } from './leave-policy-master/leave-policy-master.controller';
import { LeaveBalance } from './leave-balances/entities/leave-balance.entity';
import { LeaveBalancesService } from './leave-balances/leave-balances.service';
import { LeaveBalancesController } from './leave-balances/leave-balances.controller';
import { LeaveRequest } from './leave-requests/entities/leave-request.entity';
import { LeaveRequestsService } from './leave-requests/leave-requests.service';
import { LeaveRequestsController } from './leave-requests/leave-requests.controller';

// §5.4 — leave types, policy master (quota resolution), per-employee balances,
// and the request/approval workflow.
@Module({
  imports: [
    SequelizeModule.forFeature([
      LeaveType,
      LeavePolicyMaster,
      LeaveBalance,
      LeaveRequest,
      Employee,
    ]),
    ScopeResolverModule,
    EmployeesModule,
  ],
  controllers: [
    LeaveTypesController,
    LeavePolicyMasterController,
    LeaveBalancesController,
    LeaveRequestsController,
  ],
  providers: [
    LeaveTypesService,
    LeavePolicyMasterService,
    LeaveBalancesService,
    LeaveRequestsService,
  ],
  exports: [
    LeaveTypesService,
    LeavePolicyMasterService,
    LeaveBalancesService,
    LeaveRequestsService,
  ],
})
export class LeaveModule {}
