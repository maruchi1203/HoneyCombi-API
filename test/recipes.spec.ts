import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { DataSource } from 'typeorm';
import {
  RecipeCommentOrmEntity,
  RecipeOrmEntity,
  RecipeStepOrmEntity,
} from '../src/domains/recipes/adapters/orm';
import { UserOrmEntity } from '../src/domains/users/adapters/entities/user.orm-entity';
import { createAuthTestApp } from './helpers/auth-test-app';
import { createTestUser } from './helpers/create-test-user';

jest.setTimeout(20000);

describe('recipes suite', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let recipeId = '';
  const userId = 'recipe-test-user';

  beforeAll(async () => {
    ({ app, dataSource } = await createAuthTestApp());
    await createTestUser(app, {
      userId,
      nickname: 'recipe-test-user',
    });
  });

  afterAll(async () => {
    if (recipeId) {
      await dataSource
        .getRepository(RecipeCommentOrmEntity)
        .delete({ recipeId });
      await dataSource.getRepository(RecipeStepOrmEntity).delete({ recipeId });
      await dataSource.getRepository(RecipeOrmEntity).delete({ recipeId });
    }
    await dataSource.getRepository(UserOrmEntity).delete({ id: userId });

    await app.close();
  });

  it('creates a recipe', async () => {
    const response = await request(app.getHttpServer())
      .post('/recipes')
      .set('x-user-id', userId)
      .send({
        authorId: userId,
        title: 'recipe test title',
        categories: ['A', 'B', 'C'],
        ingredients: ['egg', 'milk'],
        price: 12345,
        summary: 'recipe test summary',
        steps: JSON.stringify([
          { order: 0, text: 'step 1', image: [] },
          { order: 1, text: 'step 2', image: [] },
        ]),
      })
      .expect(201);

    recipeId = response.body?.id ?? '';

    expect(recipeId).toBeTruthy();
    expect(response.body).toMatchObject({
      authorId: userId,
      title: 'recipe test title',
      categories: ['A', 'B', 'C'],
      summary: 'recipe test summary',
    });
    expect(response.body.steps).toHaveLength(2);
  });

  it('updates a recipe', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/recipes/${recipeId}`)
      .set('x-user-id', userId)
      .send({
        title: 'recipe updated title',
        content: 'recipe updated summary',
        steps: [{ order: 0, text: 'updated step', image: [] }],
      })
      .expect(200);

    expect(response.body).toMatchObject({
      id: recipeId,
      title: 'recipe updated title',
      summary: 'recipe updated summary',
    });
    expect(response.body.steps).toHaveLength(1);
    expect(response.body.steps[0].text).toBe('updated step');
  });

  it('deletes a recipe', async () => {
    await request(app.getHttpServer())
      .delete(`/recipes/${recipeId}`)
      .set('x-user-id', userId)
      .expect(200);

    const deleted = await dataSource
      .getRepository(RecipeOrmEntity)
      .findOne({ where: { recipeId } });

    expect(deleted).toBeNull();
    recipeId = '';
  });
});
