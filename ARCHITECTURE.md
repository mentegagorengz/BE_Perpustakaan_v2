# Perpustakaan API v2 — Architecture

Dokumen arsitektur sistem: struktur folder, pola desain, alur autentikasi, dan konfigurasi environment.

**Tech Stack**: NestJS v11 · TypeORM 0.3 · PostgreSQL 16 · Node.js 20+

---

## 1. Struktur Folder

```
src/
├── app.module.ts                  # Root Module (Global Providers: Guard, Interceptor, Filter)
├── main.ts                        # Bootstrap, Swagger, Global Validation Pipe
│
├── common/
│   ├── base/                      # BaseCrudService<T> (type-safe generic)
│   ├── decorators/                # @GetUser, @Roles, @BypassTransform, @ResponseMessage, api-docs helpers
│   ├── dto/                       # PaginationDto
│   ├── enums/                     # SystemRole, UserCategory, BookStatusEnum, BookConditionEnum
│   ├── filters/                   # AllExceptionsFilter
│   ├── guards/                    # RolesGuard (JwtAuthGuard → modules/auth/guards)
│   ├── interceptors/              # ResponseInterceptor (envelope + date + sanitize), ActivityLogInterceptor
│   ├── interfaces/                # ApiResponse, PaginatedResult, PaginationMeta
│   ├── transformers/              # NumericTransformer
│   └── utils/                     # validationExceptionFactory
│
├── config/
│   ├── database.config.ts         # Validated DB config (fail-fast, SSL support)
│   ├── data-source.ts             # TypeORM CLI DataSource
│   ├── env.validation.ts          # Fail-fast env validation saat bootstrap
│   ├── cookie.config.ts           # HttpOnly cookie helper (COOKIE_DOMAIN)
│   └── swagger.config.ts          # OpenAPI spec builder
│
├── migrations/
│
└── modules/
    ├── activity-logs/             # Event-driven audit (@OnEvent, async, isolated)
    ├── articles/                  # CMS articles + bulk create
    ├── auth/                      # Login, refresh rotation + grace period, cookie, logout
    ├── authors/                   # Extends BaseCrudService
    ├── books/                     # Books + BookItems sub-resource + batch validation
    ├── categories/                # Extends BaseCrudService
    ├── dashboard/                 # Aggregated read query + cache (TTL 60s)
    ├── health/                    # Terminus health check
    ├── languages/                 # Extends BaseCrudService
    ├── policy/                    # Singleton policy config (denda, durasi)
    ├── publishers/                # Extends BaseCrudService
    ├── transactions/              # Peminjaman & pengembalian + denda otomatis
    └── users/                     # User management + soft delete + partial unique index
```

---

## 2. Pola Arsitektur

### 2.1 Thin Generic Base CRUD Service

Empat module referensi (authors, categories, publishers, languages) adalah subclass tipis dari `BaseCrudService`. Duplikasi CRUD berkurang dari ~600 LOC menjadi ~150 LOC.

```typescript
class BaseCrudService<TEntity extends ObjectLiteral & { id: number }> {
  // findAll (pagination + search LIKE via searchColumn)
  // findOne
  // create / update / remove
}
```

### 2.2 Event-Driven Audit Log

Interceptor hanya mempublish event — tidak menyentuh DB secara langsung. Error di listener tidak merambat ke HTTP response.

```
[ Request Selesai ] ──► EventEmitter2.emit('audit.log', payload)
                                │
                                ▼  (async, non-blocking)
                      ActivityLogListener → Save to DB (isolated try-catch)
```

- Listener: `@OnEvent('audit.log', { async: true })`
- Kegagalan audit log tidak mempengaruhi response user

### 2.3 Soft Delete + Partial Unique Index

Entity `User`, `Book`, `BookItem` menggunakan `@DeleteDateColumn('deleted_at')`.

```sql
-- Email & identification_number bisa dipakai ulang setelah soft delete
CREATE UNIQUE INDEX "IDX_users_email_active"
ON "users" ("email") WHERE "deleted_at" IS NULL;
```

- Soft delete `Book` → cascade soft delete semua `book_items` (manual, bukan FK fisik)
- Query transaksi historis menggunakan `withDeleted`

### 2.4 Bulk Create Books — Batch Validation + Atomic

Menghindari N+1 query saat validasi relasi pada payload bulk.

1. Collect semua unique relation IDs dari payload
2. Batch validation: 4 query `In([...])` dijalankan paralel
3. Insert dalam satu `dataSource.transaction` (atomic)

### 2.5 Dashboard + Cache

- `DashboardReadQuery` dipisah dari service (count aktif book/user/log + agregasi transaksi)
- `CacheModule` global, summary di-cache 60 detik
- `DashboardCacheInvalidator` menghapus cache pada setiap event audit

---

## 3. Arsitektur Autentikasi

### 3.1 Login Flow

```
POST /api/v1/auth/login
       │
       ▼
┌──────────────────┐
│  AuthController  │ ──► Set-Cookie: access_token=<jwt>; HttpOnly; SameSite=Lax/None; Secure (prod)
│                  │      Set-Cookie: refresh_token=<opaque>; HttpOnly; SameSite=Lax/None; Secure (prod)
└──────┬───────────┘
       │
       ▼
  Returns: user profile + refreshToken
  (access token TIDAK di body — hanya refreshToken di body untuk keperluan rotasi)
```

> Cookie `refresh_token` dipakai sebagai fallback bila client tidak menyimpan
> `refreshToken` dari body. `SameSite` otomatis `Lax` di development dan
> `None` di production (wajib `Secure`), lihat `src/config/cookie.config.ts`.

### 3.2 Refresh Token Rotation + Grace Period

| Komponen | Detail |
|----------|--------|
| Access token | JWT via HttpOnly cookie `access_token` (TTL: `JWT_EXPIRES_IN`, default 15 menit) |
| Refresh token | Opaque SHA-256, disimpan ter-hash di DB (TTL: `JWT_REFRESH_EXPIRES_IN`) |
| Grace period | `REFRESH_GRACE_SECONDS` — window toleransi untuk concurrent request paralel via `previous_token_hash` |
| Replay setelah grace | Session di-revoke seluruhnya |
| Logout | Revoke session + `clearCookie` (`access_token` & `refresh_token`) |

> **Catatan implementasi**: Nilai `REFRESH_GRACE_SECONDS` harus dikonfigurasi sesuai karakteristik traffic aplikasi. Terlalu rendah menyebabkan false logout pada slow connection; terlalu tinggi memperlebar window replay attack.

### 3.3 Cookie & CORS Config

- `COOKIE_DOMAIN` opsional (default undefined → host-only cookie). Untuk production lintas subdomain set `.perpustakaan.ac.id`
- CORS: `credentials: true`, origin eksplisit dari `CORS_ORIGIN` — bukan wildcard `*`
- `JwtStrategy`: baca dari cookie `access_token`, fallback ke Bearer header

---

## 4. Global Middleware Architecture

| Provider | Peran |
|----------|-------|
| `APP_GUARD` → `ThrottlerGuard` | Rate limit global (default 100 req/menit/IP); override lebih ketat di `/auth/login` (5/60s) & `/auth/refresh` (60/60s) |
| `APP_INTERCEPTOR` → `ResponseInterceptor` | Membungkus return value Controller ke Response Envelope standar; auto-detect list vs single; strip meta jika data tunggal |
| `APP_INTERCEPTOR` → `ActivityLogInterceptor` | Emit event audit log (non-blocking) |
| `APP_FILTER` → `AllExceptionsFilter` | Tangkap semua HTTP Exception & unhandled error, format ke Error Envelope standar |
| `JwtAuthGuard` + `RolesGuard` | Auth + RBAC **per-controller** via `@UseGuards(...)` di tiap module — bukan `APP_*` (keputusan eksplisit, lihat DESIGN §1) |
| `@BypassTransform()` | Decorator untuk mengecualikan route dari envelope (OAuth token, file download, SSE streaming) |

Selain provider global di atas, `main.ts` memasang `helmet()`, `cookieParser()`, prefix global `/api/v1`, dan `ValidationPipe` global (whitelist + forbidNonWhitelisted + transform). Route publik adalah handler yang **tidak** dipasangi `@UseGuards` (auth register/login/refresh/logout, `GET /books`, `GET /articles`).

---

## 5. Konfigurasi Environment

```bash
# Database (wajib: DB_USER, DB_PASSWORD, DB_NAME)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=
DB_USER=
DB_PASSWORD=
DB_SSL=false               # Set true di production
DB_SSL_REJECT_UNAUTHORIZED=true
DB_SYNC=false              # Hanya development (auto-sync entity); jangan true di production

# Auth
JWT_SECRET=                # Wajib, minimal 32 karakter
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d  # TTL refresh session (opaque token)
REFRESH_GRACE_SECONDS=     # Grace window rotasi; code clamp 10–30s, default 30

# Cookie
COOKIE_DOMAIN=             # Opsional; set .perpustakaan.ac.id untuk lintas subdomain

# CORS
CORS_ORIGIN=               # Comma-separated origin frontend (wajib di production)

# App
PORT=3000
NODE_ENV=development
```

> Fail-fast validation dijalankan saat bootstrap (`env.validation.ts`). Server tidak akan start jika ada env yang hilang atau invalid. Diwajibkan: `JWT_SECRET` (≥32 karakter), `DB_USER`, `DB_PASSWORD`, `DB_NAME`. Tidak ada `JWT_REFRESH_SECRET` — refresh token bersifat opaque (SHA-256 di DB), bukan JWT.

---

## 6. Quality Gate

### Build & Test

| Gate | Status |
|------|:------:|
| `npm run build` | ✅ |
| `npm run lint` | ✅ |
| `npm test -- --runInBand` | ✅ 35 suite, 254 test |
| `npm run test:e2e -- --runInBand` | ✅ 16/16 |
| `npm run openapi:generate` | ✅ 32 path |
| Migration pending | ✅ None |

### Metrik Refactoring

| Area | Sebelum | Sesudah |
|------|---------|---------|
| Bulk create relasi | ❌ N+1 query | ✅ Atomic batch transaction |
| Audit log | ❌ Floating promise | ✅ Non-blocking `@OnEvent` |
| Duplikasi CRUD | ~600 LOC | ~150 LOC via `BaseCrudService` |
| Delete strategy | ❌ Hard delete (FK violation risk) | ✅ Soft delete + partial unique index |
| Auth token delivery | JWT di response body | ✅ HttpOnly cookie + refresh rotation |
| DI pattern | Manual `new` di `main.ts` | ✅ 100% `APP_*` provider |
| Type safety | `any` usage, rules disabled | ✅ Strict ESLint, zero `any` |
| Test coverage | 2 module tidak tercakup | ✅ 35 suite, 254 test, 16 e2e |

---

## 7. Keputusan yang Disengaja (Known Tradeoffs)

| Keputusan | Alasan |
|-----------|--------|
| `refreshToken` & `accessToken` (di `/auth/refresh`) pakai camelCase (bukan snake_case) | Keputusan kontrak yang disepakati — satu-satunya exception dari konvensi snake_case di response auth |
| `/health` endpoint dibungkus response envelope global | Konsistensi diutamakan; tidak ada client yang mengonsumsi `/health` secara programatik |
| Audit log via EventEmitter2 bukan Bull/queue | Simplicity — audit log non-critical, tidak perlu durability guarantee di tahap ini |