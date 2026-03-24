/**
 * 애플리케이션 내부와 API 응답에서 사용하는 사용자 도메인 모델입니다.
 */
export class User {
  userId!: string;
  nickname!: string;
  profileImgPath?: string;
  profileImgUrl?: string;
}
