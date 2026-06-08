import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';

@Entity('kitchen_tickets')
export class KitchenTicket {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_id', unique: true })
  orderId: string;

  @Column({ length: 20, default: 'pending' })
  status: string; // pending, preparing, ready

  @Column({ default: 0 })
  priority: number;

  @OneToMany(() => TicketItem, (item) => item.ticket, { cascade: true, eager: true })
  items: TicketItem[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

import { ManyToOne, JoinColumn } from 'typeorm';

@Entity('ticket_items')
export class TicketItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'ticket_id' })
  ticketId: string;

  @ManyToOne(() => KitchenTicket, (ticket) => ticket.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ticket_id' })
  ticket: KitchenTicket;

  @Column({ name: 'menu_item_id' })
  menuItemId: string;

  @Column({ length: 150 })
  name: string;

  @Column()
  qty: number;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ length: 20, default: 'pending' })
  status: string; // pending, in_progress, ready
}

// Reuse outbox & processed_events
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
