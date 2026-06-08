import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, MenuItem } from './entities/menu.entity';

@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(Category) private catRepo: Repository<Category>,
    @InjectRepository(MenuItem) private itemRepo: Repository<MenuItem>,
  ) {}

  async getCategories(): Promise<Category[]> {
    return this.catRepo.find({ order: { sortOrder: 'ASC' } });
  }

  async getItems(categoryId?: string, available?: boolean): Promise<MenuItem[]> {
    const qb = this.itemRepo.createQueryBuilder('item');
    if (categoryId) qb.andWhere('item.categoryId = :categoryId', { categoryId });
    if (available !== undefined) qb.andWhere('item.available = :available', { available });
    qb.orderBy('item.name', 'ASC');
    return qb.getMany();
  }

  async getItemById(id: string): Promise<MenuItem> {
    const item = await this.itemRepo.findOne({ where: { id } });
    if (!item) throw new NotFoundException('Menu item not found');
    return item;
  }

  async createItem(data: Partial<MenuItem>): Promise<MenuItem> {
    const item = this.itemRepo.create(data);
    return this.itemRepo.save(item);
  }

  async updateAvailability(id: string, available: boolean): Promise<MenuItem> {
    const item = await this.getItemById(id);
    item.available = available;
    return this.itemRepo.save(item);
  }

  async updateStock(id: string, stock: number): Promise<MenuItem> {
    const item = await this.getItemById(id);
    item.stock = Math.max(0, stock);
    // Auto-toggle availability based on stock level
    item.available = item.stock > 0;
    return this.itemRepo.save(item);
  }

  async createCategory(data: Partial<Category>): Promise<Category> {
    const cat = this.catRepo.create(data);
    return this.catRepo.save(cat);
  }

  /** Seed sample data if empty */
  async seedIfEmpty(): Promise<void> {
    const count = await this.catRepo.count();
    if (count > 0) return;

    const entrees = await this.catRepo.save(this.catRepo.create({ name: 'Entrées', sortOrder: 1 }));
    const plats = await this.catRepo.save(this.catRepo.create({ name: 'Plats', sortOrder: 2 }));
    const desserts = await this.catRepo.save(this.catRepo.create({ name: 'Desserts', sortOrder: 3 }));
    const boissons = await this.catRepo.save(this.catRepo.create({ name: 'Boissons', sortOrder: 4 }));

    const items = [
      { categoryId: entrees.id, name: 'Salade César', description: 'Laitue romaine, parmesan, croûtons, sauce César maison', price: 9.50, available: true },
      { categoryId: entrees.id, name: 'Soupe à l\'oignon', description: 'Soupe gratinée au fromage', price: 8.00, available: true },
      { categoryId: entrees.id, name: 'Bruschetta', description: 'Tomates fraîches, basilic, huile d\'olive', price: 7.50, available: true },
      { categoryId: plats.id, name: 'Burger Gourmet', description: 'Bœuf Angus, cheddar affiné, bacon, frites maison', price: 16.90, available: true, options: [{ id: 'opt-1', name: 'Double viande', priceModifier: 4.00 }, { id: 'opt-2', name: 'Sans gluten', priceModifier: 1.50 }] },
      { categoryId: plats.id, name: 'Risotto aux champignons', description: 'Riz Arborio, cèpes, parmesan, truffe', price: 18.50, available: true },
      { categoryId: plats.id, name: 'Pavé de saumon', description: 'Saumon grillé, légumes de saison, sauce citronnée', price: 19.90, available: true },
      { categoryId: plats.id, name: 'Pâtes alla Carbonara', description: 'Guanciale, pecorino, jaune d\'œuf', price: 14.50, available: true },
      { categoryId: desserts.id, name: 'Tiramisu', description: 'Mascarpone, café, cacao', price: 8.50, available: true },
      { categoryId: desserts.id, name: 'Crème brûlée', description: 'Vanille de Madagascar', price: 7.50, available: true },
      { categoryId: desserts.id, name: 'Fondant au chocolat', description: 'Chocolat noir 70%, cœur coulant', price: 9.00, available: true },
      { categoryId: boissons.id, name: 'Limonade maison', description: 'Citron frais, menthe, eau pétillante', price: 4.50, available: true },
      { categoryId: boissons.id, name: 'Coca-Cola', description: '33cl', price: 3.50, available: true },
      { categoryId: boissons.id, name: 'Eau minérale', description: 'Evian 50cl', price: 2.50, available: true },
    ];

    for (const item of items) {
      await this.itemRepo.save(this.itemRepo.create(item));
    }
    console.log('[Menu Service] Seeded sample menu data');
  }
}
