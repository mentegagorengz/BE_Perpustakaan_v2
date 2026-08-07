import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Language } from './entities/language.entity';
import { CreateLanguageDto } from './dto/create-language.dto';
import { UpdateLanguageDto } from './dto/update-language.dto';
import { BaseCrudService } from '../../common/base/base-crud.service';

@Injectable()
export class LanguagesService extends BaseCrudService<
  Language,
  CreateLanguageDto,
  UpdateLanguageDto
> {
  constructor(
    @InjectRepository(Language)
    repository: Repository<Language>,
  ) {
    super(repository, { entityName: 'Language', searchColumn: 'name' });
  }
}
