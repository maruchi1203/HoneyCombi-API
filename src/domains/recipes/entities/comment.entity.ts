/**
 * 애플리케이션 내부와 API 응답에서 사용하는 댓글 도메인 모델입니다.
 */
export interface Comment {
  id: string;
  recipeId: string;
  userId: string;
  text: string;

  stats: {
    good: number;
    bad: number;
  };

  createdAt: string;
  updatedAt?: string;
}
