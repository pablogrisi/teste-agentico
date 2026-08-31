import { Injectable } from '@nestjs/common';
import { Requisito } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RequisitosService {
  constructor(private readonly prisma: PrismaService) {}

  /** Requisitos ativos da base, ordenados por área e depois por `ordem`. */
  listarAtivos(): Promise<Requisito[]> {
    return this.prisma.requisito.findMany({
      where: { ativo: true },
      orderBy: [{ area: 'asc' }, { ordem: 'asc' }],
    });
  }
}
