# Backlog — Refactoring Backend Perpustakaan API v2

Sumber: `PRD_Refactory_BE.md`. Struktur folder sudah domain-based (kebab-case).

## Fase & Urutan Eksekusi

Eksekusi wajib berurutan fase: **P0 → P1 → P2 → P3 → P4 → P5 → P6 → P7**.
Jangan kerjakan P2 (soft delete) paralel dengan P5 (auth) karena session lookup bergantung pada perilaku user terhapus.

## Keputusan Kontrak (Decide First — Blocking)

Task kontrak wajib diputuskan sebelum eksekusi dimulai:

1. **Lokasi refresh token**: **body** (sesuai contoh PRD §2.2 — `request.body.refreshToken`). Access token via cookie HttpOnly `auth_token`.
2. **Migrasi nilai enum DB**: `BAIK|RUSAK_RINGAN|RUSAK_BERAT` → `GOOD|SLIGHTLY_DAMAGED|HEAVILY_DAMAGED`. API contract & OpenAPI diupdate di T44.
3. **Cakupan soft delete Book**: `deleted_at` Book ikut menonaktifkan seluruh `book_items`-nya (soft cascade manual, bukan FK fisik).
4. **Registrasi ulang**: email **dan** `identification_number` user lama boleh dipakai ulang via partial unique index (`deleted_at IS NULL`).

### Status Pekerjaan

- [x] **P0 — Baseline & Kontrak** (baseline: unit 197/197 ✅, e2e 8/11 ❌ 3 fail = bug test, build 1 error `app.set`, 24 spec files)

## P0 — Baseline & Kontrak

- [x] **T01 — Rekam baseline kualitas** (build 1 error `app.set` TS; unit 197 ✅; e2e 8/11, 3 fail di transactions karena test kirim `user_id` — whitelist tolak; lint 2 prettier; coverage 24 suite)
- [x] **T02 — Tetapkan kontrak autentikasi** — refresh token di body, access di cookie HttpOnly.
- [x] **T03 — Tetapkan strategi kompatibilitas enum** — nilai DB dimigrasi ke Inggris.
- [x] **T04 — Tetapkan perilaku soft delete** — cascade soft Book→items; email & identification_number partial-unique.

## P1 — Fondasi Konfigurasi

- [x] **T05 — Tambah & pin dependency PRD** — `@nestjs/event-emitter`, `@nestjs/cache-manager`, `cache-manager`, `@nestjs/terminus`, `cookie-parser`; `@nestjs/mapped-types` → `^2.1.1`.
- [x] **T06 — Validasi environment fail-fast** — `env.validation.ts` (JWT_SECRET ≥32, DB_USER/PASSWORD/NAME wajib).
- [x] **T07 — Satukan konfigurasi database** — `buildDatabaseConfig()` dipakai runtime & CLI; port fallback 5432; synchronize=false di production.
- [x] **T08 — Dukungan SSL PostgreSQL (`DB_SSL`)** — `ssl.rejectUnauthorized` via `DB_SSL_REJECT_UNAUTHORIZED`.
- [x] **T09 — Bootstrap & global DI 100%** — `APP_GUARD`/`APP_INTERCEPTOR`(×2)/`APP_FILTER` di AppModule; `main.ts` bersih; `NestExpressApplication` (build fix).
- [x] **T10 — CORS & cookie header** — CORS origin eksplisit + credentials; `cookie.config.ts` helper (COOKIE_DOMAIN, Secure/SameSite/Path).

## P2 — Integritas Data (Soft Delete & Enum)

- [x] **T11 — Standarkan enum buku** — BookCondition English; BookItem & Transaction pakai enum terpusat.
- [x] **T12 — Migrasi normalisasi enum** — `1785200000000-SoftDeleteAndEnums` (RENAME VALUE, transaksi status enum).
- [x] **T13 — Kolom `deleted_at`** — users, books, book_items (entity + migration).
- [x] **T14 — Partial unique index** — email & identification_number aktif-only.
- [x] **T15 — Soft delete pada operasi delete** — user softDelete; book + items softDelete.
- [x] **T16 — Lindungi histori transaksi** — `withDeleted` di findAll/findByUser.
- [x] **T17 — Test integritas soft delete** — spec users/books diupdate, e2e transactions fix payload + `GOOD`.

## P3 — Perbaikan Bulk Create Books

- [x] **T18 — Dependency repository/DataSource** — Category/Publisher/Language + DataSource di BooksService & module.
- [x] **T19 — Batch validation anti N+1** — 4 query `In([...])` paralel; missing list dilaporkan.
- [x] **T20 — Atomic bulk create** — `dataSource.transaction`, relasi + join via mock repository.
- [x] **T21 — Hilangkan `as any` pada books** — `as Category/Publisher/Language`.
- [x] **T22 — Test bulk create** — happy path, duplikat ID, missing → rollback, empty payload, 1 query/tabel.

## P4 — Audit Log Event-Driven

- [x] **T23 — Event audit bertipe** — `audit-log.event.ts` (`AuditLogEvent`, `AUDIT_LOG_EVENT`, `determineAuditAction`).
- [x] **T24 — Interceptor jadi publisher** — hanya `EventEmitter2.emit`, tidak sentuh DB.
- [x] **T25 — Listener async** — `@OnEvent` + try/catch terisolasi.
- [x] **T26 — Test isolasi audit** — sukses/gagal/access-page/login; error DB tidak merambat.
- [x] **T27 — Coverage activity-logs ≥80%** — 85% stmts / 90% lines (service+controller+listener+module spec).

## P5 — Refresh Token Rotation

- [x] **T28 — Entity session/refresh token**
  Simpan session id, user, hash token aktif, hash token sebelumnya, grace expiry, expiry, revoked timestamp, metadata.
- [x] **T29 — Migrasi session**
  Index lookup session/user/expiry; jangan simpan raw refresh token.
- [x] **T30 — Pisah config access & refresh**
  Access TTL `JWT_EXPIRES_IN` (15 menit); refresh TTL `JWT_REFRESH_EXPIRES_IN`; grace `REFRESH_GRACE_SECONDS` (10–30s). Refresh token opaque (random SHA-256), bukan JWT.
- [x] **T31 — Login pakai cookie**
  Login tak lagi mengembalikan access token di body; set `auth_token` HttpOnly cookie (refreshToken tetap di body untuk rotasi).
- [x] **T32 — Refresh rotation atomic + grace period**
  Validasi hash → kunci baris session FOR UPDATE dalam transaksi → rotate token → `previous_token_hash` untuk grace 10–30 detik request paralel; replay setelah grace = revoke.
- [x] **T33 — Logout/revoke**
  Revoke session (`revoked_at`) + `clearCookie` access token.
- [x] **T34 — Update JWT strategy**
  Baca access token dari cookie `auth_token` (fallback Bearer); sebelum validasi kriptografis, user sudah dihapus → 401.
- [x] **T35 — Test auth menyeluruh**
  Unit rotation/reuse/revoke/expired + e2e rotasi-grace-logout; cover catatan cookie, token tidak muncul di body, reuse setelah grace, revoked session.

## P6 — Base CRUD & Type Safety

- [x] **T36 — Buat thin `BaseCrudService<T>`**
  Abstraksi pagination, search LIKE via `searchColumn`, `findOne`, create/update/remove; generic `TEntity extends ObjectLiteral & { id: number }`, respons tetap `data`+`meta`.
- [x] **T37 — Migrasi 4 reference service**
  authors, categories, publishers, languages = subclass tipis (≈10 LOC/service); endpoint publik tidak berubah.
- [x] **T38 — Aktifkan ESLint bertahap**
  `no-explicit-any`, `no-floating-promises`, `no-unsafe-*`, `no-unused-vars`, `unbound-method`, `require-await` → `error`; 43 pelanggaran di src dibereskan; spec pakai override khusus (mock jest).
- [x] **T39 — Audit kebab-case**
  Tidak ada pelanggaran di luar `src/migrations/*` (identitas migration dijaga).
- [x] **T40 — Regression test CRUD**
  Spec per-module (68) + spec `base-crud.service.spec.ts` (10) — pagination, search, ordering, not-found, create, update, delete.

## Phase 7 — Dashboard, Health, Dokumentasi & Quality Gate

- [ ] **T41 — Isolasi dashboard read query**
  Dedicated read-query termasuk agregasi transaksi.
- [ ] **T42 — Cache dashboard TTL 60 detik**
  Cache manager; tentukan invalidation setelah mutasi statistik.
- [ ] **T43 — Health module**
  `/api/v1/health` (app + PostgreSQL via Terminus).
- [ ] **T44 — Perbarui Swagger/OpenAPI**
  Cookie auth, refresh/logout, enum baru, soft delete behavior, health, format response.
- [ ] **T45 — Lengkapi test policy**
  Cover controller/module baru, target coverage ≥80%.
- [ ] **T46 — Final quality gate**
  `build`, lint strict, seluruh unit + E2E, migration up/down (DB kosong & berdata), 24+ spec files.

---

## Kriteria Selesai Global

| Metrik PRD | Target |
| --- | --- |
| Relasi Bulk Create | Atomic batch transaction, relasi 100% terhubung |
| Audit log | Non-blocking `@OnEvent`, bebas floating promise |
| Duplikasi CRUD | ~600 LOC → ~150 LOC base service |
| Delete data | Soft delete User/Book/Item + partial unique index |
| Auth | HttpOnly cookie + refresh rotation + grace period |
| DI global | 100% `APP_*` provider |
| Type safety | Lint strict: `no-floating-promises` & `no-explicit-any` |
| Test | 100% module tercover (24+ spec), e2e lulus |

Koreksi kecil pada script di atas: kata "debounce" di T17 tidak diperlukan, dan batas minimal Line "24+ spec" sesuai PRD §4.