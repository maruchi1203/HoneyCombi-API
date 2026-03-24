/**
 * 목록과 Top10 조회에서 사용하는 레시피 요약 도메인 모델입니다.
 */
export interface RecipeListItem {
  recipeId: string;
  userId: string;
  title: string;
  price?: number;
  categories: string[];

  summary?: string; // 짧은 요약(또는 첫 80자)
  thumbnailUrl?: string; // 대표 이미지(없으면 null)

  stats: {
    totalRate: number; // 종합 좋아요-싫어요 점수
    comment: number;
    view: number; // 목록에서 필요 없으면 제거 가능
  };

  createdAt: string;
}
