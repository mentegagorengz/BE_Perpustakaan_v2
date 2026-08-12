# Perpustakaan API v2

REST API manajemen perpustakaan — NestJS, TypeORM, PostgreSQL.

## Arsitektur

```
src/
├── common/                    # Shared utilities
│   ├── decorators/            # @GetUser, @Roles, @ApiDocs
│   ├── dto/                   # PaginationDto
│   ├── enums/                 # RoleEnum, BookEnum
│   ├── filters/               # Global exception filter
│   ├── guards/                # RolesGuard
│   ├── interceptors/          # Response wrapper + activity log
│   ├── interfaces/            # ApiResponse, PaginatedResult
│   └── transformers/          # NumericTransformer (decimal)
├── config/                    # DB, Swagger, DataSource
├── migrations/                # TypeORM migrations
└── modules/
    ├── auth/                  # Register, login, JWT
    ├── users/                 # Manajemen user & role
    ├── books/                 # Buku & eksemplar fisik
    ├── authors/               # Penulis
    ├── categories/            # Kategori buku
    ├── publishers/            # Penerbit
    ├── languages/             # Bahasa
    ├── transactions/          # Pinjam & kembali
    ├── dashboard/             # Statistik ringkasan
    ├── activity-logs/         # Audit trail
    ├── articles/              # Artikel/berita
    └── policy/                # Kebijakan (denda, durasi)
```

## Fitur

- **Auth & RBAC** — Register, login JWT, role: `SUPER_ADMIN` / `STAFF` / `USER`
- **Buku** — CRUD metadata + manajemen eksemplar fisik (barcode, status, kondisi)
- **Master data** — CRUD penulis, kategori, penerbit, bahasa
- **Transaksi** — Pinjam, kembali, denda otomatis (Rp 5.000/hari), pessimistic lock
- **Dashboard** — Ringkasan statistik (buku, user, transaksi)
- **Activity logs** — Audit trail otomatis via global interceptor
- **Articles** — CRUD artikel/berita
- **Policy** — Konfigurasi denda & durasi pinjam (dapat diubah runtime)
- **Pagination & search** — Semua endpoint list
- **Response seragam** — `{ success, message, data, meta? }` global; error `{ success: false, message, error: { code, details } }`; meta snake_case: `total_items | total_pages | has_next_page | has_prev_page`
- **Swagger/OpenAPI** — Dokumentasi interaktif di `/api/docs`
- **Rate limiting** — 100 request/menit global

## Tech Stack

| Teknologi | Keterangan |
|-----------|------------|
| NestJS v11 | Framework |
| TypeORM 0.3 | ORM |
| PostgreSQL 16 | Database |
| Passport + JWT | Autentikasi |
| class-validator | Validasi DTO |
| bcrypt | Hashing password |
| Swagger | Dokumentasi API |
| Jest | Testing |

## Prasyarat

- Node.js >= 20
- npm >= 10
- PostgreSQL (atau Docker)

## Setup

1. **Clone**
   ```bash
   git clone <repo-url>
   cd be-perpustakaan.v2
   ```

2. **Install**
   ```bash
   npm install
   ```

3. **Env** — Copy `.env.example` ke `.env`:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=perpustakaan
   DB_PASSWORD=change_me
   DB_NAME=perpustakaan
   DB_SYNC=false

   JWT_SECRET=change_me_to_a_long_random_string
   JWT_EXPIRES_IN=1d

   CORS_ORIGIN=
   PORT=3000
   ```

4. **Database** — Lewat Docker:
   ```bash
   docker compose up -d
   ```
   Atau pakai PostgreSQL lokal.

5. **Migrasi**
   ```bash
   npm run migration:run
   ```

6. **Jalankan**
   ```bash
   npm run start:dev
   ```

   Akses: `http://localhost:3000/api/v1`  
   Swagger: `http://localhost:3000/api/docs`

## Scripts

| Script | Fungsi |
|--------|--------|
| `npm run start:dev` | Development (watch) |
| `npm run build` | Build |
| `npm run start:prod` | Produksi |
| `npm run test` | Unit test |
| `npm run test:e2e` | E2E test |
| `npm run test:cov` | Coverage |
| `npm run lint` | ESLint |
| `npm run migration:run` | Jalankan migrasi |
| `npm run migration:generate --name=Nama` | Generate migrasi baru |
| `npm run migration:revert` | Rollback migrasi |
| `npm run openapi:generate` | Generate openapi.json |

## API Endpoints

Semua endpoint di-prefix `/api/v1`.

### Auth
| Method | Path | Akses |
|--------|------|-------|
| POST | `/auth/register` | Public |
| POST | `/auth/login` | Public |
| GET | `/auth/profile` | Authenticated |

### Users
| Method | Path | Akses |
|--------|------|-------|
| GET | `/users` | SUPER_ADMIN, STAFF |
| GET | `/users/:id` | SUPER_ADMIN, STAFF |
| PATCH | `/users/:id/role` | SUPER_ADMIN |
| DELETE | `/users/:id` | SUPER_ADMIN |

### Books
| Method | Path | Akses |
|--------|------|-------|
| GET | `/books` | Public |
| GET | `/books/:id` | Public |
| POST | `/books` | SUPER_ADMIN, STAFF |
| PATCH | `/books/:id` | SUPER_ADMIN, STAFF |
| DELETE | `/books/:id` | SUPER_ADMIN |
| POST | `/books/items` | SUPER_ADMIN, STAFF |
| GET | `/books/:id/items` | Public |

### Authors / Categories / Publishers / Languages
| Method | Path | Akses |
|--------|------|-------|
| GET | `/{resource}` | Public |
| GET | `/{resource}/:id` | Public |
| POST | `/{resource}` | SUPER_ADMIN, STAFF |
| PATCH | `/{resource}/:id` | SUPER_ADMIN, STAFF |
| DELETE | `/{resource}/:id` | SUPER_ADMIN |

### Transactions
| Method | Path | Akses |
|--------|------|-------|
| POST | `/transactions/borrow` | Authenticated |
| PATCH | `/transactions/return/:barcode` | SUPER_ADMIN, STAFF |
| GET | `/transactions` | SUPER_ADMIN, STAFF |
| GET | `/transactions/my-history` | Authenticated |

### Dashboard
| Method | Path | Akses |
|--------|------|-------|
| GET | `/dashboard` | SUPER_ADMIN, STAFF |

### Activity Logs
| Method | Path | Akses |
|--------|------|-------|
| GET | `/activity-logs` | SUPER_ADMIN |

### Articles
| Method | Path | Akses |
|--------|------|-------|
| GET | `/articles` | Public |
| GET | `/articles/:id` | Public |
| POST | `/articles` | SUPER_ADMIN, STAFF |
| PATCH | `/articles/:id` | SUPER_ADMIN, STAFF |
| DELETE | `/articles/:id` | SUPER_ADMIN |

### Policy
| Method | Path | Akses |
|--------|------|-------|
| GET | `/policy` | Public |
| PATCH | `/policy` | SUPER_ADMIN |

## Role & Akses

| Role | Hak |
|------|-----|
| `SUPER_ADMIN` | Full access |
| `STAFF` | Kelola buku, master data, pengembalian |
| `USER` | Pinjam buku, riwayat sendiri, katalog |

## Kategori User

`STUDENT` · `LECTURER` · `LIBRARY_STAFF` · `PUBLIC`

## License

MIT
