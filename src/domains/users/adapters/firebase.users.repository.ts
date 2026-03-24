/**
 * Firebase Firestore와 Storage를 사용해 사용자 정보를 저장하는 저장소 구현입니다.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import admin from 'firebase-admin';
import {
  getFirestore,
  getStorageBucket,
} from '../../../common/firebase/firebase-admin';
import {
  RegisterUserCommand,
  RegisterUserDto,
  UpdateUserDto,
} from '../dto/index.dto';
import { User } from '../entities/user.entity';
import { UsersPort } from '../ports/users.port';

@Injectable()
export class FirebaseUsersRepository implements UsersPort {
  private readonly usersColName = 'users';

  /**
   * 사용자 ID로 Firestore 문서를 조회합니다.
   * @param userId 조회 대상 사용자 ID
   * @returns 사용자 정보 또는 null
   */
  async findOne(userId: string): Promise<User | null> {
    const db = getFirestore();
    const snapshot = await db.collection(this.usersColName).doc(userId).get();

    if (!snapshot.exists) {
      return null;
    }

    return this.mapSnapshotToUser(snapshot);
  }

  /**
   * 사용자 문서를 생성하거나 병합 저장합니다.
   * @param data 등록 DTO
   * @param profileImage 프로필 이미지 파일
   * @returns 저장된 사용자 정보
   */
  async register(
    data: RegisterUserCommand,
    profileImage?: Express.Multer.File,
  ): Promise<User> {
    const db = getFirestore();
    const userRef = db.collection(this.usersColName).doc(data.userId);
    const uploadedProfileImgPath = await this.uploadProfileImage(
      data.userId,
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

  /**
   * 사용자 문서를 수정합니다.
   * @param userId 수정 대상 사용자 ID
   * @param data 수정 DTO
   * @param profileImage 프로필 이미지 파일
   * @returns 수정된 사용자 정보
   */
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

  /**
   * 사용자 문서를 삭제합니다.
   * @param userId 삭제 대상 사용자 ID
   * @returns 삭제 완료 결과
   */
  async unregister(userId: string): Promise<void> {
    const db = getFirestore();
    await db.collection(this.usersColName).doc(userId).delete();
  }

  /**
   * 프로필 이미지를 Firebase Storage에 저장하고 경로를 반환합니다.
   * @param userId 사용자 ID
   * @param profileImage 프로필 이미지 파일
   * @returns 저장된 프로필 이미지 경로 또는 undefined
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
   * Firestore 스냅샷을 응답용 사용자 모델로 변환합니다.
   * @param snapshot Firestore 사용자 문서 스냅샷
   * @returns 응답용 사용자 모델
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
   * @param value 저장 전 정리할 객체
   * @returns undefined가 제거된 객체
   */
  private stripUndefined(value: UpdateUserDto | RegisterUserDto) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined),
    ) as Partial<UpdateUserDto>;
  }

  /**
   * MIME 타입에서 파일 확장자를 추출합니다.
   * @param mimeType 업로드 파일의 MIME 타입
   * @returns 저장 경로에 사용할 확장자
   */
  private resolveFileExtension(mimeType: string | undefined) {
    const type = mimeType ?? '';
    if (!type.includes('/')) {
      return 'jpg';
    }

    return type.split('/')[1] ?? 'jpg';
  }
}
