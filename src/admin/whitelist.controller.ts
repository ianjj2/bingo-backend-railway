import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { WhitelistService } from './whitelist.service';

interface ImportCpfDto {
  cpfs: Array<{
    cpf: string;
    tier: string;
    external_id?: string;
    autoriza_imagem?: boolean;
  }>;
}

interface AddCpfDto {
  cpf: string;
  tier: string;
  external_id?: string;
  autoriza_imagem?: boolean;
}

@ApiTags('admin/whitelist')
@Controller('admin/whitelist')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class WhitelistController {
  constructor(private readonly whitelistService: WhitelistService) {}

  @Get()
  @Roles('admin')
  @ApiOperation({ summary: 'Listar CPFs da whitelist' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Lista de CPFs retornada com sucesso' })
  async getWhitelist(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 50,
    @Query('tier') tier?: string,
  ) {
    return this.whitelistService.getWhitelist(page, limit, tier);
  }

  @Get('stats')
  @Roles('admin')
  @ApiOperation({ summary: 'Estatísticas da whitelist' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Estatísticas retornadas com sucesso' })
  async getStats() {
    return this.whitelistService.getWhitelistStats();
  }

  @Get('check/:cpf')
  @Roles('admin')
  @ApiOperation({ summary: 'Verificar se CPF está na whitelist' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Status do CPF verificado' })
  async checkCpf(@Param('cpf') cpf: string) {
    const result = await this.whitelistService.checkCpfWhitelist(cpf);
    return {
      cpf,
      authorized: !!result,
      data: result,
    };
  }

  @Post()
  @Roles('admin')
  @ApiOperation({ summary: 'Adicionar CPF à whitelist' })
  @ApiResponse({ status: HttpStatus.CREATED, description: 'CPF adicionado com sucesso' })
  async addCpf(@Body() cpfData: AddCpfDto) {
    return this.whitelistService.addCpfToWhitelist(cpfData);
  }

  @Post('import')
  @Roles('admin')
  @ApiOperation({ summary: 'Importar múltiplos CPFs' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Importação realizada' })
  async importCpfs(@Body() importData: ImportCpfDto) {
    return this.whitelistService.importCpfs(importData);
  }

  @Post('import-diamonds')
  @Roles('admin')
  @ApiOperation({ summary: 'Importar CPFs DIAMANTE do CSV' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CPFs DIAMANTE importados' })
  async importDiamonds() {
    // CPFs do arquivo CSV DIAMANTE
    const diamondCpfs = [
      { cpf: '051.626.731.02', tier: 'DIAMANTE', external_id: '30727768', autoriza_imagem: true },
      { cpf: '42898445886', tier: 'DIAMANTE', external_id: '298240049', autoriza_imagem: true },
      { cpf: '073.808.645-21', tier: 'DIAMANTE', external_id: '125404274', autoriza_imagem: true },
      { cpf: '15154707761', tier: 'DIAMANTE', external_id: '231684986', autoriza_imagem: true },
      { cpf: '017.527.122-42', tier: 'DIAMANTE', external_id: '39704059', autoriza_imagem: true },
      { cpf: '11350745693', tier: 'DIAMANTE', external_id: '46975275', autoriza_imagem: true },
      { cpf: '072.992.484.09', tier: 'DIAMANTE', external_id: '173666957', autoriza_imagem: true },
      { cpf: '36531961830', tier: 'DIAMANTE', external_id: '217345129', autoriza_imagem: true },
      { cpf: '055.204.001.05', tier: 'DIAMANTE', external_id: '280813252', autoriza_imagem: true },
      // TODO: Adicionar todos os CPFs do CSV aqui
    ];

    return this.whitelistService.importCpfs({ cpfs: diamondCpfs });
  }

  @Delete(':cpf')
  @Roles('admin')
  @ApiOperation({ summary: 'Remover CPF da whitelist' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CPF removido com sucesso' })
  async removeCpf(@Param('cpf') cpf: string) {
    await this.whitelistService.removeCpfFromWhitelist(cpf);
    return { message: 'CPF removido da whitelist com sucesso' };
  }
}
