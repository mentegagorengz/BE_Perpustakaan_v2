import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Policy } from './entities/policy.entity';
import { UpdatePolicyDto } from './dto/update-policy.dto';

@Injectable()
export class PolicyService {
  constructor(
    @InjectRepository(Policy)
    private readonly policyRepository: Repository<Policy>,
  ) {}

  // Singleton: selalu baris pertama; buat default bila belum ada.
  async getPolicy(): Promise<Policy> {
    let policy = await this.policyRepository.findOne({ where: {}, order: { id: 'ASC' } });
    if (!policy) {
      policy = this.policyRepository.create({
        fine_per_day: 5000,
        loan_duration_days: 7,
        max_books_per_user: 3,
      });
      policy = await this.policyRepository.save(policy);
    }
    return policy;
  }

  async update(dto: UpdatePolicyDto): Promise<Policy> {
    const policy = await this.getPolicy();
    Object.assign(policy, dto);
    return this.policyRepository.save(policy);
  }
}
