import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrderStatus } from '@restaurant/shared-types';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ type: 'varchar', length: 20, default: OrderStatus.PENDING })
  status: OrderStatus;

  @Column({ name: 'delivery_type', length: 10 })
  deliveryType: 'delivery' | 'pickup';

  @Column({ name: 'delivery_address', type: 'jsonb', nullable: true })
  deliveryAddress: Record<string, any>;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total: number;

  @Column({ name: 'promo_code', length: 50, nullable: true })
  promoCode: string;

  @OneToMany(() => OrderItem, (item) => item.order, { cascade: true, eager: true })
  items: OrderItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

import { ManyToOne, JoinColumn } from 'typeorm';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @Column({ name: 'menu_item_id' })
  menuItemId: string;

  @Column({ length: 150 })
  name: string;

  @Column()
  qty: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @Column({ type: 'jsonb', nullable: true })
  options: string[];

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ length: 20, default: 'pending' })
  status: string;
}

@Entity('outbox')
export class Outbox {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'aggregate_type', length: 50 })
  aggregateType: string;

  @Column({ name: 'aggregate_id', type: 'uuid' })
  aggregateId: string;

  @Column({ name: 'event_type', length: 100 })
  eventType: string;

  @Column({ type: 'jsonb' })
  payload: Record<string, any>;

  @Column({ default: false })
  published: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('processed_events')
export class ProcessedEvent {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', unique: true })
  messageId: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;
}

@Entity('processed_commands')
export class ProcessedCommand {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'message_id', unique: true })
  messageId: string;

  @CreateDateColumn({ name: 'processed_at' })
  processedAt: Date;
}
