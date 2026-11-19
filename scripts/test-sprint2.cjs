// Jalankan dengan emulator Auth :19319 dan Firestore :18319 untuk demo-labpresensi.
const assert = require('node:assert/strict');
const { readFileSync, existsSync } = require('node:fs');
const path = require('node:path');
const Module = require('node:module');
const { randomUUID } = require('node:crypto');
const ts = require('typescript');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth, connectAuthEmulator, createUserWithEmailAndPassword } = require('firebase/auth');
const fs = require('firebase/firestore');

const root = path.resolve(__dirname, '..');
const projectId = 'demo-labpresensi';
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST ?? '127.0.0.1:18319';
const portMatch = /^127\.0\.0\.1:([0-9]{1,5})$/.exec(firestoreHost);
assert.ok(portMatch && Number(portMatch[1]) > 0 && Number(portMatch[1]) <= 65535,
  'FIRESTORE_EMULATOR_HOST harus berupa 127.0.0.1:<port emulator>.');
const firestorePort = Number(portMatch[1]);
const apps = [];
const run = randomUUID().slice(0, 8);
const password = randomUUID();
let checks = 0;
function pass(name) { console.log('PASS', ++checks, name); }
function ok(result) { assert.equal(result.ok, true, JSON.stringify(result)); return result.data; }
const clients = [];

// Muat service aplikasi tanpa Metro. Hanya modul inisialisasi Firebase yang diganti,
// sehingga setiap klien menggunakan SDK sebenarnya dengan Auth dan database lokal sendiri.
function client() {
  const app = initializeApp({ projectId, apiKey: 'demo-local-test' }, randomUUID());
  apps.push(app);
  const auth = getAuth(app);
  connectAuthEmulator(auth, 'http://127.0.0.1:19319', { disableWarnings: true });
  const db = fs.getFirestore(app);
  fs.connectFirestoreEmulator(db, '127.0.0.1', firestorePort);
  const cache = new Map();
  const viewAuth = { user: null, loading: false, notice: null };
  function load(file) {
    const base = path.resolve(root, file);
    const filename = /\.tsx?$/.test(base) ? base : existsSync(base + '.web.tsx') ? base + '.web.tsx' :
      existsSync(base + '.ts') ? base + '.ts' : base + '.tsx';
    if (cache.has(filename)) return cache.get(filename);
    const mod = new Module(filename, module);
    const normal = Module.createRequire(filename);
    mod.require = name => {
      if (name === 'react-native') return normal('react-native-web');
      if (name === 'react-native-safe-area-context') return { SafeAreaView: normal('react-native-web').View };
      if (name === '@/features/auth/AuthContext') return { useAuth: () => viewAuth };
      if (name === '@/lib/firebase') return { db, auth };
      if (name.startsWith('@/')) return load('src/' + name.slice(2));
      if (name.startsWith('.')) return load(path.resolve(path.dirname(filename), name));
      return normal(name);
    };
    mod._compile(ts.transpileModule(readFileSync(filename, 'utf8'), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true
    } }).outputText, filename);
    cache.set(filename, mod.exports);
    return mod.exports;
  }
  const c = { db, auth, load, viewAuth, account: load('src/features/auth/authService'),
    classes: load('src/features/kelola/kelolaService'), sessions: load('src/features/kelola/sesiService'),
    attendance: load('src/features/jadwal/services/jadwalService'), leave: load('src/features/izin/services/izinService'),
    recap: load('src/features/rekap/rekapService') };
  clients.push(c);
  return c;
}

function observe(subscribe, accepts) {
  const timeout = new Error('Listener tidak menerima data yang diharapkan dalam 30 detik.');
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { stop(); reject(timeout); }, 30000);
    const stop = subscribe(rows => {
      if (accepts(rows)) { clearTimeout(timer); stop(); resolve(rows); }
    }, error => { clearTimeout(timer); stop(); reject(error); });
  });
}

// Tunggu beberapa perubahan pada listener yang sama, termasuk event yang tiba selama write.
function follow(subscribe, label) {
  let rows, failure, notify;
  let events = 0;
  const stop = subscribe(value => {
    rows = value;
    events++;
    notify?.();
  }, error => { failure = error; notify?.(); });
  return {
    stop,
    get events() { return events; },
    until(accepts) {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          notify = undefined;
          reject(new Error(label + ' belum menerima snapshot yang ditunggu dalam 30 detik.'));
        }, 30000);
        notify = () => {
          if (!failure && (rows === undefined || !accepts(rows))) return;
          clearTimeout(timer);
          notify = undefined;
          if (failure) reject(failure);
          else resolve(rows);
        };
        notify();
      });
    },
  };
}

async function testLiveRecap(session, otherSession, viewer, approver, student, user, owner, another) {
  const recap = follow((next, fail) => viewer.recap.subscribeRecap(session, next, fail), 'Rekap');
  const inbox = follow((next, fail) => student.leave.subscribeToMyIzin(user.uid, next, fail), 'Izin Saya');
  const history = follow((next, fail) => student.recap.subscribeHistory(user.uid, next, fail), 'Riwayat');
  const recordId = session.id + '_' + user.uid;
  const matchesStatus = status => rows => rows.length === 2
    && rows.some(row => row.uid === user.uid && row.status === status)
    && rows.some(row => row.uid === another.uid && row.status === 'Belum Hadir');
  try {
    await recap.until(matchesStatus('Belum Hadir'));
    await history.until(rows => rows.every(row => row.id !== recordId));
    const request = ok(await student.leave.submitIzin(session, user, 'Pengujian sinkronisasi dua peran.'));
    await inbox.until(rows => rows.some(row => row.id === request.id && row.status === 'MENUNGGU'));
    ok(await approver.leave.decideIzin(request, owner.uid, 'DITERIMA'));
    const approved = (await fs.getDocFromServer(fs.doc(student.db, 'izin', request.id))).data();
    assert.equal(approved.status, 'DITERIMA');
    assert.equal(approved.diputuskanOleh, owner.uid);
    assert.ok(Number.isFinite(Date.parse(approved.waktuKeputusan)));
    await inbox.until(rows => rows.some(row => row.id === request.id && row.status === 'DITERIMA'));
    const excused = await recap.until(matchesStatus('Izin'));
    assert.equal(excused.filter(row => row.status === 'Hadir').length, 0);
    ok(await approver.sessions.openSesi(session.id, owner.uid));
    ok(await student.attendance.createPresensi({ ...session, status: 'DIBUKA' }, user));
    const present = await recap.until(matchesStatus('Hadir'));
    assert.equal(present.filter(row => row.status === 'Hadir').length, 1);
    const time = present.find(row => row.uid === user.uid).time;
    assert.ok(Number.isFinite(Date.parse(time)));
    await history.until(rows => rows.some(row => row.id === recordId && row.time === time));
  } finally {
    recap.stop();
    history.stop();
    inbox.stop();
  }
  const events = recap.events;
  await observe((next, fail) => viewer.recap.subscribeRecap(otherSession, next, fail), matchesStatus('Belum Hadir'));
  await observe((next, fail) => viewer.recap.subscribeRecap(session, next, fail), matchesStatus('Hadir'));
  assert.equal(recap.events, events);
  ok(await approver.sessions.closeSesi(session.id, owner.uid));
  pass('Satu listener Belum Hadir → Izin (0/2) → Hadir (1/2), riwayat live, ganti sesi dan kembali');
}

async function testAi(service) {
  const { createServer } = require('node:http');
  const server = createServer(async (req, res) => {
    let body = '';
    for await (const chunk of req) body += chunk;
    assert.deepEqual(JSON.parse(body), { text: 'Alasan sintetis' });
    if (req.url === '/network') return req.socket.destroy();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (req.url === '/slow') return res.write('{');
    res.end(req.url === '/ok' ? '{"kategori":"UJI"}' : '{}');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = 'http://127.0.0.1:' + server.address().port;
  const original = process.env.EXPO_PUBLIC_AI_API_URL;
  try {
    for (const [route, expected] of [['','NOT_IMPLEMENTED'],['/ok','UJI'],['/bad','BAD_RESPONSE'],
      ['/network','NETWORK'],['/slow','TIMEOUT']]) {
      process.env.EXPO_PUBLIC_AI_API_URL = route ? url + route : '';
      const start = Date.now();
      const result = await service.classifyReason('Alasan sintetis');
      assert.equal(result.ok ? result.kategori : result.code, expected);
      if (route === '/slow') assert.ok(Date.now() - start >= 9900);
    }
  } finally {
    if (original === undefined) delete process.env.EXPO_PUBLIC_AI_API_URL;
    else process.env.EXPO_PUBLIC_AI_API_URL = original;
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
  pass('AI terkonfigurasi, API kosong/gagal, JSON salah dan timeout 10 detik saat membaca body');
}

async function offlineWrite(student, session, user, whileOffline) {
  const states = [];
  let notifyPending;
  const pending = new Promise(resolve => { notifyPending = resolve; });
  const stop = student.attendance.subscribeToPresensi(session.id, user.uid, (row, local) => {
    states.push({ present: !!row, local });
    if (local) notifyPending();
  }, error => { throw error; });
  await fs.disableNetwork(student.db);
  const write = student.attendance.createPresensi(session,user);
  try {
    const timeout = AbortSignal.timeout(8000);
    await Promise.race([pending, new Promise((_,reject) => timeout.addEventListener('abort',() => reject(Error('pending timeout'))))]);
    assert.ok(states.every(state => !state.present));
    if (whileOffline) await whileOffline();
  } finally {
    await fs.enableNetwork(student.db);
    stop();
  }
  return write;
}

// Fixture administratif hanya menulis ke emulator loopback proyek demo.
async function seedEmulator(collectionName, id, data) {
  function encode(value) {
    if (value === null) return { nullValue: null };
    if (typeof value === 'boolean') return { booleanValue: value };
    if (value instanceof Date) return { timestampValue: value.toISOString() };
    if (Array.isArray(value)) return { arrayValue: { values: value.map(encode) } };
    return { stringValue: value };
  }
  const fields = Object.fromEntries(Object.entries(data).map(([key, value]) => [key, encode(value)]));
  const url = 'http://' + firestoreHost + '/v1/projects/' + projectId + '/databases/(default)/documents/' + collectionName + '/' + id;
  const result = await fetch(url, { method: 'PATCH', headers: { Authorization: 'Bearer owner',
    'Content-Type': 'application/json' }, body: JSON.stringify({ fields }) });
  assert.equal(result.ok, true, await result.text());
}

async function main() {
  process.env.EXPO_PUBLIC_AI_API_URL = '';
  fs.setLogLevel(process.argv.includes('--trace-firestore') ? 'warn' : 'silent');
  const a = client(), twin = client(), b = client(), admin = client(), student = client(), second = client();
  async function register(c, name, role, nim = '00123456789012') {
    return ok(await c.account.registerAccount({ nama: name, nim,
      email: name + run + '@example.test', password, role }));
  }
  if (process.argv.includes('--legacy-schedule-rules')) {
    const email = 'legacy-' + run + '@example.test';
    const { user } = await createUserWithEmailAndPassword(a.auth, email, password);
    await seedEmulator('users', user.uid, {
      uid: user.uid, nama: 'Asisten lama', email, role: 'ASISTEN', nim: null, createdAt: new Date().toISOString(),
    });
    await assert.rejects(fs.getDocFromServer(fs.doc(a.db, 'katalogKelas', 'qa-' + run)), { code: 'permission-denied' });
    pass('Rules lama menolak katalog yang diperlukan klien baru');
    return;
  }
  const owner = await register(a, 'Asisten', 'ASISTEN');
  const other = await register(b, 'AsistenB', 'ASISTEN');
  const nimPrefix = String(parseInt(run, 16)).padStart(13, '0');
  const user = await register(student, 'Praktikan', 'PRAKTIKAN', nimPrefix + '1');
  const another = await register(second, 'PraktikanB', 'PRAKTIKAN', nimPrefix + '2');
  const provisioned = await register(admin, 'AdminQA', 'ASISTEN');
  await seedEmulator('users', provisioned.uid, { ...provisioned, role: 'ADMIN' });
  ok(await twin.account.loginAccount({ email: owner.email, password }));
  assert.equal(owner.nim, '00123456789012');
  for (const nim of ['123', '123456789012345', '0012345678901A']) {
    assert.ok(a.account.validateCredentials({ email: owner.email, password }, { ...owner, nim }));
  }
  assert.ok(a.account.validateCredentials({ email: owner.email, password }, { ...owner, role: 'ADMIN' }));
  await assert.rejects(fs.updateDoc(fs.doc(a.db, 'users', owner.uid), { role: 'ADMIN' }), { code: 'permission-denied' });
  ok(await student.account.logoutAccount());
  assert.equal((await student.account.loginAccount({ email: user.email, password: 'incorrect' })).ok, false);
  ok(await student.account.loginAccount({ email: user.email, password }));
  pass('Registrasi, NIM 14 angka, login ulang dan role Admin terproteksi');
  const router = a.load('src/navigation/AppRouter').AppRouter;
  function render(profile) {
    a.viewAuth.user = profile;
    return require('react-dom/server').renderToStaticMarkup(require('react').createElement(router));
  }
  assert.match(render(null), /aria-label="Masuk"/);
  assert.match(render(owner), /aria-label="Rekap"/);
  assert.match(render(user), /aria-label="Jadwal"/);
  assert.match(render({ ...provisioned, role: 'ADMIN' }), /Kelola kelas/);
  pass('Render terpisah untuk login, asisten, praktikan dan admin');
  await testAi(a.load('src/features/ai/aiService'));

  const katalogId = 'kelas-' + run;
  const lokasiId = 'lab-' + run;
  const catalog = { nama: 'IF-A ' + run, praktikum: 'PBP', pesertaUids: [user.uid] };
  if (process.argv.includes('--legacy-catalog-nim-rules')) {
    const byNim = await admin.classes.saveClassCatalogByNim(katalogId, { ...catalog, roster: user.nim });
    assert.equal(byNim.code, 'CATALOG_ROSTER_READ_DENIED', JSON.stringify(byNim));
    const catalogRef = fs.doc(admin.db, 'katalogKelas', katalogId);
    assert.equal((await fs.getDocFromServer(catalogRef)).exists(), false);
    ok(await admin.classes.saveCatalogEntry('katalogKelas', katalogId, catalog));
    assert.equal((await fs.getDocFromServer(catalogRef)).exists(), true);
    pass('Rules sebelum fitur NIM membolehkan tulis katalog oleh Admin tetapi menolak pencarian profil mahasiswa');
    return;
  }
  await assert.rejects(fs.setDoc(fs.doc(a.db, 'katalogKelas', katalogId), catalog), { code: 'permission-denied' });
  assert.equal((await a.classes.saveCatalogEntry('katalogKelas', katalogId, catalog)).code, 'CATALOG_WRITE_DENIED');
  assert.equal((await admin.classes.saveClassCatalogByNim(katalogId,
    { ...catalog, roster: user.nim + '\n' + user.nim })).code, 'DUPLICATE_NIM');
  assert.deepEqual(ok(await admin.classes.lookupCatalogStudents([user.nim])),
    [{ uid: user.uid, nama: user.nama, nim: user.nim }]);
  ok(await admin.classes.saveClassCatalogByNim(katalogId, { ...catalog, roster: user.nim }));
  assert.ok((await admin.classes.checkCatalogPair(katalogId, catalog)).ok);
  const samePair = { nama: ' if-a  ' + run + ' ', praktikum: 'pbp' };
  assert.equal((await admin.classes.checkCatalogPair(undefined, samePair)).code, 'DUPLICATE_PAIR');
  assert.equal((await admin.classes.saveClassCatalogByNim(undefined, { ...samePair, roster: user.nim })).code, 'DUPLICATE_PAIR');
  const originalCatalog = (await fs.getDocFromServer(fs.doc(admin.db, 'katalogKelas', katalogId))).data();
  assert.deepEqual(originalCatalog.pesertaUids, [user.uid]);
  assert.ok(originalCatalog.createdAt instanceof fs.Timestamp);
  assert.deepEqual(ok(await admin.classes.loadCatalogNims([user.uid])), [user.nim]);
  ok(await admin.classes.saveClassCatalogByNim(katalogId, { ...catalog, roster: another.nim + ', ' + user.nim }));
  const edited = (await fs.getDocFromServer(fs.doc(admin.db, 'katalogKelas', katalogId))).data();
  assert.ok(edited.createdAt.isEqual(originalCatalog.createdAt));
  assert.deepEqual(edited.pesertaUids, [another.uid, user.uid]);
  assert.deepEqual(ok(await admin.classes.loadCatalogNims(edited.pesertaUids)), [another.nim, user.nim]);
  ok(await admin.classes.saveClassCatalogByNim(katalogId, { ...catalog, roster: user.nim }));
  assert.equal((await admin.classes.loadCatalogNims(['missing-' + run])).code, 'UNRESOLVED_ROSTER');
  assert.equal((await admin.classes.saveClassCatalogByNim(katalogId, { ...catalog, roster: '123' })).code, 'INVALID_NIM');
  assert.equal((await admin.classes.saveClassCatalogByNim(katalogId, { ...catalog, roster: nimPrefix + '9' })).code, 'NIM_NOT_FOUND');
  const duplicate = client();
  await register(duplicate, 'NimGanda', 'PRAKTIKAN', another.nim);
  assert.equal((await admin.classes.saveClassCatalogByNim(katalogId, { ...catalog, roster: another.nim })).code, 'NIM_AMBIGUOUS');
  assert.deepEqual((await fs.getDocFromServer(fs.doc(admin.db, 'katalogKelas', katalogId))).data().pesertaUids, [user.uid]);
  await assert.rejects(fs.getDocsFromServer(fs.query(fs.collection(student.db, 'users'),
    fs.where('role', '==', 'PRAKTIKAN'), fs.where('nim', '==', another.nim))), { code: 'permission-denied' });
  pass('Katalog memakai input NIM, mempertahankan nol di awal, menyimpan UID dan menolak kecocokan ambigu');
  ok(await admin.classes.saveCatalogEntry('lokasiPraktikum', lokasiId, { nama: 'Lab QA' }));
  assert.equal((await a.classes.createKelas({ asistenId: owner.uid, katalogId: 'missing' })).ok, false);
  const cid = ok(await a.classes.createKelas({ asistenId: owner.uid, katalogId }));
  const ref = fs.doc(a.db, 'kelas', cid);
  const kelas = (await fs.getDocFromServer(ref)).data();
  assert.deepEqual(ok(await a.classes.getPraktikanList(kelas)).map(row => row.uid), [user.uid]);
  assert.equal((await a.classes.addPeserta(cid, another.uid)).ok, false);
  const membership = follow((next, fail) => student.attendance.subscribeToStudentSessions(user.uid,
    () => {}, fail, () => {}, next), 'Kelas praktikan');
  try {
    await membership.until(rows => rows.length === 0);
    ok(await a.classes.addPeserta(cid, user.uid));
    await membership.until(rows => rows.some(row => row.id === cid));
    assert.equal((await a.classes.updateKelas(cid, { nama: 'Tidak boleh', praktikum: 'PBP' })).ok, false);
    assert.equal((await a.classes.deleteKelas(cid)).ok, false);
    ok(await admin.classes.updateKelas(cid, { nama: 'IF-A QA', praktikum: 'PBP' }));
    await membership.until(rows => rows.some(row => row.id === cid && row.nama === 'IF-A QA'));
  } finally {
    membership.stop();
  }
  pass('Katalog Admin, pembatasan roster, sinkronisasi mahasiswa dan hak edit/arsip kelas');
  const parallelPair = { nama: 'Kelas serentak ' + run, praktikum: 'PBP', pesertaUids: [user.uid] };
  const parallel = await Promise.all([admin.classes.saveUniqueClassCatalog(undefined, parallelPair),
    admin.classes.saveUniqueClassCatalog(undefined, parallelPair)]);
  assert.equal(parallel.filter(result => result.ok).length, 1, JSON.stringify(parallel));
  assert.equal(parallel.find(result => !result.ok).code, 'DUPLICATE_PAIR');
  const archiveCatalog = 'archive-' + run;
  ok(await admin.classes.saveUniqueClassCatalog(archiveCatalog, {
    nama: 'Katalog arsip ' + run, praktikum: 'PBP', pesertaUids: [another.uid, user.uid],
  }));
  const visibleCatalog = await observe((next, fail) => admin.classes.subscribeCatalog('katalogKelas', next, fail),
    rows => rows.some(row => row.id === archiveCatalog) && rows.some(row => row.id === katalogId));
  assert.equal(admin.classes.latestCatalogClass(visibleCatalog).id, archiveCatalog);
  assert.equal(admin.classes.latestCatalogClass([]), undefined);
  assert.deepEqual(ok(await admin.classes.loadRosterPreview([another.uid, user.uid])),
    [{ id: another.uid, nama: another.nama }, { id: user.uid, nama: user.nama }]);
  const archiveClass = ok(await a.classes.createKelas({ asistenId: owner.uid, katalogId: archiveCatalog }));
  const targets = [{ kind: 'kelas', id: archiveClass }, { kind: 'katalogKelas', id: archiveCatalog }];
  assert.equal((await a.classes.archiveAdminClasses(targets)).ok, false);
  assert.equal((await fs.getDocFromServer(fs.doc(admin.db, 'kelas', archiveClass))).data().archived, undefined);
  ok(await admin.classes.archiveAdminClasses(targets));
  for (const target of targets) {
    assert.equal((await fs.getDocFromServer(fs.doc(admin.db, target.kind, target.id))).data().archived, true);
  }
  const remainingCatalog = await observe((next, fail) => admin.classes.subscribeCatalog('katalogKelas', next, fail),
    rows => rows.some(row => row.id === katalogId) && !rows.some(row => row.id === archiveCatalog));
  assert.notEqual(admin.classes.latestCatalogClass(remainingCatalog).id, archiveCatalog);
  pass('Pasangan katalog unik pada simpan paralel, urutan preview dan arsip massal atomik');

  const base = { kelasId: cid, asistenId: owner.uid, lokasiId, lab: 'Lab QA', tanggal: '2028-02-29',
    jamMulai: '08:00', jamSelesai: '10:00' };
  const schedule = a.load('src/features/kelola/schedule');
  const clock = a.load('src/features/kelola/sessionClock');
  const leap = schedule.parseDate(base.tanggal);
  assert.equal(schedule.dateKey(leap), base.tanggal);
  assert.equal(schedule.parseDate('2027-02-29'), null);
  assert.equal(clock.scheduledTime(base.tanggal, base.jamMulai), Date.parse('2028-02-29T01:00:00Z'));
  assert.equal(schedule.dateKey(clock.todayWib(new Date('2026-11-19T18:00:00Z'))), '2026-11-20');
  for (const patch of [{ jamSelesai: '09:59' }, { jamSelesai: '10:01' }, { jamSelesai: '08:00' },
    { tanggal: '2025-01-01' }, { tanggal: '2028-02-31' }, { lokasiId: '' }]) {
    assert.equal((await a.sessions.createSesi({ ...base, ...patch })).ok, false);
  }
  const first = ok(await a.sessions.createSesi({ ...base, date: leap, start: 480, end: 600 }));
  const firstRef = fs.doc(a.db, 'sesi', first);
  const upcoming = (await fs.getDocFromServer(firstRef)).data();
  assert.equal(upcoming.startAt.toMillis(), clock.scheduledTime(base.tanggal, base.jamMulai));
  assert.equal(upcoming.endAt.toMillis() - upcoming.startAt.toMillis(), 7_200_000);
  assert.equal(clock.effectiveSessionStatus(upcoming, upcoming.startAt.toMillis() - 1), 'BELUM_DIBUKA');
  assert.equal(clock.effectiveSessionStatus(upcoming, upcoming.startAt.toMillis()), 'DIBUKA');
  assert.equal(clock.effectiveSessionStatus(upcoming, upcoming.endAt.toMillis()), 'DITUTUP');
  assert.equal((await a.sessions.openSesi(first, owner.uid)).ok, false);
  await assert.rejects(fs.updateDoc(firstRef, { archived: true }), { code: 'permission-denied' });
  assert.equal((await a.sessions.markAssistantPresent(upcoming, owner.uid)).ok, false);
  await assert.rejects(fs.updateDoc(firstRef, { endAt: fs.Timestamp.fromMillis(upcoming.endAt.toMillis() + 1) }),
    { code: 'permission-denied' });
  ok(await a.sessions.updateSesi(first, owner.uid, base));
  pass('Picker, WIB, durasi dua jam, tanggal lampau, timestamp, larangan hapus dan batas sesi');
  const attempts = await Promise.all([a.sessions.createSesi({ ...base, jamMulai: '10:00', jamSelesai: '12:00' }),
    twin.sessions.createSesi({ ...base, jamMulai: '11:00', jamSelesai: '13:00' })]);
  assert.equal(attempts.filter(result => result.ok).length, 1, JSON.stringify(attempts));
  assert.equal(attempts.find(result => !result.ok).code, 'SESSION_CONFLICT');
  assert.equal((await b.sessions.createSesi({ ...base, asistenId: other.uid })).ok, false);
  pass('Bentrok antartransaksi, jadwal bersisian dan kepemilikan kelas');

  const inbox = observe((next, fail) => a.leave.subscribeToAsistenIzin(owner.uid, next, fail),
    rows => rows.some(row => row.sesiId === first));
  const request = ok(await student.leave.submitIzin(upcoming, user, 'Alasan sintetis untuk pengujian.'));
  await inbox;
  const results = observe((next, fail) => student.leave.subscribeToMyIzin(user.uid, next, fail),
    rows => rows.some(row => row.id === request.id && row.status === 'DITERIMA'));
  ok(await a.leave.decideIzin(request, owner.uid, 'DITERIMA'));
  await results;
  await observe((next, fail) => a.recap.subscribeRecap(upcoming, next, fail),
    rows => rows.some(row => row.uid === user.uid && row.status === 'Izin'));
  pass('Izin mahasiswa tersimpan, masuk inbox, keputusan tampil di Izin Saya dan Rekap');

  const now = Date.now();
  const { startAt, endAt, jadwalTerdaftar, ...template } = upcoming;
  assert.ok(startAt && endAt && jadwalTerdaftar);
  const active = { ...template, id: 'active-' + run, startAt: new Date(now - 60_000), endAt: new Date(now + 7_140_000) };
  await seedEmulator('sesi', active.id, active);
  const activeSession = (await fs.getDocFromServer(fs.doc(a.db, 'sesi', active.id))).data();
  assert.equal(activeSession.status, 'BELUM_DIBUKA');
  assert.equal(clock.effectiveSessionStatus(activeSession), 'DIBUKA');
  ok(await a.sessions.markAssistantPresent(activeSession, owner.uid));
  ok(await a.sessions.markAssistantPresent(activeSession, owner.uid));
  assert.ok((await fs.getDocFromServer(fs.doc(a.db, 'presensiAsisten', active.id))).data().recordedAt);
  assert.equal((await b.sessions.markAssistantPresent(activeSession, other.uid)).ok, false);
  const recap = observe((next, fail) => a.recap.subscribeRecap(activeSession, next, fail),
    rows => rows.some(row => row.uid === user.uid && row.status === 'Hadir'));
  ok(await offlineWrite(student, activeSession, user));
  await recap;
  await observe((next, fail) => student.recap.subscribeHistory(user.uid, next, fail),
    rows => rows.some(row => row.id === active.id + '_' + user.uid));
  await observe((next, fail) => second.recap.subscribeHistory(another.uid, next, fail), rows => !rows.length);
  assert.equal((await student.attendance.createPresensi(activeSession, user)).code, 'ALREADY_CHECKED_IN');
  ok(await a.sessions.closeSesi(active.id, owner.uid));
  const closed = (await fs.getDocFromServer(fs.doc(a.db, 'sesi', active.id))).data();
  assert.equal(clock.effectiveSessionStatus(closed), 'DITUTUP');
  const expired = { ...active, id: 'expired-' + run, startAt: new Date(now - 7_260_000), endAt: new Date(now - 60_000) };
  await seedEmulator('sesi', expired.id, expired);
  const expiredSession = (await fs.getDocFromServer(fs.doc(a.db, 'sesi', expired.id))).data();
  assert.equal(clock.effectiveSessionStatus(expiredSession), 'DITUTUP');
  assert.equal((await a.sessions.markAssistantPresent(expiredSession, owner.uid)).ok, false);
  await assert.rejects(fs.setDoc(fs.doc(a.db, 'presensiAsisten', expired.id),
    { sesiId: expired.id, asistenId: owner.uid, recordedAt: fs.serverTimestamp() }), { code: 'permission-denied' });
  pass('Status otomatis, presensi asisten/praktikan, offline, riwayat pribadi dan tutup lebih awal');

  const legacy = { ...template, id: 'legacy-' + run, tanggal: '2028-03-01' };
  await seedEmulator('sesi', legacy.id, legacy);
  const secondLegacy = { ...legacy, id: 'legacy-two-' + run, tanggal: '2028-03-02' };
  await seedEmulator('sesi', secondLegacy.id, secondLegacy);
  // Tambahkan praktikan kedua yang memang diizinkan katalog sebelum skenario rekap dua peserta.
  await fs.updateDoc(fs.doc(admin.db, 'katalogKelas', katalogId), { pesertaUids: [user.uid, another.uid] });
  ok(await a.classes.addPeserta(cid, another.uid));
  await testLiveRecap(legacy, secondLegacy, a, twin, student, user, owner, another);
  ok(await admin.classes.deleteKelas(cid));
  await observe((next, fail) => student.recap.subscribeHistory(user.uid, next, fail),
    rows => rows.some(row => row.id === active.id + '_' + user.uid));
  pass('Jalur sesi legacy dan riwayat tetap terbaca setelah arsip kelas');
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(async () => {
  await Promise.all(clients.map(c => fs.terminate(c.db)));
  await Promise.all(apps.map(app => deleteApp(app)));
});
