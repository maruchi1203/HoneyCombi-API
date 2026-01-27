import { Injectable } from '@nestjs/common';
import admin from 'firebase-admin';
import {
  getFirestore,
  getStorageBucket,
} from '../../../common/firebase/firebase-admin';
import { CreateRecipeDto } from '../dto/create-recipe.dto';
import { UpdateRecipeDto } from '../dto/update-recipe.dto';
import { Recipe } from '../entities/recipe.entity';
import { PostsRepository } from '../ports/recipe.repository';
import { RecipeListItem } from '../entities/recipe-list-item.entity';
import { ImageDto } from '../../../common/dto/image.dto';

@Injectable()
export class FirebasePostsRepository implements PostsRepository {
  private readonly collection = 'recipes';

  async createRecipe(
    data: CreateRecipeDto,
    files: Express.Multer.File[] = [],
  ): Promise<Recipe> {
    const db = getFirestore();
    const docRef = db.collection(this.collection).doc();
    const recipeId = docRef.id;

    const { steps, thumbnailPath, ...rest } = data;
    const uploaded = await this.uploadRecipeImages(
      recipeId,
      steps ?? [],
      files,
    );

    const finalThumbnailPath =
      thumbnailPath ?? uploaded.thumbnailPath ?? undefined;

    await docRef.set({
      ...rest,
      steps: uploaded.steps,
      thumbnailPath: finalThumbnailPath ?? null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const snapshot = await docRef.get();

    return this.mapSnapshotForRecipe(snapshot);
  }

  async findManyRecipes(
    start: number,
    sort: string,
    limit: number,
  ): Promise<RecipeListItem[]> {
    const db = getFirestore();
    const snapshot = await db.collection(this.collection).get();

    return snapshot.docs.map((doc) => this.mapSnapshotForRecipeListItem(doc));
  }

  async findOneFullRecipe(id: string): Promise<Recipe | null> {
    const db = getFirestore();
    const snapshot = await db.collection(this.collection).doc(id).get();

    if (!snapshot.exists) {
      return null;
    }

    return this.mapSnapshotForRecipe(snapshot);
  }

  async updateOneFullRecipe(
    id: string,
    data: UpdateRecipeDto,
  ): Promise<Recipe> {
    const db = getFirestore();
    await db
      .collection(this.collection)
      .doc(id)
      .update({
        ...data,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

    const snapshot = await db.collection(this.collection).doc(id).get();

    return this.mapSnapshotForRecipe(snapshot);
  }

  async deleteRecipe(_id: string): Promise<void> {
    const db = getFirestore();
    await db.collection(this.collection).doc(_id).delete();
  }

  private mapSnapshotForRecipe(
    snapshot: admin.firestore.DocumentSnapshot,
  ): Recipe {
    const data = snapshot.data() as Partial<Recipe> | undefined;

    return {
      id: snapshot.id,
      authorId: data?.authorId ?? '',
      title: data?.title ?? '',
      price: data?.price,
      categories: data?.categories ?? [],
      summary: data?.summary,
      steps: data?.steps ?? [],
      stats: {
        view: data?.stats?.view ?? 0,
        scrap: data?.stats?.scrap ?? 0,
        good: data?.stats?.good ?? 0,
        bad: data?.stats?.bad ?? 0,
        comment: data?.stats?.comment ?? 0,
      },
      createdAt: data?.createdAt ?? '',
      updatedAt: data?.updatedAt,
    };
  }

  private mapSnapshotForRecipeListItem(
    snapshot: admin.firestore.DocumentSnapshot,
  ): RecipeListItem {
    const data = snapshot.data() as Partial<RecipeListItem> | undefined;

    return {
      id: snapshot.id,
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
      createdAt: data?.createdAt ?? '',
    };
  }

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
      const storagePath = `${this.collection}/${recipeId}/steps/${stepIndex}/${nextIndex}.${extension}`;

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
      const storagePath = `${this.collection}/${recipeId}/thumbnail.${extension}`;
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
}
