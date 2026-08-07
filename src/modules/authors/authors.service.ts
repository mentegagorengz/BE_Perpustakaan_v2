import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Author } from './entities/author.entity';
import { CreateAuthorDto } from './dto/create-author.dto';
import { UpdateAuthorDto } from './dto/update-author.dto';
import { BaseCrudService } from '../../common/base/base-crud.service';

@Injectable()
export class AuthorsService extends BaseCrudService<
  Author,
  CreateAuthorDto,
  UpdateAuthorDto
> {
  constructor(
    @InjectRepository(Author)
    repository: Repository<Author>,
  ) {
    super(repository, { entityName: 'Author', searchColumn: 'name' });
  }
}
