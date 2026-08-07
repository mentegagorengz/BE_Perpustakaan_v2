import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Publisher } from './entities/publisher.entity';
import { CreatePublisherDto } from './dto/create-publisher.dto';
import { UpdatePublisherDto } from './dto/update-publisher.dto';
import { BaseCrudService } from '../../common/base/base-crud.service';

@Injectable()
export class PublishersService extends BaseCrudService<
  Publisher,
  CreatePublisherDto,
  UpdatePublisherDto
> {
  constructor(
    @InjectRepository(Publisher)
    repository: Repository<Publisher>,
  ) {
    super(repository, { entityName: 'Publisher', searchColumn: 'name' });
  }
}
