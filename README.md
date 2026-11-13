# Mesin scalp

Mesin ANALISIS (bukan auto-trading). Memindai 25 koin USDT teratas tiap 15 menit lewat GitHub Actions, mencatat sinyal ke `data/journal.json`, lalu menilainya sendiri pada candle 5 menit. Eksekusi tetap manual di Binance.

STATUS: belum divalidasi. Uji kode lulus (17 uji), tetapi belum ada forward test maupun backtest pada data nyata.

## Pasang (lewat GitHub web UI)
1. Buat repo `scalp`, unggah semua file (termasuk `.github/workflows/`).
2. Settings > Actions > General > Workflow permissions: pilih Read and write.
3. Actions > backtest > Run workflow (uji awal, hasil di `data/backtest.md`). Lalu Actions > scan > Run workflow.
4. Jurnal terisi otomatis di `data/journal.json`, laporan di `data/report.md`.

## Hubungkan ke monitor
Tambahkan ke `engines` di `config.json` repo monitortn:
`{"id":"scalp","nama":"Mesin scalp","repo":"scalp","agen":"Scalp","start":"TANGGAL-MULAI"}`
Format jurnal sudah kompatibel (diuji).

## Logika
- Rezim BTC 1 jam: TREN_NAIK, TREN_TURUN, RANGE; LIAR (ATR tinggi) dan TIDAK_JELAS = tidak ada sinyal.
- Setup A sweep: harga menyapu swing low/high 15m lalu ditutup kembali, volume >= 1,3x median.
- Setup B pullback: ke EMA20 15m, hanya searah tren BTC.
- Entry = limit di close candle konfirmasi (tidak mengejar). SL di ekstrem sweep + 0,1 ATR. TP = 1,8R.
- Gerbang biaya: biaya 0,2% harus <= 25% dari 1R, jadi stop minimal 0,8% dan maksimal 2%.
- Ruang gerak: level terdekat harus >= 1,5R dari entry.
- Proteksi: maks 3 sinyal/hari, berhenti setelah 2 SL, maks 3 posisi terbuka.
- Jurnal menampilkan dua waktu: waktu analisis (kapan sinyal dibuat) dan waktu hasil (kapan TP/SL/kedaluwarsa/tidak terisi terjadi, UTC). Sinyal yang masih terbuka menampilkan tanda –.
- Penilaian konservatif: SL didahulukan bila SL dan TP kena di candle yang sama; order batal bila tidak terisi 1 jam; keluar paksa setelah 4 jam.

## Kaitan dengan @eliz883 (dari teks postingan saja, tanpa chart)
- Tunggu volume dan arah jelas -> filter rezim BTC dan volume.
- Altcoin di-scalp saat BTC range -> rezim RANGE membolehkan dua arah.
- Tunggu konfirmasi -> hanya candle tertutup, ada candle konfirmasi.
- Jangan overtrading, tidak harus trading tiap hari -> batas harian, berhenti setelah SL.
- Lindungi modal -> gerbang biaya, SL wajib, tanpa averaging.
Bagian yang TIDAK bisa ditiru: penilaian chart (orange box, trendline) karena tidak ada di teks. Filter EUR/USD belum dimasukkan.

## Syarat sebelum uang sungguhan (usulan)
>= 200 trade selesai, >= 8 minggu, batas bawah CI95 R/trade > 0, PF >= 1,2, SQN >= 2 (lihat monitor). Jangan ubah core.mjs, trade-sim.mjs, config.json selama forward test; hash tercetak di report.md.

## Perintah lokal
`node scripts/test-core.mjs` | `node scripts/scan.mjs` | `node scripts/backtest.mjs`
