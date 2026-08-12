import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from './setup-app';

/**
 * E2E untuk rate-limiting login (anti brute-force).
 *
 * File terpisah agar memakai instance app sendiri → bucket throttler bersih,
 * tidak terpengaruh (atau memengaruhi) percobaan login di spec e2e lain.
 * Semua request datang dari IP yang sama (supertest), jadi berbagi satu bucket.
 *
 * Login dibatasi 5 percobaan / menit. Percobaan ke-6 harus ditolak 429
 * sebelum menyentuh logika auth, apa pun benar/salahnya kredensial.
 */
describe('Auth login throttling (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleFixture.createNestApplication());
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  it('blocks the 6th login attempt within the window with 429', async () => {
    const attempt = () =>
      request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'nobody@example.com', password: 'whatever12' });

    // 5 percobaan pertama diproses (kredensial salah → 401).
    for (let i = 0; i < 5; i++) {
      const res = await attempt();
      expect(res.status).toBe(401);
    }

    // Percobaan ke-6 melewati batas → ditolak rate limiter.
    const blocked = await attempt();
    expect(blocked.status).toBe(429);
    expect(blocked.body.success).toBe(false);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
  });
});
