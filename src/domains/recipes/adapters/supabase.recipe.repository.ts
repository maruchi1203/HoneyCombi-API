/**
 * PostgreSQL, S3, Redis를 사용해 레시피와 댓글을 처리하는 저장소 구현입니다.
 */
import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import type { ImageDto } from '../../../common/dto/index.dto';
import { RedisCacheService } from '../../../common/cache/redis-cache.service';
import { S3StorageService } from '../../../common/storage/s3.storage.service';
import { Comment } from '../entities/comment.entity';
import { RecipeListItem } from '../entities/recipe.list-item.entity';
import { RecipeStepEntity } from '../entities/recipe-step.entity';
import { Recipe } from '../entities/recipe.entity';
import {
  CreateCommentDto,
  CreateRecipeDto,
  UpdateCommentDto,
  UpdateRecipeDto,
} from '../dto/index.dto';
import type { CommentsPort } from '../ports/comments.port';
import type { RecipesPort } from '../ports/recipes.port';
import {
  RecipeCommentOrmEntity,
  RecipeOrmEntity,
  RecipeStepOrmEntity,
} from './orm';

/**
 * PostgreSQL(TypeORM) 기반 레시피 저장소입니다.
 * 레시피 메타데이터는 DB에, 이미지는 S3에, 목록/상세 조회 캐시는 Redis에 둡니다.
 */
@Injectable()
export class SupabaseRecipesRepository implements RecipesPort, CommentsPort {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(RecipeOrmEntity)
    private readonly recipeRepo: Repository<RecipeOrmEntity>,
    @InjectRepository(RecipeStepOrmEntity)
    private readonly recipeStepRepo: Repository<RecipeStepOrmEntity>,
    @InjectRepository(RecipeCommentOrmEntity)
    private readonly commentRepo: Repository<RecipeCommentOrmEntity>,
    private readonly s3Storage: S3StorageService,
    private readonly cache: RedisCacheService,
  ) {}

  /**
   * 레시피 본문을 저장하고, 업로드 파일을 S3에 반영한 뒤 최종 상세 정보를 반환합니다.
   * @param input 레시피 생성 DTO
   * @param files 업로드된 이미지 파일 목록
   * @returns 생성된 레시피 상세 정보
   */
  async createRecipe(
    input: CreateRecipeDto,
    files: Express.Multer.File[] = [],
  ): Promise<Recipe> {
    const draftedRecipe = this.recipeRepo.create({
      userId: input.authorId,
      title: input.title,
      price: input.price ?? null,
      categories: input.categories ?? [],
      ingredients: input.ingredients ?? [],
      summary: input.summary ?? null,
      thumbnailPath: input.thumbnailPath ?? null,
    });

    const savedRecipe = await this.recipeRepo.save(draftedRecipe);
    const uploaded = await this.uploadRecipeImages(
      savedRecipe.recipeId,
      input.steps ?? [],
      files,
    );

    // 레시피 본문과 step 이미지는 함께 보여야 하므로 하나의 트랜잭션에서 맞춰 저장합니다.
    await this.dataSource.transaction(async (manager) => {
      savedRecipe.thumbnailPath =
        savedRecipe.thumbnailPath ?? uploaded.thumbnailPath ?? null;

      await manager.getRepository(RecipeOrmEntity).save(savedRecipe);
      await this.replaceRecipeSteps(
        manager.getRepository(RecipeStepOrmEntity),
        savedRecipe.recipeId,
        uploaded.steps,
      );
    });

    await this.invalidateRecipeCache(savedRecipe.recipeId);
    return this.findOrFailRecipe(savedRecipe.recipeId);
  }

  /**
   * 정렬, 커서, limit 조건에 따라 레시피 목록을 조회하고 Redis 캐시를 활용합니다.
   * @param cursor 목록 커서 값
   * @param sort 정렬 기준
   * @param limit 조회 개수
   * @returns 레시피 목록용 요약 배열
   */
  async findRecipeListItems(
    cursor: string | undefined,
    sort: string,
    limit: number,
  ): Promise<RecipeListItem[]> {
    // 정렬 조건별 캐시 키를 분리해 목록 조회 비용을 줄입니다.
    const cacheKey = `recipes:list:${sort}:${cursor ?? ''}:${limit}`;
    const cached = await this.cache.getJson<RecipeListItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const qb = this.recipeRepo.createQueryBuilder('r').limit(limit);

    if (sort === 'likes') {
      qb.orderBy('(r.stats_good - r.stats_bad)', 'DESC').addOrderBy(
        'r.created_at',
        'DESC',
      );

      const numericCursor = Number(cursor);
      if (cursor && Number.isFinite(numericCursor)) {
        qb.andWhere('(r.stats_good - r.stats_bad) < :cursor', {
          cursor: numericCursor,
        });
      }
    } else {
      qb.orderBy('r.created_at', 'DESC');
      if (cursor) {
        qb.andWhere('r.created_at < :cursor', { cursor });
      }
    }

    const rows = await qb.getMany();
    const items = await Promise.all(
      rows.map((row) => this.mapRecipeListItem(row)),
    );

    await this.cache.setJson(cacheKey, items, 60);
    return items;
  }

  /**
   * 조회 수 기준 Top10 레시피 목록을 조회하고 Redis 캐시를 활용합니다.
   * @param limit 조회할 상위 개수
   * @returns Top 레시피 요약 배열
   */
  async findTopRecipeListItems(limit: number): Promise<RecipeListItem[]> {
    const cacheKey = `recipes:top:view:${limit}`;
    const cached = await this.cache.getJson<RecipeListItem[]>(cacheKey);
    if (cached) {
      return cached;
    }

    const rows = await this.recipeRepo.find({
      order: { statsView: 'DESC', createdAt: 'DESC' },
      take: limit,
    });

    const items = await Promise.all(
      rows.map((row) => this.mapRecipeListItem(row)),
    );

    await this.cache.setJson(cacheKey, items, 60);
    return items;
  }

  /**
   * 레시피 상세 정보를 조회하고 상세 캐시를 활용합니다.
   * @param recipeId 조회 대상 레시피 ID
   * @returns 레시피 상세 정보 또는 null
   */
  async findFullRecipe(recipeId: string): Promise<Recipe | null> {
    const cacheKey = `recipes:detail:${recipeId}`;
    const cached = await this.cache.getJson<Recipe>(cacheKey);
    if (cached) {
      return cached;
    }

    const row = await this.recipeRepo.findOne({ where: { recipeId } });
    if (!row) {
      return null;
    }

    const steps = await this.findRecipeSteps(recipeId);
    const mapped = await this.mapRecipe(row, steps);
    await this.cache.setJson(cacheKey, mapped, 180);
    return mapped;
  }

  /**
   * 레시피 본문과 step 정보를 갱신하고 관련 캐시를 무효화합니다.
   * @param recipeId 수정 대상 레시피 ID
   * @param data 수정 DTO
   * @returns 수정된 레시피 상세 정보
   */
  async updateFullRecipe(
    recipeId: string,
    data: UpdateRecipeDto,
  ): Promise<Recipe> {
    const row = await this.recipeRepo.findOne({ where: { recipeId } });
    if (!row) {
      throw new NotFoundException('Recipe not found.');
    }

    row.title = data.title ?? row.title;
    row.price = data.price ?? row.price;
    row.categories = data.categories ?? row.categories;
    row.summary = data.content ?? row.summary;
    row.thumbnailPath = data.thumbnailPath ?? row.thumbnailPath;

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(RecipeOrmEntity).save(row);

      if (data.steps) {
        await this.replaceRecipeSteps(
          manager.getRepository(RecipeStepOrmEntity),
          recipeId,
          data.steps,
        );
      }
    });

    await this.invalidateRecipeCache(recipeId);
    return this.findOrFailRecipe(recipeId);
  }

  /**
   * 레시피와 관련 step, 댓글 데이터를 함께 삭제하고 캐시를 무효화합니다.
   * @param recipeId 삭제 대상 레시피 ID
   * @returns 삭제 완료 결과
   */
  async deleteRecipe(recipeId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(RecipeStepOrmEntity).delete({ recipeId });
      await manager.getRepository(RecipeCommentOrmEntity).delete({ recipeId });
      await manager.getRepository(RecipeOrmEntity).delete({ recipeId });
    });

    await this.invalidateRecipeCache(recipeId);
  }

  /**
   * 댓글을 생성하고 레시피 댓글 수를 함께 증가시킵니다.
   * @param input 댓글 생성 DTO
   * @returns 생성된 댓글 정보
   */
  async createComment(input: CreateCommentDto): Promise<Comment> {
    const recipe = await this.recipeRepo.findOne({
      where: { recipeId: input.recipeId },
    });
    if (!recipe) {
      throw new NotFoundException('Recipe not found.');
    }

    const saved = await this.dataSource.transaction(async (manager) => {
      const commentRepo = manager.getRepository(RecipeCommentOrmEntity);
      const recipeRepo = manager.getRepository(RecipeOrmEntity);

      const comment = commentRepo.create({
        recipeId: input.recipeId,
        userId: input.authorId,
        text: input.text,
      });

      const nextComment = await commentRepo.save(comment);
      recipe.statsComment += 1;
      await recipeRepo.save(recipe);

      return nextComment;
    });

    await this.invalidateRecipeCache(input.recipeId);
    return this.mapComment(saved);
  }

  /**
   * 특정 사용자가 작성한 댓글을 최신순으로 조회합니다.
   * @param authorId 댓글 작성자 ID
   * @returns 댓글 배열
   */
  async findCommentsByUser(authorId: string): Promise<Comment[]> {
    const rows = await this.commentRepo.find({
      where: { userId: authorId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return rows.map((row) => this.mapComment(row));
  }

  /**
   * 특정 레시피에 달린 댓글을 최신순으로 조회합니다.
   * @param recipeId 조회 대상 레시피 ID
   * @returns 댓글 배열
   */
  async findCommentsByRecipe(recipeId: string): Promise<Comment[]> {
    const rows = await this.commentRepo.find({
      where: { recipeId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return rows.map((row) => this.mapComment(row));
  }

  /**
   * 댓글 작성자 본인 여부를 확인한 뒤 댓글 내용을 수정합니다.
   * @param authorId 현재 인증 사용자 ID
   * @param data 댓글 수정 DTO
   * @returns 수정된 댓글 정보
   */
  async updateComment(
    authorId: string,
    data: UpdateCommentDto,
  ): Promise<Comment> {
    const row = await this.commentRepo.findOne({
      where: { commentId: data.commentId, recipeId: data.recipeId },
    });
    if (!row) {
      throw new NotFoundException('Comment not found.');
    }

    if (row.userId !== authorId) {
      throw new ForbiddenException('Not allowed to update this comment.');
    }

    row.text = data.text;
    const updated = await this.commentRepo.save(row);
    await this.cache.delByPrefix(`recipes:detail:${data.recipeId}`);

    return this.mapComment(updated);
  }

  /**
   * 댓글 작성자 본인 여부를 확인한 뒤 댓글을 삭제하고 댓글 수를 조정합니다.
   * @param authorId 현재 인증 사용자 ID
   * @param recipeId 댓글이 속한 레시피 ID
   * @param commentId 삭제 대상 댓글 ID
   * @returns 삭제 완료 결과
   */
  async deleteComment(
    authorId: string,
    recipeId: string,
    commentId: string,
  ): Promise<void> {
    const row = await this.commentRepo.findOne({
      where: { commentId, recipeId },
    });
    if (!row) {
      return;
    }

    if (row.userId !== authorId) {
      throw new ForbiddenException('Not allowed to delete this comment.');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(RecipeCommentOrmEntity).delete({ commentId });

      const recipe = await manager
        .getRepository(RecipeOrmEntity)
        .findOne({ where: { recipeId } });

      if (recipe) {
        recipe.statsComment = Math.max(0, recipe.statsComment - 1);
        await manager.getRepository(RecipeOrmEntity).save(recipe);
      }
    });

    await this.invalidateRecipeCache(recipeId);
  }

  private mapRecipe(
    row: RecipeOrmEntity,
    steps: RecipeStepOrmEntity[] = [],
  ): Promise<Recipe> {
    return this.enrichRecipeUrls({
      id: row.recipeId,
      authorId: row.userId,
      title: row.title,
      price: row.price ?? undefined,
      categories: row.categories ?? [],
      summary: row.summary ?? undefined,
      thumbnailUrl: row.thumbnailPath ?? undefined,
      steps: this.mapRecipeSteps(steps),
      stats: {
        view: row.statsView,
        scrap: row.statsScrap,
        good: row.statsGood,
        bad: row.statsBad,
        comment: row.statsComment,
      },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
    });
  }

  private async mapRecipeListItem(row: RecipeOrmEntity): Promise<RecipeListItem> {
    return {
      recipeId: row.recipeId,
      userId: row.userId,
      title: row.title,
      price: row.price ?? undefined,
      categories: row.categories ?? [],
      summary: row.summary ?? undefined,
      thumbnailUrl:
        (await this.s3Storage.getDownloadUrl(row.thumbnailPath)) ??
        row.thumbnailPath ??
        undefined,
      stats: {
        totalRate: row.statsGood - row.statsBad,
        comment: row.statsComment,
        view: row.statsView,
      },
      createdAt: row.createdAt.toISOString(),
    };
  }

  private mapComment(row: RecipeCommentOrmEntity): Comment {
    return {
      id: row.commentId,
      recipeId: row.recipeId,
      userId: row.userId,
      text: row.text,
      stats: {
        good: row.statsGood,
        bad: row.statsBad,
      },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
    };
  }

  /**
   * 업로드 파일을 썸네일과 step 이미지로 나눠 S3에 저장하고 경로 정보를 정리합니다.
   * @param recipeId 생성 대상 레시피 ID
   * @param steps 레시피 step 배열
   * @param files 업로드 파일 목록
   * @returns 정규화된 step 이미지 정보와 썸네일 경로
   */
  private async uploadRecipeImages(
    recipeId: string,
    steps: CreateRecipeDto['steps'],
    files: Express.Multer.File[],
  ) {
    // multipart field 이름 규칙을 기준으로 썸네일과 step 이미지를 분리합니다.
    const thumbnailFile = files.find((file) => file.fieldname === 'thumbnail');
    const stepFiles = files.filter((file) =>
      this.isStepImageField(file.fieldname),
    );

    const stepsWithImages = (steps ?? []).map((step) => ({
      ...step,
      image: [],
    }));
    const uploadedStepsImages: ImageDto[][] = stepsWithImages.map(() => []);

    for (const file of stepFiles) {
      const { stepIndex, imageIndex } = this.parseStepImageField(
        file.fieldname,
      );
      if (stepIndex < 0 || stepIndex >= uploadedStepsImages.length) {
        continue;
      }

      const nextIndex = imageIndex ?? uploadedStepsImages[stepIndex].length;
      const extension = this.resolveFileExtension(file.mimetype);
      const storagePath = `recipes/${recipeId}/steps/${stepIndex}/${nextIndex}.${extension}`;

      await this.s3Storage.uploadBuffer(storagePath, file);
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
      const extension = this.resolveFileExtension(thumbnailFile.mimetype);
      const storagePath = `recipes/${recipeId}/thumbnail.${extension}`;
      await this.s3Storage.uploadBuffer(storagePath, thumbnailFile);
      thumbnailPath = storagePath;
    } else {
      thumbnailPath = this.resolveDefaultThumbnailPath(normalizedSteps);
    }

    return {
      steps: normalizedSteps,
      thumbnailPath,
    };
  }

  private resolveDefaultThumbnailPath(steps: RecipeStepEntity[]) {
    for (let index = steps.length - 1; index >= 0; index -= 1) {
      const images = steps[index]?.image ?? [];
      const last = images[images.length - 1];
      if (last?.path) {
        return last.path;
      }
    }

    return null;
  }

  private async findRecipeSteps(recipeId: string) {
    return this.recipeStepRepo.find({
      where: { recipeId },
      order: { order: 'ASC' },
    });
  }

  private mapRecipeSteps(steps: RecipeStepOrmEntity[]): RecipeStepEntity[] {
    return steps.map((step) => ({
      order: step.order,
      text: step.text,
      image: step.imagePath
        ? [
            {
              path: step.imagePath,
              order: 0,
            },
          ]
        : [],
    }));
  }

  private async replaceRecipeSteps(
    stepRepo: Repository<RecipeStepOrmEntity>,
    recipeId: string,
    steps: RecipeStepEntity[],
  ) {
    // step은 순서 전체를 다시 쓰는 구조라 기존 데이터를 비우고 새로 저장합니다.
    await stepRepo.delete({ recipeId });
    if (!steps.length) {
      return;
    }

    const rows = steps.map((step, index) =>
      stepRepo.create({
        recipeId: recipeId,
        order: step.order ?? index,
        text: step.text ?? '',
        imagePath: step.image?.[0]?.path ?? null,
      }),
    );

    await stepRepo.save(rows);
  }

  /**
   * 레시피가 반드시 존재해야 하는 경로에서 상세 정보를 조회합니다.
   * @param recipeId 조회 대상 레시피 ID
   * @returns 레시피 상세 정보
   */
  private async findOrFailRecipe(recipeId: string): Promise<Recipe> {
    const row = await this.recipeRepo.findOne({ where: { recipeId } });
    if (!row) {
      throw new NotFoundException('Recipe not found.');
    }

    const steps = await this.findRecipeSteps(recipeId);
    return this.mapRecipe(row, steps);
  }

  /**
   * 목록, Top10, 상세 캐시를 함께 비워 변경된 내용이 즉시 반영되게 합니다.
   * @param recipeId 상세 캐시를 비울 레시피 ID
   * @returns 캐시 무효화 완료 결과
   */
  private async invalidateRecipeCache(recipeId: string) {
    // 목록과 상세 캐시는 서로 다른 키 공간을 사용하므로 둘 다 비워야 합니다.
    await this.cache.delByPrefix('recipes:list:');
    await this.cache.delByPrefix('recipes:top:view:');
    await this.cache.delByPrefix(`recipes:detail:${recipeId}`);
  }

  private isStepImageField(fieldName: string) {
    return /^steps\[\d+\]\.image(\[\d+\])?$/.test(fieldName);
  }

  private parseStepImageField(fieldName: string) {
    const match = fieldName.match(/^steps\[(\d+)\]\.image(?:\[(\d+)\])?$/);
    if (!match) {
      return { stepIndex: -1, imageIndex: undefined as number | undefined };
    }

    return {
      stepIndex: Number(match[1]),
      imageIndex: match[2] === undefined ? undefined : Number(match[2]),
    };
  }

  private resolveFileExtension(mimeType: string | undefined) {
    const type = mimeType ?? '';
    if (!type.includes('/')) {
      return 'jpg';
    }

    return type.split('/')[1] ?? 'jpg';
  }

  /**
   * 저장된 S3 내부 경로를 signed URL로 바꿔 응답 모델을 보강합니다.
   * @param recipe 상세 응답으로 변환할 레시피 모델
   * @returns 다운로드 URL이 채워진 레시피 상세 정보
   */
  private async enrichRecipeUrls(recipe: Recipe): Promise<Recipe> {
    const thumbnailUrl = recipe.thumbnailUrl
      ? (await this.s3Storage.getDownloadUrl(recipe.thumbnailUrl)) ??
        recipe.thumbnailUrl
      : undefined;

    const steps = await Promise.all(
      recipe.steps.map(async (step) => ({
        ...step,
        image: await Promise.all(
          (step.image ?? []).map(async (image) => ({
            ...image,
            url: (await this.s3Storage.getDownloadUrl(image.path)) ?? image.url,
          })),
        ),
      })),
    );

    return {
      ...recipe,
      thumbnailUrl,
      steps,
    };
  }
}
