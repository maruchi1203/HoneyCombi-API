import { Injectable, NotFoundException } from '@nestjs/common';
import admin from 'firebase-admin';
import {
  getFirestore,
  getStorageBucket,
} from '../../../common/firebase/firebase-admin';
import { RegisterUserDto, UpdateUserDto } from '../dto/index.dto';
import { User } from '../entities/user.entity';
import { UsersPort } from '../ports/users.port';

@Injectable()
export class FirebaseUsersRepository implements UsersPort {
  private readonly usersColName = 'users';

  async findOne(id: string): Promise<User | null> {
    const db = getFirestore();
    const snapshot = await db.collection(this.usersColName).doc(id).get();

    if (!snapshot.exists) {
      return null;
    }

    return this.mapSnapshotToUser(snapshot);
  }

  async register(
    id: string,
    data: RegisterUserDto,
    profileImage?: Express.Multer.File,
  ): Promise<User> {
    const db = getFirestore();
    const userRef = db.collection(this.usersColName).doc(id);
    const uploadedProfileImgPath = await this.uploadProfileImage(
      id,
      profileImage,
    );

    const payload = {
      ...this.stripUndefined({
        ...data,
        profileImgPath: uploadedProfileImgPath ?? data.profileImgPath,
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await userRef.set(payload, { merge: true });

    const saved = await userRef.get();
    return this.mapSnapshotToUser(saved);
  }

  async update(
    id: string,
    data: UpdateUserDto,
    profileImage?: Express.Multer.File,
  ): Promise<User> {
    const db = getFirestore();
    const userRef = db.collection(this.usersColName).doc(id);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      throw new NotFoundException('User not found.');
    }

    const uploadedProfileImgPath = await this.uploadProfileImage(
      id,
      profileImage,
    );

    await userRef.update({
      ...this.stripUndefined({
        ...data,
        profileImgPath: uploadedProfileImgPath ?? data.profileImgPath,
      }),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await userRef.get();
    return this.mapSnapshotToUser(updated);
  }

  async unregister(id: string): Promise<void> {
    const db = getFirestore();
    await db.collection(this.usersColName).doc(id).delete();
  }

  private async uploadProfileImage(
    userId: string,
    profileImage?: Express.Multer.File,
  ) {
    if (!profileImage?.buffer) {
      return undefined;
    }

    const bucket = getStorageBucket();
    const extension = this.resolveFileExtension(profileImage.mimetype);
    const storagePath = `${this.usersColName}/${userId}/profile.${extension}`;

    await bucket.file(storagePath).save(profileImage.buffer, {
      contentType: profileImage.mimetype,
      resumable: false,
    });

    return storagePath;
  }

  private mapSnapshotToUser(snapshot: admin.firestore.DocumentSnapshot): User {
    const raw = snapshot.data() as Partial<User> | undefined;

    return {
      id: snapshot.id,
      nickname: raw?.nickname ?? '',
      profileImgPath: raw?.profileImgPath ?? undefined,
    };
  }

  private stripUndefined(value: UpdateUserDto | RegisterUserDto) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined),
    ) as Partial<UpdateUserDto>;
  }

  private resolveFileExtension(mimeType: string | undefined) {
    const type = mimeType ?? '';
    if (!type.includes('/')) {
      return 'jpg';
    }

    return type.split('/')[1] ?? 'jpg';
  }
}
