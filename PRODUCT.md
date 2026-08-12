# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Anggota (peminjam buku), Pustakawan (pengelola data), dan Admin (manajemen sistem).

## Product Purpose
Menyediakan layanan backend API terpusat untuk sistem manajemen perpustakaan. Bertujuan untuk mengotomatisasi sirkulasi peminjaman, pencarian inventaris buku, dan manajemen keanggotaan secara efisien.

## Positioning
Standardisasi REST API yang sangat ketat dengan arsitektur *response envelope* tunggal, memastikan integrasi yang konsisten, aman, dan type-safe dengan sistem frontend atau klien pihak ketiga manapun.

## Operating Context
Diakses melalui aplikasi klien web/mobile. Alur kerja mencakup pencatatan keanggotaan, proses peminjaman & pengembalian buku, perhitungan denda, serta audit log sistem.

## Capabilities and Constraints
- Manajemen inventaris buku & pengguna (CRUD).
- Autentikasi dan Otorisasi berbasis JWT.
- **Batasan**: Wajib mengikuti format response dan strict HTTP status code yang tercatat dalam `API_STANDARDS.md`.

## Evidence on Hand
- Dokumentasi arsitektur dan standardisasi API (`API_STANDARDS.md`).
- Basis kode backend yang telah berjalan menggunakan NestJS dan TypeORM.

## Product Principles
- **API-First Design**: Semua fitur dirancang dari perspektif API kontrak.
- **Strict Error Handling**: Validasi penuh pada level sistem sebelum merespon dengan status code HTTP yang presisi.
- **Konsistensi Data**: Response JSON harus selalu mengikuti pola envelope yang telah disepakati (data tunggal tanpa meta, paginasi wajib pakai meta).
