import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';

const PASSWORD_SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    @InjectModel(User)
    private readonly userModel: typeof User,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ where: { email } });
  }

  async findById(id: string): Promise<User | null> {
    return this.userModel.findByPk(id, {
      attributes: { exclude: ['passwordHash'] },
    });
  }

  async list(): Promise<User[]> {
    // BUGS#3 — newest-updated first, the default for every listing.
    return this.userModel.findAll({
      attributes: { exclude: ['passwordHash'] },
      order: [['updatedAt', 'DESC']],
    });
  }

  async create(dto: CreateUserDto): Promise<User> {
    const existing = await this.findByEmail(dto.email);
    if (existing) {
      throw new ConflictException('A user with this email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, PASSWORD_SALT_ROUNDS);
    const user = await this.userModel.create({
      name: dto.name,
      email: dto.email,
      passwordHash,
      role: dto.role,
    } as any);

    return this.findById(user.id) as Promise<User>;
  }

  // Auth audit fix — the only way to revoke a compromised/offboarded
  // account's access. Deliberately allows an admin to deactivate their own
  // account (no special-case block) — that's a legitimate action, not a
  // footgun worth guarding against here. Idempotent: deactivating an
  // already-inactive user (or reactivating an already-active one) just
  // succeeds, no error.
  async setActive(id: string, isActive: boolean): Promise<User> {
    const user = await this.userModel.findByPk(id);
    if (!user) {
      throw new NotFoundException(`User ${id} not found`);
    }
    await user.update({ isActive });
    return this.findById(id) as Promise<User>;
  }
}
