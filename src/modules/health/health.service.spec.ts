import { Logger, ServiceUnavailableException } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { Test, TestingModule } from '@nestjs/testing';

import { HealthService } from './health.service';

describe('HealthService', () => {
  let service: HealthService;
  let module: TestingModule;

  const mockDiskHealthIndicator = {
    checkStorage: jest.fn(),
  };

  const mockMemoryHealthIndicator = {
    checkHeap: jest.fn(),
  };

  const mockHttpHealthIndicator = {
    pingCheck: jest.fn(),
  };

  const mockTypeormHealthIndicator = {
    pingCheck: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        HealthService,
        Logger,
        HealthCheckService,
        {
          provide: DiskHealthIndicator,
          useValue: mockDiskHealthIndicator,
        },
        {
          provide: MemoryHealthIndicator,
          useValue: mockMemoryHealthIndicator,
        },
        {
          provide: HttpHealthIndicator,
          useValue: mockHttpHealthIndicator,
        },
        {
          provide: TypeOrmHealthIndicator,
          useValue: mockTypeormHealthIndicator,
        },
      ],
    })
      .overrideProvider(HealthCheckService)
      .useValue({
        check: jest.fn().mockResolvedValue({
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
      })
      .compile();

    service = module.get<HealthService>(HealthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return "ok" if all the health check succeeds', async () => {
    const result = await service.checkAppHealth();
    expect(result?.status).toEqual('ok');
  });

  it('throws an error if any of the health check fails', async () => {
    const healthCheckService = module.get<HealthCheckService>(HealthCheckService);
    (healthCheckService.check as jest.Mock).mockRejectedValue(new ServiceUnavailableException());
    await expect(service.checkAppHealth()).rejects.toThrow(ServiceUnavailableException);
  });
});
