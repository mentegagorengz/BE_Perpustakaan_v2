# 📚 Perpustakaan API v2

REST API untuk sistem manajemen perpustakaan yang dibangun dengan [NestJS](https://nestjs.com/), TypeORM, dan PostgreSQL.

## 🏗️ Arsitektur

```
src/
├── common/              # Shared utilities (guards, decorators, filters, interceptors, DTOs)
├── config/              # Konfigurasi database & environment
└── modules/
    ├── auth/            # Autentikasi (register, login, JWT)
    ├── users/           # Manajemen user & role
    ├── books/           # Manajemen buku & eksemplar (book items)
    ├── authors/         # Manajemen penulis
    ├── categories/      # Manajemen kategori buku
    ├── publishers/      # Manajemen penerbit
    ├── languages/       # Manajemen bahasa
    └── transactions/    # Peminjaman & pengembalian buku
```

## ✨ Fitur

- **Autentikasi & Otorisasi** — Register, Login dengan JWT, Role-based access control (`SUPER_ADMIN`, `STAFF`, `USER`)
- **Manajemen Buku** — CRUD buku (metadata), manajemen eksemplar fisik (barcode, status, kondisi)
- **Manajemen Master Data** — CRUD untuk penulis, kategori, penerbit, dan bahasa
- **Transaksi Peminjaman** — Pinjam buku, kembalikan buku, hitung denda otomatis (Rp 5.000/hari)
- **Paginasi & Pencarian** — Semua endpoint list mendukung pagination dan search
- **Response Konsisten** — Format response seragam `{ statusCode, message, data }` via global interceptor & exception filter

## 🛠️ Tech Stack

| Teknologi | Keterangan |
|-----------|------------|
| [NestJS](https://nestjs.com/) v11 | Framework backend |
| [TypeORM](https://typeorm.io/) v0.3 | ORM untuk PostgreSQL |
| [PostgreSQL](https://www.postgresql.org/) | Database |
| [Passport + JWT](http://www.passportjs.org/) | Autentikasi |
| [class-validator](https://github.com/typestack/class-validator) | Validasi DTO |
| [bcrypt](https://github.com/kelektiv/node.bcrypt.js) | Hashing password |

## 📋 Prasyarat

- Node.js >= 20.0.0
- npm >= 10.0.0
- PostgreSQL

## 🚀 Instalasi & Setup

1. **Clone repository**
   ```bash
   git clone https://github.com/<username>/be-perpustakaan.v2.git
   cd be-perpustakaan.v2
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Konfigurasi environment** — Buat file `.env` di root project:
   ```env
   DB_HOST=localhost
   DB_PORT=5432
   DB_USER=postgres
   DB_PASSWORD=your_password
   DB_NAME=perpustakaan

   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=1d

   PORT=3000
   ```

4. **Jalankan aplikasi**
   ```bash
   # development (watch mode)
   npm run start:dev

   # production
   npm run build
   npm run start:prod
   ```

5. **Akses API** di `http://localhost:3000/api/v1`

## 📡 API Endpoints

### Auth
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| POST | `/api/v1/auth/register` | Public | Register user baru |
| POST | `/api/v1/auth/login` | Public | Login, mendapat access token |
| GET | `/api/v1/auth/profile` | Authenticated | Lihat profil user yang login |

### Users
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | `/api/v1/users` | SUPER_ADMIN, STAFF | List semua user (paginated) |
| GET | `/api/v1/users/:id` | SUPER_ADMIN, STAFF | Detail user |
| PATCH | `/api/v1/users/:id/role` | SUPER_ADMIN | Update role/kategori user |
| DELETE | `/api/v1/users/:id` | SUPER_ADMIN | Hapus user |

### Books
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | `/api/v1/books` | Public | List semua buku (paginated) |
| GET | `/api/v1/books/:id` | Public | Detail buku beserta items |
| POST | `/api/v1/books` | SUPER_ADMIN, STAFF | Tambah buku baru |
| PATCH | `/api/v1/books/:id` | SUPER_ADMIN, STAFF | Update buku |
| DELETE | `/api/v1/books/:id` | SUPER_ADMIN | Hapus buku |
| POST | `/api/v1/books/items` | SUPER_ADMIN, STAFF | Tambah eksemplar buku |
| GET | `/api/v1/books/:id/items` | Public | List eksemplar sebuah buku |

### Authors / Categories / Publishers / Languages
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| GET | `/api/v1/{resource}` | Public | List (paginated) |
| GET | `/api/v1/{resource}/:id` | Public | Detail |
| POST | `/api/v1/{resource}` | SUPER_ADMIN, STAFF | Tambah baru |
| PATCH | `/api/v1/{resource}/:id` | SUPER_ADMIN, STAFF | Update |
| DELETE | `/api/v1/{resource}/:id` | SUPER_ADMIN | Hapus |

### Transactions
| Method | Endpoint | Akses | Keterangan |
|--------|----------|-------|------------|
| POST | `/api/v1/transactions/borrow` | Authenticated | Pinjam buku |
| PATCH | `/api/v1/transactions/return/:barcode` | SUPER_ADMIN, STAFF | Kembalikan buku |
| GET | `/api/v1/transactions` | SUPER_ADMIN, STAFF | Riwayat semua transaksi |
| GET | `/api/v1/transactions/my-history` | Authenticated | Riwayat transaksi sendiri |

## 🧪 Testing

```bash
# unit tests
npm run test

# e2e tests
npm run test:e2e

# test coverage
npm run test:cov
```

## 📁 Struktur Role

| Role | Hak Akses |
|------|-----------|
| `SUPER_ADMIN` | Full access (CRUD semua resource, manage role, hapus data) |
| `STAFF` | Manage buku, master data, proses pengembalian |
| `USER` | Pinjam buku, lihat riwayat sendiri, lihat katalog |

## 📝 Kategori User

`STUDENT` · `LECTURER` · `LIBRARY_STAFF` · `PUBLIC`

## 📄 License

[MIT](https://opensource.org/licenses/MIT)