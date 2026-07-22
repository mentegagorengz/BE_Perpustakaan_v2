import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Article } from './entities/article.entity';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(
    @InjectRepository(Article)
    private readonly articleRepo: Repository<Article>,
  ) {}

  async create(createArticleDto: CreateArticleDto, user: any) {
    const article = this.articleRepo.create({
      ...createArticleDto, // Gunakan huruf kecil sesuai parameter!
      author: { id: user.id || user.sub }, // Pastikan mengambil ID dari token
    });
    return await this.articleRepo.save(article);
  }

  async createMany(createArticlesDto: CreateArticleDto[], user: any) {
    const articlesData = createArticlesDto.map((dto) => ({
      ...dto,
      author: { id: user.id || user.sub }, // Pastikan mengambil ID dari token
    }));
    const articles = this.articleRepo.create(articlesData);
    return await this.articleRepo.save(articles);
  }

  async findAll() {
    return await this.articleRepo.find({
      relations: ['author'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: number) {
    const article = await this.articleRepo.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!article)
      throw new NotFoundException(`Artikel dengan ID ${id} tidak ditemukan`);
    return article;
  }

  async update(id: number, updateData: UpdateArticleDto) {
    const article = await this.findOne(id);
    Object.assign(article, updateData);
    return await this.articleRepo.save(article);
  }

  async remove(id: number) {
    const article = await this.findOne(id);
    return await this.articleRepo.remove(article);
  }
}
