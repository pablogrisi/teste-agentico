import {
  Body,
  Controller,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AnalisesService } from './analises.service';
import {
  ListarAnalisesQueryRaw,
  parseListarAnalisesQuery,
} from './listar-analises.query';
import { PatchRevisaoBody } from './revisao-requisito';

// Teto rígido do multer; o limite real (configurável) é checado na validação,
// que devolve 422 com mensagem clara para arquivos entre o limite e este teto.
const TETO_UPLOAD_BYTES = 60 * 1024 * 1024;

@Controller('analises')
export class AnalisesController {
  constructor(private readonly analises: AnalisesService) {}

  @Post()
  @HttpCode(201)
  @UseInterceptors(
    FileInterceptor('arquivo', { limits: { fileSize: TETO_UPLOAD_BYTES } }),
  )
  async criar(
    @Body() body: { nup?: string; objeto?: string },
    @UploadedFile() arquivo?: Express.Multer.File,
  ) {
    const analise = await this.analises.criar({
      nup: body?.nup,
      objeto: body?.objeto,
      arquivo: arquivo
        ? {
            mimetype: arquivo.mimetype,
            size: arquivo.size,
            buffer: arquivo.buffer,
          }
        : undefined,
    });
    return {
      id: analise.id,
      nup: analise.nup,
      objeto: analise.objeto,
      status: analise.status,
      iniciadaEm: analise.iniciadaEm,
    };
  }

  @Get()
  async listar(@Query() query: ListarAnalisesQueryRaw) {
    return this.analises.listar(parseListarAnalisesQuery(query));
  }

  @Get(':id')
  async buscar(@Param('id') id: string) {
    return this.analises.abrir(id);
  }

  @Post(':id/reprocessar')
  @HttpCode(200)
  async reprocessar(@Param('id') id: string) {
    const a = await this.analises.reprocessar(id);
    return { id: a.id, status: a.status };
  }

  @Patch(':id/requisitos/:requisitoId')
  async revisar(
    @Param('id') id: string,
    @Param('requisitoId') requisitoId: string,
    @Body() body: PatchRevisaoBody,
  ) {
    return this.analises.revisarRequisito(id, requisitoId, body ?? {});
  }

  @Get(':id/pdf')
  async pdf(@Param('id') id: string): Promise<StreamableFile> {
    const { bytes, nomeArquivo } = await this.analises.lerPdf(id);
    return new StreamableFile(bytes, {
      type: 'application/pdf',
      disposition: `inline; filename="${nomeArquivo}"`,
    });
  }
}
