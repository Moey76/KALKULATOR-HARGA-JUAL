# Kalkulator Harga Jual

Aplikasi kalkulator harga jual mandiri untuk seller Indonesia. Dibuat dengan HTML, CSS, dan JavaScript murni sehingga dapat berjalan tanpa token, API key, backend, database, atau proses build.

## Fitur

- Alur empat langkah: produk, target untung, promo dan biaya, hasil.
- Target laba nominal, persentase dari modal, atau margin transaksi.
- Biaya admin, program promo, live, pre-order, asuransi, affiliate, iklan, packing, operasional, dan biaya kustom.
- Rekomendasi harga jual, dana masuk, laba bersih, margin, BEP ROAS, dan target ROAS.
- Simulasi harga lain serta harga coret.
- Insight otomatis offline tanpa layanan AI eksternal.
- Riwayat tersimpan lokal di browser dan ekspor CSV.
- Responsif untuk desktop dan ponsel.

## Menjalankan di komputer

Cara termudah: buka `index.html` langsung di browser.

Untuk server lokal:

```bash
python -m http.server 8080
```

Lalu buka `http://localhost:8080`.

Untuk menguji rumus inti:

```bash
node test.js
```

## Deploy ke GitHub Pages

1. Buat repository baru di GitHub.
2. Unggah seluruh isi folder ini ke branch `main`.
3. Buka **Settings → Pages**.
4. Pada **Build and deployment**, pilih **GitHub Actions**.
5. Workflow yang sudah disertakan akan menerbitkan website otomatis.

Panduan yang lebih rinci tersedia di `DEPLOY_GITHUB.md`.

Alamat website biasanya menjadi:

`https://USERNAME.github.io/NAMA-REPOSITORY/`

## Catatan rumus

Biaya persentase dihitung dari harga transaksi setelah diskon toko. Voucher toko dan biaya tetap dikurangkan terpisah. Harga jual ideal dicari agar dana bersih setelah seluruh biaya dapat menutup modal dan target laba, kemudian dibulatkan ke atas ke kelipatan Rp1.000.

Persentase marketplace dapat berubah. Cocokkan selalu dengan Seller Centre dan edit angka preset sebelum memakai hasil untuk keputusan bisnis.

## Privasi

Semua perhitungan berjalan di perangkat pengguna. Riwayat disimpan melalui `localStorage` browser dan tidak dikirim ke server mana pun.
