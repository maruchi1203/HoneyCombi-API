import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RecipesPort } from '../ports/recipes.port';
import type { CommentsPort } from '../ports/comments.port';
import { CreateRecipeDto } from '../dto/index.dto';
import { UpdateRecipeDto } from '../dto/index.dto';
import { Recipe } from '../entities/recipe.entity';
import { RecipeListItem } from '../entities/recipe.list-item.entity';
import { CreateCommentDto } from '../dto/index.dto';
import { UpdateCommentDto } from '../dto/index.dto';
import { Comment } from '../entities/comment.entity';
import { RecipeOrmEntity } from './entities/recipe.orm-entity';
import { RecipeCommentOrmEntity } from './entities/recipe-comment.orm-entity';
import { S3StorageService } from '../../../common/storage/s3.storage.service';
import { RedisCacheService } from '../../../common/cache/redis-cache.service';
import type { ImageDto } from '../../../common/dto/index.dto';

@Injectable()
export class AwsRecipesRepository implements RecipesPort, CommentsPort {
  constructor(
    @InjectRepository(RecipeOrmEntity)
    private readonly recipeRepo: Repository<RecipeOrmEntity>,
    @InjectRepository(RecipeCommentOrmEntity)
    private readonly commentRepo: Repository<RecipeCommentOrmEntity>,
    private readonly s3Storage: S3StorageService,
    private readonly cache: RedisCacheService,
  ) {}

  async createRecipe(
    input: CreateRecipeDto,
    files: Express.Multer.File[] = [],
  ): Promise<Recipe> {
    const draft = this.recipeRepo.create({
      authorId: input.authorId,
      title: input.title,
      price: input.price ?? null,
      categories: input.categories ?? [],
      summary: input.summary ?? null,
      thumbnailPath: input.thumbnailPath ?? null,
      steps: input.steps ?? [],
    });

    const saved = await this.recipeRepo.save(draft);
    const uploaded = await this.uploadRecipeImages(
      saved.id,
      saved.steps,
      files,
    );

    saved.steps = uploaded.steps;
    saved.thumbnailPath = saved.thumbnailPath ?? uploaded.thumbnailPath ?? null;

    const updated = await this.recipeRepo.save(saved);
    await this.cache.delByPrefix('recipes:list:');
    await this.cache.delByPrefix(`recipes:detail:${updated.id}`);

    return this.mapRecipe(updated);
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

    const row = await this.recipeRepo.findOne({ where: { id: recipeId } });
    if (!row) {
      return null;
    }

    const mapped = this.mapRecipe(row);
    await this.cache.setJson(cacheKey, mapped, 180);
    return mapped;
  }

  async updateFullRecipe(
    recipeId: string,
    data: UpdateRecipeDto,
  ): Promise<Recipe> {
    const row = await this.recipeRepo.findOne({ where: { id: recipeId } });
    if (!row) {
      throw new NotFoundException('Recipe not found.');
    }

    row.title = data.title ?? row.title;
    row.price = data.price ?? row.price;
    row.categories = data.categories ?? row.categories;
    row.thumbnailPath = data.thumbnailPath ?? row.thumbnailPath;
    row.steps = data.steps ?? row.steps;

    const updated = await this.recipeRepo.save(row);
    await this.cache.delByPrefix('recipes:list:');
    await this.cache.delByPrefix(`recipes:detail:${recipeId}`);

    return this.mapRecipe(updated);
  }

  async deleteRecipe(recipeId: string): Promise<void> {
    await this.recipeRepo.delete({ id: recipeId });
    await this.cache.delByPrefix('recipes:list:');
    await this.cache.delByPrefix(`recipes:detail:${recipeId}`);
  }

  async createComment(input: CreateCommentDto): Promise<Comment> {
    const recipe = await this.recipeRepo.findOne({
      where: { id: input.recipeId },
    });
    if (!recipe) {
      throw new NotFoundException('Recipe not found.');
    }

    const comment = this.commentRepo.create({
      recipeId: input.recipeId,
      authorId: input.authorId,
      text: input.text,
    });

    const saved = await this.commentRepo.save(comment);
    recipe.statsComment += 1;
    await this.recipeRepo.save(recipe);

    await this.cache.delByPrefix('recipes:list:');
    await this.cache.delByPrefix(`recipes:detail:${input.recipeId}`);

    return this.mapComment(saved);
  }

  async findCommentsByUser(authorId: string): Promise<Comment[]> {
    const rows = await this.commentRepo.find({
      where: { authorId },
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
      where: { id: data.commentId, recipeId: data.recipeId },
    });
    if (!row) {
      throw new NotFoundException('Comment not found.');
    }

    if (row.authorId !== authorId) {
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
      where: { id: commentId, recipeId },
    });
    if (!row) {
      return;
    }

    if (row.authorId !== authorId) {
      throw new ForbiddenException('Not allowed to delete this comment.');
    }

    await this.commentRepo.delete({ id: commentId });

    const recipe = await this.recipeRepo.findOne({ where: { id: recipeId } });
    if (recipe) {
      recipe.statsComment = Math.max(0, recipe.statsComment - 1);
      await this.recipeRepo.save(recipe);
    }

    await this.cache.delByPrefix('recipes:list:');
    await this.cache.delByPrefix(`recipes:detail:${recipeId}`);
  }

  private mapRecipe(row: RecipeOrmEntity): Recipe {
    return {
      id: row.id,
      authorId: row.authorId,
      title: row.title,
      price: row.price ?? undefined,
      categories: row.categories ?? [],
      summary: row.summary ?? undefined,
      steps: row.steps ?? [],
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
      id: row.id,
      authorId: row.authorId,
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
      id: row.id,
      recipeId: row.recipeId,
      authorId: row.authorId,
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
    }

    return {
      steps: normalizedSteps,
      thumbnailPath,
    };
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
