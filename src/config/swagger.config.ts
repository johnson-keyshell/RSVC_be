import { DocumentBuilder } from '@nestjs/swagger';

export default () =>
  new DocumentBuilder()
    .setTitle('RSVC-Backend')
    .setDescription('Backend for RSVC Property Marketplace Application')
    .setVersion('0.0.1')
    .build();
