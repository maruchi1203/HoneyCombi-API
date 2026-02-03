import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { RecipeModule } from '../src/domains/recipes/recipe.module';

jest.setTimeout(20000);

describe('레시피 테스트 Suite', () => {
  let app: INestApplication;
  let recipeId = '';
  const authorId = 'user-recipe-test';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RecipeModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('레시피 생성', async () => {
    const response = await request(app.getHttpServer())
      .post('/recipes')
      .set('x-user-id', authorId)
      .send({
        authorId,
        title: '레시피 테스트 제목',
        categories: ['A', 'B', 'C'],
        price: 12345,
        summary: '레시피 테스트 요약',
        steps: '[]',
      })
      .expect(201);

    recipeId = response.body?.id ?? '';
    expect(recipeId).toBeTruthy();
  });

  it('레시피 수정', async () => {
    await request(app.getHttpServer())
      .patch(`/recipes/${recipeId}`)
      .set('x-user-id', authorId)
      .send({
        title: '레시피 테스트 수정 후 제목',
        summary: '레시피 테스트 수정 후 요약',
      })
      .expect(200);
  });

  it('레시피 삭제', async () => {
    await request(app.getHttpServer())
      .delete(`/recipes/${recipeId}`)
      .set('x-user-id', authorId)
      .expect(200);
  });
});
