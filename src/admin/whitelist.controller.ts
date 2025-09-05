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
  @ApiOperation({ summary: 'Verificar se CPF está na whitelist (público)' })
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
    // CPFs do arquivo CSV DIAMANTE (principais)
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
      // Nota: Execute o SQL completo no Supabase para importar todos os 89 CPFs
    ];

    return this.whitelistService.importCpfs({ cpfs: diamondCpfs });
  }

  @Post('import-gold')
  @Roles('admin')
  @ApiOperation({ summary: 'Importar CPFs OURO do CSV' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CPFs OURO importados' })
  async importGold() {
    // CPFs do arquivo CSV OURO
    const goldCpfs = [
      { cpf: '010.139.615.52', tier: 'OURO', external_id: '42888415', autoriza_imagem: true },
      { cpf: '47032739857', tier: 'OURO', external_id: '289355890', autoriza_imagem: true },
      { cpf: '006.373.995.01', tier: 'OURO', external_id: '260335736', autoriza_imagem: true },
      { cpf: '45394627843', tier: 'OURO', external_id: '252215296', autoriza_imagem: true },
      { cpf: '03003281259', tier: 'OURO', external_id: '290491190', autoriza_imagem: true },
      { cpf: '14676689748', tier: 'OURO', external_id: '242330513', autoriza_imagem: true },
      { cpf: '18237672739', tier: 'OURO', external_id: '238211118', autoriza_imagem: true },
      { cpf: '038.336.033-13', tier: 'OURO', external_id: '253936452', autoriza_imagem: true },
      { cpf: '043.166.911.20', tier: 'OURO', external_id: '302988149', autoriza_imagem: true },
      { cpf: '000.149.950.50', tier: 'OURO', external_id: '172323631', autoriza_imagem: true },
      { cpf: '61012705307', tier: 'OURO', external_id: '291281160', autoriza_imagem: true },
      { cpf: '06460036900', tier: 'OURO', external_id: '264613833', autoriza_imagem: true },
      { cpf: '94012784234', tier: 'OURO', external_id: '288092913', autoriza_imagem: true },
      { cpf: '02889229050', tier: 'OURO', external_id: '312172882', autoriza_imagem: true },
      { cpf: '15895934722', tier: 'OURO', external_id: '268517860', autoriza_imagem: true },
    ];

    return this.whitelistService.importCpfs({ cpfs: goldCpfs });
  }

  @Post('import-black')
  @Roles('admin')
  @ApiOperation({ summary: 'Importar CPFs BLACK do CSV' })
  @ApiResponse({ status: HttpStatus.OK, description: 'CPFs BLACK importados' })
  async importBlack() {
    // CPFs do arquivo CSV BLACK
    const blackCpfs = [
      { cpf: '043.304.461.62', tier: 'BLACK', external_id: '274305460', autoriza_imagem: true },
      { cpf: '38897913873', tier: 'BLACK', external_id: '293240943', autoriza_imagem: true },
      { cpf: '066.145.615.37', tier: 'BLACK', external_id: '292565247', autoriza_imagem: true },
      { cpf: '20623099705', tier: 'BLACK', external_id: '289308300', autoriza_imagem: true },
      { cpf: '22986909819', tier: 'BLACK', external_id: '297644077', autoriza_imagem: true },
      { cpf: '47896968800', tier: 'BLACK', external_id: '283578800', autoriza_imagem: true },
      { cpf: '12021341739', tier: 'BLACK', external_id: '292474421', autoriza_imagem: true },
      { cpf: '083.320.351.71', tier: 'BLACK', external_id: '287280053', autoriza_imagem: true },
      { cpf: '14061182650', tier: 'BLACK', external_id: '298449346', autoriza_imagem: true },
      { cpf: '37976932810', tier: 'BLACK', external_id: '275530030', autoriza_imagem: true },
      { cpf: '055.046.135.31', tier: 'BLACK', external_id: '291594601', autoriza_imagem: true },
      { cpf: '43054822826', tier: 'BLACK', external_id: '298332019', autoriza_imagem: true },
      { cpf: '04933213143', tier: 'BLACK', external_id: '292477440', autoriza_imagem: true },
      { cpf: '366.039.588-99', tier: 'BLACK', external_id: '292476953', autoriza_imagem: true },
      { cpf: '003.315.871.14', tier: 'BLACK', external_id: '293439443', autoriza_imagem: true },
      { cpf: '348.780.846-34', tier: 'BLACK', external_id: '270859537', autoriza_imagem: true },
      { cpf: '049.332.131.43', tier: 'BLACK', external_id: '292477440_2', autoriza_imagem: true },
      { cpf: '22986900810', tier: 'BLACK', external_id: '297644077_2', autoriza_imagem: true },
      { cpf: '08332035171', tier: 'BLACK', external_id: '287280053_2', autoriza_imagem: true },
      { cpf: '39649019898', tier: 'BLACK', external_id: '292481212', autoriza_imagem: true },
      { cpf: '14155215659', tier: 'BLACK', external_id: '296268368', autoriza_imagem: true },
    ];

    return this.whitelistService.importCpfs({ cpfs: blackCpfs });
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
