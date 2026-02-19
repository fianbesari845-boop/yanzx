const qrcode = require("qrcode");
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();

const outPdf = process.argv[2] || "qr_labels.pdf";
const db = new sqlite3.Database(path.join(__dirname, "absensi.db"));
const doc = new PDFDocument({ margin: 18, size: "A4" });
doc.pipe(fs.createWriteStream(outPdf));

const cols = 2;
const rows = 5;
const cardW = 90; // 5 cm
const cardH = 90;
let x = 0;
let y = 0;
let count = 0;

db.all("SELECT nama, kelas, qr_id FROM siswa ORDER BY nama", (err, data) => {
  if (err) throw err;
  if (!data.length) {
    console.log("Tidak ada data siswa");
    return db.close();
  }

  let pending = 0;
  data.forEach(({ nama, kelas, qr_id }) => {
    pending++;
    qrcode.toDataURL(qr_id, { width: 200 }, (err, url) => {
      if (err) throw err;

      if (count && count % (cols * rows) === 0) {
        doc.addPage();
        x = 0;
        y = 0;
      }

      const px = 18 + (x * (cardW + 10));
      const py = 18 + (y * (cardH + 10));

      doc.image(url, px + 15, py + 15, { width: 60, height: 60 });
      doc.fontSize(10)
         .text(nama, px, py + 78, { width: cardW, align: "center" })
         .text(kelas, px, py + 88, { width: cardW, align: "center" });

      x++;
      if (x >= cols) { x = 0; y++; }
      count++;

      if (--pending === 0) {
        doc.end();
        console.log("PDF selesai:", outPdf);
        db.close();
      }
    });
  });
});