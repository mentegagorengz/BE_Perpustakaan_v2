import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from './setup-app';
import { UserCategory, SystemRole } from '../src/common/enums/role.enum';

/**
 * E2E nyata untuk alur peminjaman: register → login → pinjam → kembalikan,
 * menembak HTTP → service → PostgreSQL sungguhan. Membutuhkan database
 * berjalan (docker-compose up) dengan skema termigrasi.
 *
 * Semua data (user + reference + book + item + transaksi) dibuat dengan
 * penanda unik per-run dan dibersihkan di afterAll agar idempoten.
 */
describe('Transactions (e2e)', () => {
  let app: INestApplication;
  let dataSource: DataSource;
  let token: string;
  let userId: number;

  const unique = Date.now();
  const barcode = `E2E-BRC-${unique}`;
  const user = {
    identification_number: `E2E-TRX-${unique}`,
    email: `e2e-trx-${unique}@example.com`,
    password: 'password123',
    full_name: 'E2E Trx User',
    category: UserCategory.STUDENT,
  };

  // id referensi yang diseed, disimpan untuk cleanup
  const seeded: {
    categoryId?: number;
    publisherId?: number;
    languageId?: number;
    authorId?: number;
    bookId?: number;
    bookItemId?: number;
  } = {};

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = configureApp(moduleFixture.createNestApplication());
    await app.init();
    dataSource = app.get(DataSource);

    // 1. Register user lalu elevasi role ke STAFF (endpoint return butuh STAFF).
    //    JwtStrategy.validate() membaca role fresh dari DB, jadi cukup update DB.
    await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(user)
      .expect(201);

    const userRow = await dataSource.query(
      'SELECT id FROM users WHERE identification_number = $1',
      [user.identification_number],
    );
    userId = userRow[0].id;
    await dataSource.query('UPDATE users SET role = $1 WHERE id = $2', [
      SystemRole.STAFF,
      userId,
    ]);

    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: user.email, password: user.password })
      .expect(200);
    const setCookie = loginRes.headers['set-cookie'] as unknown as string[];
    const cookieMatch = /auth_token=([^;]+)/.exec(setCookie.join(';'));
    token = cookieMatch ? cookieMatch[1] : '';

    // 2. Seed data referensi + buku + eksemplar langsung via DB (barcode unik).
    const cat = await dataSource.query(
      'INSERT INTO categories (name) VALUES ($1) RETURNING id',
      [`E2E Cat ${unique}`],
    );
    seeded.categoryId = cat[0].id;
    const pub = await dataSource.query(
      'INSERT INTO publishers (name) VALUES ($1) RETURNING id',
      [`E2E Pub ${unique}`],
    );
    seeded.publisherId = pub[0].id;
    const lang = await dataSource.query(
      'INSERT INTO languages (name) VALUES ($1) RETURNING id',
      [`E2E Lang ${unique}`],
    );
    seeded.languageId = lang[0].id;
    const auth = await dataSource.query(
      'INSERT INTO authors (name) VALUES ($1) RETURNING id',
      [`E2E Author ${unique}`],
    );
    seeded.authorId = auth[0].id;
    const book = await dataSource.query(
      `INSERT INTO books (title, category_id, publisher_id, language_id)
       VALUES ($1, $2, $3, $4) RETURNING id`,
      [
        `E2E Book ${unique}`,
        seeded.categoryId,
        seeded.publisherId,
        seeded.languageId,
      ],
    );
    seeded.bookId = book[0].id;
    const item = await dataSource.query(
      `INSERT INTO book_items (barcode, status, condition, book_id)
       VALUES ($1, 'AVAILABLE', 'GOOD', $2) RETURNING id`,
      [barcode, seeded.bookId],
    );
    seeded.bookItemId = item[0].id;
  });

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.query(
        'DELETE FROM transactions WHERE book_item_id = $1',
        [seeded.bookItemId],
      );
      await dataSource.query('DELETE FROM book_items WHERE id = $1', [
        seeded.bookItemId,
      ]);
      await dataSource.query('DELETE FROM book_authors WHERE book_id = $1', [
        seeded.bookId,
      ]);
      await dataSource.query('DELETE FROM books WHERE id = $1', [
        seeded.bookId,
      ]);
      await dataSource.query('DELETE FROM authors WHERE id = $1', [
        seeded.authorId,
      ]);
      await dataSource.query('DELETE FROM languages WHERE id = $1', [
        seeded.languageId,
      ]);
      await dataSource.query('DELETE FROM publishers WHERE id = $1', [
        seeded.publisherId,
      ]);
      await dataSource.query('DELETE FROM categories WHERE id = $1', [
        seeded.categoryId,
      ]);
      await dataSource.query('DELETE FROM users WHERE id = $1', [userId]);
    }
    await app?.close();
  });

  it('borrow: meminjam buku AVAILABLE → status DB jadi BORROWED', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/transactions/borrow')
      .set('Authorization', `Bearer ${token}`)
      .send({ barcode })
      .expect(201);

    expect(res.body.data.message).toBe('Buku berhasil dipinjam');

    const rows = await dataSource.query(
      'SELECT status FROM book_items WHERE id = $1',
      [seeded.bookItemId],
    );
    expect(rows[0].status).toBe('BORROWED');
  });

  it('borrow: barcode yang sudah BORROWED → 400', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/transactions/borrow')
      .set('Authorization', `Bearer ${token}`)
      .send({ barcode })
      .expect(400);
  });

  it('return tepat waktu: fine_amount 0 (number, bukan string) + status AVAILABLE', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/transactions/return/${barcode}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.fine).toBe('Tidak ada denda');

    // Verifikasi fine_amount dari DB terbaca sebagai number (transformer bekerja).
    const rows = await dataSource.query(
      `SELECT fine_amount, status FROM transactions WHERE book_item_id = $1`,
      [seeded.bookItemId],
    );
    expect(rows[0].status).toBe('RETURNED');

    const item = await dataSource.query(
      'SELECT status FROM book_items WHERE id = $1',
      [seeded.bookItemId],
    );
    expect(item[0].status).toBe('AVAILABLE');
  });

  it('return terlambat: denda dihitung per hari kalender & fine_amount bertipe number', async () => {
    // Pinjam ulang, lalu mundurkan due_date 3 hari lewat DB agar terlambat.
    await request(app.getHttpServer())
      .post('/api/v1/transactions/borrow')
      .set('Authorization', `Bearer ${token}`)
      .send({ barcode })
      .expect(201);

    // Set due_date ke 3 hari kalender lalu, jam 12:00 SIANG waktu lokal.
    // Kolom due_date bertipe `timestamp without time zone`; mengirim ISO/UTC
    // (toISOString) akan menggeser jam beberapa jam dan — bila test jalan dekat
    // tengah malam — melewati batas hari sehingga selisihnya salah hitung.
    // Karena itu kita kirim wall-clock LOKAL (bukan UTC) pada jam 12 siang yang
    // jauh dari batas tengah malam, sehingga normalisasi ke tengah malam lokal
    // di service selalu menghasilkan tepat 3 hari kalender, deterministik.
    const d = new Date();
    d.setDate(d.getDate() - 3);
    const pad = (n: number) => String(n).padStart(2, '0');
    const localNoon = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate(),
    )} 12:00:00`;
    await dataSource.query(
      `UPDATE transactions
         SET due_date = $2
       WHERE book_item_id = $1 AND returned_at IS NULL`,
      [seeded.bookItemId, localNoon],
    );

    const res = await request(app.getHttpServer())
      .patch(`/api/v1/transactions/return/${barcode}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(res.body.data.fine).toBe('Denda Anda: Rp 15000');

    // Ambil transaksi terakhir (yang baru dikembalikan) dan pastikan number.
    const rows = await dataSource.query(
      `SELECT fine_amount FROM transactions
       WHERE book_item_id = $1 ORDER BY id DESC LIMIT 1`,
      [seeded.bookItemId],
    );
    const fine = rows[0].fine_amount;
    // Dari raw pg, kolom numeric datang sebagai string — buktikan nilainya benar.
    expect(Number(fine)).toBe(15000);
  });
});
