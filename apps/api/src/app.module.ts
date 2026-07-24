import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
import { BullModule } from '@nestjs/bullmq';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { EmployeeTypesModule } from './modules/organization/employee-types/employee-types.module';
import { PositionsModule } from './modules/organization/positions/positions.module';
import { DepartmentsModule } from './modules/organization/departments/departments.module';
import { DivisionsModule } from './modules/organization/divisions/divisions.module';
import { EmployeesModule } from './modules/employees/employees.module';
import { PayslipComponentsModule } from './modules/payslip-components/payslip-components.module';
import { TaxBpjsConstantsModule } from './modules/tax-bpjs-constants/tax-bpjs-constants.module';
import { SalaryPeriodConfigModule } from './modules/salary-period-config/salary-period-config.module';
import { SalaryMasterModule } from './modules/salary-master/salary-master.module';
import { IncentiveMasterModule } from './modules/incentive-master/incentive-master.module';
import { LeaveModule } from './modules/leave/leave.module';
import { HolidaysModule } from './modules/holidays/holidays.module';
import { FingerprintsModule } from './modules/fingerprints/fingerprints.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { SuratIjinModule } from './modules/letters/surat-ijin/surat-ijin.module';
import { SuratPeringatanModule } from './modules/letters/surat-peringatan/surat-peringatan.module';
import { OvertimeLettersModule } from './modules/letters/overtime-letters/overtime-letters.module';
import { KasbonModule } from './modules/kasbon/kasbon.module';
import { PayslipTempComponentsModule } from './modules/payslip-temp-components/payslip-temp-components.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig],
    }),
    SequelizeModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        dialect: 'mysql',
        host: config.get<string>('database.host'),
        port: config.get<number>('database.port'),
        username: config.get<string>('database.username'),
        password: config.get<string>('database.password'),
        database: config.get<string>('database.database'),
        logging: config.get<boolean>('database.logging'),
        autoLoadModels: true,
        synchronize: false,
      }),
    }),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        },
      }),
    }),
    UsersModule,
    AuthModule,
    EmployeeTypesModule,
    PositionsModule,
    DepartmentsModule,
    DivisionsModule,
    EmployeesModule,
    PayslipComponentsModule,
    TaxBpjsConstantsModule,
    SalaryPeriodConfigModule,
    SalaryMasterModule,
    IncentiveMasterModule,
    LeaveModule,
    HolidaysModule,
    FingerprintsModule,
    AttendanceModule,
    SuratIjinModule,
    SuratPeringatanModule,
    OvertimeLettersModule,
    KasbonModule,
    PayslipTempComponentsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
