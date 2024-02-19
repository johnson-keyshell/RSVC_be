import { HttpStatus, Logger, ServiceUnavailableException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

import { HttpResponse } from 'src/models/http-response.model';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { CustomException } from '../../exceptions/custom.exception';

describe('HealthController', () => {
  let controller: HealthController;
  let healthService: HealthService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [Logger, HealthService],
    })
      .overrideProvider(HealthService)
      .useValue({
        checkAppHealth: jest.fn(() =>
          Promise.resolve({
            status: 'ok',
            info: {
              storage: {
                status: 'up',
              },
              memory: {
                status: 'up',
              },
              ping: {
                status: 'up',
              },
              database: {
                status: 'up',
              },
            },
            error: {},
            details: {
              storage: {
                status: 'up',
              },
              memory: {
                status: 'up',
              },
              ping: {
                status: 'up',
              },
              database: {
                status: 'up',
              },
            },
          }),
        ),
      })
      .compile();

    controller = module.get<HealthController>(HealthController);
    healthService = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return a http response with health check result data and 200 as status code', async () => {
    const data: HttpResponse = await controller.check();
    expect(data.isSuccess).toBeTruthy();
    expect(data.statusCode).toBe(HttpStatus.OK);
    expect(data.error).toBeNull;
  });

  it('should return a http response if any of the service fails with 503 status code and healt check result ', async () => {
    (healthService.checkAppHealth as jest.Mock).mockRejectedValue(
      new ServiceUnavailableException({
        status: 'error',
        info: {
          storage: {
            status: 'up',
          },
          memory: {
            status: 'up',
          },
          ping: {
            status: 'up',
          },
        },
        error: {
          database: {
            status: 'down',
          },
        },
        details: {
          storage: {
            status: 'up',
          },
          memory: {
            status: 'up',
          },
          ping: {
            status: 'up',
          },
          database: {
            status: 'down',
          },
        },
      }),
    );

    const data: HttpResponse = await controller.check();
    expect(data.isSuccess).toBeFalsy();
    expect(data.statusCode).toBe(HttpStatus.SERVICE_UNAVAILABLE);
    expect(data.error).toBeNull();
  });

  it('should throw custom exception in case of error ', async () => {
    (healthService.checkAppHealth as jest.Mock).mockRejectedValue(new ServiceUnavailableException());
    await expect(controller.check()).rejects.toThrow(CustomException);
  });
});
