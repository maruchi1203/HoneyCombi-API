export class ImageDto {
  path: string; // Storage path (권장: 정본 키)
  url?: string; // downloadURL (캐시/편의용)
  contentType?: string; // image/jpeg
  bytes?: number; // 파일 크기
  width?: number;
  height?: number;
  thumbPath?: string; // 썸네일 경로(있으면)
  order?: number; // 같은 step 내 이미지 정렬
}
