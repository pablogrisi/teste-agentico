import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export type ComponenteStatus = 'up' | 'down';

export interface HealthResult {
  status: 'ok' | 'degraded';
  db: ComponenteStatus;
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthResult> {
    let db: ComponenteStatus = 'down';
    try {
      await this.prisma.healthCheck();
      db = 'up';
    } catch (erro) {
      this.logger.warn(
        `Health check do banco falhou: ${(erro as Error).message}`,
      );
    }

    return {
      status: db === 'up' ? 'ok' : 'degraded',
      db,
      timestamp: new Date().toISOString(),
    };
  }
}
