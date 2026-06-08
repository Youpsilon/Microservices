import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import * as crypto from 'crypto';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Role, JwtPayload, AuthTokens } from '@restaurant/shared-types';

@Injectable()
export class AuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshExpiresInDays: number;

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(RefreshToken) private refreshRepo: Repository<RefreshToken>,
  ) {
    this.jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-prod';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '15m';
    this.refreshExpiresInDays = parseInt(process.env.REFRESH_EXPIRES_DAYS || '7', 10);
  }

  // ─── Signup ───
  async signup(email: string, password: string, name: string, phone?: string): Promise<AuthTokens & { user: Partial<User> }> {
    const existing = await this.userRepo.findOne({ where: { email } });
    if (existing) {
      throw new ConflictException('Email already registered');
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = this.userRepo.create({
      email,
      passwordHash,
      name,
      phone,
      roles: [Role.CLIENT],
    });
    const saved = await this.userRepo.save(user);

    const tokens = await this.generateTokens(saved);
    return {
      ...tokens,
      user: { id: saved.id, email: saved.email, name: saved.name, roles: saved.roles },
    };
  }

  // ─── Login ───
  async login(email: string, password: string): Promise<AuthTokens & { user: Partial<User> }> {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const tokens = await this.generateTokens(user);
    return {
      ...tokens,
      user: { id: user.id, email: user.email, name: user.name, roles: user.roles },
    };
  }

  // ─── Refresh Token ───
  async refresh(refreshTokenValue: string): Promise<AuthTokens> {
    const tokenHash = this.hashToken(refreshTokenValue);
    const storedToken = await this.refreshRepo.findOne({
      where: { tokenHash, revoked: false },
      relations: { user: true },
    });

    if (!storedToken || storedToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Rotate: revoke old, issue new
    storedToken.revoked = true;
    await this.refreshRepo.save(storedToken);

    return this.generateTokens(storedToken.user);
  }

  // ─── Get Profile ───
  async getProfile(userId: string): Promise<Partial<User>> {
    const user = await this.userRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      roles: user.roles,
      createdAt: user.createdAt,
    };
  }

  // ─── Update Profile ───
  async updateProfile(userId: string, updates: Partial<Pick<User, 'name' | 'phone' | 'address'>>): Promise<Partial<User>> {
    await this.userRepo.update(userId, updates);
    return this.getProfile(userId);
  }

  // ─── Token Generation ───
  private async generateTokens(user: User): Promise<AuthTokens> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      roles: user.roles,
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.jwtExpiresIn as any,
    });

    // Generate refresh token
    const refreshTokenValue = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(refreshTokenValue);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + this.refreshExpiresInDays);

    await this.refreshRepo.save(
      this.refreshRepo.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      }),
    );

    return { accessToken, refreshToken: refreshTokenValue };
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }
}
