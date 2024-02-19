import { Controller, Get, HttpStatus, Logger } from '@nestjs/common';
import { HealthCheck } from '@nestjs/terminus';

import { HealthService } from './health.service';
import { CustomException } from '../../exceptions/custom.exception';
import { HttpResponse } from '../../models/http-response.model';

@Controller('health')
export class HealthController {
  constructor(
    private healthService: HealthService,
    private logger: Logger,
  ) {}

  @Get()
  @HealthCheck()
  async check() {
    try {
      this.logger.log('Checking Application Health...', 'HealthController');
      const data = await this.healthService.checkAppHealth();
      return new HttpResponse(true, 200, data, null);
    } catch (error) {
      if (error.response.status === 'error') {
        return new HttpResponse(false, error.status, error.response, null);
      } else {
        throw new CustomException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
      }
    }
  }
}
