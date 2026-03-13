import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  // Lazy loading에 사용
  health(): string {
    return 'health check';
  }
}
