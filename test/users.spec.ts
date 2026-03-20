import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { UserOrmEntity } from '../src/domains/users/adapters/entities/user.orm-entity';
import { createAuthTestApp } from './helpers/auth-test-app';

jest.setTimeout(20000);

describe('users suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const userId = 'user-upload-test';

  beforeAll(async () => {
    ({ app, dataSource } = await createAuthTestApp());
  });

  afterAll(async () => {
    await dataSource.getRepository(UserOrmEntity).delete({ userId: userId });
    await app.close();
  });

  it('registers a user with a profile image upload', async () => {
    const response = await request(app.getHttpServer())
      .post('/users/register')
      .set('x-user-id', userId)
      .field('nickname', 'upload-user')
      .attach('profileImage', Buffer.from('png-image'), {
        filename: 'avatar.png',
        contentType: 'image/png',
      })
      .expect(201);

    expect(response.body).toMatchObject({
      userId,
      nickname: 'upload-user',
      profileImgPath: `users/${userId}/profile.png`,
    });
    expect(response.body.profileImgUrl).toEqual(expect.any(String));
    expect(response.body.profileImgUrl).toContain(
      `users/${userId}/profile.png`,
    );
  });

  it('finds a user with a signed profile image url', async () => {
    const response = await request(app.getHttpServer())
      .get(`/users/${userId}`)
      .expect(200);

    expect(response.body).toMatchObject({
      userId,
      nickname: 'upload-user',
      profileImgPath: `users/${userId}/profile.png`,
    });
    expect(response.body.profileImgUrl).toEqual(expect.any(String));
    expect(response.body.profileImgUrl).toContain(
      `users/${userId}/profile.png`,
    );
  });

  it('updates a user profile image upload', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/users/${userId}`)
      .set('x-user-id', userId)
      .field('nickname', 'updated-user')
      .attach('profileImage', Buffer.from('jpeg-image'), {
        filename: 'avatar.jpg',
        contentType: 'image/jpeg',
      })
      .expect(200);

    expect(response.body).toMatchObject({
      userId,
      nickname: 'updated-user',
      profileImgPath: `users/${userId}/profile.jpeg`,
    });
    expect(response.body.profileImgUrl).toEqual(expect.any(String));
    expect(response.body.profileImgUrl).toContain(
      `users/${userId}/profile.jpeg`,
    );
  });

  it('deletes a user', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('x-user-id', userId)
      .expect(200);

    const deleted = await dataSource
      .getRepository(UserOrmEntity)
      .findOne({ where: { userId: userId } });

    expect(deleted).toBeNull();
  });
});
