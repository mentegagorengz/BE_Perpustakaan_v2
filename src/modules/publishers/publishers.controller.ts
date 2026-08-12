import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PublishersService } from './publishers.service';
import { Publisher } from './entities/publisher.entity';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { SystemRole } from '../../common/enums/role.enum';
import { PaginationDto } from '../../common/dto/pagination.dto';
import {
  ApiAuthErrors,
  ApiNotFound,
  ApiResponseWrapped,
} from '../../common/decorators/api-docs.decorator';
import { ResponseMessage } from '../../common/decorators/response-message.decorator';

@ApiTags('Publishers')
@Controller('publishers')
export class PublishersController {
  constructor(private readonly publishersService: PublishersService) {}

  @ApiOperation({ summary: 'Tambah penerbit baru' })
  @ApiResponseWrapped(Publisher, undefined, 201)
  @ApiBearerAuth()
  @ApiAuthErrors()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Penerbit berhasil ditambahkan')
  @Post()
  create(@Body() createPublisherDto: CreatePublisherDto) {
    return this.publishersService.create(createPublisherDto);
  }

  @ApiOperation({ summary: 'List semua penerbit (paginated)' })
  @ApiResponseWrapped(Publisher, undefined, undefined, true)
  @ResponseMessage('Berhasil mengambil daftar penerbit')
  @Get()
  findAll(@Query() paginationDto: PaginationDto) {
    return this.publishersService.findAll(paginationDto);
  }

  @ApiOperation({ summary: 'Detail penerbit' })
  @ApiResponseWrapped(Publisher)
  @ApiNotFound('Penerbit')
  @ResponseMessage('Detail penerbit berhasil diambil')
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.publishersService.findOne(+id);
  }

  @ApiOperation({ summary: 'Update penerbit' })
  @ApiResponseWrapped(Publisher)
  @ApiBearerAuth()
  @ApiAuthErrors()
  @ApiNotFound('Penerbit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN, SystemRole.STAFF)
  @ResponseMessage('Penerbit berhasil diubah')
  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePublisherDto: UpdatePublisherDto,
  ) {
    return this.publishersService.update(+id, updatePublisherDto);
  }

  @ApiOperation({ summary: 'Hapus penerbit' })
  @ApiResponseWrapped()
  @ApiBearerAuth()
  @ApiAuthErrors()
  @ApiNotFound('Penerbit')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(SystemRole.SUPER_ADMIN)
  @ResponseMessage('Penerbit berhasil dihapus')
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.publishersService.remove(+id);
  }
}
