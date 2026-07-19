import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { SequelizeModule } from '@nestjs/sequelize';
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
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
