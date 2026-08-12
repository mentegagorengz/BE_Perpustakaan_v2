# Perpustakaan API v2 — API Standards

Panduan standar penulisan endpoint baru: konvensi REST, response envelope, status code, dan inventaris endpoint.

> Dokumen ini adalah referensi utama saat **menambah atau memodifikasi endpoint**. Untuk memahami arsitektur sistem secara keseluruhan, lihat `ARCHITECTURE.md`.

---

## 1. Konvensi URL & HTTP Method

### Versioning & Naming

- Semua endpoint wajib prefix `/api/v1/`
- Gunakan **plural nouns** dan format **kebab-case**

| ❌ Hindari | ✅ Benar |
|-----------|---------|
| `/api/getUsers` | `/api/v1/users` |
| `/api/v1/user_profile` | `/api/v1/user-profiles` |
| `/api/v1/createProduct` | `/api/v1/products` |

- Gunakan **resource hierarchy** untuk relasi: `GET /api/v1/users/:userId/orders`

### Pemetaan HTTP Method

| Method | Fungsi | Catatan |
|--------|--------|---------|
| `GET` | Baca data | Idempotent. Dilarang mengubah state DB |
| `POST` | Buat resource baru ATAU trigger aksi non-CRUD | Login, search kompleks, export |
| `PUT` | Replace seluruh objek | — |
| `PATCH` | Update sebagian field | Dipakai untuk update di project ini |
| `DELETE` | Hapus data | Soft delete |

---

## 2. Response Envelope

Semua response wajib menggunakan struktur envelope berikut. `ResponseInterceptor` menangani ini secara otomatis — tidak perlu dibungkus manual di Controller.

### A. Single Data

Untuk: `GET /:id`, `POST` (create), `PATCH`, `DELETE` (dengan body).

> **Aturan keras**: Dilarang menyertakan key `meta` pada response data tunggal.

```json
{
  "success": true,
  "message": "Pesan deskriptif untuk UI",
  "data": {
    "id": "usr_123",
    "email": "user@example.com",
    "created_at": "2026-08-11T05:26:55Z"
  }
}
```

Jika aksi tidak mengembalikan payload (misal: hapus data), set `"data": null`.

### B. List / Collection (Paginated)

Untuk: `GET /` dengan paginasi. Key `meta` **hanya** muncul di sini.

```json
{
  "success": true,
  "message": "Berhasil mengambil daftar data",
  "data": [
    {
      "id": "usr_123",
      "email": "user@example.com"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total_items": 100,
    "total_pages": 10,
    "has_next_page": true,
    "has_prev_page": false
  }
}
```

### C. Error Response

```json
{
  "success": false,
  "message": "Pesan ringkas kesalahan",
  "error": {
    "code": "VALIDATION_ERROR",
    "details": [
      {
        "field": "email",
        "message": "Email sudah terdaftar"
      }
    ]
  }
}
```

- `error.code`: Machine-readable string enum — `VALIDATION_ERROR`, `AUTH_EXPIRED`, `NOT_FOUND`, `INSUFFICIENT_FUNDS`, dll.
- `error.details`: Array error per-field untuk validasi form. Set `null` jika error bersifat global.

---

## 3. HTTP Status Code

> **Prinsip utama**: Jangan pernah return `200 OK` jika `success: false`. Error client → `4xx`. Error server → `5xx`.

| Code | Nama | Kapan Digunakan |
|:----:|------|-----------------|
| **200** | OK | GET sukses; PUT/PATCH sukses; DELETE dengan body; POST non-creation (login, search) |
| **201** | Created | POST/PUT yang berhasil membuat resource baru di DB (register, create order) |
| **204** | No Content | DELETE sukses tanpa response body |
| **400** | Bad Request | Syntax JSON cacat, malformed payload, query parameter wajib hilang, gagal validasi DTO (class-validator) |
| **401** | Unauthorized | Token hilang, invalid, atau expired |
| **403** | Forbidden | User terautentikasi tapi tidak punya hak akses ke resource |
| **404** | Not Found | Endpoint URL tidak ada atau ID resource tidak ditemukan di DB |
| **409** | Conflict | Duplikat data yang harus unik (email / nomor identifikasi sudah terdaftar di register) |
| **422** | Unprocessable Entity | **Reserved** — belum ada endpoint yang menghasilkan 422; validasi DTO → 400, konflik bisnis → 409 |
| **429** | Too Many Requests | Rate limit terlampaui (global 100 req/menit; `/auth/login` 5/60s; `/auth/refresh` 60/60s) |
| **500** | Internal Server Error | Unhandled exception / crash internal server |

---

## 4. Konvensi Data & Keamanan

### Format Tanggal

Semua field tanggal/waktu wajib ISO 8601 UTC:

```
"created_at": "2026-08-11T05:26:55Z"
```

### Naming Convention

- JSON field: **snake_case** konsisten di seluruh response
- Exception yang disepakati: `refreshToken` di auth endpoint (camelCase — lihat `ARCHITECTURE.md`)

### Data Leakage Protection

Hapus semua field sensitif sebelum dikirim ke client:

```
password · password_hash · otp_secret · refresh_token_hash · deletedAt · internal DB keys
```

Mekanisme perlindungan berlapis:
- Field sensitif (mis. `password`) dideklarasikan `select: false` di entity — tidak pernah keluar dari query.
- `ResponseInterceptor` membuang key internal `deletedAt` secara global sebelum envelope dikirim.

---

## 5. Menulis Endpoint Baru — Checklist

Gunakan checklist ini setiap kali menambah endpoint:

- [ ] URL menggunakan plural noun + kebab-case + prefix `/api/v1/`
- [ ] HTTP method sesuai tabel pemetaan di Section 1
- [ ] Controller return plain object — biarkan `ResponseInterceptor` yang membungkus
- [ ] Tambahkan `@ResponseMessage('...')` di setiap handler
- [ ] POST create → pastikan return status `201`
- [ ] Error condition → lempar `HttpException` yang tepat, bukan return `{ success: false }`
- [ ] Field tanggal menggunakan ISO 8601 UTC
- [ ] Tidak ada field sensitif di response
- [ ] Endpoint yang bypass envelope → gunakan `@BypassTransform()`
- [ ] Update `openapi.json` via `npm run openapi:generate`

---

## 6. Inventaris Endpoint

Base URL: `/api/v1`. Total: **52 operation / 32 path**.

### Auth

| Method | Path | Status | Meta |
|--------|------|:------:|:----:|
| POST | `/auth/register` | 201 | — |
| POST | `/auth/login` | 200 | — |
| POST | `/auth/refresh` | 200 | — |
| POST | `/auth/logout` | 200 | — |
| GET | `/auth/profile` | 200 | — |

### Users

| Method | Path | Status | Meta |
|--------|------|:------:|:----:|
| GET | `/users` | 200 | ✅ |
| GET | `/users/:id` | 200 | — |
| PATCH | `/users/:id/role` | 200 | — |
| DELETE | `/users/:id` | 200 | — |

### Books

| Method | Path | Status | Meta |
|--------|------|:------:|:----:|
| POST | `/books` | 201 | — |
| GET | `/books` | 200 | ✅ |
| GET | `/books/:id` | 200 | — |
| PATCH | `/books/:id` | 200 | — |
| DELETE | `/books/:id` | 200 | — |
| POST | `/books/items` | 201 | — |
| GET | `/books/:id/items` | 200 | — |
| POST | `/books/bulk` | 201 | — |

### Reference Data (Categories / Authors / Publishers / Languages)

Pola yang sama berlaku untuk keempat module ini:

| Method | Path | Status | Meta |
|--------|------|:------:|:----:|
| GET | `/{resource}` | 200 | ✅ |
| POST | `/{resource}` | 201 | — |
| GET | `/{resource}/:id` | 200 | — |
| PATCH | `/{resource}/:id` | 200 | — |
| DELETE | `/{resource}/:id` | 200 | — |

`{resource}` = `categories` · `authors` · `publishers` · `languages`

### Articles

| Method | Path | Status | Meta |
|--------|------|:------:|:----:|
| GET | `/articles` | 200 | — |
| POST | `/articles` | 201 | — |
| GET | `/articles/:id` | 200 | — |
| PATCH | `/articles/:id` | 200 | — |
| DELETE | `/articles/:id` | 200 | — |
| POST | `/articles/bulk` | 201 | — |

### Transactions

| Method | Path | Status | Meta |
|--------|------|:------:|:----:|
| POST | `/transactions/borrow` | 201 | — |
| PATCH | `/transactions/return/:barcode` | 200 | — |
| GET | `/transactions` | 200 | ✅ |
| GET | `/transactions/my-history` | 200 | ✅ |

### System

| Method | Path | Status | Meta |
|--------|------|:------:|:----:|
| GET | `/activity-logs` | 200 | ✅ |
| GET | `/dashboard/summary` | 200 | — |
| GET | `/policies` | 200 | — |
| PATCH | `/policies` | 200 | — |
| GET | `/health` | 200 | — |

---

## 7. Quick Reference

```
┌─────────────────────────────────────────────┐
│  SINGLE DATA (no meta)                      │
│  { success, message, data: {} }             │
├─────────────────────────────────────────────┤
│  LIST DATA (with meta)                      │
│  { success, message, data: [], meta: {} }   │
├─────────────────────────────────────────────┤
│  ERROR                                      │
│  { success, message, error: {code,details} }│
└─────────────────────────────────────────────┘

Status: POST create → 201 · Semua error → jangan 200
Field: snake_case · Tanggal: ISO 8601 UTC
Sensitif: strip sebelum response
```