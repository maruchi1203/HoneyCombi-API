/**
 * 레시피 step 이미지나 프로필 이미지처럼 스토리지에 저장되는 이미지 메타데이터입니다.
 */
export class ImageDto {
  path!: string; // 스토리지 내부 정본 경로
  url?: string; // 클라이언트 표시용 다운로드 URL
  contentType?: string; // 예: image/jpeg
  bytes?: number; // 파일 크기(byte)
  width?: number;
  height?: number;
  thumbPath?: string; // 썸네일이 따로 있을 때의 경로
  order?: number; // 같은 step 안에서의 이미지 순서
}
