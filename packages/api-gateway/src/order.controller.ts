import { All, Controller, Param, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';

/**
 * Generic HTTP proxy helper.
 * Forwards the request to targetBase + path, preserving method, Authorization header, body and query string.
 */
export async function proxyTo(
  targetBase: string,
  path: string,
  req: Request,
  res: Response,
) {
  const qs = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
  const url = `${targetBase}${path}${qs}`;

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (req.headers.authorization) {
    headers['Authorization'] = req.headers.authorization as string;
  }

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(req.method);

  try {
    const upstream = await fetch(url, {
      method: req.method,
      headers,
      ...(hasBody && req.body && Object.keys(req.body).length > 0
        ? { body: JSON.stringify(req.body) }
        : {}),
    });

    const contentType = upstream.headers.get('content-type') || '';
    res.status(upstream.status);
    if (contentType.includes('application/json')) return res.json(await upstream.json());
    return res.send(await upstream.text());
  } catch (err: any) {
    console.error(`[Gateway] Proxy error → ${url}:`, err.message);
    return res.status(502).json({ message: 'Upstream service unavailable', error: err.message });
  }
}

// ─── Orders proxy ────────────────────────────────────────────────────────────

const ORDER_SERVICE_URL = process.env.ORDER_SERVICE_URL || 'http://localhost:3003/api';

@Controller('orders')
export class OrderController {
  /** POST /api/orders → order-service POST /api/orders */
  @All()
  proxyRoot(@Req() req: Request, @Res() res: Response) {
    return proxyTo(ORDER_SERVICE_URL, '/orders', req, res);
  }

  /** ALL /api/orders/:path* → order-service /api/orders/:path* */
  @All('*path')
  proxySub(@Param('path') path: string | string[], @Req() req: Request, @Res() res: Response) {
    const subPath = Array.isArray(path) ? path.join('/') : path;
    return proxyTo(ORDER_SERVICE_URL, `/orders/${subPath}`, req, res);
  }
}
