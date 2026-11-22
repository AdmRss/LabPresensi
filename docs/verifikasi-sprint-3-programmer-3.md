# LabPresensi — implementasi notifikasi Sprint 3

Branch `feature/s3-push-notification` dibuat dari `origin/main` pada `4b822ce`. Modul client dan backend siap direview. Aktivasi aplikasi, deploy Functions, serta pengujian FCM pada perangkat membutuhkan integrasi tim.

## Keputusan teknis dan hasil pekerjaan

| Task | Hasil |
|---|---|
| P3-01 | Pilihan stack Android adalah `expo-notifications` versi SDK 58 untuk memperoleh native device token dan Firebase Admin Messaging di backend untuk mengirim langsung via FCM. Bentuk API adapter diverifikasi dengan deklarasi tipe `expo-notifications@58.1.9`, Firebase Admin `14.5.1`, dan Firebase Functions `7.4.0` di folder sementara. |
| P3-02–P3-06 | Tipe payload, permission dan fallback, pendaftaran, rotasi, pelepasan saat logout, serta registrasi ulang tersedia di `src/features/notifications/`. Firebase callable memakai Auth UID dan menolak permintaan dengan UID yang sudah berubah. |
| P3-07–P3-11 | `functions/src/notifications/` menyediakan handler update sesi dan izin, resolver penerima, callable token, adapter Firestore, dan pengirim FCM melalui Firebase Admin yang dipasok integrator. |
| P3-12–P3-13 | Store mengambil klaim secara transaksional untuk tiap token, mencatat hasil, mengulang penolakan sementara, dan menonaktifkan token invalid hanya jika binding masih sama. |
| P3-14–P3-16 | Lifecycle client menyediakan penanganan foreground, respons tap live, dan pembacaan respons cold start. Pemetaan menghasilkan parameter Expo Router pada route `/` dan memeriksa UID serta peran pengguna sebelum navigasi. |
| P3-17 | Tes modul memakai data sintetis, Firestore in-memory, dan stub FCM serta Expo. Hasil per kasus dicatat di bawah. |

Pada Android, `getDevicePushTokenAsync` menghasilkan token FCM. Channel `labpresensi-activities` dibuat sebelum permintaan permission. FCM mengirim notifikasi yang dirender OS di background atau saat aplikasi berhenti, dengan metadata untuk tap. Isi yang terlihat hanya memberi tahu adanya pembaruan praktikum. Aplikasi menyaring akun pada foreground dan saat tap. Android dapat membatasi pengiriman setelah force stop. iOS dan web melewati registrasi karena token perangkat iOS dari Expo adalah token APNs. [Expo Notifications SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/) · [Pengiriman FCM dan APNs dengan Expo](https://docs.expo.dev/push-notifications/sending-notifications-custom/) · [Perilaku push Expo](https://docs.expo.dev/push-notifications/what-you-need-to-know/)

Backend memakai `notificationTokens/{tokenId}` untuk satu binding per instalasi. ID merupakan hash UUID lokal yang dibuat dengan generator acak aman. SecureStore menyimpan UUID dan penghitung operasi lintas login. Callable mengambil UID dari Firebase Auth. Rotasi mengganti token di record yang sama dan token yang sudah tercatat di instalasi lain ditolak. Usulan field backend `revision` mencegah request lama mengaktifkan kembali binding yang sudah dilepas. Logout secara eksplisit melepas binding sebelum `signOut`. Jika perangkat offline dan pelepasan binding gagal, integrator perlu menetapkan penanganan agar app melaporkan kegagalan dengan benar dan mencegah akun berikutnya menerima data akun lama. Pesan yang sudah diterima FCM dapat tetap muncul sebagai pesan generik. [Firebase callable Functions](https://firebase.google.com/docs/functions/callable) · [Expo SecureStore SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/securestore/)

`SESSION_OPENED` dipicu oleh update status Firestore menjadi `DIBUKA`. `SCHEDULE_CHANGED` membandingkan waktu mulai/selesai yang dinormalisasi dari Timestamp atau field jadwal legacy WIB. Migrasi representasi dengan waktu identik diabaikan. Permission event mengikuti transisi `MENUNGGU` ke `DITERIMA` atau `DITOLAK` pada pengaju yang sama. Sesi terjadwal di checkout menghitung status efektif dari waktu tanpa menulis ke Firestore. Pembukaan otomatis dan perubahan lokasi saja menunggu keputusan `INT-01`/`P2-05`.

Usulan store `notificationEvents/{eventId}` menyimpan `deliveries` per token dan ID yang stabil untuk kombinasi ID update Firestore, path, tipe event, dan UID. Forward retry memeriksa binding terbaru dan melewati token yang sudah terkirim, dilepas, atau dirotasi. Kegagalan sementara dengan respons yang dikenali dicoba ulang maksimal lima kali dengan jeda awal satu menit. Untuk timeout jaringan atau worker yang berhenti setelah klaim, hasil pengiriman mungkin tidak diketahui. Klaim yang dibiarkan kedaluwarsa menjadi `FAILED` tanpa pengiriman ulang, sehingga satu notifikasi dapat terlewat. Pertahankan record melampaui masa retry trigger untuk menjaga deduplikasi. Firestore dapat mengirim ulang event yang sama. Penerimaan pesan di FCM dan pencatatan status Firestore merupakan dua operasi terpisah. [Trigger Firestore](https://firebase.google.com/docs/functions/firestore-events) · [Retry Functions](https://firebase.google.com/docs/functions/retries) · [Kode error FCM](https://firebase.google.com/docs/cloud-messaging/error-codes)

## Usulan integrasi untuk review

1. **Expo dan konfigurasi Android.** Setelah persetujuan `package.json` dan `package-lock.json`, pasang `expo-notifications`, `expo-crypto`, dan `expo-secure-store` lewat `npx expo install`, lalu jalankan `npx expo-doctor`. Tambahkan config plugin dan referensi `android.googleServicesFile` di `app.json` melalui CNG. Gunakan konfigurasi Firebase untuk `com.labpresensi.app` dari proyek yang sama dengan FCM pengirim. Siapkan development build Android. Service account dan private key hanya di backend. [Konfigurasi Expo Notifications](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/#configuration) · [Expo Crypto SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/crypto/)
2. **Lifecycle dan auth.** Kaitkan satu instance `createNotificationClient` ke runtime di `src/app/_layout.tsx`. Pasok `expo-notifications`, `Platform.OS`, `getFunctions(app, region)`, Firebase Auth UID terkini, `Crypto.randomUUID`, dan SecureStore `getItemAsync`/`setItemAsync`. Saat profil siap, panggil `start(uid, false, onResult)` dan tampilkan fallback permission beserta aksi yang memanggil `start(uid, true, onResult)`. Periksa kembali status saat pengguna kembali dari pengaturan perangkat. Bersihkan listener saat akun berganti. Di `src/features/auth/AuthContext.tsx`, panggil `revokeBeforeLogout(uid)` sebelum `signOut` dan tangani hasilnya.
3. **Route dan layar tujuan.** Pasang `connectNotificationLifecycle` sekali di Android ketika root dapat mengakses auth dan Expo Router. Teruskan `router.navigate` sebagai callback dan panggil `flush()` ketika auth atau router selesai dipulihkan. Gunakan `useLocalSearchParams` di `src/app/index.tsx` untuk membaca `sesiId` atau `izinId` dan `notificationEventId`. Integrasikan dengan `src/navigation/` agar Praktikan masuk ke Jadwal atau Izin Saya dan Asisten masuk ke sesi di Kelola. Layar tujuan menampilkan detail dari daftar milik akun aktif. Parameter URL adalah input eksternal, sehingga layar harus memeriksa bahwa dokumen termasuk hasil query yang sudah diotorisasi untuk pengguna tersebut. [Expo Router SDK 58](https://docs.expo.dev/versions/v58.0.0/sdk/router/)
4. **Functions dan Rules.** Siapkan scaffold `functions/` dan konfigurasi `firebase.json` melalui integrator. Tempatkan factory berikut di entry point Functions. Gunakan region yang sama pada client callable dan Functions. Setujui format `notificationEvents` dan field backend `revision` pada token sebelum deploy. Pertahankan penolakan akses langsung client ke kedua collection tersebut saat mereview `firestore.rules`. Review `firestore.indexes.json` jika aturan indeks berubah. Query yang dipakai store menggunakan equality satu field `token` atau `uid`. [Firebase Admin Messaging](https://firebase.google.com/docs/cloud-messaging/send/admin-sdk) · [Transaksi Firestore](https://firebase.google.com/docs/firestore/manage-data/transactions)

```ts
const handlers = createNotificationFunctions(
  createFirestoreNotificationStore(getFirestore(), () => Timestamp.now()),
  getMessaging(),
);

export const registerNotificationToken = onCall({ region }, handlers.registerNotificationToken);
export const revokeNotificationToken = onCall({ region }, handlers.revokeNotificationToken);
export const notifySessionUpdated = onDocumentUpdated(
  { document: 'sesi/{sesiId}', region, retry: true }, handlers.onSessionUpdated,
);
export const notifyPermissionUpdated = onDocumentUpdated(
  { document: 'izin/{izinId}', region, retry: true }, handlers.onPermissionUpdated,
);
```

Contoh tersebut memakai `initializeApp()` melalui bootstrap Functions dan impor Firebase Admin/Functions dari scaffold integrator.

## Bukti pengujian

Node.js `v24.21.0`, TypeScript dari lockfile repo, Windows PowerShell. Tiga belas pengujian modul lulus. Kolom end-to-end mencakup Firebase project/Functions terpasang, perangkat Android, dan hasil FCM asli. Saat pemeriksaan ADB belum menemukan perangkat dan workspace belum berisi `google-services.json`.

| Test ID | Hasil aktual pada pengujian modul | End-to-end |
|---|---|---|
| P3-T01 | Permission granted tersedia sesudah channel disiapkan. | Not Tested |
| P3-T02 | Penolakan menghasilkan fallback pengaturan perangkat. | Not Tested |
| P3-T03 | Binding dibuat untuk Auth UID. UID berbeda dan request tanpa auth ditolak. | Not Tested |
| P3-T04 | Token baru menggantikan token lama. Respons pembacaan token awal yang terlambat tidak menimpa rotasi. | Not Tested |
| P3-T05 | Logout melepas binding. Akun lain dan request registrasi terlambat tidak mengaktifkan kembali binding lama. Perangkat dapat mendaftar ulang untuk akun baru. | Not Tested |
| P3-T06 | Hanya dua praktikan dalam roster dikirim `SESSION_OPENED`. Update status yang sama diabaikan. | Not Tested |
| P3-T07 | Praktikan dan asisten terdampak ditargetkan. Migrasi waktu ekuivalen diabaikan. | Not Tested |
| P3-T08 | Notifikasi keputusan diterima hanya dikirim ke pengaju. | Not Tested |
| P3-T09 | Notifikasi keputusan ditolak hanya dikirim ke pengaju. Penggantian UID pada update diabaikan. | Not Tested |
| P3-T10 | Replay bersamaan tidak menggandakan kiriman. Retry parsial mengulang token gagal sementara. Klaim lama dan hasil ambigu tidak memicu pengiriman ulang. | Not Tested |
| P3-T11 | Handler foreground mengizinkan tampilan untuk akun tujuan dan menolak akun lain. | Not Tested |
| P3-T12 | Respons cold start ditahan sampai auth dan navigasi siap. Pengiriman dan rendering OS memerlukan Android development build. | Not Tested |
| P3-T13 | Tap menghasilkan parameter sesi atau izin yang sesuai dan mengabaikan payload invalid. Tampilan detail menunggu wiring route. | Not Tested |
| P3-T14 | Token invalid dinonaktifkan dan dilewati pada event berikutnya. Respons invalid yang terlambat tidak menonaktifkan token hasil rotasi. | Not Tested |

`npx expo lint` dan `npx tsc --noEmit` lulus. Diff terhadap `origin/main` hanya berisi modul milik Programmer 3 dan dokumen ini.

Regresi Sprint 2 menggunakan Firebase Auth dan Firestore Emulator dengan proyek `demo-labpresensi`. Suite asli berhenti saat Node memuat `expo-symbols`. Runner sementara memakai stub ikon dan memeriksa tab awal Beranda yang berlaku pada `origin/main`. Sembilan pemeriksaan lulus, mencakup registrasi, render per role, AI, katalog, sesi, dan keputusan izin. Pemeriksaan selanjutnya berhenti karena listener setelah skenario presensi tidak menerima data yang diharapkan dalam 30 detik. Regresi Sprint 2 masih terverifikasi sebagian.

Untuk mengulang pengujian modul pada Windows, jalankan dari root repo.

```powershell
$s3Root = (Get-Location).Path
$s3Temp = Join-Path ([IO.Path]::GetTempPath()) ('labpresensi-s3-tests-' + [guid]::NewGuid())
New-Item -ItemType Directory -Path $s3Temp | Out-Null
$s3Output = Join-Path $s3Temp 'js'
$s3Config = Join-Path $s3Temp 'tsconfig.json'
$s3Tests = @(
  'functions/src/notifications/__tests__/notificationFunctions.test.ts',
  'src/features/notifications/__tests__/notificationClient.test.ts'
)
@{
  extends = (Join-Path $s3Root 'tsconfig.json')
  compilerOptions = @{ noEmit = $false; rootDir = $s3Root; outDir = $s3Output; module = 'NodeNext'; moduleResolution = 'NodeNext' }
  files = @($s3Tests | ForEach-Object { Join-Path $s3Root $_ })
  include = @()
} | ConvertTo-Json -Depth 5 | Set-Content -Encoding UTF8 -LiteralPath $s3Config
npx.cmd tsc -p $s3Config
if ($LASTEXITCODE -ne 0) { throw 'Kompilasi tes notifikasi gagal.' }
$s3TestOutputs = @($s3Tests | ForEach-Object { Join-Path $s3Output ($_ -replace '\.ts$', '.js') })
node --test $s3TestOutputs
```
