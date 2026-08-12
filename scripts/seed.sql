-- ============================================================
-- SEED DATA Perpustakaan (PostgreSQL)
-- Jalankan: psql -h localhost -U perpustakaan -d perpustakaan -f scripts/seed.sql
-- Dummy password:
--   admin@perpustakaan.id -> admin123
--   staff@perpustakaan.id -> staff123
--   semua user lainnya     -> password123
-- ============================================================

BEGIN;

-- Reset urutan: hapus data lama sesuai urutan FK
DELETE FROM transactions;
DELETE FROM book_items;
DELETE FROM book_authors;
DELETE FROM books;
DELETE FROM articles;
DELETE FROM refresh_sessions;
DELETE FROM activity_logs;
DELETE FROM users;
DELETE FROM authors;
DELETE FROM publishers;
DELETE FROM languages;
DELETE FROM categories;

SELECT setval(pg_get_serial_sequence('users', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('authors', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('publishers', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('languages', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('categories', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('books', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('book_items', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('transactions', 'id'), 1, false);
SELECT setval(pg_get_serial_sequence('articles', 'id'), 1, false);

-- ============================ CATEGORIES ============================
INSERT INTO categories (id, name) VALUES
  (1, 'Fiksi'),
  (2, 'Non-Fiksi'),
  (3, 'Sains'),
  (4, 'Teknologi'),
  (5, 'Sejarah'),
  (6, 'Biografi'),
  (7, 'Anak'),
  (8, 'Komik');

-- ============================ LANGUAGES ============================
INSERT INTO languages (id, name, code) VALUES
  (1, 'Indonesia', 'id'),
  (2, 'Inggris', 'en'),
  (3, 'Jawa', 'jv'),
  (4, 'Arab', 'ar'),
  (5, 'Jepang', 'ja'),
  (6, 'Mandarin', 'zh');

-- ============================ PUBLISHERS ============================
INSERT INTO publishers (id, name, address) VALUES
  (1, 'Gramedia Pustaka Utama', 'Jakarta Pusat, DKI Jakarta'),
  (2, 'Bentang Pustaka', 'Yogyakarta, DI Yogyakarta'),
  (3, 'Penerbit Erlangga', 'Jakarta Timur, DKI Jakarta'),
  (4, 'Mizan Pustaka', 'Bandung, Jawa Barat'),
  (5, 'Republika Penerbit', 'Jakarta Selatan, DKI Jakarta'),
  (6, 'Elex Media Komputindo', 'Jakarta Barat, DKI Jakarta'),
  (7, 'Pustaka Jaya', 'Jakarta Pusat, DKI Jakarta'),
  (8, 'Andi Offset', 'Yogyakarta, DI Yogyakarta'),
  (9, 'Diva Press', 'Bantul, DI Yogyakarta'),
  (10, 'Balai Pustaka', 'Jakarta Timur, DKI Jakarta');

-- ============================ AUTHORS ============================
INSERT INTO authors (id, name, bio) VALUES
  (1, 'Andrea Hirata', 'Penulis asal Belitung, terkenal lewat novel Laskar Pelangi.'),
  (2, 'Tere Liye', 'Penulis produktif asal Sumatera Selatan, karya fiksi populer.'),
  (3, 'Dewi Lestari', 'Penulis, pencipta lagu, dan penyanyi, dikenal lewat trilogi Supernova.'),
  (4, 'Pramoedya Ananta Toer', 'Sastrawan besar Indonesia, penulis Tetralogi Buru.'),
  (5, 'J.K. Rowling', 'Penulis Inggris, pencipta seri Harry Potter.'),
  (6, 'George Orwell', 'Penulis Inggris, karya terkenal 1984 dan Animal Farm.'),
  (7, 'Haruki Murakami', 'Novelis Jepang, karya surrealisme dan realisme magis.'),
  (8, 'Yuval Noah Harari', 'Sejarawan Israel, penulis Sapiens.'),
  (9, 'Napoleon Hill', 'Penulis buku pengembangan diri asal Amerika.'),
  (10, 'Fiersa Besari', 'Penulis, musisi, dan pegiat literasi asal Bandung.'),
  (11, 'Eka Kurniawan', 'Penulis asal Tasikmalaya, karya diterjemahkan ke banyak bahasa.'),
  (12, 'Sapardi Djoko Damono', 'Penyair dan sastrawan Indonesia, penulis Hujan Bulan Juni.'),
  (13, 'Ayu Utami', 'Penulis novel Saman, perintis sastra kontemporer Indonesia.'),
  (14, 'Ahmad Fuadi', 'Penulis Negeri 5 Menara, berlatar pesantren.'),
  (15, 'Seno Gumira Ajidarma', 'Cerpenis dan penulis drama Indonesia.');

-- ============================ USERS ============================
-- password: admin123 / staff123 / password123 (bcrypt)
INSERT INTO users (id, identification_number, email, password, full_name, role, category) VALUES
  (1, '1990010101', 'admin@perpustakaan.id', '$2b$10$1lcCkNxbCqt2SXd29QUU8eyzeLCcDIQWeEG3D19DNUls3F0Pu4oze', 'Administrator Utama', 'SUPER_ADMIN', 'LIBRARY_STAFF'),
  (2, '1995010101', 'staff@perpustakaan.id', '$2b$10$MFLm0sqqVcjPTH67thk8IOEbH32cYfL3hPIjyBKs16QX3tT5kB866', 'Siti Rahmawati', 'STAFF', 'LIBRARY_STAFF'),
  (3, '2023100101', 'budi.santoso@student.ac.id', '$2b$10$AzlGbKEEmQmv0euwvi3oAOM8djB3LXqFxhr.Osq1Pth8bFb3WhlTe', 'Budi Santoso', 'USER', 'STUDENT'),
  (4, '2023100102', 'dewi.anggraini@student.ac.id', '$2b$10$AzlGbKEEmQmv0euwvi3oAOM8djB3LXqFxhr.Osq1Pth8bFb3WhlTe', 'Dewi Anggraini', 'USER', 'STUDENT'),
  (5, '2023100103', 'rudi.hermawan@student.ac.id', '$2b$10$AzlGbKEEmQmv0euwvi3oAOM8djB3LXqFxhr.Osq1Pth8bFb3WhlTe', 'Rudi Hermawan', 'USER', 'STUDENT'),
  (6, '2023100104', 'sari.wulandari@student.ac.id', '$2b$10$AzlGbKEEmQmv0euwvi3oAOM8djB3LXqFxhr.Osq1Pth8bFb3WhlTe', 'Sari Wulandari', 'USER', 'STUDENT'),
  (7, '2023100105', 'agus.prasetyo@student.ac.id', '$2b$10$AzlGbKEEmQmv0euwvi3oAOM8djB3LXqFxhr.Osq1Pth8bFb3WhlTe', 'Agus Prasetyo', 'USER', 'STUDENT'),
  (8, '2023100106', 'rina.kusuma@student.ac.id', '$2b$10$AzlGbKEEmQmv0euwvi3oAOM8djB3LXqFxhr.Osq1Pth8bFb3WhlTe', 'Rina Kusuma', 'USER', 'STUDENT'),
  (9, '2023100107', 'fajar.nugroho@student.ac.id', '$2b$10$AzlGbKEEmQmv0euwvi3oAOM8djB3LXqFxhr.Osq1Pth8bFb3WhlTe', 'Fajar Nugroho', 'USER', 'STUDENT'),
  (10, '2023100108', 'laila.maharani@student.ac.id', '$2b$10$AzlGbKEEmQmv0euwvi3oAOM8djB3LXqFxhr.Osq1Pth8bFb3WhlTe', 'Laila Maharani', 'USER', 'STUDENT'),
  (11, '1985123401', 'dr.handoko@lecturer.ac.id', '$2b$10$AzlGbKEEmQmv0euwvi3oAOM8djB3LXqFxhr.Osq1Pth8bFb3WhlTe', 'Dr. Handoko Wijaya', 'USER', 'LECTURER'),
  (12, '1980123402', 'prof.nurjanah@lecturer.ac.id', '$2b$10$AzlGbKEEmQmv0euwvi3oAOM8djB3LXqFxhr.Osq1Pth8bFb3WhlTe', 'Prof. Nurjanah', 'USER', 'LECTURER');

-- ============================ BOOKS ============================
INSERT INTO books (id, title, sub_title, isbn_13, isbn_10, published_year, description, image_url, category_id, publisher_id, language_id) VALUES
  (1, 'Laskar Pelangi', 'Novel', '9789793062792', '9793062797', 2005, 'Kisah anak-anak Belitung yang gigih mengejar mimpi lewat pendidikan.', NULL, 1, 2, 1),
  (2, 'Sang Pemimpi', NULL, '9789791141750', '9791141754', 2006, 'Sekuel Laskar Pelangi, perjuangan dua bersaudara meraih beasiswa.', NULL, 1, 2, 1),
  (3, 'Bumi', 'Serial Bumi', '9786020309387', '6020309386', 2014, 'Novel fantasi petualangan Raib, Seli, dan Ali.', NULL, 1, 1, 1),
  (4, 'Supernova: Kesatria, Putri, dan Bintang Jatuh', NULL, '9789792261851', '9792261855', 2001, 'Novel populer pembuka trilogi Supernova.', NULL, 1, 1, 1),
  (5, 'Bumi Manusia', 'Tetralogi Buru', '9789799731235', '9799731237', 1980, 'Kisah Minke, pribumi terdidik di masa kolonial.', NULL, 5, 7, 1),
  (6, 'Harry Potter and the Sorcerer''s Stone', NULL, '9780439708180', '0439708184', 1997, 'Awal petualangan Harry Potter di Hogwarts.', NULL, 1, 1, 2),
  (7, '1984', NULL, '9780451524935', '0451524934', 1949, 'Distopia klasik tentang pengawasan totaliter.', NULL, 1, 1, 2),
  (8, 'Norwegian Wood', NULL, '9780375704024', '0375704027', 1987, 'Novel cinta dan kehilangan karya Murakami.', NULL, 1, 1, 2),
  (9, 'Sapiens: A Brief History of Humankind', NULL, '9780062316097', '0062316095', 2011, 'Sejarah besar peradaban manusia.', NULL, 3, 1, 2),
  (10, 'Think and Grow Rich', NULL, '9781585424337', '1585424331', 1937, 'Buku klasik pengembangan diri dan kesuksesan.', NULL, 2, 3, 2),
  (11, 'Arah Langkah', 'Serial Arah', '9786022912254', '6022912255', 2019, 'Fiersa Besari bercerita tentang perjalanan dan kehilangan.', NULL, 1, 2, 1),
  (12, 'Cantik Itu Luka', NULL, '9786022913688', '6022913688', 2002, 'Novel magis-realisme karya Eka Kurniawan.', NULL, 1, 9, 1),
  (13, 'Hujan Bulan Juni', 'Puisi', '9789794615962', '9794615964', 1994, 'Kumpulan puisi klasik Sapardi.', NULL, 2, 7, 1),
  (14, 'Saman', NULL, '9789794165504', '9794165500', 1998, 'Novel fenomenal Ayu Utami.', NULL, 1, 7, 1),
  (15, 'Negeri 5 Menara', NULL, '9789791440150', '9791440151', 2009, 'Impian enam santri meraih mimpi dari pesantren.', NULL, 1, 2, 1),
  (16, 'Dunia Sophie', 'Novel Filsafat', '9789796733866', '9796733867', 1991, 'Pengantar filsafat lewat novel karya Jostein Gaarder.', NULL, 2, 3, 1),
  (17, 'Algoritma dan Pemrograman Dasar', NULL, '9789792941724', '9792941725', 2016, 'Buku teks dasar-dasar algoritma untuk mahasiswa.', NULL, 4, 8, 1),
  (18, 'Basis Data Modern', NULL, '9786022893332', '6022893331', 2018, 'Pengantar perancangan dan manajemen basis data.', NULL, 4, 8, 1),
  (19, 'Ensiklopedia Sains untuk Anak', NULL, '9789792243932', '9792243930', 2010, 'Ensiklopedia sains bergambar untuk anak sekolah dasar.', NULL, 7, 3, 1),
  (20, 'One Piece Vol. 1', 'Romance Dawn', '9786020337519', '6020337514', 1997, 'Petualangan Monkey D. Luffy mencari One Piece.', NULL, 8, 6, 1);

-- ============================ BOOK AUTHORS ============================
INSERT INTO book_authors (book_id, author_id) VALUES
  (1, 1), (2, 1), (3, 2), (4, 3), (5, 4),
  (6, 5), (7, 6), (8, 7), (9, 8), (10, 9),
  (11, 10), (12, 11), (13, 12), (14, 13), (15, 14),
  (16, 3), (17, 2), (18, 2), (19, 12), (20, 15);

-- ============================ BOOK ITEMS ============================
INSERT INTO book_items (id, barcode, status, condition, book_id) VALUES
  (1,  'BK-000001', 'AVAILABLE', 'GOOD',               1),
  (2,  'BK-000002', 'AVAILABLE', 'GOOD',               1),
  (3,  'BK-000003', 'AVAILABLE', 'SLIGHTLY_DAMAGED',   2),
  (4,  'BK-000004', 'BORROWED',  'GOOD',               3),
  (5,  'BK-000005', 'AVAILABLE', 'GOOD',               4),
  (6,  'BK-000006', 'AVAILABLE', 'HEAVILY_DAMAGED',    5),
  (7,  'BK-000007', 'BORROWED',  'GOOD',               6),
  (8,  'BK-000008', 'AVAILABLE', 'GOOD',               7),
  (9,  'BK-000009', 'AVAILABLE', 'GOOD',               8),
  (10, 'BK-000010', 'BORROWED',  'GOOD',               9),
  (11, 'BK-000011', 'AVAILABLE', 'GOOD',               10),
  (12, 'BK-000012', 'LOST',      'GOOD',               11),
  (13, 'BK-000013', 'AVAILABLE', 'GOOD',               12),
  (14, 'BK-000014', 'DAMAGED',   'HEAVILY_DAMAGED',    13),
  (15, 'BK-000015', 'AVAILABLE', 'GOOD',               14),
  (16, 'BK-000016', 'AVAILABLE', 'GOOD',               15),
  (17, 'BK-000017', 'BORROWED',  'GOOD',               16),
  (18, 'BK-000018', 'AVAILABLE', 'GOOD',               17),
  (19, 'BK-000019', 'AVAILABLE', 'GOOD',               18),
  (20, 'BK-000020', 'AVAILABLE', 'GOOD',               19),
  (21, 'BK-000021', 'AVAILABLE', 'GOOD',               20),
  (22, 'BK-000022', 'BORROWED',  'GOOD',               20),
  (23, 'BK-000023', 'AVAILABLE', 'GOOD',               6),
  (24, 'BK-000024', 'AVAILABLE', 'SLIGHTLY_DAMAGED',   8);

-- ============================ TRANSACTIONS ============================
INSERT INTO transactions (id, user_id, book_item_id, borrowed_at, due_date, returned_at, fine_amount, status) VALUES
  (1, 3, 4,  '2026-07-20 09:00:00', '2026-07-27 09:00:00', NULL,                  0,    'BORROWED'),
  (2, 4, 7,  '2026-07-22 10:30:00', '2026-07-29 10:30:00', NULL,                  0,    'BORROWED'),
  (3, 5, 10, '2026-07-25 08:15:00', '2026-08-01 08:15:00', NULL,                  0,    'BORROWED'),
  (4, 6, 17, '2026-06-10 13:00:00', '2026-06-17 13:00:00', '2026-06-15 09:45:00', 0,    'RETURNED'),
  (5, 7, 1,  '2026-05-02 11:00:00', '2026-05-09 11:00:00', '2026-05-09 10:00:00', 0,    'RETURNED'),
  (6, 8, 5,  '2026-06-20 09:30:00', '2026-06-27 09:30:00', '2026-06-30 15:00:00', 15000, 'RETURNED'),
  (7, 9, 15, '2026-04-11 14:00:00', '2026-04-18 14:00:00', '2026-04-16 08:00:00', 0,    'RETURNED'),
  (8, 10, 22, '2026-07-01 10:00:00', '2026-07-08 10:00:00', NULL,                0,    'OVERDUE'),
  (9, 11, 3,  '2026-07-05 09:00:00', '2026-07-12 09:00:00', '2026-07-11 13:00:00', 0,    'RETURNED'),
  (10, 12, 8, '2026-07-18 10:00:00', '2026-07-25 10:00:00', NULL,                0,    'BORROWED');

-- ============================ ARTICLES ============================
INSERT INTO articles (id, title, content, image_url, is_published, author_id, created_at, updated_at) VALUES
  (1, 'Tips Memilih Buku untuk Anak Usia Dini', 'Membangun minat baca sejak dini dimulai dari memilih buku yang tepat. Pilih buku bergambar dengan cerita sederhana dan pesan moral yang mudah dipahami. Bacakan dengan intonasi menarik agar anak antusias.', NULL, true, 2, '2026-06-01 09:00:00', '2026-06-01 09:00:00'),
  (2, 'Daftar Novel Indonesia Wajib Baca 2026', 'Dari Laskar Pelangi hingga Cantik Itu Luka, novel-novel Indonesia berikut wajib masuk daftar bacaan kamu tahun ini. Setiap karya menawarkan sudut pandang unik tentang budaya dan masyarakat Indonesia.', NULL, true, 2, '2026-06-10 10:00:00', '2026-06-11 08:30:00'),
  (3, 'Cara Efektif Belajar dengan Teknik Pomodoro', 'Teknik Pomodoro membagi waktu belajar menjadi sesi 25 menit dengan jeda istirahat 5 menit. Metode ini terbukti meningkatkan fokus dan mengurangi kelelahan mental.', NULL, true, 1, '2026-06-15 11:00:00', '2026-06-15 11:00:00'),
  (4, 'Mengenal Sejarah Perpustakaan di Indonesia', 'Perpustakaan tertua di Indonesia bermula dari masa kolonial. Sejak itu, perpustakaan berkembang menjadi pusat literasi masyarakat.', NULL, true, 2, '2026-07-01 08:00:00', '2026-07-02 09:00:00'),
  (5, 'Resensi: Sapiens – Yuval Noah Harari', 'Buku ini mengajak pembaca menelusuri perjalanan Homo sapiens dari era pemburu hingga dominasi dunia modern. Ditulis ringan namun mendalam.', NULL, true, 1, '2026-07-10 13:00:00', '2026-07-10 13:00:00'),
  (6, 'Program Perpustakaan Keliling: Membawa Buku ke Desa', 'Perpustakaan keliling hadir menjangkau daerah terpencil. Program ini meningkatkan minat baca masyarakat pedesaan secara signifikan.', NULL, false, 2, '2026-07-20 09:00:00', '2026-07-20 09:00:00');

COMMIT;
