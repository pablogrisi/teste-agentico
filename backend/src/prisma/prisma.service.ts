import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Cliente Prisma como provider injetável. Conecta no boot e desconecta no
 * shutdown. `healthCheck()` é usado pelo endpoint `/health`.
 */
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log('Conexão com o banco estabelecida');
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /** Executa um `SELECT 1` para provar que o banco está acessível. */
  async healthCheck(): Promise<boolean> {
    await this.$queryRaw`SELECT 1`;
    return true;
  }
}
