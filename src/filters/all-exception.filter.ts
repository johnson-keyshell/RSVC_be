import { ArgumentsHost, Catch } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

import { CustomException } from '../exceptions/custom.exception';
import { HttpResponse } from '../models/http-response.model';

@Catch()
export class AllExceptionsFilter extends BaseExceptionFilter {
  constructor() {
    super();
  }

  catch(exception: any, host: ArgumentsHost): void {
    if (exception instanceof CustomException) {
      const { httpAdapter } = this.httpAdapterHost;

      const ctx = host.switchToHttp();
      const response = ctx.getResponse<Response>();
      const httpStatus = exception.getStatus();
      const isSuccess = exception.isSuccess ? exception.isSuccess : false;

      httpAdapter.reply(response, new HttpResponse(isSuccess, httpStatus, exception.data, exception.error), httpStatus);
    } else {
      super.catch(exception, host);
    }
  }
}
