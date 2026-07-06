import { Module, OnModuleInit, Logger } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { User } from './entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Role } from '@restaurant/shared-types';

// ─── Seed Data ───
const DEFAULT_USERS = [
  { email: 'admin@restaurant.fr',   password: 'Admin123!',   name: 'Sophie Admin',   roles: [Role.ADMIN] },
  { email: 'chef@restaurant.fr',    password: 'Chef123!',    name: 'Marco Chef',     roles: [Role.CHEF] },
  { email: 'livreur@restaurant.fr', password: 'Livreur123!', name: 'Pierre Livreur', roles: [Role.COURIER] },
  { email: 'client@restaurant.fr',  password: 'Client123!',  name: 'Alice Client',   roles: [Role.CLIENT] },
];

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5433', 10),
      username: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'dev',
      database: process.env.DB_NAME || 'auth',
      entities: [User, RefreshToken],
      synchronize: process.env.NODE_ENV !== 'production', // Use migrations in prod
      logging: process.env.NODE_ENV !== 'production',
    }),
    TypeOrmModule.forFeature([User, RefreshToken]),
  ],
  controllers: [AuthController],
  providers: [AuthService],
})
export class AuthModule implements OnModuleInit {
  private readonly logger = new Logger(AuthModule.name);

  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultUsers();
  }

  // ─── Auto-seed comptes de test au premier démarrage ───
  private async seedDefaultUsers(): Promise<void> {
    const count = await this.userRepo.count();
    if (count > 0) return; // Already seeded

    this.logger.log('🌱 Seeding default test accounts...');

    for (const userData of DEFAULT_USERS) {
      const passwordHash = await bcrypt.hash(userData.password, 12);
      await this.userRepo.save(
        this.userRepo.create({
          email: userData.email,
          passwordHash,
          name: userData.name,
          roles: userData.roles,
        }),
      );
      this.logger.log(`  ✅ Created [${userData.roles.join(', ')}]: ${userData.email}`);
    }

    this.logger.log('');
    this.logger.log('🎉 Test accounts ready:');
    this.logger.log('   📧 client@restaurant.fr    🔑 Client123!');
    this.logger.log('   📧 admin@restaurant.fr     🔑 Admin123!');
    this.logger.log('   📧 chef@restaurant.fr      🔑 Chef123!');
    this.logger.log('   📧 livreur@restaurant.fr   🔑 Livreur123!');
  }
}
