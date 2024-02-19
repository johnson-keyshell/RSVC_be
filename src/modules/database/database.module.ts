import { Global, Logger, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

import databaseConfig from '../../config/db.config';

@Global()
@Module({
  imports: [TypeOrmModule.forRoot(databaseConfig())],
  exports: [TypeOrmModule],
  providers: [Logger],
})
export class DatabaseModule {
  constructor(
    private readonly datasource: DataSource,
    private logger: Logger,
  ) {
    if (this.datasource.isInitialized) {
      this.logger.log('DB Connected Successfully', 'Database');
    } else {
      this.logger.error('Unable to connect to Database!', 'Database');
    }
  }
}
