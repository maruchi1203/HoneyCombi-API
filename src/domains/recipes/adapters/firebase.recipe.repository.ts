import { Injectable } from '@nestjs/common';
import admin from 'firebase-admin';
import {
  getFirestore,
  getStorageBucket,
} from '../../../common/firebase/firebase-admin';
import { CreateRecipeDto } from '../dto/index.dto';
import { UpdateRecipeDto } from '../dto/index.dto';
import { Recipe } from '../entities/recipe.entity';
import { RecipesPort } from '../ports/recipes.port';
import { RecipeListItem } from '../entities/recipe.list-item.entity';
import { ImageDto } from '../../../common/dto/index.dto';
import { CommentsPort } from '../ports/comments.port';
import { CreateCommentDto } from '../dto/index.dto';
import { UpdateCommentDto } from '../dto/index.dto';
import { Comment } from '../entities/comment.entity';

/**
 * Firestore 기반 레시피 저장소입니다.
 * 레시피/댓글 문서는 Firestore에, 이미지 파일은 Firebase Storage에 저장합니다.
 */
@Injectable()
export class FirebaseRecipesRepository implements RecipesPort, CommentsPort {
  private readonly recipesColName = 'recipes';
  private readonly commentsColName = 'comments';

  // #region Recipe
  /**
   * 레시피 생성 요청을 받아 레시피 문서를 생성합니다.
   * @param input 레시피 생성 DTO
   * @param files 업로드할 이미지 파일
   * @returns 생성된 레시피
   */
  async createRecipe(
    input: CreateRecipeDto,
    files: Express.Multer.File[] = [],
  ): Promise<Recipe> {
    // 1. DB 연결 및 문서 참조 생성
    const db = getFirestore();
    const docRef = db.collection(this.recipesColName).doc();
    const recipeId = docRef.id;
    const { steps, thumbnailPath, ...rest } = input;

    // 2. 이미지 업로드
    const uploaded = await this.uploadRecipeImages(
      recipeId,
      steps ?? [],
      files,
    );

    // 3. 이미지 경로 최종 설정
    const finalThumbnailPath =
      thumbnailPath ?? uploaded.thumbnailPath ?? undefined;

    await docRef.set({
      ...rest,
      steps: uploaded.steps,
      thumbnailPath: finalThumbnailPath ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // 4. 결과 문서 반환
    const snapshot = await docRef.get();
    return this.mapSnapshotForRecipe(snapshot);
  }

  /**
   * 레시피 목록을 정렬/커서 기준으로 조회합니다.
   * @param cursor 검색 시작 기준값
   * @param sort 정렬 기준값
   * @param limit 조회할 레시피 수
   * @returns 요약된 레시피 목록
   */
  async findRecipeListItems(
    cursor: string | undefined,
    sort: string,
    limit: number,
  ): Promise<RecipeListItem[]> {
    const db = getFirestore();
    let query: admin.firestore.Query = db.collection(this.recipesColName);

    if (sort === 'likes') {
      query = query.orderBy('stats.totalRate', 'desc');
    } else {
      query = query.orderBy('createdAt', 'desc');
    }

    if (cursor) {
      if (sort === 'likes') {
        const numericCursor = Number(cursor);
        if (Number.isFinite(numericCursor)) {
          query = query.startAfter(numericCursor);
        }
      } else {
        query = query.startAfter(cursor);
      }
    }

    const snapshot = await query.limit(limit).get();

    return snapshot.docs.map((doc) => this.mapSnapshotForRecipeListItem(doc));
  }

  async findTopRecipeListItems(limit: number): Promise<RecipeListItem[]> {
    const db = getFirestore();
    const snapshot = await db
      .collection(this.recipesColName)
      .orderBy('stats.view', 'desc')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    return snapshot.docs.map((doc) => this.mapSnapshotForRecipeListItem(doc));
  }

  /**
   * 레시피 단건 상세 정보를 조회합니다.
   * @param recipeId
   * @returns 레시피 또는 null
   */
  async findFullRecipe(recipeId: string): Promise<Recipe | null> {
    const db = getFirestore();
    const snapshot = await db
      .collection(this.recipesColName)
      .doc(recipeId)
      .get();

    if (!snapshot.exists) {
      return null;
    }

    return this.mapSnapshotForRecipe(snapshot);
  }

  /**
   * 레시피의 전체 정보를 수정합니다.
   * @param recipeId
   * @param data 수정할 레시피 데이터
   * @returns 수정된 레시피
   */
  async updateFullRecipe(
    recipeId: string,
    data: UpdateRecipeDto,
  ): Promise<Recipe> {
    const db = getFirestore();
    const sanitized = this.stripUndefined(data);
    await db
      .collection(this.recipesColName)
      .doc(recipeId)
      .update({
        ...sanitized,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    const snapshot = await db
      .collection(this.recipesColName)
      .doc(recipeId)
      .get();

    return this.mapSnapshotForRecipe(snapshot);
  }

  /**
   * 레시피를 삭제합니다.
   * @param recipeId
   */
  async deleteRecipe(recipeId: string): Promise<void> {
    const db = getFirestore();
    await db.collection(this.recipesColName).doc(recipeId).delete();
  }
  // #endregion

  // #region Comment
  /**
   * 댓글을 생성합니다.
   * @param input 댓글 생성 DTO
   * @returns 생성된 댓글
   */
  async createComment(input: CreateCommentDto): Promise<Comment> {
    const db = getFirestore();
    const recipeRef = db.collection(this.recipesColName).doc(input.recipeId);
    const commentRef = recipeRef.collection(this.commentsColName).doc();

    // 댓글 생성과 Recipe 댓글 수 증가를 하나의 배치로 처리
    const batch = db.batch();
    batch.set(commentRef, {
      recipeId: input.recipeId,
      authorId: input.authorId,
      text: input.text,
      stats: {
        good: 0,
        bad: 0,
      },
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(recipeRef, {
      'stats.comment': admin.firestore.FieldValue.increment(1),
    });

    await batch.commit();

    const snapshot = await commentRef.get();
    return this.mapSnapshotForComment(snapshot);
  }

  /**
   * 특정 사용자가 작성한 댓글 목록을 조회합니다.
   * @param userId
   * @returns 댓글 목록
   */
  async findCommentsByUser(userId: string): Promise<Comment[] | null> {
    const db = getFirestore();
    const snapshot = await db
      .collectionGroup(this.commentsColName)
      .where('authorId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => this.mapSnapshotForComment(doc));
  }

  async findCommentsByRecipe(recipeId: string): Promise<Comment[] | null> {
    const db = getFirestore();
    const snapshot = await db
      .collection(this.recipesColName)
      .doc(recipeId)
      .collection(this.commentsColName)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    if (snapshot.empty) {
      return [];
    }

    return snapshot.docs.map((doc) => this.mapSnapshotForComment(doc));
  }

  async updateComment(
    authorId: string,
    data: UpdateCommentDto,
  ): Promise<Comment> {
    const db = getFirestore();
    const commentRef = db
      .collection(this.recipesColName)
      .doc(data.recipeId)
      .collection(this.commentsColName)
      .doc(data.commentId);

    const snapshot = await commentRef.get();
    if (!snapshot.exists) {
      throw new Error('Comment not found.');
    }

    const existing = snapshot.data() as Partial<Comment> | undefined;
    if (existing?.userId !== authorId) {
      throw new Error('Not allowed to update this comment.');
    }

    await commentRef.update({
      text: data.text,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await commentRef.get();
    return this.mapSnapshotForComment(updated);
  }

  async deleteComment(
    authorId: string,
    recipeId: string,
    commentId: string,
  ): Promise<void> {
    const db = getFirestore();
    const recipeRef = db.collection(this.recipesColName).doc(recipeId);
    const commentRef = recipeRef
      .collection(this.commentsColName)
      .doc(commentId);

    const snapshot = await commentRef.get();
    if (!snapshot.exists) {
      return;
    }

    const existing = snapshot.data() as Partial<Comment> | undefined;
    if (existing?.userId !== authorId) {
      throw new Error('Not allowed to delete this comment.');
    }

    const batch = db.batch();
    batch.delete(commentRef);
    batch.update(recipeRef, {
      'stats.comment': admin.firestore.FieldValue.increment(-1),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
  }
  // #endregion

  // #region snapshot
  /**
   * Firestore 레시피 문서를 API 응답용 상세 모델로 변환합니다.
   */
  private mapSnapshotForRecipe(
    snapshot: admin.firestore.DocumentSnapshot,
  ): Recipe {
    const data = snapshot.data() as
      | (Partial<Recipe> & { thumbnailPath?: string })
      | undefined;

    return {
      id: snapshot.id,
      authorId: data?.authorId ?? '',
      title: data?.title ?? '',
      price: data?.price,
      categories: data?.categories ?? [],
      summary: data?.summary,
      thumbnailUrl: data?.thumbnailUrl ?? data?.thumbnailPath,
      steps: data?.steps ?? [],
      stats: {
        view: data?.stats?.view ?? 0,
        scrap: data?.stats?.scrap ?? 0,
        good: data?.stats?.good ?? 0,
        bad: data?.stats?.bad ?? 0,
        comment: data?.stats?.comment ?? 0,
      },
      createdAt: this.toIsoDate(data?.createdAt),
      updatedAt: this.toIsoDate(data?.updatedAt) || undefined,
    };
  }

  /**
   * Firestore 레시피 문서를 목록 조회용 축약 모델로 변환합니다.
   */
  private mapSnapshotForRecipeListItem(
    snapshot: admin.firestore.DocumentSnapshot,
  ): RecipeListItem {
    const data = snapshot.data() as Partial<RecipeListItem> | undefined;

    return {
      recipeId: snapshot.id,
      userId: data?.userId ?? '',
      title: data?.title ?? '',
      price: data?.price,
      categories: data?.categories ?? [],
      summary: data?.summary,
      thumbnailUrl: data?.thumbnailUrl,
      stats: {
        totalRate: data?.stats?.totalRate ?? 0,
        comment: data?.stats?.comment ?? 0,
        view: data?.stats?.view ?? 0,
      },
      createdAt: this.toIsoDate(data?.createdAt),
    };
  }

  private mapSnapshotForComment(
    snapshot: admin.firestore.DocumentSnapshot,
  ): Comment {
    const data = snapshot.data() as Partial<Comment> | undefined;
    const parentRecipeId = snapshot.ref.parent.parent?.id ?? '';

    return {
      id: snapshot.id,
      recipeId: data?.recipeId ?? parentRecipeId,
      userId: data?.userId ?? '',
      text: data?.text ?? '',
      stats: {
        good: data?.stats?.good ?? 0,
        bad: data?.stats?.bad ?? 0,
      },
      createdAt: this.toIsoDate(data?.createdAt),
      updatedAt: this.toIsoDate(data?.updatedAt) || undefined,
    };
  }
  // #endregion

  // #region Private
  /**
   * 업로드된 파일 목록에서 썸네일과 step 이미지를 분리해 Storage에 저장합니다.
   */
  private async uploadRecipeImages(
    recipeId: string,
    steps: CreateRecipeDto['steps'],
    files: Express.Multer.File[],
  ) {
    const bucket = getStorageBucket();
    const thumbnailFile = files.find((file) => file.fieldname === 'thumbnail');
    const stepFiles = files
      .map((file, index) => ({ file, index }))
      .filter(({ file }) => this.isStepImageField(file.fieldname));

    const stepsWithImages = steps.map((step) => ({
      ...step,
      image: [],
    }));

    const uploadedStepsImages: ImageDto[][] = stepsWithImages.map(() => []);

    for (const { file } of stepFiles) {
      const { stepIndex, imageIndex } = this.parseStepImageField(
        file.fieldname,
      );
      if (stepIndex < 0 || stepIndex >= uploadedStepsImages.length) {
        continue;
      }

      const nextIndex = imageIndex ?? uploadedStepsImages[stepIndex].length;
      const extension = this.resolveFileExtension(file);
      const storagePath = `${this.recipesColName}/${recipeId}/steps/${stepIndex}/${nextIndex}.${extension}`;

      await this.uploadFile(bucket, storagePath, file);

      uploadedStepsImages[stepIndex][nextIndex] = {
        path: storagePath,
        contentType: file.mimetype,
        bytes: file.size,
        order: nextIndex,
      };
    }

    const normalizedSteps = stepsWithImages.map((step, index) => ({
      ...step,
      image: uploadedStepsImages[index].filter(Boolean),
    }));

    let thumbnailPath: string | null = null;

    if (thumbnailFile) {
      const extension = this.resolveFileExtension(thumbnailFile);
      const storagePath = `${this.recipesColName}/${recipeId}/thumbnail.${extension}`;
      await this.uploadFile(bucket, storagePath, thumbnailFile);
      thumbnailPath = storagePath;
    } else {
      thumbnailPath = this.resolveDefaultThumbnailPath(normalizedSteps);
    }

    return { steps: normalizedSteps, thumbnailPath };
  }

  private resolveDefaultThumbnailPath(steps: CreateRecipeDto['steps']) {
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      const images = steps[index]?.image ?? [];
      const last = images[images.length - 1];
      if (last?.path) {
        return last.path;
      }
    }

    return null;
  }

  private isStepImageField(fieldName: string) {
    return /^steps\[\d+\]\.image(\[\d+\])?$/.test(fieldName);
  }

  private parseStepImageField(fieldName: string) {
    const match = fieldName.match(/^steps\[(\d+)\]\.image(?:\[(\d+)\])?$/);
    if (!match) {
      return { stepIndex: -1, imageIndex: undefined as number | undefined };
    }

    const stepIndex = Number(match[1]);
    const imageIndex = match[2] === undefined ? undefined : Number(match[2]);

    return { stepIndex, imageIndex };
  }

  private resolveFileExtension(file: Express.Multer.File) {
    const type = file.mimetype ?? '';
    if (type.includes('/')) {
      return type.split('/')[1] ?? 'jpg';
    }

    return 'jpg';
  }

  private async uploadFile(
    bucket: ReturnType<typeof getStorageBucket>,
    destination: string,
    file: Express.Multer.File,
  ) {
    if (file.buffer) {
      await bucket.file(destination).save(file.buffer, {
        contentType: file.mimetype,
        resumable: false,
      });
      return;
    }

    if (file.path) {
      await bucket.upload(file.path, {
        destination,
        contentType: file.mimetype,
      });
    }
  }

  private stripUndefined(value: UpdateRecipeDto) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined),
    ) as Partial<UpdateRecipeDto>;
  }

  /**
   * Firestore Timestamp, Date, 문자열을 모두 ISO 문자열로 통일합니다.
   */
  private toIsoDate(value: unknown) {
    if (!value) {
      return '';
    }

    if (typeof value === 'string') {
      return value;
    }

    if (value instanceof Date) {
      return value.toISOString();
    }

    if (
      typeof value === 'object' &&
      value !== null &&
      'toDate' in value &&
      typeof (value as { toDate?: unknown }).toDate === 'function'
    ) {
      return (
        (value as { toDate: () => Date }).toDate?.()?.toISOString?.() ?? ''
      );
    }

    return '';
  }
  // #endregion
}


