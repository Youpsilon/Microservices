import { All, Controller, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { proxyTo } from './order.controller';

const DELIVERY_SERVICE_URL = process.env.DELIVERY_SERVICE_URL || 'http://localhost:3005/api';

@Controller('deliveries')
export class DeliveryProxyController {
  @All()
  proxyRoot(@Req() req: Request, @Res() res: Response) {
    return proxyTo(DELIVERY_SERVICE_URL, '/deliveries', req, res);
  }

  @All('*path')
  proxySub(@Param('path') path: string | string[], @Req() req: Request, @Res() res: Response) {
    const subPath = Array.isArray(path) ? path.join('/') : path;
    return proxyTo(DELIVERY_SERVICE_URL, `/deliveries/${subPath}`, req, res);
  }
}

@Controller('couriers')
export class CourierProxyController {
  @All()
  proxyRoot(@Req() req: Request, @Res() res: Response) {
    return proxyTo(DELIVERY_SERVICE_URL, '/couriers', req, res);
  }

  @All('*path')
  proxySub(@Param('path') path: string | string[], @Req() req: Request, @Res() res: Response) {
    const subPath = Array.isArray(path) ? path.join('/') : path;
    return proxyTo(DELIVERY_SERVICE_URL, `/couriers/${subPath}`, req, res);
  }
}
