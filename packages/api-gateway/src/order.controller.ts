import { Controller, Post, Body, Req, Res, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { Request, Response } from 'express';
import { CreateOrderDto, EventTypes, Exchanges } from '@restaurant/shared-types';
import { connectAmqp, setupExchange, publishEvent } from '@restaurant/amqp-utils';
import * as amqp from 'amqplib';
import { v4 as uuidv4 } from 'uuid';
import * as jwt from 'jsonwebtoken';

@Controller('orders')
export class OrderController {
  private channel: amqp.Channel | null = null;

  constructor() {
    this.initAmqp();
  }

  private async initAmqp() {
    try {
      this.channel = await connectAmqp();
      await setupExchange(this.channel, Exchanges.ORDER);
    } catch (err) {
      console.error('API Gateway failed to connect to RabbitMQ', err);
    }
  }

  @Post()
  async placeOrder(@Req() req: Request, @Body() body: any, @Res() res: Response) {
    // Basic Auth check (assuming JWT is passed)
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Unauthorized' });
    }
    
    // Decode JWT payload
    let customerId = 'unknown';
    try {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret');
      customerId = (decoded as any).sub;
    } catch (e) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid token' });
    }

    if (!this.channel) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Message broker disconnected' });
    }

    const commandPayload = {
      ...body,
      customerId,
      // We generate a pending orderId here so the frontend can track it if needed
      orderId: uuidv4(),
      submittedAt: new Date().toISOString(),
    };

    // Publish to RabbitMQ (Command Message Pattern)
    try {
      await publishEvent(
        this.channel,
        Exchanges.ORDER,
        'order.create_command',
        commandPayload
      );

      // Return 202 Accepted instantly!
      return res.status(HttpStatus.ACCEPTED).json({
        message: 'Order received and is being processed.',
        status: 'processing',
        trackingId: commandPayload.orderId,
      });
    } catch (err) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({ message: 'Failed to queue order' });
    }
  }
}
