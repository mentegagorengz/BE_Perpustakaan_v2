# Laporan Audit Keamanan — BE_Perpustakaan_v2

**Tanggal:** 2026-07-21
**Cakupan:** Seluruh lapisan HTTP backend NestJS — bootstrap (`main.ts`), auth/JWT, RBAC (guard + 11 controller), DTO/validasi, service transaksi, response/error handling, konfigurasi DB & env.
**Metode:** Pembacaan kode manual menyeluruh. Status test saat audit: 194 unit + 10 e2e HIJAU.

---

## Ringkasan

| # | Temuan | Severity | Status |
|---|--------|----------|--------|
| 1 | Tidak ada rate-limiting pada login → brute-force password | **HIGH** | ✅ Diperbaiki |
| 2 | `books.createMany` pakai `any[]` → validasi DTO ter-bypass | **MEDIUM** | Terbuka |
| 3 | `articles.update` pakai `Partial<Dto>` → validasi ter-bypass | **MEDIUM** | Terbuka |
| 4 | Tidak ada validasi `JWT_SECRET` saat startup → misconfig senyap | **MEDIUM** | Terbuka |
| 5 | Tidak ada security headers (helmet) | **MEDIUM** | Terbuka |
| 6 | Kebijakan password lemah (hanya `MinLength(8)`) | **LOW** | Terbuka |
| 7 | Audit log mempercayai header `x-forwarded-for` (IP spoofable) | **LOW** | Terbuka |
| 8 | `BorrowBookDto.user_id` diterima dari klien (di-override, tapi rapuh) | **LOW** | Terbuka |

Tidak ditemukan kerentanan kritis (RCE, SQL injection, privilege escalation langsung, kebocoran kredensial). Fondasi keamanan sudah baik — lihat bagian "Yang Sudah Aman".

---

## Detail Temuan

### 1. Tidak ada rate-limiting pada login — HIGH
**File:** `src/modules/auth/auth.controller.ts:38` (`POST /auth/login`), tidak ada `@nestjs/throttler` di seluruh proyek.

Endpoint login tidak dibatasi jumlah percobaannya. Penyerang bisa mencoba password sebanyak-banyaknya (credential stuffing / brute-force) tanpa hambatan. Kombinasi dengan kebijakan password lemah (#6) memperbesar risiko.

**Dampak:** Pengambilalihan akun via tebak password, termasuk akun `SUPER_ADMIN`.

**Rekomendasi:** Pasang `@nestjs/throttler` global (mis. 10 req/menit) dan throttle lebih ketat khusus `/auth/login` (mis. 5 percobaan / 15 menit per IP+email).

---

### 2. `books.createMany` menerima `any[]` → validasi ter-bypass — MEDIUM
**File:** `src/modules/books/books.controller.ts:103`, `src/modules/books/books.service.ts:47`

```ts
async createMany(@Body() booksDto: any[]) {        // any[] → tanpa metatype
  return this.booksService.createMany(booksDto);
}
// service:
const books = this.bookRepository.create(booksDto); // kolom arbitrer masuk
```

`ValidationPipe` (whitelist + forbidNonWhitelisted) **hanya bekerja bila ada tipe DTO**. Tipe `any[]` tidak punya metatype, jadi seluruh payload lolos tanpa validasi. Field arbitrer bisa menyusup ke entity `Book`.

**Dampak:** Data kotor / kolom tak terduga tersimpan. Terbatas karena endpoint admin/staff-only, tapi tetap validation bypass.

**Rekomendasi:** Buat tipe `@Body() booksDto: CreateBookDto[]` + `ParseArrayPipe({ items: CreateBookDto })`. Berlaku sama untuk `articles.createMany` (`CreateArticleDto[]` — ini sudah bertipe, cukup pastikan `ParseArrayPipe`).

---

### 3. `articles.update` pakai `Partial<CreateArticleDto>` → validasi ter-bypass — MEDIUM
**File:** `src/modules/articles/articles.controller.ts:63`

```ts
update(@Param('id') id: string, @Body() updateData: Partial<CreateArticleDto>)
```

`Partial<T>` adalah tipe TypeScript yang **hilang saat runtime** (metatype menjadi `Object`), sehingga `ValidationPipe` melewatkannya. Body update artikel tidak tervalidasi sama sekali.

**Dampak:** Input tak tervalidasi pada update artikel (admin/staff-only).

**Rekomendasi:** Buat `UpdateArticleDto extends PartialType(CreateArticleDto)` (dari `@nestjs/mapped-types`/`swagger`) dan gunakan sebagai tipe body — pola yang sudah dipakai modul lain.

---

### 4. Tidak ada validasi `JWT_SECRET` saat startup — MEDIUM
**File:** `src/modules/auth/auth.module.ts:18`, `src/modules/auth/strategies/jwt.strategy.ts:16`

`configService.get<string>('JWT_SECRET')` dipakai langsung tanpa cek keberadaan. Bila env tidak diset, `secret`/`secretOrKey` menjadi `undefined` dan aplikasi tetap boot — kegagalan senyap yang berbahaya (token bisa ditandatangani/diverifikasi dengan secret kosong tergantung perilaku library).

**Dampak:** Deploy yang lupa set `JWT_SECRET` menghasilkan sistem auth yang lemah tanpa peringatan.

**Rekomendasi:** Validasi env saat startup (mis. skema Joi di `ConfigModule.forRoot({ validationSchema })`) yang mewajibkan `JWT_SECRET` ada dan panjang minimum (≥32 char). Fail-fast bila tidak.

---

### 5. Tidak ada security headers (helmet) — MEDIUM
**File:** `src/main.ts` (tidak ada `helmet`)

Response tidak menyertakan header pengaman standar (`X-Content-Type-Options`, `X-Frame-Options`/CSP, `Strict-Transport-Security`, dll).

**Dampak:** Permukaan serangan lebih besar (clickjacking, MIME-sniffing) — relevan karena API dikonsumsi web frontend.

**Rekomendasi:** `npm i helmet` lalu `app.use(helmet())` di `main.ts`.

---

### 6. Kebijakan password lemah — LOW
**File:** `src/modules/auth/dto/register.dto.ts:24`

Password hanya divalidasi `@MinLength(8)`. Tidak ada syarat kompleksitas; `"12345678"` diterima. Memperparah #1.

**Rekomendasi:** Tambah `@Matches()` untuk minimal kombinasi huruf+angka, atau naikkan `MinLength` ke 10–12 dan tolak password umum.

---

### 7. Audit log mempercayai `x-forwarded-for` — LOW
**File:** `src/common/interceptors/activity-logs.interceptor.ts:19`

IP diambil dari header `x-forwarded-for` yang dikirim klien lebih dulu, tanpa `trust proxy` yang dikonfigurasi. Klien bisa memalsukan IP di log aktivitas.

**Dampak:** Integritas audit trail berkurang (atribusi IP bisa dipalsukan).

**Rekomendasi:** Set `app.set('trust proxy', ...)` sesuai topologi proxy nyata, lalu pakai `request.ip` (yang sudah menghormati trust proxy) alih-alih membaca header mentah.

---

### 8. `BorrowBookDto.user_id` diterima dari klien — LOW
**File:** `src/modules/transactions/dto/borrow-book.dto.ts:13`, `transactions.controller.ts:37`

DTO mewajibkan `user_id` dari body, tapi controller menimpanya dengan id dari token: `borrowBook({ ...dto, user_id: userId })`. Saat ini **aman** karena override ada di urutan terakhir, tapi rapuh — jika suatu saat urutan spread dibalik atau field dipakai sebelum override, berubah jadi IDOR (meminjam atas nama user lain).

**Rekomendasi:** Hapus `user_id` dari `BorrowBookDto` sepenuhnya; ambil hanya dari `@GetUser('id')`. Menghilangkan ketergantungan pada urutan spread.

---

## Yang Sudah Aman (tidak perlu tindakan)

- **Mass-assignment privilege escalation terblokir:** `ValidationPipe` global `whitelist:true` + `forbidNonWhitelisted:true` (`main.ts:42-43`), dan `RegisterDto` **tidak** punya field `role` → user tak bisa mendaftar sebagai admin.
- **RBAC konsisten** di 11 controller: semua endpoint tulis (POST/PATCH/DELETE) diproteksi `JwtAuthGuard + RolesGuard` dengan `@Roles` yang tepat (delete umumnya `SUPER_ADMIN` saja). Endpoint publik (list/detail buku, artikel) memang sengaja terbuka.
- **Role selalu fresh dari DB:** `JwtStrategy.validate` mengambil ulang user dari DB, jadi role di token yang basah (mis. setelah demote) tidak dipakai.
- **Password hash tak pernah bocor:** kolom `password` `select:false` (`user.entity.ts:21`); login/register/JWT identity tidak mengembalikannya.
- **CORS fail-closed** di production bila `CORS_ORIGIN` kosong (`main.ts:28-34`).
- **Tanpa user enumeration:** register memakai pesan konflik generik identik; login memakai pesan generik "Invalid email or password".
- **Query ter-parameterisasi:** pencarian memakai `ILIKE :search` dengan parameter (bukan string concat) → aman dari SQL injection.
- **Transaksi user-scoped:** `my-history` memakai id dari token, bukan input klien → tanpa IDOR.
- **Race-condition pinjam/kembali** ditangani `pessimistic_write` lock dalam DB transaction.
- **Guard fail-closed & 401 konsisten** (diperbaiki & diuji sesi ini: `RolesGuard` tak lagi 500 saat user kosong; token user terhapus → 401).

---

## Prioritas Perbaikan yang Disarankan

1. **#1 rate-limiting** (throttler) — dampak tertinggi, effort rendah.
2. **#4 validasi env** + **#5 helmet** — hardening cepat via config/middleware.
3. **#2 & #3 validasi DTO** — tutup bypass validasi.
4. **#6, #7, #8** — perbaikan bertahap.

Semua item dapat dikerjakan via TDD (test dulu, lalu fix) mengikuti pola yang sudah ada di repo.
