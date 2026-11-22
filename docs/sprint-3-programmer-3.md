# Sprint 3 LabPresensi — Programmer 3

**Fokus:** Push notification dan event handling
**Repositori:** [AdmRss/LabPresensi](https://github.com/AdmRss/LabPresensi)
**Branch pekerjaan:** `feature/s3-push-notification`
**Branch integrasi tim:** `integration/sprint-3`

## Instruksi eksekusi untuk Codex

Kerjakan modul notifikasi LabPresensi sesuai task, kontrak, dan kriteria penerimaan di bawah. Mulai dengan membaca `AGENTS.md`, memeriksa status Git dan branch, serta mengaudit `package.json`, `app.json`, konfigurasi Firebase/EAS, tipe data, alur login/logout, layanan kelas/sesi/izin, dan navigasi yang sudah ada. Gunakan branch Programmer 3 dari basis yang disepakati tim dan jaga perubahan yang sudah ada di workspace.

Konfirmasi status persetujuan kontrak sebelum mengubah schema, memasang dependency, atau menyentuh file bersama. Catat keputusan yang sudah disepakati dan perubahan yang perlu diajukan ke integrator. Jika keputusan belum tersedia, selesaikan audit dan pekerjaan dalam modul milik Programmer 3 yang dapat berjalan dengan kontrak yang sudah jelas. Laporkan pekerjaan yang masih bergantung pada integrator beserta keputusan atau perubahan yang dibutuhkan.

### Kepemilikan dan batas scope

| Pemilik | Area |
|---|---|
| Programmer 3 | `src/features/notifications/**` dan `functions/src/notifications/**` |
| Programmer 1 | `src/features/attendance/**`, `functions/src/attendance/**`, pengambilan koordinat, radius, validasi dan penulisan presensi |
| Programmer 2 | `src/features/laboratory/**`, `src/features/maps/**`, `src/features/rekap/**`, CRUD lab, Maps, rekap dan riwayat |
| Integrator | `src/types.ts`, `src/lib/firebase.ts`, `src/navigation/**`, `src/app/**`, integrasi auth-notification, `firestore.rules`, `firestore.indexes.json`, `package.json`, lockfile, `app.json`, konfigurasi Firebase/native bersama, dan entry point backend Functions |

- Edit modul milik Programmer 3. Ajukan perubahan lintas modul lewat kontrak atau PR terkoordinasi dengan integrator. Rules gabungan direview oleh ketiga programmer dan harus mencakup akses existing serta kebutuhan baru. Index mengikuti query aktual yang disepakati.
- Perubahan model sesi atau izin dan perubahan schema bersama memerlukan kontrak yang disetujui. Pertahankan role, field, dan alur existing selama migrasi. Simpan semua kredensial server di environment atau secret backend.
- Kerjakan commit yang logis per task dan mudah direview. PR wajib memuat Task ID, daftar file yang diubah, kriteria penerimaan, pengujian yang dijalankan, dan risiko migrasi. Lakukan code review sebelum merge ke `integration/sprint-3`. Integrator memastikan kompatibilitas Sprint 2.
- Jangan commit API key rahasia, service account, private key, atau `.env` berisi kredensial. Pastikan service account dan private key tidak masuk kode, konfigurasi, maupun bundle aplikasi client.

## Audit repo dan keputusan integrasi

- Dokumen PM mencatat Expo `~58.0.25`, Expo Router `~58.0.31`, React Native `0.88.1`, Firebase JS SDK `^13.3.0`, Firebase Auth dengan persistence AsyncStorage, dan Cloud Firestore. Baca ulang `package.json` dan verifikasi semua temuan di branch target. Audit apakah scaffold `functions/` sudah tersedia dan koordinasikan inisialisasi bersama bila diperlukan.
- Pada checkout yang dipakai saat penyusunan dokumen ini, `src/types.ts` juga mendefinisikan `ADMIN`. Pertahankan role yang ada. Target event tetap mengikuti relasi yang ditetapkan di bagian event.
- Pada checkout yang sama, `src/features/kelola/sessionClock.ts` menghitung status efektif sesi terjadwal dari `startAt` dan `endAt`, sedangkan sesi legacy dapat berpindah ke `DIBUKA` melalui update Firestore. Waktu yang berlalu saja tidak menghasilkan update Firestore. Konfirmasi dengan integrator apakah sesi yang terbuka otomatis termasuk cakupan `SESSION_OPENED` dan, jika termasuk, sepakati sumber event backend dan ownership-nya. Pertahankan dukungan untuk transisi status Firestore yang diwajibkan PM.
- Cek `src/features/kelola/sesiService.ts`, `src/features/izin/services/izinService.ts`, serta auth dan navigasi aktual. Pada checkout yang diaudit, relasi menggunakan `sesi.kelasId`, `kelas.pesertaUids`, `asistenId`, dan `izin.praktikanUid`. Jadwal dapat memiliki `startAt`/`endAt`, `tanggal`/`jamMulai`/`jamSelesai`, dan `lokasiId` selain `lab`. Verifikasi field yang berlaku dan sepakati perubahan mana yang berarti jadwal berubah, termasuk hubungan dengan `labId`.

| Referensi task PM | Hal yang perlu disepakati |
|---|---|
| `INT-01` | Schema, tipe, payload, sumber event, relasi penerima, interface service, dan error code bersama. |
| `INT-02` | Entry point Expo Router, target deep link, integrasi auth dan lifecycle, serta konfigurasi native yang terkait. |
| `INT-03` | Scaffold, konfigurasi dan entry point Cloud Functions, kredensial backend, dan pembagian modul attendance/notifications. |
| `INT-04` | Kontrak data attendance untuk rekap antara Programmer 1 dan Programmer 2. |
| `P2-05` | Relasi sesi ke laboratorium dan kompatibilitas data lama yang memengaruhi deteksi `SCHEDULE_CHANGED`. |

## Kontrak Firestore dan event

### Collection dan migrasi

| Path | Data yang dipertahankan |
|---|---|
| `users/{uid}` | Profil dan role pengguna. |
| `kelas/{kelasId}` | Kelas, praktikum, asisten, dan peserta. |
| `sesi/{sesiId}` | Jadwal dan status `BELUM_DIBUKA`, `DIBUKA`, `DITUTUP`. |
| `presensi/{sesiId}_{praktikanUid}` | Catatan presensi dengan document ID deterministik. |
| `izin/{sesiId}_{praktikanUid}` | Pengajuan dan keputusan izin. Verifikasi enum existing `MENUNGGU`, `DITERIMA`, `DITOLAK`. |
| `laboratorium/{labId}` | Kontrak lab milik Programmer 2. |

Setelah migrasi lab disetujui, sesi baru dan fitur baru memakai `labId: string` sebagai referensi utama. Data lama tetap terbaca, `lab` tetap tersedia selama masa transisi, dan penghapusannya menunggu migrasi data serta regression test. Sepakati hubungan `labId` dengan `lokasiId` bila field tersebut ada pada branch target.

Sepakati standar penyimpanan waktu, dengan Firestore Timestamp sebagai usulan PM. Gunakan timezone tampilan yang konsisten dengan alur jadwal existing, gunakan aturan waktu yang sama untuk sesi aktif dan berikutnya, serta sepakati perilaku ketika sesi melewati tengah malam atau jadwal berubah. Normalisasi format waktu yang berbeda sebelum membandingkannya.

### `notificationTokens/{tokenId}`

```text
id: string
uid: string
token: string
platform: "android" | "ios"
deviceId: string | null
isActive: boolean
createdAt: timestamp
updatedAt: timestamp
lastUsedAt: timestamp
```

Gunakan Firebase UID yang sedang login untuk registrasi. Pastikan token yang sudah dirotasi, tidak valid, atau dilepas saat logout tidak lagi dipakai untuk pengiriman yang bersangkutan. Registrasi ulang saat perangkat berpindah akun. Sepakati aturan akses token dengan integrator agar binding token akun A tidak dapat dipakai untuk mengirim notifikasi akun B.

### Event notifikasi

| Event | Perubahan data yang memicu | Penerima | Tujuan tap |
|---|---|---|---|
| `SESSION_OPENED` | Status sesi Firestore berubah menjadi `DIBUKA`. | Praktikan terdaftar pada kelas/sesi terkait. | Halaman sesi terkait. |
| `SCHEDULE_CHANGED` | Jadwal sesi berubah pada field jadwal yang disepakati. | Praktikan dan asisten yang terdampak. | Halaman jadwal atau detail sesi terkait. |
| `PERMISSION_APPROVED` | Status izin berubah menjadi `DITERIMA`. | Praktikan yang mengajukan izin. | Halaman pengajuan izin terkait. |
| `PERMISSION_REJECTED` | Status izin berubah menjadi `DITOLAK`. | Praktikan yang mengajukan izin. | Halaman pengajuan izin terkait. |

Picu event dari perubahan data yang berhasil disimpan di Firestore. Gunakan data sebelum dan sesudah perubahan untuk mendeteksi transisi dan abaikan write yang tidak mengubah nilai relevan. Tentukan penerima di backend dari relasi kelas, sesi, jadwal, dan izin. Kirim hanya kepada pengguna yang berkepentingan. Resolusi penerima dan pemetaan deep link harus mengikuti otorisasi existing. Sepakati tujuan route dan parameter dengan integrator, termasuk penanganan tap saat aplikasi baru terbuka dan sesi autentikasi masih dipulihkan.

```text
eventId: string
eventType: "SESSION_OPENED" | "SCHEDULE_CHANGED" |
           "PERMISSION_APPROVED" | "PERMISSION_REJECTED"
sourceDocumentPath: string
recipientUid: string
relatedDocumentId: string
createdAt: timestamp
payload: object
```

### Usulan `notificationEvents/{eventId}`

```text
id: string
eventType: "SESSION_OPENED" | "SCHEDULE_CHANGED" |
           "PERMISSION_APPROVED" | "PERMISSION_REJECTED"
sourceDocumentPath: string
recipientUid: string
payload: object
createdAt: timestamp
status: "PENDING" | "SENT" | "FAILED"
attempts: number
```

Integrator memutuskan apakah collection ini dipakai atau idempotency dicatat lewat mekanisme backend lain. Pertahankan `relatedDocumentId` di kontrak event dan sepakati letak penyimpanannya jika collection di atas dipakai. Gunakan identitas event yang stabil saat delivery diulang. Tangani replay, pemrosesan bersamaan, dan hasil pengiriman parsial agar retry tidak mengirim ulang ke target yang sudah berhasil. Dalam keputusan teknis, jelaskan perilaku bila backend gagal setelah permintaan diterima FCM dan sebelum hasilnya tercatat. Bedakan kegagalan sementara yang dapat dicoba ulang dari token invalid yang perlu dinonaktifkan atau dihapus sesuai kontrak.

### Service contract

Sepakati return type dan error code yang konsisten. Gunakan pola `Result<T>` existing bila sesuai, dengan hasil `{ ok: true, data }` atau `{ ok: false, code, message }`. Nama usulan PM untuk modul ini adalah `registerNotificationToken(input)` dan `resolveSessionRecipients(sessionId)`. Cocokkan dengan pola layanan existing agar satu tanggung jawab tidak memiliki dua implementasi.

## Backlog implementasi

| ID | Target dan hasil yang harus diserahkan | Dependensi |
|---|---|---|
| `P3-01` | Dokumen keputusan teknis berisi audit paket dan pemilihan stack yang kompatibel dengan Expo SDK proyek, Android development build, serta pengiriman FCM dari backend tepercaya. Verifikasi tipe token yang dihasilkan stack dan kompatibilitasnya dengan pengirim yang dipilih. | Audit paket dan Expo SDK |
| `P3-02` | `src/features/notifications/types.ts` mendefinisikan tipe event, payload, token, dan status pengiriman. | `INT-01` |
| `P3-03` | `src/features/notifications/services/notificationPermissionService.ts` membedakan granted, denied, dan status lain yang didukung. Sediakan fallback saat ditolak. | `P3-01` |
| `P3-04` | `src/features/notifications/services/notificationTokenService.ts` mengambil dan menyimpan token dengan UID login yang benar. | `P3-01`, `P3-03` |
| `P3-05` | Token service memperbarui data saat token berubah dan menghentikan pemakaian token lama. | `P3-04` |
| `P3-06` | Integrasi auth melalui integrator menangani logout dan pergantian akun, termasuk melepas binding lama dan registrasi kembali untuk akun baru. | `P3-04` |
| `P3-07` | `functions/src/notifications/` menyiapkan modul backend dengan kredensial lingkungan tepercaya dan pengiriman FCM dari server. | `INT-03` |
| `P3-08` | `functions/src/notifications/sessionOpened.ts` menangani transisi status menjadi `DIBUKA` untuk praktikan terkait. | `P3-07` |
| `P3-09` | `functions/src/notifications/scheduleChanged.ts` menangani perubahan jadwal dan menarget praktikan serta asisten terdampak. | `P3-07`, `P2-05` |
| `P3-10` | `functions/src/notifications/permissionDecision.ts` menangani kedua keputusan izin dan menarget UID pengaju. | `P3-07` |
| `P3-11` | `functions/src/notifications/recipientResolver.ts` menyelesaikan penerima dari relasi data, tanpa broadcast ke semua pengguna. | `P3-08`–`P3-10` |
| `P3-12` | `functions/src/notifications/idempotency.ts` mencegah pengiriman ulang saat event yang sama diproses kembali. | `P3-08`–`P3-11` |
| `P3-13` | Backend notification menangani retry kegagalan sementara dan menonaktifkan atau menghapus token invalid sesuai aturan. | `P3-07`, `P3-12` |
| `P3-14` | Handler foreground menangani notifikasi ketika aplikasi aktif sesuai UX existing. | `P3-03` |
| `P3-15` | Handler background dan terminated menangani penerimaan dan interaksi sesuai dukungan OS. Koordinasikan konfigurasi Expo dan bersihkan subscription yang sudah tidak dipakai. | `P3-14`, `INT-02` |
| `P3-16` | `src/features/notifications/notificationNavigation.ts` memetakan tap ke sesi, jadwal, atau pengajuan izin yang sesuai melalui Expo Router. | `INT-02` |
| `P3-17` | Uji lifecycle notifikasi dan serahkan hasil aktual sesuai matriks pengujian. | `P3-01`–`P3-16` |

## Konfigurasi dan tahapan integrasi

- Sebelum menulis kode Expo, EAS, atau React Native, baca versi major `expo` di `package.json` dan buka dokumentasi `https://docs.expo.dev/versions/v<major>.0.0/`. Gunakan [indeks dokumentasi Expo](https://docs.expo.dev/llms.txt) untuk menemukan halaman API yang relevan. Utamakan pola mobile-first, performa, kompatibilitas lintas platform, serta modul Expo yang direkomendasikan bila memenuhi kebutuhan.
- Setelah dependency disetujui, gunakan `npx expo install <package>`. Ganti `npx` dengan `bunx` jika ada `bun.lock`. Jalankan `npx expo-doctor` setelah perubahan dependency atau konfigurasi. Koordinasikan perubahan manifest, lockfile, permission, dan plugin dengan integrator.
- Gunakan Expo Router untuk navigasi. Entry point berada di `src/app/`, layout navigator di `_layout.tsx`, dan logika modul tetap di luar folder route. Gunakan impor dari `expo-router` untuk API routing. Registrasi route, tab, dan integrasi root dilakukan melalui integrator.
- Gunakan Continuous Native Generation dengan `app.json` atau config plugin. Folder native hasil generate dikelola oleh toolchain. Uji push di Android development build pada perangkat yang mendukung, dengan konfigurasi native yang sesuai. Gunakan EAS mengikuti `AGENTS.md`, misalnya `npx eas-cli@latest build --profile development` atau padanannya dengan `bunx` untuk proyek Bun.
- Pastikan Firestore aktif. Siapkan Cloud Functions bersama integrator, ajukan indexes untuk query aktual dan rules yang mempertahankan akses Sprint 2, lalu review dan deploy rules gabungan melalui alur integrasi tim. Kredensial backend hanya tersedia di environment atau secret backend.
- Urutan tim: **M1** audit dan persetujuan schema, service, ownership, event, serta error code → **M2** implementasi per modul → **M3** unit/module testing dan bukti → **M4** review dan integrasi pada `integration/sprint-3` → **M5** konfigurasi Firebase, Functions, Rules, indexes, Maps API, native permission, dan development build → **M6** end-to-end dan security testing dengan data yang konsisten → **M7** demonstrasi Sprint 3.
- Untuk integrasi lintas modul, Programmer 1 menangani akurasi GPS, permission/timeout lokasi, validasi ulang di backend dan operasi atomik untuk presensi. Programmer 2 menangani kompatibilitas library Maps, Maps SDK for Android, billing, serta pembatasan API key berdasarkan package name dan signing certificate fingerprint. Jangan simpan unrestricted key atau server key di repo. Tim menguji kompatibilitas `lab`/`labId`, konsistensi timezone, dan cleanup listener sebelum rilis.

## Matriks pengujian Programmer 3

Mulai dengan status **Not Tested** dan kolom hasil aktual kosong. Catat perintah, lingkungan atau perangkat, hasil aktual, dan bukti untuk setiap pengujian yang dilakukan. Jalankan `npx expo lint` dan `npx tsc --noEmit` sebelum menyatakan tugas selesai, atau padanan `bunx` sesuai lockfile. Bedakan hasil unit/module test, emulator, dan development build. Jika kredensial, perangkat, atau konfigurasi integrasi belum tersedia, sebutkan kasus yang masih **Not Tested** dan prasyaratnya.

| Test ID | Skenario | Expected Result | Actual Result | Status |
|---|---|---|---|---|
| `P3-T01` | Permission diterima | Token dapat diminta. | | Not Tested |
| `P3-T02` | Permission ditolak | Fallback ditampilkan. | | Not Tested |
| `P3-T03` | Token diperoleh | Token terikat ke UID login yang benar. | | Not Tested |
| `P3-T04` | Token berubah | Data perangkat diperbarui dan token lama berhenti dipakai. | | Not Tested |
| `P3-T05` | Logout atau pergantian akun | Binding akun lama dilepas dan registrasi akun baru benar. | | Not Tested |
| `P3-T06` | Sesi dibuka | Praktikan terkait menerima notifikasi. | | Not Tested |
| `P3-T07` | Jadwal berubah | Praktikan dan asisten terdampak menerima notifikasi. | | Not Tested |
| `P3-T08` | Izin diterima | Pengaju menerima notifikasi persetujuan. | | Not Tested |
| `P3-T09` | Izin ditolak | Pengaju menerima notifikasi penolakan. | | Not Tested |
| `P3-T10` | Event diproses ulang | Pengguna tidak menerima notifikasi ganda. | | Not Tested |
| `P3-T11` | Aplikasi foreground | Handler foreground bekerja pada development build. | | Not Tested |
| `P3-T12` | Aplikasi background atau terminated | Penerimaan dan interaksi berjalan sesuai dukungan platform pada development build. | | Not Tested |
| `P3-T13` | Notifikasi ditekan | Halaman terkait terbuka melalui deep link. | | Not Tested |
| `P3-T14` | Token invalid | Token dibersihkan atau dinonaktifkan. | | Not Tested |

### Security dan regression

- [ ] Verifikasi binding token akun A dan B tetap terpisah. Pengguna di luar target masing-masing event tidak menerima notifikasi.
- [ ] Verifikasi event yang sama dapat diproses ulang tanpa duplikasi. Uji retry kegagalan sementara dan hasil pengiriman parsial sesuai mekanisme yang dipilih.
- [ ] Verifikasi service account dan private key tidak ada di bundle client. Review akses token, Rules, indexes, dan backend bersama integrator.
- [ ] Verifikasi setelah integrasi bahwa autentikasi, kelas, sesi, izin, dan presensi existing tetap berjalan, data Firestore konsisten antar pengguna, serta tidak ada error runtime yang menghambat alur utama.
- [ ] Pada pengujian tim, verifikasi penolakan presensi atas nama UID lain, presensi saat sesi tertutup, manipulasi nilai jarak, dan perubahan langsung status presensi. Verifikasi write laboratorium ditolak bagi pengguna tanpa hak dan asisten di luar kewenangannya. Koordinasikan bukti ini dengan Programmer 1 dan 2.

## Definition of Done dan handoff

- [ ] Keputusan stack dan kontrak integrasi tercatat, termasuk file bersama yang direview integrator. Semua task `P3-01`–`P3-17` memiliki ringkasan perubahan dan bukti sesuai statusnya.
- [ ] Permission, pengambilan token, binding UID, rotasi, logout, perpindahan akun, dan penanganan token invalid lulus pengujian yang relevan.
- [ ] Demonstrasikan asisten membuka sesi, mengubah jadwal, menerima izin, dan menolak izin. Backend mendeteksi setiap perubahan yang tersimpan, penerima yang tepat mendapat push, pemrosesan ulang tidak menghasilkan duplikasi, dan tap menuju halaman terkait.
- [ ] Foreground, background, dan terminated diuji di development build sesuai dukungan platform. Status matriks mencerminkan pengujian aktual. Tampilan UI saja belum memenuhi kriteria apabila penyimpanan data, otorisasi, atau pengiriman belum terverifikasi.
- [ ] Setelah integrasi tim, aturan akses dan backend sudah direview, regression Sprint 2 lulus, dan ketiga alur Sprint 3 dapat didemonstrasikan. Alur bersama mencakup presensi berbasis lokasi dan rekap asisten, Maps dengan posisi pengguna serta aktivitas lab aktif/berikutnya yang mengikuti perubahan jadwal, dan notifikasi kegiatan.
- [ ] Handoff memuat Task ID, file yang diubah, keputusan teknis, hasil pengujian dan buktinya, risiko migrasi, serta pekerjaan yang masih membutuhkan integrator. Klaim penyelesaian sesuai hasil yang sudah diverifikasi.
