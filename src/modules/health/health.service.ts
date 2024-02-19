import { Injectable } from '@nestjs/common';
import {
  DiskHealthIndicator,
  HealthCheckService,
  HttpHealthIndicator,
  MemoryHealthIndicator,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';

@Injectable()
export class HealthService {
  constructor(
    private health: HealthCheckService,
    private dbHealth: TypeOrmHealthIndicator,
    private http: HttpHealthIndicator,
    private disk: DiskHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  async checkAppHealth() {
    return this.health.check([
      () => this.disk.checkStorage('storage', { path: '/', thresholdPercent: 0.75 }),
      () => this.memory.checkHeap('memory', 150 * 1024 * 1024),
      () => this.http.pingCheck('ping', 'https://docs.nestjs.com'),
      () => this.dbHealth.pingCheck('database'),
    ]);
  }
}
