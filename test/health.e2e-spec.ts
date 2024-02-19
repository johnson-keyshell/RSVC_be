import { HttpStatus, INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';

import { AppModule } from './../src/app.module';

describe('HealthController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    await app.init();
  });

  it('/health (GET) - should return the health check response', async () => {
    const response = await request(app.getHttpServer()).get('/health').expect(HttpStatus.OK);

    expect(response.body.data).toBeDefined();
    expect(response.body.error).toBeNull();
  });

  afterEach(async () => {
    if (app) {
      await app.close();
    }
  });
});
