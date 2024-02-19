import { HttpModule } from '@nestjs/axios';
import { Logger, Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';

import { HealthController } from './health.controller';
import { HealthService } from './health.service';
import { DatabaseModule } from '../database/database.module';

@Module({
  imports: [TerminusModule.forRoot({ logger: Logger, errorLogStyle: 'pretty' }), HttpModule, DatabaseModule],
  controllers: [HealthController],
  providers: [Logger, HealthService],
})
export class HealthModule {}
