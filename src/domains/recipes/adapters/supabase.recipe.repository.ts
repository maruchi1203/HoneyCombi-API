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

  async findRecipeListItems(
    cursor: string | undefined,
    sort: string,
    limit: number,
  ): Promise<RecipeListItem[]> {
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
    const items = rows.map((row) => this.mapRecipeListItem(row));

    await this.cache.setJson(cacheKey, items, 60);
    return items;
  }

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
    const mapped = this.mapRecipe(row, steps);
    await this.cache.setJson(cacheKey, mapped, 180);
    return mapped;
  }

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

  async deleteRecipe(recipeId: string): Promise<void> {
    await this.dataSource.transaction(async (manager) => {
      await manager.getRepository(RecipeStepOrmEntity).delete({ recipeId });
      await manager.getRepository(RecipeCommentOrmEntity).delete({ recipeId });
      await manager.getRepository(RecipeOrmEntity).delete({ recipeId });
    });

    await this.invalidateRecipeCache(recipeId);
  }

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

  async findCommentsByUser(authorId: string): Promise<Comment[]> {
    const rows = await this.commentRepo.find({
      where: { userId: authorId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return rows.map((row) => this.mapComment(row));
  }

  async findCommentsByRecipe(recipeId: string): Promise<Comment[]> {
    const rows = await this.commentRepo.find({
      where: { recipeId },
      order: { createdAt: 'DESC' },
      take: 50,
    });

    return rows.map((row) => this.mapComment(row));
  }

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
  ): Recipe {
    return {
      id: row.recipeId,
      authorId: row.userId,
      title: row.title,
      price: row.price ?? undefined,
      categories: row.categories ?? [],
      summary: row.summary ?? undefined,
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
    };
  }

  private mapRecipeListItem(row: RecipeOrmEntity): RecipeListItem {
    return {
      recipeId: row.recipeId,
      userId: row.userId,
      title: row.title,
      price: row.price ?? undefined,
      categories: row.categories ?? [],
      summary: row.summary ?? undefined,
      thumbnailUrl: row.thumbnailPath ?? undefined,
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
      authorId: row.userId,
      text: row.text,
      stats: {
        good: row.statsGood,
        bad: row.statsBad,
      },
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt?.toISOString(),
    };
  }

  private async uploadRecipeImages(
    recipeId: string,
    steps: CreateRecipeDto['steps'],
    files: Express.Multer.File[],
  ) {
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

  private async findOrFailRecipe(recipeId: string): Promise<Recipe> {
    const row = await this.recipeRepo.findOne({ where: { recipeId } });
    if (!row) {
      throw new NotFoundException('Recipe not found.');
    }

    const steps = await this.findRecipeSteps(recipeId);
    return this.mapRecipe(row, steps);
  }

  private async invalidateRecipeCache(recipeId: string) {
    await this.cache.delByPrefix('recipes:list:');
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
}
