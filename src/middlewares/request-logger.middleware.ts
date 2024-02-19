import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  constructor(private logger: Logger) {}

  use(req: Request, res: Response, next: NextFunction) {
    const { ip, method } = req;
    const userAgent = req.get('user-agent') || '';
    res.on('finish', () => {
      const { statusCode } = res;
      const contentLength = res.get('content-length');
      if (statusCode >= 400) {
        this.logger.error(`${method} ${req.url} - ${statusCode} ${contentLength} - ${userAgent} ${ip}`, null, 'http');
      } else {
        this.logger.log(`${method} ${req.url} - ${statusCode} ${contentLength} - ${userAgent} ${ip}`, 'http');
      }
    });

    next();
  }
}
