// Shared types across all microservices

// ─── Roles & Auth ───
export enum Role {
  CLIENT = 'client',
  CHEF = 'chef',
  COURIER = 'livreur',
  ADMIN = 'admin',
}

export interface JwtPayload {
  sub: string;
  email: string;
  roles: Role[];
  iat?: number;
  exp?: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

// ─── Order Statuses ───
export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  READY = 'ready',
  PICKED_UP = 'picked_up',
  DELIVERING = 'delivering',
  DELIVERED = 'delivered',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum KitchenItemStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  READY = 'ready',
}

export enum DeliveryStatus {
  PENDING = 'pending',
  ASSIGNED = 'assigned',
  PICKED_UP = 'picked_up',
  IN_TRANSIT = 'in_transit',
  COMPLETED = 'completed',
}

export enum CourierStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  OFFLINE = 'offline',
}

// ─── Domain Events ───
export interface DomainEvent<T = unknown> {
  messageId: string;
  type: string;
  version: string;
  timestamp: string;
  correlationId: string;
  causationId?: string;
  payload: T;
}

// Event payloads
export interface OrderPlacedPayload {
  orderId: string;
  customerId: string;
  items: Array<{
    menuItemId: string;
    name: string;
    qty: number;
    unitPrice: number;
    options?: string[];
    notes?: string;
  }>;
  deliveryType: 'delivery' | 'pickup';
  deliveryAddress?: string;
  total: number;
}

export interface KitchenItemStatusPayload {
  orderId: string;
  ticketId: string;
  itemId: string;
  menuItemId: string;
  status: KitchenItemStatus;
}

export interface OrderReadyForPickupPayload {
  orderId: string;
  ticketId: string;
  readyAt: string;
}

export interface DeliveryAssignedPayload {
  deliveryId: string;
  orderId: string;
  courierId: string;
  eta: string;
}

export interface CourierLocationPayload {
  deliveryId: string;
  courierId: string;
  location: { lat: number; lng: number };
  timestamp: string;
}

export interface DeliveryCompletedPayload {
  deliveryId: string;
  orderId: string;
  completedAt: string;
}

// ─── Event Type Constants ───
export const EventTypes = {
  CUSTOMER_REGISTERED: 'customer.registered',
  MENU_ITEM_UPDATED: 'item.updated',
  MENU_ITEM_AVAILABILITY: 'item.availability.changed',
  ORDER_PLACED: 'order.placed',
  ORDER_VALIDATED: 'order.validated',
  ORDER_CANCELLED: 'order.cancelled',
  ORDER_COMPLETED: 'order.completed',
  KITCHEN_ITEM_IN_PROGRESS: 'item.in-progress',
  KITCHEN_ITEM_READY: 'item.ready',
  ORDER_READY_FOR_PICKUP: 'order.ready-for-pickup',
  DELIVERY_ASSIGNED: 'delivery.assigned',
  COURIER_LOCATION_UPDATED: 'courier.location.updated',
  DELIVERY_PICKED_UP: 'delivery.picked-up',
  DELIVERY_COMPLETED: 'delivery.completed',
} as const;

// ─── Exchange Names ───
export const Exchanges = {
  AUTH: 'auth.events',
  MENU: 'menu.events',
  ORDER: 'order.events',
  KITCHEN: 'kitchen.events',
  DELIVERY: 'delivery.events',
} as const;

// ─── API DTOs ───
export interface CreateOrderDto {
  cartId: string;
  deliveryType: 'delivery' | 'pickup';
  deliveryAddress?: string;
  promoCode?: string;
}

export interface CartItemDto {
  menuItemId: string;
  qty: number;
  options?: string[];
  notes?: string;
}

export interface UpdateItemStatusDto {
  status: 'in_progress' | 'ready';
}
