/**
 * Script de création de comptes admin
 * Usage: npx ts-node -r tsconfig-paths/register --project packages/auth-service/tsconfig.json packages/auth-service/scripts/seed-admin.ts
 */

import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';

// We need to inline the entity because of module resolution
const { EntitySchema } = require('typeorm');

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5433', 10),
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'dev',
    database: process.env.DB_NAME || 'auth',
    entities: [path.join(__dirname, '../src/entities/*.entity{.ts,.js}')],
    synchronize: false,
  });

  await dataSource.initialize();
  console.log('✅ Connected to auth database');

  const userRepo = dataSource.getRepository('users');

  const admins = [
    { email: 'admin@restaurant.com', password: 'Admin123!', name: 'Chef Admin' },
    { email: 'manager@restaurant.com', password: 'Manager123!', name: 'Manager Restaurant' },
  ];

  for (const adminData of admins) {
    const existing = await userRepo.findOne({ where: { email: adminData.email } });
    if (existing) {
      console.log(`⚠️  Compte déjà existant: ${adminData.email}`);
      // Update roles to make sure it's admin
      await userRepo.update(existing.id, { roles: ['admin'] });
      console.log(`   → Rôle admin confirmé pour ${adminData.email}`);
      continue;
    }

    const passwordHash = await bcrypt.hash(adminData.password, 12);
    await userRepo.save(
      userRepo.create({
        email: adminData.email,
        passwordHash,
        name: adminData.name,
        roles: ['admin'],
      })
    );
    console.log(`✅ Compte admin créé: ${adminData.email} (mot de passe: ${adminData.password})`);
  }

  await dataSource.destroy();
  console.log('\n🎉 Seed terminé!');
  console.log('\nComptes admin disponibles:');
  console.log('  📧 admin@restaurant.com     | 🔑 Admin123!');
  console.log('  📧 manager@restaurant.com   | 🔑 Manager123!');
}

seed().catch(err => {
  console.error('❌ Erreur lors du seed:', err);
  process.exit(1);
});
