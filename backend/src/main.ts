import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableShutdownHooks();

  const config = app.get(ConfigService);
  const port = config.get<number>('port', 3000);

  // CORS: o frontend (Next.js) chama a API direto do navegador nos modais de
  // criação/revisão. Sem `CORS_ORIGINS`, reflete a origem da requisição — ok no
  // MVP sem autenticação (SDD §2/§9); definir a lista quando houver identidade.
  const corsOrigins = config.get<string[]>('corsOrigins', []);
  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });

  await app.listen(port);
  Logger.log(
    `LicIA Analisadora (backend) ouvindo na porta ${port}`,
    'Bootstrap',
  );
}

void bootstrap();
