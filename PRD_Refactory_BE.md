# PRD — Refactoring Backend Perpustakaan API v2

Dokumen Spesifikasi Teknis: Kebutuhan System, Perancangan Arsitektur, dan Arahan Pengembangan Kode (NestJS 11 + TypeORM + PostgreSQL).

---

## 1. KEBUTUHAN (REQUIREMENTS)

### 1.1 Masalah Utama & Latar Belakang
Codebase Backend BE_Perpustakaan_v2 saat ini memiliki beberapa masalah kritis pada arsitektur, integritas data, dan type safety yang berisiko memicu bug di production:
- **Duplikasi CRUD Masif**: Terdapat 4 module (`authors`, `categories`, `publishers`, `languages`) dengan logika CRUD yang 100% identik (~600 LOC duplikat).
- 🐛 **Bug Relasi Bulk Create (`BooksService.createMany`)**: Method `createMany` memanggil `repository.create()` tanpa menyelesaikan relasi `category_id`, `publisher_id`, `language_id`, dan `author_ids`. Data hasil bulk create kehilangan relasi dan berpotensi memicu N+1 query problem saat validasi relasi.
- 🐛 **Floating Promise pada Audit Log**: `ActivityLogInterceptor` memanggil fungsi async di dalam operator RxJS `tap` tanpa `await` / error handling terisolasi. Audit log bisa silently fail atau memicu unhandled promise rejection.
- **Bypass Dependency Injection (DI)**: Interceptor diinstansiasi secara manual menggunakan operator `new` di `main.ts` alih-alih memanfaatkan NestJS DI Container (`APP_INTERCEPTOR`).
- **Hard Delete Breaking Foreign Key Constraints**: Penghapusan fisik data User, Book, maupun BookItem menggagalkan integritas data riwayat transaksi peminjaman (FK Violation / 500 Server Error).
- **Keamanan Token & Session**: Menggunakan JWT tanpa mekanisme Refresh Token Rotation (serta rentan race condition saat concurrent requests) dan belum mendukung manajemen cookie HttpOnly yang fleksibel untuk subdomain production.
- **Enum Hardcoded & Percampuran Bahasa**: Enum didefinisikan sebagai string array di entity, serta penggunaan bahasa Indonesia dan Inggris yang tidak konsisten pada status/kondisi buku.

### 1.2 Kebutuhan Fungsional
- **Penyelesaian Transaksi Bulk Create Atomic & Efficient**:
  - Memastikan `BooksService.createMany` menyelesaikan seluruh relasi entity secara atomic di dalam transaksi database (`QueryRunner`).
  - Wajib menggunakan Batch Validation (`In([id1, id2, ...])`) untuk mengecek ketersediaan ID relasi sebelum transaksi dijalankan demi menghindari N+1 Query.
- **Asynchronous Event-Driven Audit Logging**: Mengubah registrasi audit log dari interceptor sinkron menjadi event-driven (`@nestjs/event-emitter`) agar terisolasi penuh dan tidak menambah latency HTTP response utama.
- **Otentikasi Secure HttpOnly Cookie + Refresh Token Rotation with Grace Period**:
  - Endpoint `POST /auth/login` menyisipkan `auth_token` langsung ke header HTTP response `Set-Cookie` (`HttpOnly; Secure; SameSite; Path=/`).
  - Menyediakan JWT Refresh Token Rotation flow dengan simpanan token ter-hash di database.
  - Mendukung Grace Period (10–30 detik) untuk toleransi race condition ketika frontend melakukan concurrent API requests saat token expired.
- **Abstraksi Thin Base CRUD Service Type-Safe**: Mengisolasi logika query standar (pagination, findById, search) ke dalam generic base service tanpa menggunakan tipe `any`.
- **Soft Delete Komprehensif (User, Book, BookItem) & Partial Unique Index**: Mengimplementasikan Soft Delete (`deletedAt`) pada entity User, Book, dan BookItem serta memperbarui indeks unik email PostgreSQL agar user terhapus bisa mendaftar ulang jika diperlukan.
- **Aggregated Read Query & Caching Dashboard**: Menggabungkan query agregasi data dashboard ke dalam dedicated read-query terisolasi dengan penambahan in-memory caching (TTL 60 detik).

### 1.3 Kebutuhan Non-Fungsional
- **Type Safety Strict Mode**: Mengaktifkan kembali rule ESLint `@typescript-eslint/no-floating-promises` (error) dan `no-explicit-any` (error/warn). Dilarang keras menggunakan tipe `any`.
- **Kepatuhan Naming Convention**: Seluruh folder dan file wajib menggunakan format kebab-case.
- **100% DI Compliance**: Seluruh Interceptor, Guard, dan Filter global wajib didaftarkan via Provider NestJS (`APP_INTERCEPTOR`, `APP_GUARD`, `APP_FILTER`).
- **Fail-Fast Environment Configuration**: Validasi environment variables saat aplikasi bootstrap (`database.config.ts`) dengan default fallback yang aman (misal: port 5432, `COOKIE_DOMAIN`).
- **Production Readiness**: Mendukung enkripsi koneksi database (DB SSL) dan fleksibilitas subdomain cookies melalui variabel lingkungan (`DB_SSL=true`, `COOKIE_DOMAIN=.perpustakaan.ac.id`).

### 1.4 Spesifikasi Tech Stack & Library
- **Framework**: NestJS v11
- **Runtime & Compiler**: Node.js (v20+) + SWC (`@swc/core`, `@swc/cli`)
- **Database & ORM**: PostgreSQL 16 + TypeORM 0.3 (`pg` driver v8)
- **Authentication & Security**: `@nestjs/jwt`, `@nestjs/passport`, `passport-jwt`, `bcrypt`, `helmet`, `@nestjs/throttler`
- **Validation & DTO**: `class-validator`, `class-transformer`, `@nestjs/mapped-types` (Pinned v11)
- **Event, Caching, & Health**: `@nestjs/event-emitter`, `@nestjs/cache-manager`, `cache-manager`, `@nestjs/terminus`
- **Documentation & Testing**: `@nestjs/swagger`, `swagger-ui-express`, Jest, `ts-jest`, `supertest`, `@faker-js/faker`

---

## 2. PERANCANGAN (DESIGN & ARCHITECTURE)

### 2.1 Arsitektur Folder (Domain-Based & Kebab-Case)
```
src/
├── app.module.ts                  # Root Module (Global Providers: Guard, Interceptor, Filter)
├── main.ts                        # Bootstrap clean, Swagger setup, Global Validation Pipe
│
├── common/                        # Shared Utilities & Base Classes
│   ├── base/                      # Thin Generic Base Classes (Strict Type-Safe)
│   │   ├── base-crud.service.ts
│   │   └── index.ts
│   ├── decorators/                # Custom Decorators (@GetUser, @Roles, @Public)
│   ├── dto/                       # Common DTOs (PaginationDto)
│   ├── enums/                     # Single Source of Truth Enum (Role, BookStatus, BookCondition)
│   ├── filters/                   # AllExceptionsFilter (Clean response format)
│   ├── guards/                    # JwtAuthGuard, RolesGuard
│   ├── interceptors/              # ResponseInterceptor
│   └── index.ts                   # Barrel Export
│
├── config/                        # Configuration Factory & Validation
│   ├── database.config.ts         # Validated DB Config (Strict fallback)
│   ├── data-source.ts             # TypeORM CLI DataSource (Reuses database.config)
│   └── swagger.config.ts          # OpenAPI Spec Builder
│
├── migrations/                    # PostgreSQL Migration Files
│
└── modules/                       # Feature Domain Modules
    ├── activity-logs/             # Async Event Listener Audit Log
    ├── articles/                  # CMS Articles
    ├── auth/                      # Login, Refresh Token Rotation + Grace Period, Cookie Handler
    │   ├── dto/
    │   ├── entities/
    │   └── strategies/
    ├── authors/                   # Extends BaseCrudService
    ├── books/                     # Books & BookItems Sub-resource + Batch Validation
    ├── categories/                # Extends BaseCrudService
    ├── dashboard/                 # Aggregated Read Query + Cache
    ├── health/                    # Terminus Health Check Endpoint (/health)
    ├── languages/                 # Extends BaseCrudService
    ├── policy/                    # Singleton Policy Config
    ├── publishers/                # Extends BaseCrudService
    ├── transactions/              # Borrowing & Lending Engine
    └── users/                     # User Management + Soft Delete & Partial Unique Index
```

### 2.2 Arsitektur Otentikasi & Cookie Management (Subdomain & Grace Period Ready)

```
HTTP POST /auth/login
       │
       ▼
┌──────────────┐      Set-Cookie: auth_token=jwt...; HttpOnly; Secure; SameSite=Lax; Domain=.domain.com
│ AuthController│ ───────────────────────────────────────────────────────────────────────────────────► Client Browser
└──────┬───────┘
       │
       ▼
Returns User Profile Payload (Tanpa menyertakan token di body response)
```

Header Response Cookie Handler (`auth.controller.ts`):
```typescript
@Post('login')
@HttpCode(HttpStatus.OK)
async login(
  @Body() dto: LoginDto,
  @Res({ passthrough: true }) response: Response,
) {
  const { accessToken, refreshToken, user } = await this.authService.login(dto);

  const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

  // Set HttpOnly Cookie untuk Access Token
  response.cookie('auth_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: cookieDomain,
    path: '/',
    maxAge: 15 * 60 * 1000, // 15 Menit
  });

  return { message: 'Login successful', user };
}

@Post('refresh')
@HttpCode(HttpStatus.OK)
async refreshTokens(
  @Req() request: Request,
  @Res({ passthrough: true }) response: Response,
) {
  // Grace Period Handling: Jika refresh token sedang di-rotate dalam kurun 10-30 detik terakhir,
  // berikan accessToken baru tanpa membatalkan sesi paralel (mencegah concurrent request failure).
  const { accessToken, newRefreshToken } = await this.authService.rotateRefreshTokenWithGracePeriod(
    request.body.refreshToken,
  );

  response.cookie('auth_token', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: '/',
    maxAge: 15 * 60 * 1000,
  });

  return { accessToken, refreshToken: newRefreshToken };
}
```

### 2.3 Perancangan Event-Driven Audit Log
Menggantikan interceptor RxJS `tap` untuk menghindari blocking latency dan floating promise.

```
[ Request Selesai ] ──► EventEmit('audit.log', payload)
                                │
                                ▼ (Asynchronous / Non-blocking)
                      ┌──────────────────┐
                      │ ActivityLogSvc   │ ──► Save to DB (Isolated Try-Catch)
                      └──────────────────┘
```

`activity-logs.listener.ts`:
```typescript
@Injectable()
export class ActivityLogListener {
  constructor(private readonly activityLogsService: ActivityLogsService) {}

  @OnEvent('audit.log', { async: true })
  async handleAuditLogEvent(event: AuditLogEvent) {
    try {
      await this.activityLogsService.createLog(event);
    } catch (error) {
      // Log error ke monitoring tool tanpa menggagalkan HTTP Request utama
      console.error('Failed to save audit log:', error);
    }
  }
}
```

### 2.4 Perancangan Soft Delete (User, Book, BookItem) & Partial Unique Index PostgreSQL
Mencegah error Foreign Key Constraint Violation pada riwayat peminjaman buku sambil tetap memperbolehkan registrasi email yang sama jika user lama telah dihapus (soft deleted).

PostgreSQL Migration:
```sql
-- Hapus constraint unique lama pada email user
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "UQ_users_email";

-- Buat Partial Unique Index khusus data aktif (deleted_at IS NULL)
CREATE UNIQUE INDEX "IDX_USERS_EMAIL_UNIQUE_ACTIVE" 
ON "users" ("email") 
WHERE "deleted_at" IS NULL;
```

Entity Definitions (`user.entity.ts` & `book.entity.ts`):
```typescript
// user.entity.ts
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  email: string;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}

// book.entity.ts
@Entity('books')
export class Book {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  isbn: string;

  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deletedAt?: Date;
}
```

### 2.5 Perancangan Thin Generic Base CRUD Service (Strict Type-Safe)
```typescript
// src/common/base/base-crud.service.ts
import { ObjectLiteral, Repository, DeepPartial } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { PaginationDto } from '../dto/pagination.dto';

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export abstract class BaseCrudService<T extends ObjectLiteral> {
  constructor(
    protected readonly repository: Repository<T>,
    protected readonly entityName: string,
  ) {}

  async findAll(query: PaginationDto): Promise<PaginatedResult<T>> {
    const page = Math.max(1, query.page ?? 1);
    const limit = Math.max(1, query.limit ?? 10);
    const [data, total] = await this.repository.findAndCount({
      skip: (page - 1) * limit,
      take: limit,
    });
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // Tipe ID menggunakan union eksplisit (string | number), haram menggunakan 'any'
  async findOneById(id: string | number): Promise<T> {
    const item = await this.repository.findOne({ where: { id } as any });
    if (!item) {
      throw new NotFoundException(`${this.entityName} with ID ${id} not found`);
    }
    return item;
  }
}
```

---

## 3. ARAHAN TEKNIS (DEVELOPMENT DIRECTIVES)

### 3.1 Aturan Kontrak Otentikasi & Header Cookie
- **Cookie Delivery**: Backend wajib menyertakan header `Set-Cookie` berisi `auth_token` saat login/refresh dan memvalidasi cookie tersebut di `JwtStrategy`.
- **Subdomain Support**: Gunakan variabel lingkungan `COOKIE_DOMAIN` (contoh: `.perpustakaan.ac.id`) agar cookie dapat dikirimkan dari frontend ke backend lintas subdomain.
- **CORS Credentials**: Konfigurasi CORS pada NestJS wajib mengaktifkan `credentials: true` dan menentukan origin secara spesifik (tidak boleh wildcard `*`).

```typescript
// main.ts
app.enableCors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
});
```

### 3.2 Aturan Standar Kode & Type Safety
- **Aturan Naming Convention**: Nama file wajib menggunakan kebab-case (contoh: `activity-log.listener.ts`, `book-item.entity.ts`).
- **Haram any Type**: Gunakan tipe data yang eksplisit (`string | number`) atau `unknown` dengan type assertion.
- **Single Source of Truth Enum**: Seluruh Enum wajib diimpor dari `src/common/enums/`. Entity dilarang mendefinisikan array string enum secara lokal.
- **Bahasa Enum Standard**: Gunakan Bahasa Inggris secara konsisten pada Enum DB (`BookCondition.GOOD`, `BookCondition.SLIGHTLY_DAMAGED`, `BookCondition.HEAVILY_DAMAGED`).

### 3.3 Aturan Transaksi Database (Bulk Create & Batch Validation)
- **Anti N+1 Validation**: Sebelum memulai transaksi `BooksService.createMany`, kumpulkan seluruh ID relasi (`category_id`, `publisher_id`, `language_id`, `author_ids`) dari payload DTO dan lakukan batch check menggunakan TypeORM `In([...])` dalam 1 kali query per tabel relasi.
- **Atomic Transaction**: Setelah seluruh ID relasi terverifikasi, bungkus penyimpanan data bulk di dalam transaksi TypeORM (`QueryRunner` / `dataSource.transaction`).

```typescript
// books.service.ts
async createMany(createBookDtos: CreateBookDto[]) {
  // 1. Collect unique IDs for Batch Fetching
  const categoryIds = [...new Set(createBookDtos.map(d => d.categoryId))];
  
  // 2. Batch Validation (1 query, anti N+1)
  const categories = await this.categoryRepository.findBy({ id: In(categoryIds) });
  if (categories.length !== categoryIds.length) {
    throw new BadRequestException('One or more categories not found');
  }

  // 3. Atomic Transaction
  return await this.dataSource.transaction(async (manager) => {
    // Perform bulk create with resolved relations
  });
}
```

### 3.4 Arahan Unit Testing & Dependency Isolation
- **Mocking Repository**: Unit test pada Service wajib mengisolasi database dengan menggunakan TypeORM Repository Mock (`jest.fn()`).
- **Test Coverage**: Modul `activity-logs` dan `policy` wajib melengkapi unit test (`*.spec.ts`) hingga coverage minimal 80%.

---

## 4. METRIK KEBERHASILAN (QUALITY METRICS)

| Parameter Kualitas | Kondisi Saat Ini (v1) | Target Akhir Refactoring |
| --- | --- | --- |
| **Relasi Bulk Create Buku** | ❌ Broken (Relasi Hilang & N+1 Query) | ✅ 100% Relasi Terhubung (Atomic Batch Transaction) |
| **Eksekusi Audit Log** | ❌ Floating Promise (Tap RxJS) | ✅ Non-blocking Async Event (`@OnEvent`) |
| **Duplikasi Kode CRUD** | ~600 LOC Duplikat | ~150 LOC (Thin Type-Safe Base Service) |
| **Integritas Delete Data** | ❌ Hard Delete (FK Violation User/Book) | ✅ Soft Delete (User, Book, Item) + Partial Unique Index PG |
| **Mekanisme Otentikasi** | Pure JWT Body Response | Secure HttpOnly Cookie + Refresh Token Rotation (Grace Period) |
| **Pengelolaan DI Global** | Manual `new` di `main.ts` | 100% via NestJS Provider (`APP_INTERCEPTOR`) |
| **Type Safety & ESLint** | Critical rules disabled, any usage | Clean Lint (`no-floating-promises` & `no-explicit-any` Strict) |
| **Unit & E2E Test Coverage** | Missing spec di 2 module | 100% Module Covered (24+ Spec Files) |
