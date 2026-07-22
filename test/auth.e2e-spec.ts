import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from './setup-app';
import { UserCategory } from '../src/common/enums/role.enum';

/**
 * E2E nyata untuk alur auth: menembak HTTP → service → PostgreSQL sungguhan.
 * Membutuhkan database berjalan (docker-compose up) dengan skema termigrasi.
 *
 * Data yang dibuat memakai email/identification unik per-run dan dibersihkan
 * di afterAll, sehingga test idempoten dan aman dijalankan berulang.
 */
describe('Auth (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  const unique = Date.now();
  const user = {
    identification_number: `E2E-${unique}`,
    email: `e2e-${unique}@example.com`,
    password: 'password123',
    full_name: 'E2E Auth User',
    category: UserCategory.STUDENT,
  };

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleFixture.createNestApplication());
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query('DELETE FROM users WHERE identification_number = $1', [
        user.identification_number,
      ]);
    }
    await app?.close();
  });

  it('register: membuat user baru dan tidak pernah mengembalikan password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(user)
      .expect(201);

    expect(res.body.data).toBeDefined();
    expect(res.body.data.email).toBe(user.email);
    expect(res.body.data.password).toBeUndefined();
  });

  it('register: email/identification duplikat → 409 dengan pesan generik (anti-enumeration)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(user)
      .expect(409);

    expect(res.body.message).toBe('Data registrasi sudah terdaftar');
  });

  it('login: kredensial benar → access_token + data user tanpa password', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);

    expect(res.body.data.access_token).toEqual(expect.any(String));
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.role).toBe('USER');
  });

  it('login: password salah → 401 pesan generik (tidak bocorkan email ada/tidak)', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: 'wrong-password' })
      .expect(401);

    expect(res.body.message).toBe('Invalid email or password');
  });

  it('login: email tidak terdaftar → 401 dengan pesan yang SAMA', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `nope-${unique}@example.com`, password: 'whatever12' })
      .expect(401);

    expect(res.body.message).toBe('Invalid email or password');
  });

  it('register: body tidak valid → 400 dari ValidationPipe', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
  });
});
