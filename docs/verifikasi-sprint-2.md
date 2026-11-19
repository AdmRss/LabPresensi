# LabPresensi — hasil stabilisasi Sprint 2

## Perubahan 20 November 2026

Admin yang diprovisikan melalui kanal tepercaya membuka tab **Katalog** untuk mengisi kelas, praktikum, NIM mahasiswa yang boleh dipilih asisten, serta lokasi lab. Masukkan satu NIM 14 digit per baris. Aplikasi memeriksa bahwa setiap NIM menunjuk tepat satu profil praktikan, lalu menyimpan UID. Buat akun Auth dan set profil `users/{uid}.role` ke `ADMIN` melalui Firebase Console atau proses administratif. Form registrasi publik hanya menerima Asisten dan Praktikan. Pada tab **Kelas**, Admin dapat mengedit, mengarsipkan, atau menghubungkan kelas lama ke entri katalog.

- `katalogKelas/{id}` memuat `nama`, `praktikum`, dan `pesertaUids` berupa daftar UID Firebase Auth. `lokasiPraktikum/{id}` memuat `nama`. Rules membatasi perubahan katalog pada Admin dan memvalidasi status praktikan ketika asisten menambahkannya ke roster.
- Sesi baru memuat `startAt` dan `endAt` sebagai Timestamp. Field tanggal dan jam lama tetap tersedia untuk konsumen terdahulu. Tampilan menghitung status dengan zona jadwal WIB. Firestore Rules menggunakan `request.time` untuk izin, presensi, dan penutupan manual. Sesi terjadwal berstatus efektif terbuka di antara kedua Timestamp, termasuk saat aplikasi tidak berjalan. Status otomatis tidak menulis ulang kolom `status`. Penutupan lebih awal menyimpan `DITUTUP` secara permanen.
- Sesi historis tanpa Timestamp tetap menggunakan status tersimpan. Admin perlu menautkan kelas lama ke katalog. Edit sesi lama yang belum dibuka dengan jadwal mendatang, dua jam, dan lokasi katalog agar memakai mekanisme waktu baru. Klien baru dan Firestore Rules perlu dirilis bersama setelah katalog terisi. Perubahan produksi memerlukan persetujuan PM.
- Uji Android yang masih terbuka meliputi membuka Atur Peserta, memilih dan menyimpan mahasiswa katalog, serta mengetuk kartu Jadwal lalu memeriksa detail dan tombol presensi. Validasi backend yang terkait berjalan melalui emulator lokal.

Bagian di bawah mencatat hasil pemeriksaan sebelumnya.

19 November 2026 · branch **feature/fiksasi-sprint-2**, basis **191daf4** · **READY_WITH_UNVERIFIED_RUNTIME_TESTS**

## A. Ringkasan untuk PM

Blocker pengujian F02 selesai pada emulator pembanding. Suite akhir lulus 20/20 kelompok pada lima run berturut-turut. Pada kelanjutan ini, perubahan repo terbatas pada skrip uji, laporan dan penunjuk di checkpoint. Perubahan aplikasi dan rules pada branch berasal dari tahap sebelum jeda.

Alur dua peran sudah berjalan pada Firebase Auth dan Firestore Emulator dengan rules kandidat. Asisten dapat mengatur peserta, membuat dan membuka sesi. Praktikan dapat mengirim presensi pertama atau mengajukan izin sebelum sesi dibuka. Asisten menerima pengajuan melalui listener, keputusan kembali ke praktikan, dan rekap merespons perubahan. Riwayat tetap tersedia dari klien baru sesudah kelas dan sesi diarsipkan. Bukti ini berasal dari service aplikasi, SDK sebenarnya, identitas terpisah dan data sintetis.

Branch layak direview. Demo penuh masih memerlukan interaksi pada perangkat dan klasifikasi melalui model asli pengajar. Ada konflik integrasi dengan snapshot main yang diaudit. Dasar penilaian adalah Sprint APK PBP hlm. 1–5, 7, 9–11 dan 17–18, audit F00–F08 serta masukan AS-01–AS-07. Alur Sprint 1 menggunakan identitas dan penyimpanan Firebase sesuai kelanjutan tugas pada Sprint 2.

## B. Penyelesaian temuan audit

| Temuan | Masalah awal | Perubahan | File utama | Verifikasi | Status |
|---|---|---|---|---|---|
| F01 | Baca calon dokumen memerlukan data pemilik yang belum ada | Tulis ID deterministik, query status menurut UID/sesi, cek duplikat ke server setelah write ditolak | jadwalService, submission, izinService, rules | Presensi/izin pertama berhasil. Dua klien satu UID menghasilkan satu record per operasi | FIXED_VERIFIED |
| F02 | Rekap dan Riwayat placeholder | Roster per sesi, jam, prioritas status, total, riwayat per UID | RekapTab, RiwayatTab, rekapService | Satu listener mengikuti tiga status dan dua klien. Total dan riwayat persisten teruji. Diagnosis timeout dan batas UI ada di E–G | FIXED_VERIFIED pada service |
| F03 | Tanggal/jam bebas, jam akhir bisa lebih awal | Validator create/edit dan rules kalender, format, urutan, lab | schedule, sesiService, SesiTab, rules | Kabisat, tanggal mustahil, jam invalid/kosong/sama/terbalik, jadwal valid dan penutupan legacy teruji | FIXED_VERIFIED |
| F04 | Relasi pemilik, perubahan field dan keputusan mempercayai input klien | Pemeriksaan sumber kelas/sesi, pembatasan field, edit transaksional, keputusan final | rules, sesiService, izinService | Penolakan lintas pemilik, perubahan identitas, edit vs buka, dua keputusan bersamaan | FIXED_VERIFIED |
| F05 | Hard delete memutus induk catatan | Arsip, filter sesi dan kelas aktif, pertahankan keputusan izin lama | rules, types, layanan Kelola/Jadwal/Izin | Riwayat tetap ada, pengajuan baru dibatasi, pending lama dapat diputus setelah arsip | FIXED_VERIFIED |
| F06 | Presensi lokal bisa tampak terkonfirmasi | Metadata pending, status detail terikat UID dan sesi, jam server | JadwalTab, jadwalService, rules | Putus jaringan, konfirmasi setelah reconnect, rollback saat sesi ditutup, baca record lama dari cache | FIXED_VERIFIED |
| F07 | Mock sukses tanpa URL, timeout body salah klasifikasi | Hapus hasil mock, tangani API kosong/timeout, simpan izin dengan kategori null | aiService, izinService, IzinSayaTab, .env.example | HTTP loopback dan timeout 10 detik teruji. URL asli pengajar belum tersedia | PARTIALLY_FIXED |
| F08 | Inbox tidak mengakhiri loading dan detail memakai objek lama | Akhiri loading pada setiap snapshot sukses. Pilih detail dengan ID dari daftar live | PemeriksaanIzinTab, JadwalTab | Listener dan render shell teruji. Interaksi filter, detail, dan modal belum diuji pada perangkat | FIXED_UNVERIFIED |
| F00 | Pendaftaran dapat memilih ASISTEN yang mempunyai akses ke direktori | Kebijakan tugas hlm. 18 dipertahankan | authService, rules | Akun uji sintetis. Sebelum memakai identitas mahasiswa nyata pada registrasi publik, perlu kebijakan penerbitan peran dan akses direktori | NOT_APPLICABLE untuk perubahan tugas, P0 bersyarat untuk penggunaan riil |

## C. Matriks acceptance criteria Sprint 2

Nomor merujuk butir PDF hlm. 9–11. PASS berlaku pada lapisan yang diuji. PARTIAL menunjukkan bahwa sebagian perilaku sudah dibuktikan. UNVERIFIED menandai verifikasi yang masih terbuka.

| SRS | Hasil setiap butir | Bukti dan batas |
|---|---|---|
| 001 Auth | 1 PASS · 2 PARTIAL · 3 PARTIAL · 4 UNVERIFIED · 5 PARTIAL | Registrasi dua peran, profil, login salah/benar, duplikat, email invalid dan logout diuji melalui SDK. Back dan persistensi Auth setelah proses native dihentikan masih perlu perangkat. Klien baru pada tes riwayat login kembali. |
| 002 Navigasi | 1 PASS · 2 PASS · 3 PARTIAL · 4 PASS · 5 UNVERIFIED | Render React untuk dua profil menunjukkan hanya tab masing-masing, layar login tanpa user, serta loading. Penolakan lintas peran diuji di rules. Logout otomatis untuk profil hilang dan navigasi perangkat belum diuji penuh. |
| 003 Kelas/peserta | 1 PARTIAL · 2 PASS · 3 PARTIAL · 4 UNVERIFIED · 5 PARTIAL | CRUD, scope owner, penambahan/pencabutan UID lulus. Daftar kini memakai listener. Pencarian nama/NIM, feedback form, dialog batal/hapus dan perubahan daftar di layar memerlukan uji perangkat. |
| 004 Sesi | 1 PARTIAL · 2 PASS · 3 PASS · 4 PARTIAL · 5 PARTIAL · 6 UNVERIFIED | Validasi kalender, status awal, transisi, timestamp ISO, otorisasi, transaksi dan penerimaan perubahan status lulus. Dialog buka/tutup/hapus serta pembatalan UI tertunda. |
| 005 Jadwal | 1 PARTIAL · 2 PARTIAL · 3 UNVERIFIED · 4 PARTIAL | Daftar terikat keanggotaan aktif. Listener menerima buka/tutup dari klien lain. Detail mengambil sesi terkini berdasarkan ID. Urutan multi-kelas, warna status, detail dan pesan kosong pada perangkat memerlukan uji. |
| 006 Presensi | 1 PARTIAL · 2 PASS · 3 PARTIAL · 4 PARTIAL · 5 PARTIAL | Rules memeriksa UID, roster, induk aktif dan status sesi. Field, duplikat, pending, rollback serta jam terkonfirmasi diuji. Perubahan tombol pada detail terbuka perlu uji interaksi. |
| 007 Rekap/riwayat | 1 PARTIAL · 2 PASS · 3 PASS · 4 PARTIAL · 5 PARTIAL · 6 PARTIAL | Satu listener menerima Izin lalu Hadir, total 0/2 lalu 1/2 dan jam. Berpindah subscription dan kembali mengembalikan data sesi yang benar. Riwayat hanya memuat UID sendiri, termasuk setelah login dari klien baru. Pemilihan, rendering total/kartu dan buka ulang proses native masih perlu perangkat. |
| 008 Izin | 1 PASS · 2 PASS · 3 PASS · 4 PASS · 5 PARTIAL · 6 UNVERIFIED | Pilihan sesi aktif, batas 10–500, submit tanpa AI, penyimpanan dan keputusan live teruji. State tombol dan kartu riwayat di perangkat masih terbuka. |
| 009 AI | 1 PARTIAL · 2 PASS · 3 PARTIAL · 4 PASS · 5 UNVERIFIED | HTTP lokal menguji kategori, kegagalan dan timeout saat body belum selesai. Jalur submit menyimpan null dan MENUNGGU. Pesan form, label pendukung dan model pengajar masih perlu demo. |
| 010 Pemeriksaan izin | 1 PARTIAL · 2 PASS · 3 PARTIAL · 4 PASS · 5 PASS · 6 UNVERIFIED | Inbox berfilter owner, update tiga field keputusan, finalitas dan listener praktikan diuji. Detail, konfirmasi dan filter Menunggu/Semua pada perangkat masih terbuka. |
| 011 Security/validasi | 1 PARTIAL · 2 PASS · 3 PARTIAL · 4 PASS · 5 PASS · 6 PASS · 7 PASS | Akun anonim, role, UID asing, pemilik lain, arsip, race, mapper Indonesia dan keputusan final diuji. Mode offline pada seluruh layar serta rules terpasang perlu diperiksa terpisah. |

### Matriks umpan balik asprak

| ID | Keluhan | Akar masalah | File | Bukti | Status |
|---|---|---|---|---|---|
| AS-01 | Kelola masih memakai string | Validasi tanggal/jam lemah, label kelas dari input | sesiService, schedule, rules, SesiTab | Relasi memakai ID, label dari induk, kalender diuji. Nama, NIM dan lab tetap string sesuai kontrak | FIXED_VERIFIED |
| AS-02 | Peserta tidak dapat membuka jadwal | Detail basi dan listener pada calon dokumen presensi | JadwalTab, jadwalService, submission | Sesi kelas sendiri dan event buka/tutup lintas klien. Tap detail belum diuji | FIXED_UNVERIFIED |
| AS-03 | Validasi dan tipe database kurang | Pemeriksaan nonkosong dan allow update terlalu luas | authService, schedule, sesiService, izinService, rules | Validasi tipe, hak akses, batas alasan dan kalender. Feedback tiap form perlu perangkat | FIXED_UNVERIFIED |
| AS-04 | Satu login membuka sesi bertabrakan | Transaksi lama hanya menyentuh satu dokumen sesi | schedule, sesiService, rules, types | Dua klien satu login bersaing, tepat satu berhasil. Interval berdampingan dan awal 00:00 lolos | FIXED_VERIFIED |
| AS-05 | Izin mahasiswa tidak tersimpan | Pre-read dokumen yang belum ada | izinService, IzinSayaTab, aiService, rules | Jalur submit aktual, fallback null, persistensi, duplikat, batas alasan dan keputusan lintas peran | FIXED_VERIFIED |
| AS-06 | Izin asisten tidak dapat dibuka | Loading bertahan pada snapshot sukses, konfirmasi memakai alert native | PemeriksaanIzinTab, ConfirmSheet, izinService | Render shell dan keputusan dua klien lulus. Filter, modal detail dan konfirmasi perlu perangkat | FIXED_UNVERIFIED |
| AS-07 | Rekap dan riwayat tidak tersedia | Placeholder tanpa pembacaan Firestore | RekapTab, RiwayatTab, rekapService | Perubahan pada listener yang sama, isolasi UID, jam, total, perpindahan sesi dan persistensi teruji pada service. Interaksi pada layar perlu perangkat | FIXED_VERIFIED pada service, UI UNVERIFIED |

## D. Perubahan lokal dan dampak pada data

Status Git dihitung terhadap HEAD. M menunjukkan file terlacak yang diubah. Baru menunjukkan file yang belum dilacak, termasuk pekerjaan dari sebelum jeda.

| Berkas | Git | Perubahan yang direview |
|---|---|---|
| .env.example | M | Menjelaskan URL klasifikasi AI opsional. |
| firebase.json | M | Mengatur Auth dan Firestore Emulator pada loopback. |
| firestore.rules | M | Mengikat operasi pada pemilik, identitas, lifecycle, reservasi dan waktu presensi. |
| src/components/ConfirmSheet.tsx | M | Memusatkan konfirmasi dan mencegah pengiriman ganda saat tindakan masih berjalan. |
| src/navigation/AppRouter.tsx | M | Mengikat shell ke UID agar subtree peran dibuat ulang ketika akun berganti. |
| src/lib/firebase.ts | M | Mengarahkan hanya konfigurasi dev proyek demo yang memilih emulator ke host lokal. |
| src/types.ts | M | Menambah field opsional untuk arsip, reservasi dan metadata presensi. |
| src/features/auth/AuthContext.tsx | M | Menunggu proses registrasi, membedakan profil hilang dari hasil cache, memeriksa UID saat load selesai. |
| src/features/auth/AuthScreen.tsx | M | Memakai validator kredensial bersama pada form. |
| src/features/auth/authService.ts | M | Menerapkan validasi dan mengoordinasikan pembuatan akun dengan penulisan profil. |
| src/features/ai/aiService.ts | M | Memvalidasi respons dan durasi permintaan serta mengembalikan kegagalan bila URL kosong. |
| src/features/izin/IzinSayaTab.tsx | M | Mengirim melalui service klasifikasi dan izin, menangani fallback pada form. |
| src/features/izin/PemeriksaanIzinTab.tsx | M | Menyelesaikan loading, menampilkan inbox dan mengonfirmasi keputusan. |
| src/features/izin/services/izinService.ts | M | Memvalidasi alasan dan induk, menulis izin pertama, menangani duplikat, listener dan keputusan. |
| src/features/jadwal/JadwalTab.tsx | M | Memperbarui detail dari ID sesi aktif dan menampilkan pending/konfirmasi presensi sesuai UID. |
| src/features/jadwal/services/jadwalService.ts | M | Mengikuti keanggotaan aktif, menulis waktu server, membaca waktu lama dan metadata pending. |
| src/features/jadwal/services/submission.ts | Baru | Memeriksa duplikat pada server setelah penolakan write. |
| src/features/kelola/KelolaTab.tsx | M | Mengikuti daftar kelas dan mengonfirmasi perubahan yang perlu persetujuan pengguna. |
| src/features/kelola/SesiTab.tsx | M | Memakai validasi jadwal dan konfirmasi buka/tutup/arsip. |
| src/features/kelola/kelolaService.ts | M | Membatasi kelas aktif dan memperbarui roster serta arsip kelas. |
| src/features/kelola/sesiService.ts | M | Memvalidasi induk, mengedit dan mengubah status secara transaksional, mengelola reservasi/arsip. |
| src/features/kelola/schedule.ts | Baru | Memvalidasi tanggal dan interval serta menghitung menit yang dipesan/dilepas. |
| src/features/rekap/RekapTab.tsx | M | Memilih sesi dan menampilkan roster, status, jam dan total. |
| src/features/rekap/RiwayatTab.tsx | M | Menampilkan catatan presensi milik pengguna aktif dan informasi sesi. |
| src/features/rekap/rekapService.ts | Baru | Menggabungkan sumber rekap, menerapkan prioritas dan membatasi query riwayat per UID. |
| scripts/test-sprint2.cjs | Baru | Menjalankan regresi melalui service asli, identitas terpisah dan rules emulator lokal. |
| docs/verifikasi-sprint-2.md | Baru | Merekam bukti, pemetaan SRS, keterbatasan dan keputusan review. |
| SPRINT2_CODEX_CHECKPOINT.md | Baru | Mempertahankan bukti saat jeda dan menunjuk hasil verifikasi terbaru. |

**Kompatibilitas dan urutan transisi**

- Flag `archived` pada kelas/sesi bersifat opsional. Dokumen tanpa flag masih aktif. Arsip mempertahankan induk riwayat. Dokumen yang induknya terhapus sebelumnya hanya bisa menampilkan fallback bila informasi asalnya hilang.
- Sesi yang dibuka dengan mekanisme baru mendapat `slotTerdaftar: true`. Transaksi juga menulis `users/{uid}/jadwalAktif/{tanggal}` dengan `sesiId`, `opening`, dan `minutes` sepanjang 1.440 karakter. Interval dihitung dari menit mulai sampai sebelum menit akhir pada tanggal yang sama. Pemilik berbeda memiliki reservasi terpisah.
- Klien memeriksa sesi terbuka pra-reservasi sebelum membuka sesi baru. Rules tidak bisa mencari semua sesi lama lewat query global. Sebelum rollout, PM perlu menginventarisasi dan menutup sesi lama yang masih terbuka, termasuk jadwal cacat, lalu mengoordinasikan penghentian klien lama dan pemberlakuan rules bersama klien baru. Menyalakan dua versi penulis bersamaan dapat meninggalkan sesi terbuka tanpa reservasi atau membuat write klien lama ditolak. Suite memakai fixture legacy tanpa backfill.
- Presensi baru memakai ID `{sesiId}_{uid}` dan `recordedAt` dari server. Jam lama tetap dibaca dari `timestamp` jika `recordedAt` belum ada. Rules kandidat akan menolak presensi baru dari klien lama yang belum menyertakan waktu server.
- Penyebut rekap memakai roster kelas ketika rekap dilihat. Mengeluarkan peserta bisa mengubah total rekap lama. Riwayat praktikan tetap berdasarkan UID. Pembekuan roster historis memerlukan keputusan produk terpisah.

## E. Hasil uji dan diagnosis F02

**Mengapa rekap pernah timeout.** Suite awal pada Firestore Emulator 1.19.8 sempat lulus 19 kelompok. Dalam pengulangan cepat dengan fixture baru, callback kelas memberikan dua UID, profil keduanya selesai dibaca dan presensi kosong sesuai fixture. Query izin milik asisten dan sesi yang sama memberikan snapshot kosong dengan `hasPendingWrites=false`, termasuk satu snapshot `fromCache=false`. Rekap menerbitkan dua baris Belum Hadir. Tidak ada callback susulan sebelum batas 30 detik, padahal write selesai dan pembacaan server setelah timeout mengembalikan DITERIMA. Query REST emulator juga menemukan dokumen yang sesuai. Gejala muncul baik saat asisten memakai klien yang sama maupun ketika keputusan ditulis klien kedua.

Pada reproduksi dengan log SDK, stream gRPC `Listen` melaporkan `RESOURCE_EXHAUSTED: Received message larger than max (134484482 vs 17825792)` dan SDK menerapkan maximum backoff. Klien tetap bisa membaca keputusan dari server. Menjalankan klien dengan Node 22.23.2 pada emulator lama juga menghasilkan error stream. Bukti ini menempatkan kegagalan yang terlacak pada pengiriman event di jalur Node SDK–emulator. Penyebab internal pada library/versi Java tertentu dan kesamaan penyebab pada setiap timeout lama belum dapat dipastikan. Log ini tidak mendiagnosis error jaringan pada perangkat pengguna.

**Perbaikan dan kontrol pembanding.** Pengujian memakai Firestore Emulator 1.22.0 (distribusi Firebase CLI 15.36.0), Java 25, Node 24.21.0, Firebase SDK 13.3.0, akun sintetis dan rules identik. Dua proses mengulang skenario keputusan tepat setelah subscribe masing-masing 220 kali. Satu proses menulis keputusan dari klien pengamat, proses lain dari klien asisten kedua. Keduanya selesai dengan exit 0, seluruh 440 iterasi menerima Izin. Pengujian tetap memuat skenario subscribe bersamaan dengan write. Tidak ada retry assertion, penambahan timeout, polling rekap atau perubahan pada rules dan fungsi produksi dalam kelanjutan ini.

Suite kini juga memegang **satu** subscription sejak dua peserta berstatus Belum Hadir sampai Izin dan Hadir. Listener terpisah untuk Izin Saya dan Riwayat sudah aktif selama perubahan. Tes memeriksa waktu dan pemutus pada write server, total hadir, jam yang sama di kedua peran, lepas/ganti/kembali ke sesi, keputusan ditolak, serta dua record UID sendiri pada klien yang dibuka ulang. Pengujian port alternatif tetap membatasi Auth, Firestore, dan fixture legacy ke loopback serta satu proyek demo.

| Pemeriksaan | Hasil dan cakupan |
|---|---|
| `node scripts/test-sprint2.cjs` | PASS, **20/20 kelompok dalam lima run berturut-turut** dari revisi akhir skrip, exit 0 setiap kali. Tiap run memakai akun, kelas dan sesi sintetis baru. Grup mencakup render shell, Auth, kelas, validasi, bentrok, transisi, race, izin, rekap, riwayat, arsip, presensi offline dan AI lokal. |
| Logika dan rules | Dalam suite yang sama. Termasuk batas alasan/kalender, interval bersisian, prioritas 2/4, izin/presensi ganda dua klien, penolakan lintas UID/pemilik, finalitas keputusan dan penutupan sesi lama. |
| `npx tsc --noEmit`, `npx expo lint` | PASS, masing-masing exit 0. |
| `git diff --check` | PASS untuk diff terlacak. Git melaporkan normalisasi LF/CRLF di Windows. |
| `npx expo export --platform all` | PASS, exit 0. Metro menghasilkan bundle Android, iOS dan web serta hasil render server web dalam direktori QA sementara, dengan konfigurasi Firebase sintetis dan Expo offline. |
| Perangkat dan model pengajar | Belum diverifikasi. Rincian pada G. |

**Mengulang suite.** Gunakan Firebase CLI 15.36.0 dengan Java yang didukung. Jalankan `firebase emulators:start --only auth,firestore --project demo-labpresensi` dari root saat port konfigurasi bebas. Di terminal kedua jalankan `node scripts/test-sprint2.cjs`. Gunakan `--trace-firestore` untuk melihat peringatan SDK saat mendiagnosis kegagalan. Uji pembanding kali ini mempertahankan Auth di 19319 dan emulator lama di 18319, lalu menjalankan Firestore 1.22.0 terpisah di 18320 dengan file rules identik. Untuk mengulang pada proses tersebut di PowerShell gunakan berikut ini.

```powershell
$env:FIRESTORE_EMULATOR_HOST = '127.0.0.1:18320'
node scripts/test-sprint2.cjs
```

Hash SHA-256 rules repo dan salinan yang dimuat emulator sama, yaitu `88d44d73f70552ecb14a338c3db53aff38cce6609c83611c4786634eeb7ab6c4`. SHA ini mengidentifikasi berkas yang diuji secara lokal.

## F. Firestore Security Rules

### Jika Tambah sesi ditolak

Klien penjadwalan membaca dan menulis reservasi di `users/{uid}/jadwalSesi/{tanggal}`. Jika pembacaan reservasi ditolak, form kini meminta admin memeriksa Firestore Rules dan peran akun. Aplikasi tetap menyimpan sesi dalam satu transaksi bersama reservasi.

Untuk proyek yang dipakai perangkat, admin dapat memeriksa rules aktif di Firebase Console. Cocokkan aturan `jadwalSesi` dan penulisan sesi dengan `firestore.rules` kandidat, lalu periksa bahwa dokumen `users/{uid}` milik akun yang login memiliki `role: ASISTEN` dan `kelas/{kelasId}.asistenId` cocok dengan UID tersebut. Sebelum mengaktifkan rules kandidat, koordinasikan versi klien dan periksa jadwal lama yang bentrok. Uji simpan satu sesi di lingkungan yang disetujui setelah rules dan klien selaras.

Rules emulator membatasi tulis kelas/sesi pada pemiliknya. Untuk presensi dan izin, identitas, keanggotaan serta relasi kelas dan sesi diperiksa pada dokumen sumber. ID deterministik membatasi satu pengajuan dan satu presensi per UID/sesi. Keputusan izin hanya dapat beralih dari MENUNGGU ke kondisi final. Akses baca presensi/izin terikat UID praktikan atau UID asisten pemilik. Suite menjalankan penolakan dan operasi sah dengan akun terautentikasi terpisah. Hanya fixture sesi warisan yang disiapkan melalui fasilitas admin emulator.

Semua akun yang login masih dapat membaca kelas dan sesi. Akun ASISTEN dapat membaca direktori pengguna, dan alur tugas mengizinkan pemilihan peran saat registrasi. PM perlu menentukan apakah model ini sesuai sebelum memakai data nyata. Hasil runtime hanya mencakup salinan rules lokal. Versi yang aktif pada proyek Firebase dan kebutuhan indeks pada backend tujuan masih perlu diverifikasi.

## G. Verifikasi perangkat dan eksternal yang masih terbuka

Gunakan data sintetis pada lingkungan yang disetujui. Siapkan satu asisten, dua praktikan anggota kelas, dua perangkat atau sesi aplikasi terpisah, serta satu kelas dan dua sesi berbeda.

1. Daftarkan dan masuk dengan tiap peran. Coba email/password salah, input kosong, profil hilang serta logout. Tekan Back dan matikan/buka ulang aplikasi. Cocokkan profil, tab, akses serta persistensi sesi dengan akun yang aktif.
2. Buat/edit kelas, cari peserta dengan nama/NIM, tambah dan keluarkan peserta, batalkan lalu konfirmasikan arsip. Cocokkan perubahan daftar dengan perangkat praktikan, termasuk kondisi kosong.
3. Periksa feedback tanggal mustahil, jam tidak valid/terbalik dan lab kosong. Buka dua sesi yang bertumpang tindih dari dua perangkat dengan login asisten yang sama. Harapkan satu berhasil. Ulangi dengan interval bersisian, kedua sesi seharusnya bisa dibuka.
4. Praktikan membuka detail Jadwal. Asisten membuka lalu menutup sesi. Periksa urutan multi-kelas, label status dan perubahan tombol selagi detail tetap terbuka. Coba presensi dua kali, mode pesawat, pindah detail saat pending, lalu sambung kembali setelah sesi ditutup. Sukses harus menunggu konfirmasi server dan menampilkan pesan yang sesuai saat write ditolak.
5. Saat sesi lain belum dibuka, ajukan izin dengan 9, 10, 500 dan 501 karakter setelah trim. Periksa pemilih sesi, state tombol dan kartu pengajuan. Di perangkat asisten buka filter Menunggu/Semua, detail, batal lalu konfirmasi keputusan. Verifikasi kartu praktikan dan rekap memperlihatkan perubahan. Ulangi dengan penolakan dan saat inbox kosong.
6. Pertahankan rekap terbuka selama izin diterima dan praktikan mencatat hadir. Cocokkan Belum Hadir → Izin → Hadir, total 0/2 → 0/2 → 1/2 dan jam dengan Riwayat. Ganti sesi lalu kembali, ganti akun dan buka ulang aplikasi. Periksa riwayat kedua praktikan dan hasil setelah arsip.
7. Minta PM/pengajar mengonfirmasi URL dan kontrak model. Gunakan alasan sintetis, periksa kategori pada UI serta fallback pengajuan tanpa kategori ketika jaringan gagal. Kontrak yang diuji lokal adalah POST JSON `{text}` dengan respons `{kategori}`.
8. Dari perangkat yang melaporkan `unavailable`, verifikasi koneksi ke proyek uji yang benar dan catat kode error Auth serta Firestore secara terpisah. Hak Firebase Console untuk pengembang dan akses data dari klien aplikasi perlu diuji secara terpisah.

Render shell dan ekspor statis tidak menjalankan tap, Back atau siklus hidup proses native. Automatic approval review sebelumnya menolak peluncuran Chromium interaktif dan headless dengan alasan “blocked by policy”. Bukti interaksi browser, APK/perangkat fisik dan endpoint pengajar masih terbuka.

## H. Checklist PM sebelum merge

- [ ] Review matriks B–C, ulangi suite lokal pada emulator dengan rules kandidat dan simpan hasil uji perangkat pada bagian G.
- [ ] Setujui batas akses direktori/peran asisten, sumber roster historis, dan penanganan data yatim.
- [ ] Cocokkan kontrak/hasil model pengajar, perilaku offline dan konfigurasi Firebase untuk lingkungan penilaian.
- [ ] Tentukan jendela transisi rules/klien serta penutupan sesi legacy. Pastikan versi klien yang boleh menulis sudah kompatibel.
- [ ] Tinjau integrasi terhadap main terkini. Audit sebelumnya atas snapshot `cd2dc89` menemukan konflik teks pada ConfirmSheet, AuthScreen, IzinSayaTab, PemeriksaanIzinTab, JadwalTab, KelolaTab, SesiTab, RekapTab, RiwayatTab dan AppRouter. Pertahankan perilaku Sprint 2 dan desain yang telah disetujui saat PM kelak mengizinkan integrasi. Ulangi pengujian pada hasil integrasi.

## I. Status Git dan keputusan review

Branch `feature/fiksasi-sprint-2`, HEAD `191daf4f109c9227822efe547bb09861d4ad26d9`. Ada 22 file terlacak dimodifikasi dan enam file baru, seluruhnya lokal dan belum staged. Keenam file baru adalah checkpoint, laporan, skrip pengujian, `submission.ts`, `schedule.ts` dan `rekapService.ts`. File dependency dan lockfile berada di luar perubahan. Tidak ada commit, push, merge atau deployment.

Diff file terlacak berisi 589 penambahan dan 718 penghapusan. Git tidak menghitung enam file baru dalam angka ini. **READY_WITH_UNVERIFIED_RUNTIME_TESTS** — siap untuk review lokal PM. Kesiapan merge/demo bergantung pada hasil perangkat, model pengajar, kompatibilitas rules/klien dan resolusi konflik integrasi pada H.
