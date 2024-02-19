import 'dotenv/config';
import { DataSourceOptions } from 'typeorm';

export default (): DataSourceOptions => {
  const dbConfig: DataSourceOptions = {
    type: 'mysql',
    migrations: ['db/migrations/*.ts'],
    migrationsTableName: 'migrations_typeorm',
  };

  switch (process.env.NODE_ENV) {
    case 'development':
      Object.assign(dbConfig, {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || '3306',
        username: process.env.DB_USERNAME || 'root',
        password: process.env.DB_PASSWORD || 'password',
        database: process.env.DB_NAME || 'rsvc_db_dev',
        synchronize: true,
        retries: 3,
        autoLoadEntities: true,
      });
      break;
    case 'test':
      Object.assign(dbConfig, {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: 'rsvc_db_test',
        retries: 3,
        autoLoadEntities: true,
      });
      break;
    case 'staging' || 'production':
      //TODO setup production config
      Object.assign(dbConfig, {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || 'rsvc_db',
        retries: 3,
        autoLoadEntities: true,
      });
      break;
    default:
      throw new Error('Unknown Environment!');
  }
  return dbConfig;
};
