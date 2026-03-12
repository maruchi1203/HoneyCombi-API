import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import request from 'supertest';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { AuthGuard } from '../src/common/guards/auth.guard';
import {
  RecipeCommentOrmEntity,
  RecipeOrmEntity,
  RecipeStepOrmEntity,
} from '../src/domains/recipes/adapters/orm';

jest.setTimeout(20000);

describe('comments suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let commentId = '';
  let recipeId = '';
  const authorId = 'test0';

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

    const response = await request(app.getHttpServer())
      .post('/recipes')
      .set('x-user-id', authorId)
      .send({
        authorId,
        title: 'comment test recipe',
        categories: [],
        ingredients: [],
        summary: 'comment test summary',
        steps: JSON.stringify([{ order: 0, text: 'step 1', image: [] }]),
      })
      .expect(201);

    recipeId = response.body.id;
  });

  afterAll(async () => {
    if (recipeId) {
      await dataSource
        .getRepository(RecipeCommentOrmEntity)
        .delete({ recipeId });
      await dataSource.getRepository(RecipeStepOrmEntity).delete({ recipeId });
      await dataSource.getRepository(RecipeOrmEntity).delete({ recipeId });
    }

    await app.close();
  });

  it('creates a comment', async () => {
    const response = await request(app.getHttpServer())
      .post(`/recipes/${recipeId}/comments`)
      .set('x-user-id', authorId)
      .send({ text: 'first comment' })
      .expect(201);

    expect(response.body).toMatchObject({
      recipeId,
      authorId,
      text: 'first comment',
    });

    commentId = response.body.id;
  });

  it('finds comments by user', async () => {
    const response = await request(app.getHttpServer())
      .get(`/recipes/comments/user/${authorId}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(
      response.body.some((comment: { id: string }) => comment.id === commentId),
    ).toBe(true);
  });

  it('updates a comment', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/recipes/${recipeId}/comments/${commentId}`)
      .set('x-user-id', authorId)
      .send({ text: 'updated comment' })
      .expect(200);

    expect(response.body.text).toBe('updated comment');
  });

  it('deletes a comment', async () => {
    await request(app.getHttpServer())
      .delete(`/recipes/${recipeId}/comments/${commentId}`)
      .set('x-user-id', authorId)
      .expect(200);

    const deleted = await dataSource
      .getRepository(RecipeCommentOrmEntity)
      .findOne({ where: { commentId } });

    expect(deleted).toBeNull();
    commentId = '';
  });
});
