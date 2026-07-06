import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';

@Entity('couriers')
export class Courier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20, nullable: true })
  phone: string;

  @Column({ length: 20, nullable: true })
  vehicle: string;

  @Column({ length: 20, default: 'offline' })
  status: string; // available, busy, offline

  @Column({ name: 'current_location', type: 'jsonb', nullable: true })
  currentLocation: { lat: number; lng: number };
}

@Entity('deliveries')
export class Delivery {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id' })
  orderId: string;

  @Column({ name: 'courier_id', nullable: true })
  courierId: string | null;

  @ManyToOne(() => Courier, { nullable: true })
  @JoinColumn({ name: 'courier_id' })
  courier: Courier;

  @Column({ length: 20, default: 'pending' })
  status: string; // pending, assigned, picked_up, in_transit, completed

  @Column({ nullable: true })
  eta: Date;

  @Column({ name: 'pickup_address', type: 'jsonb', nullable: true })
  pickupAddress: Record<string, any>;

  @Column({ name: 'delivery_address', type: 'jsonb', nullable: true })
  deliveryAddress: Record<string, any>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

@Entity('courier_locations')
export class CourierLocation {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'courier_id' })
  courierId: string;

  @Column({ name: 'delivery_id', nullable: true })
  deliveryId: string;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lat: number;

  @Column({ type: 'decimal', precision: 10, scale: 7 })
  lng: number;

  @CreateDateColumn({ name: 'recorded_at' })
  recordedAt: Date;
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
