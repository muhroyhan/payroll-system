import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Role } from '@payroll-system/shared-types';
import { UsersService } from '../../users/users.service';
import type { AuthenticatedUser } from '../types/authenticated-user';

interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET') as string,
    });
  }

  // Auth audit fix — a signature-valid, unexpired JWT is no longer enough on
  // its own: deactivating a user (UsersService.setActive) must take effect on
  // the very next request, not just at the token's natural expiry. Queries
  // the DB on every request rather than caching isActive (e.g. in Redis with
  // a short TTL) — deliberately the more conservative default for an
  // auth-path decision; a cache would reintroduce exactly the "stale
  // deactivated-but-still-accepted" window this fix exists to close, just
  // shortened rather than eliminated. Revisit only if this query is ever
  // shown to be a real bottleneck (findById is a single indexed PK lookup).
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.usersService.findById(payload.sub);
    if (!user || !user.isActive) {
      throw new UnauthorizedException();
    }
    return { id: payload.sub, email: payload.email, role: payload.role };
  }
}
