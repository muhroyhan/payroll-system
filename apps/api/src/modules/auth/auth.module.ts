import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { UsersModule } from '../users/users.module';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtStrategy } from './strategies/jwt.strategy';
import { LoginLockoutService } from './login-lockout.service';
import { LOGIN_LOCKOUT_REDIS } from './login-lockout.constants';

@Module({
  imports: [
    UsersModule,
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (config.get<string>('JWT_EXPIRES_IN') ??
            '8h') as `${number}${'s' | 'm' | 'h' | 'd'}`,
        },
      }),
    }),
    // Auth audit fix — 5 requests/minute, scoped to POST /auth/login only via
    // @UseGuards(ThrottlerGuard) on that one route (auth.controller.ts).
    // Deliberately NOT registered as a global APP_GUARD — every other
    // endpoint stays unthrottled unless a future task asks for it.
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 5, setHeaders: true }]),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    LoginLockoutService,
    {
      provide: LOGIN_LOCKOUT_REDIS,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new Redis({
          host: config.get<string>('redis.host'),
          port: config.get<number>('redis.port'),
        }),
    },
  ],
})
export class AuthModule {}
