import { INestApplication } from '@nestjs/common';
import request from 'supertest';

export async function createTestUser(
  app: INestApplication,
  options: {
    userId: string;
    nickname?: string;
  },
) {
  const { userId, nickname = `test-user-${userId}` } = options;

  const response = await request(app.getHttpServer())
    .post('/users/register')
    .set('x-user-id', userId)
    .field('nickname', nickname)
    .expect(201);

  return response.body as {
    userId: string;
    nickname: string;
    profileImgPath?: string;
    profileImgUrl?: string;
  };
}
