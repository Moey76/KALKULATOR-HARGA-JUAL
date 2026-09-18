# Panduan Deploy ke GitHub Pages

Proyek ini tidak perlu `npm install`, token, API key, database, atau server. Pastikan `index.html` berada di folder utama repository.

## Pilihan A — Upload lewat website GitHub

1. Masuk ke GitHub dan klik **New repository**.
2. Isi nama, misalnya `kalkulator-harga-jual`.
3. Pilih **Public** lalu klik **Create repository**.
4. Ekstrak ZIP proyek ini.
5. Pada repository, klik **uploading an existing file**.
6. Unggah **isi foldernya**, termasuk folder `.github`, bukan ZIP-nya.
7. Klik **Commit changes**.
8. Masuk ke **Settings → Pages**.
9. Pada **Source**, pilih **GitHub Actions**.
10. Buka tab **Actions** dan tunggu proses `Deploy static site to Pages` selesai dengan tanda hijau.

URL website akan tampil di halaman **Settings → Pages**, biasanya:

`https://USERNAME.github.io/kalkulator-harga-jual/`

## Pilihan B — Menggunakan Git di Windows

Buka Terminal/PowerShell di dalam folder proyek, lalu jalankan:

```bash
git init
git add .
git commit -m "Kalkulator harga jual siap deploy"
git branch -M main
git remote add origin https://github.com/USERNAME/kalkulator-harga-jual.git
git push -u origin main
```

Ganti `USERNAME` dengan username GitHub Anda. Setelah itu pilih **GitHub Actions** di **Settings → Pages**.

## Jika website belum muncul

- Pastikan repository menggunakan branch `main`.
- Pastikan file `.github/workflows/pages.yml` ikut terunggah.
- Buka tab **Actions** dan lihat apakah proses deploy masih berjalan atau gagal.
- Pastikan **Settings → Pages → Source** memakai **GitHub Actions**.
- Jangan memindahkan `index.html` ke subfolder jika ingin workflow bawaan ini langsung bekerja.

## Mengubah tampilan atau rumus

- Konten halaman: `index.html`
- Desain dan warna: `styles.css`
- Interaksi halaman: `app.js`
- Rumus inti: `calc-core.js`

Setelah mengedit, commit dan push kembali. GitHub Pages akan diperbarui otomatis.
