
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const csv = require("csv-parser");

const file = process.argv[2];
if (!file) {
  console.log("Usage: node import_csv.js daftar.csv");
  process.exit(1);
}

const db = new sqlite3.Database(path.join(__dirname, "absensi.db"));

const results = [];
fs.createReadStream(file)
  .pipe(csv())
  .on("data", (data) => results.push(data))
  .on("end", () => {
    let done = 0;
    results.forEach((r) => {
      const { nama, kelas, qr_id } = r;
      if (!nama || !kelas || !qr_id) return;
      db.run(
        "INSERT OR IGNORE INTO siswa (nama, kelas, qr_id) VALUES (?, ?, ?)",
        [nama, kelas, qr_id],
        function () {
          if (++done === results.length) {
            console.log("Import selesai");
            db.close();
          }
        }
      );
    });
  });