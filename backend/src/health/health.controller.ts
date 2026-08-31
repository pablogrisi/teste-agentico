import { Controller, Get } from '@nestjs/common';
import { HealthResult, HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  /**
   * Sempre responde 200 com o estado do serviço e do banco. Um cliente que
   * queira tratar "degradado" como falha checa o campo `status`/`db`.
   */
  @Get()
  check(): Promise<HealthResult> {
    return this.health.check();
  }
}
