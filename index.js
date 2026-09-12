import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import db from "../Database/db.js";
import { requireAuth, signToken } from "./auth.js";
import { createBackup, startBackupScheduler } from "../Database/backup.js";

const app = express();
const PORT = Number(process.env.PORT || 4000);

app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json());

const adminUser = process.env.ADMIN_USERNAME || "admin";
const adminPass = process.env.ADMIN_PASSWORD || "ChangeMe@123";
const existing = db.prepare("SELECT id FROM users WHERE username=?").get(adminUser);
if (!existing) {
  db.prepare("INSERT INTO users(username,password_hash) VALUES(?,?)")
    .run(adminUser, bcrypt.hashSync(adminPass, 12));
}

app.get("/api/health", (_, res) => res.json({ ok: true, app: "રામાધણી ડેરી ફાર્મ" }));

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE username=?").get(username);
  if (!user || !bcrypt.compareSync(password || "", user.password_hash))
    return res.status(401).json({ error: "Invalid username or password" });
  res.json({ token: signToken(user), user: { id: user.id, username: user.username } });
});

app.use("/api", requireAuth);

app.get("/api/customers", (_, res) => {
  res.json(db.prepare("SELECT * FROM customers ORDER BY name COLLATE NOCASE").all());
});

app.post("/api/customers", (req, res) => {
  const { name, phone="", address="", rate=0, notes="" } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Customer name is required" });
  const info = db.prepare(
    "INSERT INTO customers(name,phone,address,rate,notes) VALUES(?,?,?,?,?)"
  ).run(name.trim(), phone, address, Number(rate)||0, notes);
  res.status(201).json(db.prepare("SELECT * FROM customers WHERE id=?").get(info.lastInsertRowid));
});

app.put("/api/customers/:id", (req, res) => {
  const { name, phone="", address="", rate=0, notes="" } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: "Customer name is required" });
  const result = db.prepare(
    "UPDATE customers SET name=?,phone=?,address=?,rate=?,notes=? WHERE id=?"
  ).run(name.trim(), phone, address, Number(rate)||0, notes, req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Customer not found" });
  res.json(db.prepare("SELECT * FROM customers WHERE id=?").get(req.params.id));
});

app.delete("/api/customers/:id", (req, res) => {
  const result = db.prepare("DELETE FROM customers WHERE id=?").run(req.params.id);
  if (!result.changes) return res.status(404).json({ error: "Customer not found" });
  res.json({ ok: true });
});

app.post("/api/entries", (req, res) => {
  const { customer_id, entry_date, morning=0, evening=0 } = req.body;
  if (!customer_id || !entry_date) return res.status(400).json({ error: "Customer and date required" });
  db.prepare(`
    INSERT INTO milk_entries(customer_id,entry_date,morning,evening)
    VALUES(?,?,?,?)
    ON CONFLICT(customer_id,entry_date) DO UPDATE SET morning=excluded.morning, evening=excluded.evening
  `).run(customer_id, entry_date, Number(morning)||0, Number(evening)||0);
  res.json({ ok: true });
});

app.get("/api/entries", (req, res) => {
  const month = String(req.query.month || new Date().toISOString().slice(0,7));
  res.json(db.prepare(`
    SELECT e.*, c.name, c.phone, c.rate
    FROM milk_entries e JOIN customers c ON c.id=e.customer_id
    WHERE substr(e.entry_date,1,7)=?
    ORDER BY e.entry_date DESC, c.name
  `).all(month));
});

app.get("/api/ledger/:customerId", (req, res) => {
  const month = String(req.query.month || new Date().toISOString().slice(0,7));
  const customer = db.prepare("SELECT * FROM customers WHERE id=?").get(req.params.customerId);
  if (!customer) return res.status(404).json({ error: "Customer not found" });

  const entries = db.prepare(`
    SELECT entry_date,morning,evening,(morning+evening) total
    FROM milk_entries WHERE customer_id=? AND substr(entry_date,1,7)=?
    ORDER BY entry_date
  `).all(req.params.customerId, month);

  const totalMilk = entries.reduce((s,e)=>s+e.total,0);
  const bill = totalMilk * Number(customer.rate || 0);
  const paid = db.prepare(`
    SELECT COALESCE(SUM(amount),0) paid FROM payments
    WHERE customer_id=? AND substr(payment_date,1,7)=?
  `).get(req.params.customerId, month).paid;
  res.json({ customer, month, entries, totalMilk, rate: customer.rate, bill, paid, balance: bill-paid });
});

app.post("/api/payments", (req, res) => {
  const { customer_id, payment_date, amount, method="Cash", note="" } = req.body;
  if (!customer_id || !payment_date || !(Number(amount)>0))
    return res.status(400).json({ error: "Customer, date and positive amount are required" });
  const info = db.prepare(
    "INSERT INTO payments(customer_id,payment_date,amount,method,note) VALUES(?,?,?,?,?)"
  ).run(customer_id,payment_date,Number(amount),method,note);
  res.status(201).json({ id: info.lastInsertRowid });
});

app.get("/api/payments", (_, res) => {
  res.json(db.prepare(`
    SELECT p.*, c.name FROM payments p JOIN customers c ON c.id=p.customer_id
    ORDER BY p.payment_date DESC, p.id DESC
  `).all());
});

app.post("/api/backup", (_, res) => {
  try { res.json({ ok: true, file: createBackup() }); }
  catch (e) { res.status(500).json({ error: e.message }); }
});

app.post("/api/ai", async (req, res) => {
  const question = String(req.body?.question || "").trim();
  if (!question) return res.status(400).json({ error: "Question required" });

  // Safe built-in assistant: answers common billing/farm queries using current DB data.
  const customers = db.prepare("SELECT COUNT(*) count FROM customers").get().count;
  const month = new Date().toISOString().slice(0,7);
  const milk = db.prepare(`
    SELECT COALESCE(SUM(morning+evening),0) total FROM milk_entries
    WHERE substr(entry_date,1,7)=?
  `).get(month).total;

  let answer = `હું રામાધણી ડેરી ફાર્મ AI સહાયક છું. હાલ ${month}માં ${customers} ગ્રાહકો અને ${milk.toFixed(2)} લિટર milk entries નોંધાઈ છે.`;
  if (/bill|billing|બિલ|બાકી|balance/i.test(question)) {
    answer += " ગ્રાહકનું નામ આપશો તો હું તેના હાલના મહિના માટે bill અને balance બતાવી શકું છું.";
  } else if (/backup|બેકઅપ/i.test(question)) {
    answer += " ડેટાબેઝનો automatic daily backup ચાલુ છે; તમે Dashboard પરથી manual backup પણ લઈ શકો છો.";
  } else if (/payment|ચુકવણી|પેમેન્ટ/i.test(question)) {
    answer += " Payments વિભાગમાં customer, તારીખ, રકમ અને payment method નોંધાવી શકો છો.";
  } else {
    answer += " તમે billing, payment, milk entries, monthly ledger અથવા backup વિશે પૂછો.";
  }
  res.json({ answer });
});

app.listen(PORT, () => {
  console.log(`રામાધણી ડેરી ફાર્મ API running on http://localhost:${PORT}`);
  startBackupScheduler();
});
