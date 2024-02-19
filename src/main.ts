import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';

import { AppModule } from './app.module';
import { winstonLogger } from './config/logger.config';
import swaggerConfig from './config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: winstonLogger('RSVC'),
  });

  //Loading environment variables
  const configService = app.get(ConfigService);

  //To add appropriate headers
  app.use(helmet());

  //To reduce response size
  app.use(compression());

  // Starts listening for shutdown hooks
  app.enableShutdownHooks();

  if (configService.get('NODE_ENV') === 'development') {
    //Setting up Swagger API documentation
    const document = SwaggerModule.createDocument(app, swaggerConfig());
    SwaggerModule.setup('docs', app, document);
  }

  //Starting the server
  await app.listen(configService.get('PORT'));

  const logger = new Logger('Main');
  logger.log(`Application is listening on port ${configService.get('PORT')}`);
}
bootstrap();
