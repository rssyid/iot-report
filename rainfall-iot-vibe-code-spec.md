# Rainfall IoT Dashboard — Vibe Coding Specification

## 1. Tujuan MVP

Bangun aplikasi web untuk:

1. Mengambil data curah hujan harian dari endpoint `GetArsStation4Weeks`.
2. Menyimpan data sejak `2025-01-01` sampai tanggal berjalan ke Neon PostgreSQL.
3. Menampilkan tabel data harian dan grafik ringkas.
4. Menyediakan agregat mingguan berdasarkan kalender minggu GIS yang diberikan.
5. Menyediakan tombol manual untuk sinkronisasi data sampai tanggal tertentu.
6. Menyimpan data secara idempotent sehingga proses sinkronisasi dapat diulang tanpa duplikasi.

MVP belum perlu authentication, export, alert, peta, atau fitur analitik lanjutan.

## 2. Konteks API sumber

Endpoint:

```text
POST https://app.gis-div.com/iot/Service/webservice.asmx/GetArsStation4Weeks
```

Payload:

```json
{
  "companycode": "PT.JJP",
  "endingdate": "2026-09-24",
  "arsiran": "7"
}
```

Catatan penting:

- API mengembalikan format ASP.NET Web Services dengan wrapper `d`.
- `d` berisi array string JSON, bukan array objek langsung.
- String pertama berisi data per station dengan kolom tanggal dinamis seperti `8-28`, `9-24`, dan `MTD`.
- String kedua berisi ringkasan harian seperti `AvgHarian`, `Tanggal2`, dan `avgharian1`.
- Jangan menyimpan kolom tanggal dinamis sebagai kolom PostgreSQL. Normalisasi menjadi baris per tanggal.
- Nilai harian station adalah angka curah hujan, diasumsikan milimeter (`mm`). Konfirmasi unit ke pemilik API bila diperlukan.
- `arsiran` gunakan nilai default `7`, tetapi jadikan environment variable atau konfigurasi.

Contoh parsing konseptual:

```ts
const outer = await response.json();
const payload = Array.isArray(outer.d) ? outer.d : [];
const stationRows = JSON.parse(payload[0] ?? '[]');
const dailySummaryRows = JSON.parse(payload[1] ?? '[]');
```

## 3. Stack yang disarankan

Gunakan stack yang konsisten dengan aplikasi modern full-stack:

- Next.js App Router + TypeScript.
- PostgreSQL Neon.
- Drizzle ORM atau Prisma. Pilih satu dan gunakan konsisten; rekomendasi: Drizzle ORM karena schema SQL lebih eksplisit.
- Zod untuk validasi payload dan query parameter.
- Recharts untuk grafik.
- Tailwind CSS untuk UI.
- `date-fns` untuk manipulasi tanggal.
- `p-limit` atau mekanisme concurrency sederhana untuk membatasi request API eksternal.

Jangan memanggil API eksternal langsung dari browser. Semua request harus melalui server route/server action agar API source tidak terekspos dan agar parsing serta retry terkontrol.

## 4. Environment variables

Buat `.env.example`:

```env
DATABASE_URL="postgresql://..."
RAINFALL_API_URL="https://app.gis-div.com/iot/Service/webservice.asmx/GetArsStation4Weeks"
RAINFALL_ARSIRAN="7"
RAINFALL_START_DATE="2025-01-01"
APP_TIMEZONE="Asia/Jakarta"
SYNC_MAX_CONCURRENCY="2"
```

Jangan commit `.env` atau credential Neon.

## 5. Model data PostgreSQL

Gunakan tabel berikut.

### 5.1 companies

Master perusahaan.

```sql
create table companies (
  id uuid primary key default gen_random_uuid(),
  company_code varchar(30) not null unique,
  company_name text not null,
  region text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

### 5.2 estates

Master estate. Satu company dapat memiliki banyak estate.

```sql
create table estates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id),
  est_code varchar(30) not null,
  est_alias varchar(30),
  est_complete text not null,
  wilayah varchar(30),
  display_order integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, est_code)
);
```

Mapping data yang diberikan:

- `company_code` masuk ke `companies.company_code`.
- `company_name` masuk ke `companies.company_name` setelah trim whitespace.
- `Region` masuk ke `companies.region`.
- `est_code`, `est_alias`, `est_complete`, `wilayah`, dan `order` masuk ke `estates`.
- Konversi `order` dari string ke integer.
- Karena satu company dapat muncul di lebih dari satu region, jangan menjadikan `company_code` dan `region` sebagai duplikasi company tanpa alasan. MVP gunakan satu company berdasarkan `company_code`; bila region berbeda, simpan region terbaru/non-null atau buat tabel company_regions pada fase berikutnya.

### 5.3 rain_stations

Station yang muncul dari API. Station tidak selalu identik dengan estate master, jadi simpan sebagai entitas terpisah dan hubungkan ke estate bila dapat dicocokkan.

```sql
create table rain_stations (
  id uuid primary key default gen_random_uuid(),
  station_id varchar(80) not null unique,
  company_id uuid references companies(id),
  estate_id uuid references estates(id),
  source_est_code varchar(30),
  location text,
  first_seen_at timestamptz,
  last_seen_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Matching station:

1. Cari `company_id` berdasarkan `CompanyCode`.
2. Cari `estate_id` berdasarkan `company_id + EstCode`.
3. Simpan `source_est_code` walaupun estate belum ditemukan.
4. Jangan gagal total hanya karena satu station belum ada di master estate.

### 5.4 calendar_weeks

Import isi file `calendar_weeks.json` yang diberikan user. File tersebut menjadi sumber kalender minggu GIS, bukan menghitung minggu ISO secara otomatis.

```sql
create table calendar_weeks (
  id integer primary key,
  month integer not null,
  year integer not null,
  week integer not null,
  start_date date not null,
  end_date date not null,
  week_name varchar(30) not null,
  formatted_name varchar(80) not null,
  gis_week_id integer not null unique,
  unique(year, month, week)
);
```

Catatan:

- Minggu dapat dimulai pada akhir bulan sebelumnya dan berakhir pada bulan berikutnya.
- Gunakan `start_date <= rain_date and rain_date <= end_date` untuk assignment.
- Kolom `month` adalah bulan kalender yang ditetapkan file, bukan selalu `month(start_date)`.
- Seed calendar dari file JSON secara idempotent.
- Data file yang diberikan mencakup kalender 2025 dan 2026 sampai akhir 2026; sediakan mekanisme seed ulang untuk kalender tambahan.

### 5.5 rainfall_daily

Tabel fakta utama. Satu baris mewakili satu station pada satu tanggal.

```sql
create table rainfall_daily (
  id bigserial primary key,
  company_id uuid references companies(id),
  estate_id uuid references estates(id),
  station_id uuid not null references rain_stations(id),
  rain_date date not null,
  rainfall_mm numeric(12,2) not null default 0,
  source_mtd numeric(12,2),
  source_arsiran integer not null default 7,
  source_ending_date date,
  raw_date_key varchar(20),
  import_batch_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(station_id, rain_date)
);

create index rainfall_daily_date_idx on rainfall_daily(rain_date);
create index rainfall_daily_company_date_idx on rainfall_daily(company_id, rain_date);
create index rainfall_daily_estate_date_idx on rainfall_daily(estate_id, rain_date);
```

Prinsip penyimpanan:

- `rainfall_mm` berasal dari key tanggal dinamis, bukan `MTD`.
- `MTD` hanya metadata sumber dan tidak digunakan untuk menjumlahkan data harian.
- Jika API mengembalikan nilai kosong/null, normalisasi menjadi `0` hanya bila makna API memang berarti tidak ada hujan. Bila tidak yakin, gunakan nullable dan tampilkan status kualitas data. Untuk MVP, gunakan `0` sesuai contoh API dan simpan raw response/log.
- Upsert berdasarkan `(station_id, rain_date)`.

### 5.6 rainfall_weekly

MVP boleh menghitung agregat mingguan dengan SQL view, bukan menyimpan tabel terpisah. Rekomendasi awal: gunakan view agar selalu konsisten dengan data harian.

```sql
create or replace view rainfall_weekly as
select
  cw.gis_week_id,
  cw.year,
  cw.month,
  cw.week,
  cw.week_name,
  cw.formatted_name,
  cw.start_date,
  cw.end_date,
  rd.company_id,
  rd.estate_id,
  rd.station_id,
  sum(rd.rainfall_mm)::numeric(12,2) as rainfall_mm,
  count(*)::integer as observed_days,
  count(*) filter (where rd.rainfall_mm > 0)::integer as rainy_days
from rainfall_daily rd
join calendar_weeks cw
  on rd.rain_date between cw.start_date and cw.end_date
group by
  cw.gis_week_id, cw.year, cw.month, cw.week, cw.week_name,
  cw.formatted_name, cw.start_date, cw.end_date,
  rd.company_id, rd.estate_id, rd.station_id;
```

Jika performa view menjadi masalah, fase berikutnya dapat mengganti dengan materialized view atau tabel agregat yang direbuild setelah sync.

### 5.7 sync_batches

Audit dan progress sinkronisasi.

```sql
create table sync_batches (
  id uuid primary key default gen_random_uuid(),
  requested_start_date date not null,
  requested_end_date date not null,
  company_count integer not null default 0,
  success_count integer not null default 0,
  failed_count integer not null default 0,
  status varchar(20) not null default 'running',
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
```

### 5.8 sync_requests

Detail request per company dan endpoint.

```sql
create table sync_requests (
  id bigserial primary key,
  batch_id uuid not null references sync_batches(id) on delete cascade,
  company_code varchar(30) not null,
  ending_date date not null,
  arsiran integer not null default 7,
  status varchar(20) not null default 'pending',
  http_status integer,
  rows_received integer not null default 0,
  error_message text,
  started_at timestamptz,
  finished_at timestamptz
);
```

### 5.9 api_raw_responses

Simpan raw response untuk debugging, tetapi pertimbangkan retention di masa depan.

```sql
create table api_raw_responses (
  id bigserial primary key,
  sync_request_id bigint not null references sync_requests(id) on delete cascade,
  response_json jsonb not null,
  created_at timestamptz not null default now()
);
```

Untuk volume besar, raw response dapat disimpan hanya ketika error atau untuk batch historis pertama.

## 6. Strategi mengambil data historis

Endpoint hanya menerima `companycode`, `endingdate`, dan `arsiran`, serta mengembalikan rentang sekitar empat minggu. Karena target historis dimulai 2025-01-01, lakukan request per company dengan tanggal akhir yang bergerak.

Implementasi awal yang aman:

1. Ambil daftar company unik dari master.
2. Untuk setiap company, buat tanggal akhir dari `2025-01-28` sampai tanggal berjalan dengan interval 28 hari.
3. Tambahkan request terakhir dengan `endingdate = today` bila belum terwakili.
4. Jalankan request maksimal concurrency `2`.
5. Parse semua tanggal yang dikembalikan.
6. Filter hasil ke rentang `2025-01-01` sampai `requested_end_date`.
7. Upsert ke `rainfall_daily`.
8. Request berikutnya boleh overlap; unique constraint mencegah duplikasi.

Pseudocode:

```ts
function buildEndingDates(startDate: Date, endDate: Date) {
  const dates: string[] = [];
  let cursor = addDays(startDate, 27);

  while (cursor < endDate) {
    dates.push(format(cursor, 'yyyy-MM-dd'));
    cursor = addDays(cursor, 28);
  }

  dates.push(format(endDate, 'yyyy-MM-dd'));
  return [...new Set(dates)];
}
```

Namun, endpoint diberi nama `4Weeks` dan contoh mengembalikan tanggal 2026-08-28 sampai 2026-09-24, yaitu 28 hari. Verifikasi bahwa setiap `endingdate` memang menghasilkan jendela 28 hari. Jangan mengasumsikan API memberikan seluruh histori dalam satu request.

Untuk sinkronisasi harian berikutnya:

- Ambil tanggal terakhir yang sudah tersimpan per company atau gunakan overlap tujuh hari.
- Panggil endpoint dengan `endingdate = today`.
- Upsert data yang dikembalikan.
- Overlap sengaja dipertahankan untuk mengoreksi data yang terlambat berubah.

## 7. Parsing tanggal dinamis

API menghasilkan key seperti `8-28`, `9-1`, dan `9-24`. Tahun tidak ada di key, sehingga tahun harus ditentukan dari `endingdate` dan rentang window.

Buat parser yang:

1. Mengambil bulan dan hari dari key dengan regex `^(\\d{1,2})-(\\d{1,2})$`.
2. Mencoba tahun dari `endingdate`.
3. Membuat kandidat tanggal.
4. Memilih kandidat yang berada pada window `endingdate - 27 hari` sampai `endingdate`.
5. Menolak key ambigu atau di luar window.

Contoh:

```ts
function parseApiDateKey(
  key: string,
  endingDate: Date,
  windowStart: Date,
  windowEnd: Date,
): Date | null {
  const match = /^(\\d{1,2})-(\\d{1,2})$/.exec(key);
  if (!match) return null;

  const month = Number(match[1]);
  const day = Number(match[2]);
  const candidateYears = [endingDate.getFullYear() - 1, endingDate.getFullYear(), endingDate.getFullYear() + 1];

  const candidates = candidateYears
    .map((year) => new Date(year, month - 1, day))
    .filter((date) => date >= windowStart && date <= windowEnd);

  return candidates.length === 1 ? candidates[0] : null;
}
```

Gunakan timezone aplikasi `Asia/Jakarta` dan hindari konversi tanggal ke UTC yang dapat menggeser hari.

## 8. Parsing response lengkap

Buat modul `src/lib/rainfall-api.ts` dengan fungsi:

```ts
type RainfallApiResult = {
  stationRows: Array<{
    CompanyCode: string;
    EstCode: string;
    Station_ID: string;
    Location: string | null;
    [key: string]: unknown;
  }>;
  dailySummaryRows: Array<{
    AvgHarian: number;
    Tanggal: string;
    Tanggal2: string;
    avgharian1: number;
    [key: string]: unknown;
  }>;
  raw: unknown;
};

export async function fetchRainfall4Weeks(input: {
  companyCode: string;
  endingDate: string;
  arsiran: number;
}): Promise<RainfallApiResult>;
```

Persyaratan parser:

- Validasi HTTP status.
- Validasi `outer.d` adalah array.
- Parse setiap elemen string JSON dengan error message yang jelas.
- Jika `d[0]` kosong, hasil station kosong namun request tidak dianggap sukses penuh tanpa warning.
- Jangan memasukkan key `CompanyCode`, `EstCode`, `Station_ID`, `Location`, dan `MTD` sebagai tanggal.
- Angka harus dinormalisasi menjadi finite number.
- Simpan raw payload ke `api_raw_responses` atau log terkontrol.

## 9. API route internal aplikasi

Buat route berikut.

### `GET /api/companies`

Mengembalikan company aktif beserta jumlah estate dan station.

### `GET /api/rainfall/daily`

Query:

```text
startDate=2026-01-01
endDate=2026-09-24
companyCode=PT.JJP
estCode=JJP1
stationId=ST-RF-JJP1-059
limit=5000
offset=0
```

Response:

```json
{
  "data": [],
  "meta": {
    "startDate": "2026-01-01",
    "endDate": "2026-09-24",
    "total": 0,
    "limit": 5000,
    "offset": 0
  }
}
```

### `GET /api/rainfall/weekly`

Query sama, plus optional `gisWeekId`.

Response harus berasal dari view `rainfall_weekly` dan mengembalikan `rainfall_mm`, `observed_days`, dan `rainy_days`.

### `GET /api/rainfall/summary`

Mengembalikan KPI untuk filter aktif:

- total rainfall.
- average daily rainfall.
- rainy days.
- station count.
- latest observed date.
- weekly total terbaru.

### `POST /api/sync`

Body:

```json
{
  "startDate": "2025-01-01",
  "endDate": "2026-09-25",
  "companyCodes": ["PT.THIP", "PT.JJP"],
  "arsiran": 7
}
```

Validasi:

- `startDate <= endDate`.
- `startDate` tidak lebih awal dari `2025-01-01` untuk MVP kecuali mode backfill khusus.
- `endDate` tidak boleh lebih dari tanggal hari ini menurut timezone aplikasi.
- `companyCodes` harus subset company master.
- `arsiran` integer positif.

Untuk MVP lokal, route dapat menjalankan sync secara synchronous dan mengembalikan progress setelah selesai. Untuk deployment production, gunakan job queue/background worker karena histori banyak company dan request.

Response minimal:

```json
{
  "batchId": "uuid",
  "status": "completed",
  "companies": 10,
  "successfulRequests": 100,
  "failedRequests": 0,
  "rowsUpserted": 12345,
  "warnings": []
}
```

### `GET /api/sync/:batchId`

Mengembalikan status batch dan detail request untuk progress UI.

## 10. UI MVP

Buat satu halaman dashboard, misalnya `/rainfall`.

### Filter

- Date range: default `2025-01-01` sampai tanggal terakhir data.
- Company dropdown.
- Estate dropdown.
- Station dropdown.
- Tab `Harian` dan `Mingguan`.
- Tombol `Sinkronisasi data`.

### KPI cards

- Total curah hujan.
- Rata-rata harian.
- Hari hujan.
- Data terakhir.

### Grafik

Tab Harian:

- Line chart atau bar chart rainfall per tanggal.
- Jika lebih dari satu station dipilih, tampilkan agregat harian dan legend station hanya bila jumlah station tidak terlalu banyak.

Tab Mingguan:

- Bar chart total rainfall per `formatted_name`.
- Gunakan urutan `start_date`, bukan urutan alfabet `week_name`.

### Tabel

Tabel harian:

- tanggal.
- company.
- estate.
- station.
- location.
- rainfall mm.
- sumber ending date.

Tabel mingguan:

- formatted week.
- periode.
- company.
- estate.
- station.
- total rainfall mm.
- observed days.
- rainy days.

UI harus memiliki loading state, empty state, error state, dan format angka Indonesia menggunakan `Intl.NumberFormat('id-ID')`.

## 11. Perilaku tombol sinkronisasi

Saat tombol ditekan:

1. Buka dialog konfirmasi ringan berisi start date, end date, company yang dipilih, dan estimasi jumlah request.
2. Kirim `POST /api/sync`.
3. Tampilkan progress berdasarkan batch.
4. Setelah selesai, invalidate/refetch query tabel, grafik, dan KPI.
5. Tampilkan daftar warning jika ada company atau station yang gagal.
6. Jangan menghapus data lama jika request baru gagal.

Untuk default awal:

- start date: `2025-01-01`.
- end date: tanggal sekarang.
- semua company aktif.
- arsiran: `7`.

## 12. Seed master data

Buat seed script terpisah:

```text
scripts/seed-master.ts
scripts/seed-calendar.ts
```

Master company/estate diambil dari list yang diberikan user. Pastikan seluruh record berikut masuk:

- PT.THIP: THP1 sampai THP20.
- PT.JJP: JJP1 sampai JJP3.
- PT.PTW: PTW1 sampai PTW2.
- PT.PANPS: PNP1.
- PT.SAM: SAM.
- PT.GAN: GAN1 sampai GAN3.
- PT.BAS: BAS.
- PT.NJP: NJP.
- PT.PLDK: PLD2.
- PT.SUMK: SUM2.

Gunakan upsert berdasarkan natural key, bukan insert buta.

## 13. Migrasi dan command

Tambahkan command yang jelas di `package.json`:

```json
{
  "scripts": {
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed:master": "tsx scripts/seed-master.ts",
    "db:seed:calendar": "tsx scripts/seed-calendar.ts",
    "sync:historical": "tsx scripts/sync-historical.ts",
    "typecheck": "tsc --noEmit",
    "lint": "next lint"
  }
}
```

Sesuaikan command dengan tool ORM yang benar-benar dipilih.

Urutan setup:

```text
1. Isi DATABASE_URL di .env.local.
2. Jalankan migration.
3. Jalankan seed master company/estate.
4. Jalankan seed calendar_weeks.json.
5. Jalankan sync historis 2025-01-01 sampai tanggal sekarang.
6. Jalankan aplikasi dan buka dashboard.
```

## 14. Validasi data dan acceptance criteria

Implementasi dianggap berhasil apabila:

- API dapat dipanggil server-side menggunakan payload yang benar.
- Response wrapper `d` berhasil diparse.
- Key tanggal dinamis berhasil menjadi tanggal ISO `YYYY-MM-DD`.
- Tidak ada kolom database bernama `9-1`, `9-2`, atau tanggal dinamis.
- Re-run sync tidak menggandakan baris.
- `MTD` tidak dijumlahkan sebagai rainfall harian.
- Data berada pada rentang requested start/end date.
- Station JJP contoh dapat menghasilkan data untuk `ST-RF-JJP1-059`, `ST-RF-JJP2-060`, dan `ST-RF-JJP3-061` bila API mengembalikannya.
- Minggu `Sep 2026, W4` memakai periode `2026-09-21` sampai `2026-09-27` sesuai kalender yang diberikan; data sampai `2026-09-24` masuk ke minggu tersebut.
- Grafik mingguan mengambil agregat dari data harian, bukan dari `avgharian1` kecuali diberi label sebagai metrik berbeda.
- Error satu company tidak menghentikan seluruh batch.
- UI menampilkan jumlah data dan tanggal terakhir berhasil.

## 15. Hal yang harus dihindari

- Jangan melakukan fetch API eksternal dari client component.
- Jangan menyimpan response berbentuk wide table dengan kolom tanggal dinamis.
- Jangan memakai `MTD` sebagai nilai harian.
- Jangan menghitung minggu hanya menggunakan ISO week karena kalender GIS memiliki aturan bulan dan minggu sendiri.
- Jangan menghapus semua data sebelum sync.
- Jangan menjalankan request semua company secara paralel tanpa limit.
- Jangan hardcode tanggal `2026-09-24`; gunakan tanggal berjalan dan input pengguna.
- Jangan memasukkan secret ke source code atau commit.

## 16. Prompt eksekusi untuk Antigravity

Gunakan instruksi berikut sebagai prompt implementasi:

> Implementasikan MVP aplikasi Rainfall IoT Dashboard berdasarkan file specification ini. Gunakan Next.js App Router, TypeScript, Neon PostgreSQL, dan Drizzle ORM. Buat schema database, migrations, seed master company/estate dari data yang diberikan, seed `calendar_weeks.json`, server-side API client untuk endpoint ASP.NET `GetArsStation4Weeks`, parser response `d` yang berisi JSON string, normalisasi key tanggal dinamis menjadi `rainfall_daily`, upsert idempotent, sync batch, API routes, dan dashboard dengan filter, KPI, tabel harian/mingguan, serta grafik singkat. Jangan fetch endpoint eksternal dari browser. Mulai dengan implementasi database dan parser, lalu tambahkan API, kemudian UI. Tambahkan unit test untuk parsing response, parsing tanggal, assignment calendar week, dan idempotent upsert. Jangan mengarang field API di luar contoh; buat parser defensif dan logging error yang jelas. Setelah implementasi, tampilkan file yang dibuat, command setup, dan hasil typecheck/test.

## 17. Catatan produk fase berikutnya

Jangan implementasikan dulu, tetapi siapkan arsitektur agar mudah ditambahkan:

- authentication dan role-based access.
- scheduled daily sync.
- map lokasi station.
- anomaly detection dan missing-data monitoring.
- export Excel/CSV.
- perbandingan actual vs target curah hujan.
- audit trail perubahan master.
- background job queue dan retry policy.
- dashboard regional dan agregasi company.
