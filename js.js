// generate_qr.js
const qrcode = require('qrcode');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const db = new sqlite3.Database(path.join(__dirname, 'absensi.db'));
const outDir = path.join(__dirname, 'qrcodes');

// buat folder qrcodes kalau belum ada
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

db.all('SELECT qr_id, nama, kelas FROM siswa', (err, rows) => {
  if (err) throw err;
  if (rows.length === 0) {
    console.log('Belum ada data siswa.');
    return db.close();
  }

  let done = 0;
  rows.forEach(({ qr_id, nama, kelas }) => {
    const filePath = path.join(outDir, `${qr_id}.png`);

    // isi QR = qr_id saja (plain text)
    qrcode.toFile(filePath, qr_id, { type: 'png', width: 300 }, (err) => {
      if (err) return console.error(err);
      console.log(`✅ ${qr_id}.png  (${nama} - ${kelas})`);
      if (++done === rows.length) {
        console.log('Selesai membuat semua QR Code.');
        db.close();
      }
    });
  });
});