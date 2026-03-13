import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import { UserOrmEntity } from '../src/domains/users/adapters/entities/user.orm-entity';

jest.setTimeout(20000);

describe('users suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  const userId = 'user-upload-test';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideGuard(AuthGuard)
      .useValue({
        canActivate: (context: {
          switchToHttp: () => {
            getRequest: () => {
              headers: Record<string, string | string[] | undefined>;
              user?: { id?: string };
            };
          };
        }) => {
          const request = context.switchToHttp().getRequest();
          const header = request.headers['x-user-id'];
          const resolvedUserId = Array.isArray(header) ? header[0] : header;
          request.user = { id: resolvedUserId };
          return true;
        },
      })
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    dataSource = app.get<DataSource>(getDataSourceToken());
  });

  afterAll(async () => {
    await dataSource.getRepository(UserOrmEntity).delete({ id: userId });
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
      id: userId,
      nickname: 'upload-user',
      profileImgPath: `users/${userId}/profile.png`,
    });
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
      id: userId,
      nickname: 'updated-user',
      profileImgPath: `users/${userId}/profile.jpeg`,
    });
  });

  it('deletes a user', async () => {
    await request(app.getHttpServer())
      .delete(`/users/${userId}`)
      .set('x-user-id', userId)
      .expect(200);

    const deleted = await dataSource
      .getRepository(UserOrmEntity)
      .findOne({ where: { id: userId } });

    expect(deleted).toBeNull();
  });
});
