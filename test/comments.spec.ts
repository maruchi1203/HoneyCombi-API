import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import admin from 'firebase-admin';
import { RecipeModule } from '../src/domains/recipes/recipe.module';
import {
  getFirebaseApp,
  getFirestore,
} from '../src/common/firebase/firebase-admin';

jest.setTimeout(20000);

// describe : 여러 TestCase를 하나의 TestSuite로 묶는다
describe('댓글 테스트 Suite', () => {
  let app: INestApplication;
  let commentId = '';
  const recipeId = `recipe-comments-test`;
  const authorId = `user-comments-test`;

  // 테스트 실행 전 설정
  beforeAll(async () => {
    // RecipeModule에 한정해 모듈 생성 (전체 모듈로 하니 Jest와 TypeORM의 충돌 문제가 있었음)
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [RecipeModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // 테스트할 데이터 준비
    const db = getFirestore();
    await db
      .collection('recipes')
      .doc(recipeId)
      .set({
        authorId,
        title: 'e2e recipe',
        categories: [],
        steps: [],
        stats: {
          view: 0,
          scrap: 0,
          good: 0,
          bad: 0,
          comment: 0,
        },
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
  });

  // 테스트 실행 후 설정
  afterAll(async () => {
    try {
      const db = getFirestore();
      const commentsRef = db
        .collection('recipes')
        .doc(recipeId)
        .collection('comments');
      const commentsSnapshot = await commentsRef.get();
      const batch = db.batch();
      commentsSnapshot.docs.forEach((doc) => batch.delete(doc.ref));
      batch.delete(db.collection('recipes').doc(recipeId));
      await batch.commit();
    } finally {
      await app.close();
      const firebaseApp = getFirebaseApp();
      await firebaseApp.delete();
    }
  });

  it('댓글 생성', async () => {
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

  it('유저 기반 댓글 검색', async () => {
    const response = await request(app.getHttpServer())
      .get(`/recipes/comments/user/${authorId}`)
      .expect(200);

    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBe(1);
  });

  it('댓글 수정', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/recipes/${recipeId}/comments/${commentId}`)
      .set('x-user-id', authorId)
      .send({ text: '수정된 댓글' })
      .expect(200);

    expect(response.body.text).toBe('수정된 댓글');
  });

  it('댓글 삭제', async () => {
    await request(app.getHttpServer())
      .delete(`/recipes/${recipeId}/comments/${commentId}`)
      .set('x-user-id', authorId)
      .expect(200);

    const response = await request(app.getHttpServer())
      .get(`/recipes/comments/user/${authorId}`)
      .expect(200);

    expect(response.body.length).toBe(0);
  });
});
