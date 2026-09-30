# 🌧️ IoT Telemetry Portal — Rainfall & TMAT Monitoring Dashboard

[![Next.js](https://img.shields.io/badge/Next.js-14.2.23-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_Serverless-4169E1?style=for-the-badge&logo=postgresql)](https://neon.tech/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.38-C5F74F?style=for-the-badge&logo=drizzle)](https://orm.drizzle.team/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![Leaflet](https://img.shields.io/badge/Leaflet-GIS_Map-199900?style=for-the-badge&logo=leaflet)](https://leafletjs.com/)
[![Swagger](https://img.shields.io/badge/OpenAPI-Swagger_UI-85EA2D?style=for-the-badge&logo=swagger)](https://swagger.io/)

Aplikasi web dashboard dan platform telemetri IoT terpadu untuk pemantauan, analisis spasial, dan pelaporan **Curah Hujan (Rainfall / Ombrometer)** serta **Tinggi Muka Air Tanah (TMAT / Holykell Water Level Sensor)** pada area perkebunan kelapa sawit / kehutanan.

---

## 📑 Daftar Isi

- [Fitur Utama](#-fitur-utama)
- [Arsitektur & Tech Stack](#-arsitektur--tech-stack)
- [Struktur Direktori](#-struktur-direktori)
- [Model Data & Skema Database](#-model-data--skema-database)
- [Panduan Instalasi & Menjalankan](#-panduan-instalasi--menjalankan)
- [Konfigurasi Environment (.env)](#-konfigurasi-environment-env)
- [Script & Perintah Database](#-script--perintah-database)
- [Referensi REST API](#-referensi-rest-api)
- [Fitur Spasial & Visualisasi](#-fitur-spasial--visualisasi)
- [Lisensi](#-lisensi)

---

## 🚀 Fitur Utama

### 1. 🌧️ Rainfall Telemetry & Matrix Analysis
- **Daily Rainfall Matrix**: Tampilan matriks kalender harian interaktif curah hujan per stasiun ombrometer (mm/hari).
- **Weekly Aggregation (GIS Calendar)**: Perhitungan agregat mingguan berbasis standar kalender kerja GIS (Week 1–4/5 per bulan) bukan sekadar ISO week.
- **Station & Company Matrices**: Rekapitulasi perbandingan curah hujan per estate, wilayah, dan unit perusahaan.
- **Interactive Timeline Slider**: Filter rentang tanggal fleksibel dengan navigasi cepat.
- **Grafik Tren Interaktif**: Visualisasi fluktuasi curah hujan, hari hujan (*rainy days*), dan akumulasi MTD (*Month-to-Date*).

### 2. 🗺️ Pemetaan Spasial GIS & Isohyet Kontur
- **Interactive Leaflet Map**: Peta sebaran stasiun penakar hujan dan sensor TMAT.
- **Isohyet Contouring**: Interpolasi kontur gradasi warna curah hujan menggunakan algoritma spasial D3 & Turf.js.
- **GeoJSON Boundary Overlay**: Dukungan import & visualisasi batas poligon konsesi/kebun (*Estate & Company boundaries*).
- **Station Coordinates Management**: Pengelolaan titik koordinat latitude/longitude stasiun secara langsung via UI.

### 3. 🌊 TMAT (Tinggi Muka Air Tanah) Monitoring
- **Real-time & Hourly Telemetry**: Monitoring data sensor kedalaman air tanah (Holykell IoT) per jam.
- **Sensor Health Diagnostics**: Pelacakan level voltase baterai dan kualitas sinyal GSM/LoRa.
- **Status Zonasi Lahan Gambut**: Klasifikasi ambang batas air tanah (*Aman*, *Waspada*, *Bahaya*) untuk kepatuhan tata kelola air dan pencegahan karhutla.
- **TMAT Spatial Map**: Pemetaan sebaran alat TMAT di seluruh blok kebun.

### 4. 📑 IoT Operational Report
- **Rekapitulasi Blok Kebun**: Pairing stasiun hujan dan sensor TMAT per blok, status tanam (*Muda/Menghasilkan*), dan status IDL.
- **Rekomendasi Agronomi & Water Management**: Catatan rekomendasi operasional, target perbaikan sekat bakar/pintu air, PIC, dan pelacakan progress mingguan.
- **Export Multi-Format**: Download laporan dalam format Microsoft Excel (`.xlsx`) berformat rapi via ExcelJS atau copy langsung ke Clipboard (TSV).

### 5. 🔄 Idempotent Data Sync Engine
- **Automated & Manual Sync**: Sinkronisasi data dari endpoint webservice eksternal GIS Div (`GetArsStation4Weeks`, `GetMonthlyTMATHolykell`).
- **Idempotency Guarantee**: Penanganan *upsert* unik `(station_id, rain_date)` dan `(device_id, record_date, record_hour)` sehingga aman dijalankan berulang tanpa duplikasi.
- **Rate-Limiting & Concurrency Control**: Pengendalian *traffic request* ke server sumber menggunakan `p-limit`.
- **Sync Batch Logging**: Pencatatan audit trail riwayat sinkronisasi, jumlah baris data masuk, dan pesan error jika terjadi kegagalan.

### 6. 📖 Terintegrasi OpenAPI / Swagger UI
- Akses dokumentasi REST API interaktif langsung di rute `/api-docs` untuk pengujian endpoint dan integrasi pihak ketiga.

---

## 🛠️ Arsitektur & Tech Stack

| Layer | Teknologi | Keterangan |
|---|---|---|
| **Frontend** | [Next.js 14](https://nextjs.org/) (App Router) | Server Components & Client Components |
| **Bahasa** | [TypeScript](https://www.typescriptlang.org/) (v5) | Full type safety dari DB ke UI |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) + [Lucide Icons](https://lucide.dev/) | Desain modern, responsif, dan clean |
| **Database** | [Neon PostgreSQL](https://neon.tech/) Serverless | Database relasional cloud dengan connection pooling |
| **ORM & Migrations** | [Drizzle ORM](https://orm.drizzle.team/) + Drizzle Kit | Type-safe SQL schema & migration toolkit |
| **GIS & Spasial** | [Leaflet](https://leafletjs.com/), [@turf/turf](https://turfjs.org/), [D3](https://d3js.org/) | Peta interaktif, GeoJSON poligon, dan kontur isohyet |
| **Visualisasi Data** | [Recharts](https://recharts.org/) | Chart visualisasi tren CH & TMAT |
| **Export Engine** | [ExcelJS](https://github.com/exceljs/exceljs) | Export spreadsheet Excel styled multi-sheet |
| **Dokumentasi API** | [Swagger UI React](https://swagger.io/) + OpenAPI 3.0 | API explorer interaktif |
| **Testing** | [Vitest](https://vitest.dev/) | Unit test untuk parser & API client |

---

## 📂 Struktur Direktori

```text
├── scripts/                      # Script database migration, seeding & CLI sync
│   ├── check-estates.ts          # Verifikasi relasi master estate
│   ├── create-view.ts            # Script pembuatan SQL View rainfall_weekly
│   ├── migrate-report-tables.ts  # Migrasi tabel report blocks
│   ├── migrate-tmat-tables.ts    # Migrasi tabel TMAT devices & telemetry
│   ├── seed-calendar.ts          # Seed data kalender kerja GIS mingguan
│   ├── seed-master.ts            # Seed master perusahaan & estate
│   ├── seed-report-blocks.ts     # Seed konfigurasi blok pelaporan
│   ├── seed-tmat-devices.ts      # Seed master perangkat TMAT
│   ├── sync-historical.ts        # CLI runner sinkronisasi data curah hujan
│   ├── sync-tmat-historical.ts   # CLI runner sinkronisasi data TMAT
│   └── test-db.ts                # Diagnostik koneksi database
├── src/
│   ├── app/                      # Next.js App Router (Halaman & Endpoint API)
│   │   ├── api/                  # REST API Route Handlers
│   │   │   ├── companies/        # CRUD & Boundary GeoJSON company
│   │   │   ├── rainfall/         # Daily, weekly, matrix & summary endpoints
│   │   │   ├── report/           # IoT report data endpoint
│   │   │   ├── stations/         # Rain station management
│   │   │   ├── sync/             # Rainfall sync trigger & batch status
│   │   │   ├── system/           # Health check & system status
│   │   │   └── tmat/             # TMAT telemetry & device endpoints
│   │   ├── api-docs/             # Halaman Swagger UI OpenAPI (/api-docs)
│   │   ├── rainfall/             # Dashboard Curah Hujan (/rainfall/data, /rainfall/map)
│   │   ├── report/               # Dashboard Laporan IoT (/report/iot)
│   │   ├── setting/              # Manajemen Sistem & Konfigurasi (/setting/*)
│   │   └── tmat/                 # Dashboard TMAT (/tmat/data, /tmat/map)
│   ├── components/               # React UI Components (Dashboard, Matrix, Maps, Modals)
│   ├── data/                     # Static dataset (master_companies.json, calendar_weeks.json)
│   ├── db/                       # Drizzle ORM schema & koneksi Neon client
│   │   ├── index.ts              # Konfigurasi koneksi Neon Serverless / Node PG
│   │   └── schema.ts             # Definisi skema tabel & relasi Drizzle
│   └── lib/                      # Helper library & core business logic
│       ├── date-parser.ts        # Normalisasi tanggal dari respons eksternal
│       ├── excel-generators.ts   # Generator file Excel (.xlsx) dengan formatting
│       ├── export-utils.ts       # Clipboard & TSV exporter
│       ├── geojson.ts            # Helper spasial & GeoJSON parser
│       ├── isohyet.ts            # Algoritma interpolasi isohyet curah hujan
│       ├── rainfall-api.ts       # Client HTTP SOAP/JSON ke API GIS Div
│       ├── sync-engine.ts        # Core engine sinkronisasi data rainfall
│       └── tmat-sync-engine.ts   # Core engine sinkronisasi data TMAT
├── tests/                        # Vitest unit test files
├── drizzle.config.ts             # Konfigurasi Drizzle Kit
├── tailwind.config.ts            # Konfigurasi Tailwind CSS
└── package.json                  # Dependensi proyek & npm scripts
```

---

## 🗄️ Model Data & Skema Database

```mermaid
erDiagram
    COMPANIES ||--o{ ESTATES : "has many"
    COMPANIES ||--o{ RAIN_STATIONS : "has many"
    COMPANIES ||--o{ RAINFALL_DAILY : "contains"
    ESTATES ||--o{ RAIN_STATIONS : "has many"
    ESTATES ||--o{ RAINFALL_DAILY : "contains"
    RAIN_STATIONS ||--o{ RAINFALL_DAILY : "logs"
    CALENDAR_WEEKS ||--o{ RAINFALL_WEEKLY_VIEW : "groups"
    
    COMPANIES ||--o{ TMAT_DEVICES : "owns"
    TMAT_DEVICES ||--o{ TMAT_HOURLY : "records"
    
    COMPANIES ||--o{ IOT_REPORT_BLOCKS : "reports"
    RAIN_STATIONS ||--o{ IOT_REPORT_BLOCKS : "pairs"
    TMAT_DEVICES ||--o{ IOT_REPORT_BLOCKS : "pairs"
    
    SYNC_BATCHES ||--o{ SYNC_REQUESTS : "tracks"
    SYNC_REQUESTS ||--o{ API_RAW_RESPONSES : "stores"
```

### Ringkasan Tabel Utama:
1. **`companies`**: Master unit perusahaan (Company Code, Name, Region, GeoJSON Boundary).
2. **`estates`**: Master estate/kebun bawahan perusahaan.
3. **`rain_stations`**: Master stasiun penakar hujan (Ombrometer) beserta titik koordinat GPS.
4. **`calendar_weeks`**: Master kalender minggu operasional GIS (GisWeekID, rentang tanggal, label format).
5. **`rainfall_daily`**: Data curah hujan harian (mm) per stasiun. Unique: `(station_id, rain_date)`.
6. **`rainfall_weekly`** *(SQL View)*: Agregat mingguan hasil mapping otomatis `rainfall_daily` ke `calendar_weeks`.
7. **`tmat_devices`**: Master sensor Tinggi Muka Air Tanah Holykell. Unique: `(company_code, device_id)`.
8. **`tmat_hourly`**: Data telemetri TMAT per jam (water level value, battery, signal, rainfall). Unique: `(device_id, record_date, record_hour)`.
9. **`tmat_sync_batches` & `sync_batches`**: Audit trail histori dan status proses sinkronisasi API eksternal.
10. **`iot_report_blocks`**: Data konfigurasi laporan operasional IoT dan pairing antar-sensor per blok kebun.

---

## ⚙️ Panduan Instalasi & Menjalankan

### 1. Prasyarat
- **Node.js** v18.18.0 atau versi lebih baru (direkomendasikan v20 LTS).
- **PostgreSQL Database** (direkomendasikan instance PostgreSQL [Neon](https://neon.tech/) atau Postgres lokal).
- **Git**.

### 2. Clone Repositori
```bash
git clone https://github.com/username/rainfall-iot-dashboard.git
cd rainfall-iot-dashboard
```

### 3. Install Dependensi
```bash
npm install
```

### 4. Konfigurasi Environment Variable
Salin template `.env.example` ke file `.env.local`:
```bash
cp .env.example .env.local
```
Buka `.env.local` dan sesuaikan koneksi database Neon Anda (lihat bagian [Konfigurasi Environment](#-konfigurasi-environment-env)).

### 5. Inisialisasi & Migrasi Database
Jalankan perintah berikut untuk menginisialisasi skema tabel dan SQL view di database Anda:

```bash
# Push skema Drizzle ke database PostgreSQL
npm run db:push

# Buat SQL View agregasi mingguan
npx tsx scripts/create-view.ts

# Jalankan migrasi tabel tambahan TMAT & Report
npx tsx scripts/migrate-tmat-tables.ts
npx tsx scripts/migrate-report-tables.ts
```

### 6. Seeding Data Master Awal
Isi database dengan data kalender GIS, master perusahaan/estate, perangkat TMAT, dan template report:

```bash
# 1. Seed master company & estate
npm run db:seed:master

# 2. Seed kalender minggu GIS
npm run db:seed:calendar

# 3. Seed master device TMAT & blok report
npx tsx scripts/seed-tmat-devices.ts
npx tsx scripts/seed-report-blocks.ts
```

### 7. Sinkronisasi Data Awal (Opsional)
Untuk menarik data curah hujan dan TMAT historis dari webservice sumber:

```bash
# Sinkronisasi curah hujan historis
npm run sync:historical

# Sinkronisasi data TMAT historis
npx tsx scripts/sync-tmat-historical.ts
```

### 8. Jalankan Development Server
```bash
npm run dev
```

Buka peramban di [http://localhost:3000](http://localhost:3000). Aplikasi akan otomatis mengarahkan ke dashboard utama `/rainfall/data`.

---

## 🔑 Konfigurasi Environment (.env)

Buat file `.env.local` di direktori root proyek dengan format berikut:

```env
# URL Koneksi PostgreSQL Neon (Wajib)
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"

# Endpoint Webservice Curah Hujan GIS Div
RAINFALL_API_URL="https://app.gis-div.com/iot/Service/webservice.asmx/GetArsStation4Weeks"

# Endpoint Webservice TMAT Holykell
TMAT_API_URL="https://app.gis-div.com/iot/Service/webservice.asmx/GetMonthlyTMATHolykell"

# Konfigurasi Default Sinkronisasi
RAINFALL_ARSIRAN="7"
RAINFALL_START_DATE="2025-01-01"
APP_TIMEZONE="Asia/Jakarta"
SYNC_MAX_CONCURRENCY="5"
```

---

## 📜 Script & Perintah Database

| Perintah NPM | Keterangan |
|---|---|
| `npm run dev` | Menjalankan Next.js development server di `http://localhost:3000` |
| `npm run build` | Melakukan build aplikasi untuk *production ready* |
| `npm run start` | Menjalankan *production server* hasil build |
| `npm run db:push` | Menerapkan skema Drizzle ORM langsung ke database Neon |
| `npm run db:generate` | Membuat migration files dari skema Drizzle |
| `npm run db:migrate` | Menjalankan migration files ke database |
| `npm run db:seed:master` | Seeding data perusahaan dan estate dari `src/data/master_companies.json` |
| `npm run db:seed:calendar` | Seeding kalender GIS 2025–2026 dari `src/data/calendar_weeks.json` |
| `npm run sync:historical` | Sinkronisasi data historis curah hujan via CLI |
| `npm run test` | Menjalankan automated unit testing menggunakan Vitest |
| `npm run typecheck` | Menjalankan pengecekan tipe TypeScript (`tsc --noEmit`) |
| `npm run lint` | Menjalankan linter Next.js ESLint |

---

## 📡 Referensi REST API

Dokumentasi lengkap dan interaktif dapat diakses pada rute **`/api-docs`** melalui browser.

### Endpoint Utama

| Method | Endpoint | Deskripsi |
|---|---|---|
| `GET` | `/api/companies` | List semua perusahaan, jumlah estate, dan ketersediaan GeoJSON boundary |
| `GET` | `/api/companies/[code]/boundary` | Mengambil GeoJSON batas wilayah perusahaan |
| `POST` | `/api/companies/[code]/boundary` | Upload / update batas GeoJSON poligon perusahaan |
| `GET` | `/api/stations` | List semua stasiun penakar hujan (ombrometer) & koordinat |
| `PUT` | `/api/stations/[id]` | Update data stasiun (nama, estate pairing, lat/long koordinat) |
| `GET` | `/api/rainfall/daily` | Mengambil data curah hujan harian per stasiun |
| `GET` | `/api/rainfall/daily-matrix` | Matriks data curah hujan per hari untuk tampilan tabel dashboard |
| `GET` | `/api/rainfall/weekly` | Data agregat mingguan berbasis Kalender GIS |
| `GET` | `/api/rainfall/station-weekly` | Matriks mingguan agregat per stasiun |
| `GET` | `/api/rainfall/company-weekly` | Matriks mingguan agregat per perusahaan |
| `GET` | `/api/rainfall/summary` | Ringkasan metrik statistik curah hujan (CH Kemarin, MTD, Hari Hujan) |
| `GET` | `/api/tmat/devices` | List semua perangkat sensor TMAT Holykell |
| `PUT` | `/api/tmat/devices/[id]` | Update data perangkat TMAT (nama, blok, koordinat GPS) |
| `GET` | `/api/tmat/data` | Data telemetri TMAT per jam (water level, battery, signal) |
| `GET` | `/api/report/iot` | Data laporan operasional IoT dan pairing blok kebun |
| `POST` | `/api/sync` | Memulai proses batch sinkronisasi data curah hujan |
| `GET` | `/api/sync/[batchId]` | Memeriksa progress dan status job sinkronisasi curah hujan |
| `POST` | `/api/tmat/sync` | Memulai proses sinkronisasi data TMAT dari API eksternal |
| `GET` | `/api/system/status` | Status kesehatan sistem, database, dan waktu sinkronisasi terakhir |

---

## 🗺️ Fitur Spasial & Visualisasi

- **Peta Interaktif**: Menggunakan Leaflet dengan layer OpenStreetMap & ESRI Satellite Imagery.
- **Interpolasi Isohyet**: Menghitung kontur sebaran curah hujan secara dinamis menggunakan pembobotan jarak terbalik (IDW / Inverse Distance Weighting) & pemotongan poligon Turf.js sesuai boundary perkebunan.
- **Legend & Skala Warna**: Visualisasi curah hujan menggunakan standar warna BMKG (Hijau: Ringan, Kuning: Sedang, Oranye: Lebat, Merah: Sangat Lebat/Ekstrem).

---

## 🤝 Kontribusi

1. Fork repositori ini
2. Buat branch fitur baru (`git checkout -b feature/FiturKeren`)
3. Commit perubahan Anda (`git commit -m 'Menambahkan Fitur Keren'`)
4. Push ke branch Anda (`git push origin feature/FiturKeren`)
5. Ajukan **Pull Request**

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah [MIT License](LICENSE).
