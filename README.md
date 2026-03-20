# 편의점 꿀조합 레시피 백엔드 API
![썸네일](https://github.com/user-attachments/assets/bbb3e9ca-a137-480c-9264-3e5fdb5b31d8)

## 프로젝트 환경

- Framework  : Nest.js
- DB : Firebase -> Supabase(Postgresql) + AWS S3
- BE 배포 환경 : GCP Cloud Run

## 개발 목표

- Latency p50이 400ms 이하인 커뮤니티 API 설계
- Redis를 활용하여 캐싱 로직 구성해보기
- 유저 데이터 보안성 확보

### 버전별 진행사항
#### v0.1
- [X] 레시피 DB 및 CRUD 로직 설계
  - [X] 레시피
  - [X] 댓글
- [X] 유저 CRUD 로직 설계

#### v0.2
- [X] 기존 로직을 Supabase + AWS S3로 이전
- [ ] 인기 게시물과 이벤트에 대해 Redis 로직 적용
