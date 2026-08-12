import { Injectable, NotFoundException } from '@nestjs/common';
import {
  DeepPartial,
  FindOptionsOrder,
  FindOptionsWhere,
  Like,
  ObjectLiteral,
  Repository,
} from 'typeorm';
import { PaginationDto } from '../dto/pagination.dto';
import {
  createPaginationMeta,
  PaginatedResult,
} from '../interfaces/paginated-result.interface';

export interface BaseCrudOptions<TEntity extends ObjectLiteral> {
  /** Nama entitas untuk pesan NotFoundException, mis. 'Author'. */
  entityName: string;
  /** Kolom yang dipakai pencarian LIKE (default: tidak ada). */
  searchColumn?: keyof TEntity;
  /** Kolom default pengurutan (default: searchColumn atau 'id'). */
  orderColumn?: keyof TEntity;
  orderDirection?: 'ASC' | 'DESC';
}

/**
 * Thin base CRUD untuk entity referensi sederhana (authors, categories,
 * publishers, languages). Semua method memakai typed `FindOptionsWhere`
 * sehingga bebas `any`; respons pagination tetap `data` + `meta`.
 */
@Injectable()
export class BaseCrudService<
  TEntity extends ObjectLiteral & { id: number },
  TCreate extends DeepPartial<TEntity> = DeepPartial<TEntity>,
  TUpdate extends DeepPartial<TEntity> = DeepPartial<TEntity>,
> {
  protected readonly entityName: string;
  protected readonly searchColumn?: keyof TEntity;
  protected readonly orderColumn: keyof TEntity;
  protected readonly orderDirection: 'ASC' | 'DESC';

  constructor(
    protected readonly repository: Repository<TEntity>,
    options: BaseCrudOptions<TEntity>,
  ) {
    this.entityName = options.entityName;
    this.searchColumn = options.searchColumn;
    this.orderColumn = options.orderColumn ?? options.searchColumn ?? 'id';
    this.orderDirection = options.orderDirection ?? 'ASC';
  }

  async create(dto: TCreate): Promise<TEntity> {
    const entity = this.repository.create(dto);
    return this.repository.save(entity);
  }

  async findAll(
    paginationDto: PaginationDto,
  ): Promise<PaginatedResult<TEntity>> {
    const { page = 1, limit = 10, search } = paginationDto;
    const skip = (page - 1) * limit;

    const where: FindOptionsWhere<TEntity> | Record<string, never> =
      search && this.searchColumn
        ? ({
            [this.searchColumn]: Like(`%${search}%`),
          } as unknown as FindOptionsWhere<TEntity>)
        : {};

    const [data, total] = await this.repository.findAndCount({
      where,
      skip,
      take: limit,
      order: {
        [this.orderColumn]: this.orderDirection,
      } as FindOptionsOrder<TEntity>,
    });

    return {
      data,
      meta: createPaginationMeta(page, limit, total),
    };
  }

  async findOne(id: number): Promise<TEntity> {
    // Cast via unknown: TypeORM tidak bisa membuktikan `{ id }` cocok dengan
    // FindOptionsWhere generik yang deferred, padahal constraint `{ id: number }`
    // sudah menjamin propertinya.
    const where = { id } as unknown as FindOptionsWhere<TEntity>;
    const entity = await this.repository.findOne({ where });
    if (!entity) {
      throw new NotFoundException(`${this.entityName} with ID ${id} not found`);
    }
    return entity;
  }

  async update(id: number, dto: TUpdate): Promise<TEntity> {
    const entity = await this.findOne(id);
    Object.assign(entity, dto);
    return this.repository.save(entity);
  }

  async remove(id: number): Promise<void> {
    const entity = await this.findOne(id);
    await this.repository.remove(entity);
  }
}
