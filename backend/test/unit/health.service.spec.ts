import { Test } from '@nestjs/testing';
import { PrismaService } from '../../src/prisma/prisma.service';
import { HealthService } from '../../src/health/health.service';

describe('HealthService', () => {
  const buildService = async (
    prismaMock: Partial<PrismaService>,
  ): Promise<HealthService> => {
    const moduleRef = await Test.createTestingModule({
      providers: [
        HealthService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();
    return moduleRef.get(HealthService);
  };

  it('reporta status "ok" e db "up" quando o banco responde', async () => {
    const service = await buildService({
      healthCheck: jest.fn().mockResolvedValue(true),
    });

    const result = await service.check();

    expect(result.status).toBe('ok');
    expect(result.db).toBe('up');
    expect(typeof result.timestamp).toBe('string');
  });

  it('reporta status "degraded" e db "down" quando o banco falha', async () => {
    const service = await buildService({
      healthCheck: jest.fn().mockRejectedValue(new Error('sem conexão')),
    });

    const result = await service.check();

    expect(result.status).toBe('degraded');
    expect(result.db).toBe('down');
  });
});
