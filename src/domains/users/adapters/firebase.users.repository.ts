import { Injectable, NotFoundException } from '@nestjs/common';
import admin from 'firebase-admin';
import {
  getFirestore,
  getStorageBucket,
} from '../../../common/firebase/firebase-admin';
import { RegisterUserDto, UpdateUserDto } from '../dto/index.dto';
import { User } from '../entities/user.entity';
import { UsersPort } from '../ports/users.port';

/**
 * Firestore 기반 사용자 저장소입니다.
 * 문서 저장과 이미지 업로드를 Firebase 서비스로 처리합니다.
 */
@Injectable()
export class FirebaseUsersRepository implements UsersPort {
  private readonly usersColName = 'users';

  async findOne(userId: string): Promise<User | null> {
    const db = getFirestore();
    const snapshot = await db.collection(this.usersColName).doc(userId).get();

    if (!snapshot.exists) {
      return null;
    }

    return this.mapSnapshotToUser(snapshot);
  }

  async register(
    userId: string,
    data: RegisterUserDto,
    profileImage?: Express.Multer.File,
  ): Promise<User> {
    const db = getFirestore();
    const userRef = db.collection(this.usersColName).doc(userId);
    const uploadedProfileImgPath = await this.uploadProfileImage(
      userId,
      profileImage,
    );

    // undefined 필드를 제거해 Firestore에 의도치 않은 값이 기록되지 않도록 합니다.
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
    userId: string,
    data: UpdateUserDto,
    profileImage?: Express.Multer.File,
  ): Promise<User> {
    const db = getFirestore();
    const userRef = db.collection(this.usersColName).doc(userId);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      throw new NotFoundException('User not found.');
    }

    const uploadedProfileImgPath = await this.uploadProfileImage(
      userId,
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

  async unregister(userId: string): Promise<void> {
    const db = getFirestore();
    await db.collection(this.usersColName).doc(userId).delete();
  }

  /**
   * 프로필 이미지를 Firebase Storage에 저장하고 문서에 넣을 경로를 생성합니다.
   */
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

  /**
   * Firestore 스냅샷을 API 응답 형태의 사용자 객체로 변환합니다.
   */
  private mapSnapshotToUser(snapshot: admin.firestore.DocumentSnapshot): User {
    const raw = snapshot.data() as Partial<User> | undefined;

    return {
      userId: snapshot.id,
      nickname: raw?.nickname ?? '',
      profileImgPath: raw?.profileImgPath ?? undefined,
    };
  }

  /**
   * Firestore update/set 전에 undefined 값을 제거합니다.
   */
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
