const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = 3000;
const API_KEY = "absen2026";

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

const db = new sqlite3.Database(path.join(__dirname, "../absensi.db"));

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS siswa (id INTEGER PRIMARY KEY AUTOINCREMENT, nama TEXT NOT NULL, kelas TEXT NOT NULL, qr_id TEXT UNIQUE NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, updated_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);
  db.run(`CREATE TABLE IF NOT EXISTS absensi (id INTEGER PRIMARY KEY AUTOINCREMENT, siswa_id INTEGER NOT NULL, tanggal TEXT NOT NULL, jam TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(siswa_id) REFERENCES siswa(id) ON DELETE CASCADE)`);
  db.run("PRAGMA foreign_keys = ON");
});

function auth(req, res, next) {
  if (req.headers["x-api-key"] !== API_KEY) return res.status(401).json({ message: "Unauthorized" });
  next();
}

function logger(req, res, next) {
  const line = `${new Date().toISOString()} ${req.method} ${req.url} ${req.ip}\n`;
  fs.appendFile("access.log", line, () => {});
  next();
}

app.use(logger);

app.get("/", (req, res) => res.send("Server Absensi Aktif"));

app.post("/api/absen", auth, (req, res) => {
  const { qr_id } = req.body;
  if (!qr_id) return res.status(400).json({ message: "QR kosong" });
  db.get("SELECT id, nama, kelas FROM siswa WHERE qr_id = ?", [qr_id], (err, s) => {
    if (err) return res.status(500).json({ message: "DB error" });
    if (!s) return res.status(404).json({ message: "QR tidak terdaftar" });
    const tgl = new Date().toISOString().slice(0, 10);
    const jam = new Date().toTimeString().slice(0, 8);
    db.get("SELECT id FROM absensi WHERE siswa_id = ? AND tanggal = ?", [s.id, tgl], (err, r) => {
      if (err) return res.status(500).json({ message: "DB error" });
      if (r) return res.status(409).json({ message: "Sudah absen hari ini" });
      db.run("INSERT INTO absensi (siswa_id, tanggal, jam) VALUES (?, ?, ?)", [s.id, tgl, jam], function (err) {
        if (err) return res.status(500).json({ message: "Gagal absen" });
        res.status(201).json({ message: "Absensi berhasil", nama: s.nama, kelas: s.kelas, jam });
      });
    });
  });
});

app.get("/api/absensi", (req, res) => {
  const { tanggal, kelas } = req.query;
  let sql = `SELECT absensi.id as absen_id, siswa.nama, siswa.kelas, absensi.tanggal, absensi.jam FROM absensi JOIN siswa ON siswa.id = absensi.siswa_id`;
  const p = [];
  const w = [];
  if (tanggal) { w.push("absensi.tanggal = ?"); p.push(tanggal); }
  if (kelas) { w.push("siswa.kelas = ?"); p.push(kelas); }
  if (w.length) sql += " WHERE " + w.join(" AND ");
  sql += " ORDER BY absensi.jam";
  db.all(sql, p, (err, r) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(r);
  });
});

app.get("/api/siswa/public", (req, res) => {
  const { kelas } = req.query;
  let sql = "SELECT id, nama, kelas FROM siswa";
  const params = [];
  if (kelas) { sql += " WHERE kelas = ?"; params.push(kelas); }
  sql += " ORDER BY nama";
  db.all(sql, params, (err, r) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(r);
  });
});

app.get("/debug/siswa", (req, res) => {
  db.all("SELECT * FROM siswa", (err, rows) => {
    if (err) return res.status(500).json({ message: "DB error" });
    res.json(rows);
  });
});

app.listen(PORT, () => console.log(`Server jalan di http://localhost:${PORT}`));