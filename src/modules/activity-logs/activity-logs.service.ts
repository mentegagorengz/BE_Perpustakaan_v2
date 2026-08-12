import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityLog } from './entities/activity-log.entity';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { createPaginationMeta } from '../../common/interfaces/paginated-result.interface';

@Injectable()
export class ActivityLogsService {
  constructor(
    @InjectRepository(ActivityLog)
    private repo: Repository<ActivityLog>,
  ) {}

  async create(data: Partial<ActivityLog>) {
    const log = this.repo.create(data);
    return await this.repo.save(log);
  }

  async findAll(paginationDto: PaginationDto) {
    const { page = 1, limit = 10, action } = paginationDto;
    const where: Record<string, unknown> = {};
    if (action && action !== 'all') {
      where.action = action;
    }

    const [data, total] = await this.repo.findAndCount({
      where,
      relations: ['user'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      data,
      meta: createPaginationMeta(page, limit, total),
    };
  }
}
