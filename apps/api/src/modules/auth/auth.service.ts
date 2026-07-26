import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { User } from '../users/entities/user.entity';
import { LoginLockoutService } from './login-lockout.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly loginLockoutService: LoginLockoutService,
  ) {}

  // Auth audit fix — per-username lockout runs BEFORE the user lookup /
  // password compare, keyed on the raw submitted (normalized) email
  // regardless of whether the account exists, so lockout behavior itself
  // never becomes a side channel for "is this email registered." Every
  // failure path (unknown email, inactive user, wrong password) records a
  // failed attempt identically; only a genuine credential match resets it.
  async validateUser(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    await this.loginLockoutService.assertNotLocked(normalizedEmail);

    const user = await this.usersService.findByEmail(email);
    if (!user || !user.isActive) {
      await this.loginLockoutService.recordFailedAttempt(normalizedEmail);
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatches) {
      await this.loginLockoutService.recordFailedAttempt(normalizedEmail);
      throw new UnauthorizedException('Invalid credentials');
    }

    await this.loginLockoutService.resetAttempts(normalizedEmail);
    return user;
  }

  login(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role };
    return {
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }
}
