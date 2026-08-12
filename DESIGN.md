# Perpustakaan API v2 — Design

Dokumen desain sistem: reasoning di balik keputusan arsitektur, standar kepatuhan, dan metrik refactoring.

> Dokumen ini menjawab pertanyaan **"kenapa"** — bukan "apa" atau "bagaimana". Untuk implementasi teknis, lihat `ARCHITECTURE.md`. Untuk konvensi endpoint, lihat `API_STANDARDS.md`.

---

## 1. Prinsip Desain

Lima prinsip yang menjadi landasan setiap keputusan teknis di project ini:

| Prinsip | Implikasi Konkret |
|---------|------------------|
| **Fail-fast over silent failure** | Env invalid → server tidak start. Config hilang → exception saat bootstrap, bukan saat runtime. |
| **Global over local** | Interceptor, filter, dan rate-limit didaftarkan sebagai `APP_*` provider. Guard JWT/RBAC justru **per-controller** via `@UseGuards(...)` — keputusan eksplisit agar route publik (login, register, GET books/articles, health) bisa hidup tanpa guard global dan tanpa magic `@Public()` |
| **Explicit over implicit** | Soft delete dikodekan eksplisit di entity dan query. Bypass envelope dikodekan eksplisit via `@BypassTransform()`. Tidak ada magic yang tidak terdokumentasi. |
| **Isolation of concerns** | Audit log tidak boleh mempengaruhi HTTP response. Dashboard query dipisah dari service. Listener tidak tahu siapa yang emit. |
| **Type safety as constraint** | `any` adalah compile error, bukan warning. Enum adalah single source of truth — tidak ada string literal yang tersebar. |

---

## 2. Keputusan Arsitektur & Reasoning

### 2.1 TypeORM bukan Prisma

TypeORM dipilih karena:
- Kompatibilitas penuh dengan decorator-based entity yang selaras dengan pattern NestJS
- `DataSource` tersedia langsung untuk raw transaction (`dataSource.transaction`) tanpa abstraksi tambahan
- Partial unique index via raw SQL migration — Prisma pada saat implementasi belum mendukung ini secara native

**Tradeoff yang diterima**: TypeORM lebih verbose untuk relasi kompleks dan type inference-nya lebih lemah dibanding Prisma. Acceptable untuk skala project ini.

---

### 2.2 EventEmitter2 bukan Bull/BullMQ untuk Audit Log

Audit log menggunakan `EventEmitter2` in-process, bukan message queue eksternal.

**Alasan**:
- Audit log bersifat non-critical — kehilangan satu event karena crash tidak mempengaruhi integritas data bisnis
- Tidak ada requirement untuk retry, dead letter queue, atau distributed processing
- Bull/BullMQ menambah dependency Redis yang belum ada di stack, menambah operational overhead tanpa benefit nyata di skala ini

**Batas validitas keputusan ini**: Jika audit log mulai dipakai untuk compliance reporting, regulatory audit, atau billing — migrate ke queue dengan durability guarantee.

---

### 2.3 Opaque SHA-256 bukan JWT untuk Refresh Token

Refresh token disimpan sebagai hash SHA-256 di DB, bukan sebagai JWT stateless.

**Alasan**:
- JWT refresh token tidak bisa di-revoke secara individual tanpa blocklist — ini masalah keamanan fundamental
- Opaque token memungkinkan revoke per-session (logout satu device) dan revoke seluruh session (deteksi replay attack)
- Hash di DB berarti token asli tidak pernah disimpan — bocornya DB tidak mengekspos token aktif

**Tradeoff yang diterima**: Setiap refresh request membutuhkan satu DB lookup. Acceptable — refresh jarang terjadi dibanding request normal.

---

### 2.4 Grace Period pada Refresh Rotation

Saat refresh token dirotasi, token lama masih valid selama window `REFRESH_GRACE_SECONDS`.

**Alasan**: Aplikasi frontend modern sering mengirim multiple concurrent request saat token mendekati expiry. Tanpa grace period, request paralel pertama akan merotasi token — semua request berikutnya dalam milidetik yang sama akan ditolak karena token sudah invalid.

**Risiko**: Window grace memperlebar peluang replay attack. Mitigasi: replay setelah grace period → revoke seluruh session, bukan hanya token yang bersangkutan.

**Panduan konfigurasi**:
- Aplikasi mobile / slow connection: 20–30 detik
- Aplikasi web / fast connection: 10–15 detik
- Jangan set di bawah 5 detik — tidak efektif. Jangan set di atas 60 detik — window terlalu lebar.
- **Catatan implementasi**: code mem-clamp nilai env ke rentang 10–30 detik (`auth.service.ts`), sehingga nilai di luar rentang itu akan dikoreksi otomatis.

---

### 2.5 Soft Delete + Partial Unique Index

Hard delete tidak dipakai pada **User, Book, dan BookItem** karena:
- Transaksi peminjaman historis harus tetap readable meski user/buku sudah dihapus
- FK constraint akan diviolate jika record yang direferensi di-hard delete

> **Catatan**: Entity referensi (authors, categories, publishers, languages) TIDAK memakai soft delete — `BaseCrudService.remove` melakukan hard delete. Tradeoff yang diterima: menghapus referensi yang masih dipakai book akan gagal (FK violation) — ini sengaja, referensi didelete hanya saat sudah tidak dirujuk.

Partial unique index dipilih daripada kolom `is_active`:
- Index lebih efisien — hanya row aktif yang diindeks
- Semantik lebih bersih — `deleted_at IS NULL` sudah cukup, tidak perlu kolom tambahan
- Email dan nomor identifikasi bisa dipakai ulang setelah soft delete tanpa konflik

---

### 2.6 BaseCrudService Generic

Sebelum refactoring, empat module referensi (authors, categories, publishers, languages) masing-masing punya implementasi CRUD identik. Ini bukan DRY violation biasa — perubahan di satu module (misal: tambah field di pagination response) harus direplikasi manual ke tiga module lain.

`BaseCrudService<T>` menyelesaikan ini dengan generic yang type-safe. Subclass hanya perlu inject repository dan opsional override method yang memang berbeda.

**Constraint desain**: `T extends ObjectLiteral & { id: number }` — semua entity yang extend base ini wajib punya primary key `id` bertipe `number`. Ini keputusan yang disengaja untuk menjaga simplicity base service.

---

## 3. Standar Kepatuhan

### 3.1 REST API

| Aspek | Status | Catatan |
|-------|:------:|---------|
| Versioning `/api/v1` | ✅ | Semua endpoint |
| Plural + kebab-case URL | ✅ | |
| Resource hierarchy | ✅ | `/books/:id/items` |
| HTTP method mapping | ✅ | |
| Single response tanpa `meta` | ✅ | Auto-strip di `ResponseInterceptor` |
| List paginated dengan `meta` snake_case | ✅ | |
| Error envelope `{code, details}` | ✅ | |
| POST create → 201, error ≠ 200 | ✅ | |
| ISO 8601 UTC untuk semua tanggal | ✅ | Normalisasi Date di interceptor |
| snake_case konsisten di JSON | ✅ | Exception: `refreshToken` (disepakati) & `accessToken` di `/auth/refresh` |
| Data leakage protection | ✅ | Field sensitif di-hidden via `select: false` di entity + interceptor buang key internal `deletedAt` |

### 3.2 Arsitektur & Kode

| Aspek | Status | Catatan |
|-------|:------:|---------|
| Global transformer via `APP_INTERCEPTOR` | ✅ | |
| Auto meta-handling (list vs single) | ✅ | |
| Bypass mechanism `@BypassTransform()` | ✅ | |
| Global exception filter `APP_FILTER` | ✅ | |
| OpenAPI sinkron dengan implementasi | ✅ | 32 path |
| `@ResponseMessage` di semua endpoint | ✅ | |
| Zero `any` type | ✅ | Enforced via ESLint strict |
| 100% DI via `APP_*` provider | ✅ | Tidak ada `new` manual di `main.ts` |
| Fail-fast env validation | ✅ | Bootstrap abort jika env invalid |

---

## 4. Metrik Refactoring

Perubahan kuantitatif dari versi sebelumnya:

| Area | Sebelum | Sesudah | Dampak |
|------|---------|---------|--------|
| Duplikasi CRUD | ~600 LOC | ~150 LOC | −75% via `BaseCrudService` |
| Bulk create relasi | N+1 query | 4 query paralel + 1 transaction | Eliminasi N+1 |
| Audit log | Floating promise (fire and forget tanpa error boundary) | `@OnEvent` async + isolated try-catch | Error tidak merambat ke response |
| Delete strategy | Hard delete | Soft delete + partial unique index | Integritas historis terjaga |
| Auth token delivery | JWT di response body | HttpOnly cookie | Token tidak accessible via JS |
| Refresh token | Stateless JWT (tidak revocable) | Opaque hash di DB + rotation | Per-session revoke |
| DI pattern | Manual `new` di beberapa tempat | 100% `APP_*` provider | Konsistensi + testability |
| Type safety | `any` tersebar, beberapa ESLint rule di-disable | Strict lint, zero `any` | Eliminasi runtime type error |
| Test coverage | 2 module tidak tercakup | 35 suite, 254 unit test, 16 e2e | Full coverage |

---

## 5. Batas & Limitasi yang Diketahui

Ini bukan bug — ini keputusan yang sudah dipertimbangkan dan batas validitasnya terdokumentasi.

| Limitasi | Konteks | Kapan Perlu Ditinjau Ulang |
|----------|---------|---------------------------|
| Audit log non-durable (EventEmitter2) | Event hilang jika server crash saat processing | Jika audit log dipakai untuk compliance / regulatory |
| Dashboard cache TTL hardcoded 60s | Tidak ada invalidasi berbasis data change yang granular | Jika data realtime menjadi requirement |
| `BaseCrudService` hanya support `id: number` | UUID primary key tidak kompatibel | Jika ada module baru dengan UUID PK |
| Grace period refresh token adalah config, bukan adaptive | Tidak menyesuaikan diri dengan traffic pattern | Jika ada masalah false logout di production |
| Fase 6 (campus API adapter) belum diimplementasi | Menunggu format API kampus tersedia | Saat format API kampus dikonfirmasi |