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
 *
 * Catatan throttle: POST /auth/login dibatasi 5 percobaan/menit per IP
 * (anti brute-force). Karena seluruh request e2e datang dari satu IP yang
 * sama, jumlah panggilan login di bawah sengaja dijaga ≤ 5 dengan cara
 * me-reuse token antar test.
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

  // Token dibagi antar test (koordinasi: login hanya beberapa kali).
  const shared: {
    accessTokenCookie: string;
    refreshToken: string;
  } = {
    accessTokenCookie: '',
    refreshToken: '',
  };

  const loginRequest = (overrides: Partial<typeof user> = {}) =>
    request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: user.password, ...overrides });

  const setCookieValue = (res: request.Response): string => {
    const first = (res.headers['set-cookie'] as unknown as string[])[0];
    return first.split(';')[0];
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
      await dataSource.query(
        'DELETE FROM users WHERE identification_number = $1',
        [user.identification_number],
      );
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

  it('login: password salah → 401 pesan generik', async () => {
    const res = await loginRequest({ password: 'wrong-password' }).expect(401);
    expect(res.body.message).toBe('Invalid email or password');
  });

  it('login: email tidak terdaftar → 401 dengan pesan yang SAMA', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: `nope-${unique}@example.com`, password: 'whatever12' })
      .expect(401);

    expect(res.body.message).toBe('Invalid email or password');
  });

  it('login: accessToken via Set-Cookie HttpOnly (bukan body), refreshToken di body, tanpa password', async () => {
    const res = await loginRequest().expect(200);

    expect(res.body.data.accessToken).toBeUndefined();
    expect(res.body.data.refreshToken).toEqual(expect.any(String));
    expect(res.body.data.user.password).toBeUndefined();
    expect(res.body.data.user.role).toBe('USER');

    const setCookie = res.headers['set-cookie'] as unknown as string[];
    const joined = setCookie.join(';');
    expect(joined).toContain('auth_token=');
    expect(joined.toLowerCase()).toContain('httponly');

    shared.accessTokenCookie = setCookieValue(res);
    shared.refreshToken = res.body.data.refreshToken as string;
  });

  it('refresh: rotasi token → token baru; token lama tetap dilayani dalam grace window', async () => {
    const oldToken = shared.refreshToken;

    const rotated = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldToken })
      .expect(200);

    expect(rotated.body.data.accessToken).toEqual(expect.any(String));
    expect(rotated.body.data.refreshToken).toEqual(expect.any(String));
    expect(rotated.body.data.refreshToken).not.toBe(oldToken);

    // Concurrent/paralel: request kedua dengan token lama masih sukses selama
    // dalam grace period, tanpa membatalkan sesi.
    const graceRes = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: oldToken })
      .expect(200);
    expect(graceRes.body.data.refreshToken).toEqual(expect.any(String));
  });

  it('auth: profile tanpa token → 401', async () => {
    await request(app.getHttpServer()).get('/api/v1/auth/profile').expect(401);
  });

  it('auth: profile diproteksi — memakai Cookie accessToken hasil login → 200', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/auth/profile')
      .set('Cookie', shared.accessTokenCookie)
      .expect(200);
  });

  it('logout: revoke refresh token → penggunaan ulang ditolak 401', async () => {
    const refreshToken = (await loginRequest()).body.data
      .refreshToken as string;

    await request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .send({ refreshToken })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(401);
  });

  it('register: body tidak valid → 400 dari ValidationPipe', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email: 'not-an-email', password: 'short' })
      .expect(400);
  });
});
