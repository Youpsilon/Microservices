import { All, Controller, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { proxyTo } from './order.controller';

const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:3001/api';

@Controller('auth')
export class AuthProxyController {
  @All()
  proxyRoot(@Req() req: Request, @Res() res: Response) {
    return proxyTo(AUTH_SERVICE_URL, '/auth', req, res);
  }

  @All('*path')
  proxySub(@Param('path') path: string | string[], @Req() req: Request, @Res() res: Response) {
    const subPath = Array.isArray(path) ? path.join('/') : path;
    return proxyTo(AUTH_SERVICE_URL, `/auth/${subPath}`, req, res);
  }
}

@Controller('users')
export class UsersProxyController {
  @All()
  proxyRoot(@Req() req: Request, @Res() res: Response) {
    return proxyTo(AUTH_SERVICE_URL, '/users', req, res);
  }

  @All('*path')
  proxySub(@Param('path') path: string | string[], @Req() req: Request, @Res() res: Response) {
    const subPath = Array.isArray(path) ? path.join('/') : path;
    return proxyTo(AUTH_SERVICE_URL, `/users/${subPath}`, req, res);
  }
}
