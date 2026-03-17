import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { AppModule } from '../../src/app.module';
import { AuthGuard } from '../../src/common/guards/auth.guard';

export async function createAuthTestApp(): Promise<{
  app: INestApplication;
  dataSource: DataSource;
}> {
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideGuard(AuthGuard)
    .useValue({
      canActivate: (context: {
        switchToHttp: () => {
          getRequest: () => {
            headers: Record<string, string | string[] | undefined>;
            user?: { id?: string };
          };
        };
      }) => {
        const request = context.switchToHttp().getRequest();
        const header = request.headers['x-user-id'];
        const resolvedUserId = Array.isArray(header) ? header[0] : header;
        request.user = { id: resolvedUserId };
        return true;
      },
    })
    .compile();

  const app = moduleFixture.createNestApplication();
  await app.init();

  return {
    app,
    dataSource: app.get<DataSource>(getDataSourceToken()),
  };
}
