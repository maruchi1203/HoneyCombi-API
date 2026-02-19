import { Injectable } from '@nestjs/common';
import admin from 'firebase-admin';
import { getFirestore } from '../../../common/firebase/firebase-admin';
import { UpdateUserDto } from '../dto/update-info.user.dto';
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

  async update(id: string, data: UpdateUserDto): Promise<User> {
    const db = getFirestore();
    const userRef = db.collection(this.usersColName).doc(id);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      throw new Error('User not found.');
    }

    await userRef.update({
      ...this.stripUndefined(data),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const updated = await userRef.get();
    return this.mapSnapshotToUser(updated);
  }

  async unregister(id: string): Promise<void> {
    const db = getFirestore();
    await db.collection(this.usersColName).doc(id).delete();
  }

  private mapSnapshotToUser(snapshot: admin.firestore.DocumentSnapshot): User {
    const raw = snapshot.data() as Partial<User> | undefined;

    return {
      id: snapshot.id,
      name: raw?.name ?? '',
      email: raw?.email ?? '',
    };
  }

  private stripUndefined(value: UpdateUserDto) {
    return Object.fromEntries(
      Object.entries(value).filter(([, entry]) => entry !== undefined),
    ) as Partial<UpdateUserDto>;
  }
}
