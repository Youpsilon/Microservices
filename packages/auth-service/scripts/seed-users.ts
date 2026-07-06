import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import * as path from 'path';

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

  const users = [
    { email: 'admin@restaurant.fr', password: 'Admin123!', name: 'Sophie Admin', roles: ['admin'] },
    { email: 'chef@restaurant.fr', password: 'Chef123!', name: 'Marco Chef', roles: ['chef'] },
    { email: 'livreur@restaurant.fr', password: 'Livreur123!', name: 'Pierre Livreur', roles: ['livreur'] },
    { email: 'client@restaurant.fr', password: 'Client123!', name: 'Alice Client', roles: ['client'] },
  ];

  for (const u of users) {
    const existing = await userRepo.findOne({ where: { email: u.email } });
    const passwordHash = await bcrypt.hash(u.password, 12);
    
    if (existing) {
      console.log(`⚠️  Compte existant: ${u.email} - Mise à jour...`);
      await userRepo.update(existing.id, {
        passwordHash,
        name: u.name,
        roles: u.roles,
      });
      console.log(`   → Rôle [${u.roles.join(', ')}] et mot de passe mis à jour.`);
    } else {
      await userRepo.save(
        userRepo.create({
          email: u.email,
          passwordHash,
          name: u.name,
          roles: u.roles,
        })
      );
      console.log(`✅ Compte [${u.roles.join(', ')}] créé: ${u.email}`);
    }
  }

  await dataSource.destroy();
  console.log('\n🎉 Seed des utilisateurs terminé avec succès !');
}

seed().catch(err => {
  console.error('❌ Erreur lors du seed:', err);
  process.exit(1);
});
