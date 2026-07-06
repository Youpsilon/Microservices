import { All, Controller, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { proxyTo } from './order.controller';

const KITCHEN_SERVICE_URL = process.env.KITCHEN_SERVICE_URL || 'http://localhost:3004/api';

@Controller('kitchen')
export class KitchenProxyController {
  @All()
  proxyRoot(@Req() req: Request, @Res() res: Response) {
    return proxyTo(KITCHEN_SERVICE_URL, '/kitchen', req, res);
  }

  @All('*path')
  proxySub(@Param('path') path: string | string[], @Req() req: Request, @Res() res: Response) {
    const subPath = Array.isArray(path) ? path.join('/') : path;
    return proxyTo(KITCHEN_SERVICE_URL, `/kitchen/${subPath}`, req, res);
  }
}
