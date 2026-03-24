/**
 * 단순한 성공/데이터 응답 형태가 필요할 때 사용하는 공통 응답 DTO입니다.
 */
export class ResponseDTO {
  success!: boolean;
  data!: any;
}
