/**
 * OmniLink - server.js
 * Single-file Node/Express server for Render.
 *
 * Features:
 * - Serves static files (index.html, admin-dashboard.html, contractor-dashboard.html, theme.css)
 * - Handles leads, contractors, reviews, admin messages, override tokens
 * - Stores data in simple JSON files under /data for quick demo (not production-safe)
 * - Uploads saved to /uploads (Render ephemeral disk)
 * - Forwards leads to Telegram (admin bot via BOT_TOKEN/ADMIN_CHAT_ID and optional contractor token/chat)
 * - Subscription management (UI + server placeholder)
 *
 * Environment variables (set in Render):
 * - BOT_TOKEN: default admin bot token (used to forward leads)
 * - ADMIN_CHAT_ID: admin chat id to send admin notifications to
 * - ADMIN_SECRET: secret passphrase to enable admin actions
 * - ADMIN_OVERRIDE_TOKEN: optional override bot token
 * - ADMIN_OVERRIDE_CHAT_ID: optional override chat id
 *
 * Notes: For production, use a proper DB, storage bucket, and secure credential handling.
 */

import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import fetch from "node-fetch";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 10000;

const BOT_TOKEN = process.env.BOT_TOKEN || "8526401033:AAFrG8IH8xqQL_RTD7s7JLyxZpc8e8GOyyg";
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || "8187670531";
const ADMIN_OVERRIDE_TOKEN = process.env.ADMIN_OVERRIDE_TOKEN || "8374597023:AAF-rIEJOmu_XiGMPpUsI1sCL2dN5_K5wig";
const ADMIN_OVERRIDE_CHAT_ID = process.env.ADMIN_OVERRIDE_CHAT_ID || "8187670531";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";

// ensure data and uploads
const DATA_DIR = path.join(__dirname, "data");
const UPLOADS_DIR = path.join(__dirname, "uploads");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

// helper to read/write JSON files
function readJSON(name) {
  const p = path.join(DATA_DIR, name + ".json");
  if (!fs.existsSync(p)) return [];
  try { return JSON.parse(fs.readFileSync(p)); } catch(e){ return []; }
}
function writeJSON(name, arr) {
  const p = path.join(DATA_DIR, name + ".json");
  fs.writeFileSync(p, JSON.stringify(arr, null, 2));
}

// append log
function appendLog(name, obj) {
  const arr = readJSON(name);
  arr.unshift({ ts: new Date().toISOString(), ...obj });
  writeJSON(name, arr.slice(0, 1000));
}

// send to telegram using a token + chat id
async function sendTelegram(token, chatId, text, parse_mode = "HTML") {
  try {
    if (!token || !chatId) throw new Error("Missing token or chatId");
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: String(chatId), text, parse_mode })
    });
    const data = await res.json();
    if (!data.ok) console.warn("Telegram send error", data);
    return data;
  } catch (err) {
    console.error("sendTelegram error", err.message || err);
    return { ok: false, error: err.message || String(err) };
  }
}

async function notifyAdminAndMaybeContractor({ messageText, contractorToken, contractorChatId }) {
  const results = {};
  if (BOT_TOKEN && ADMIN_CHAT_ID) results.admin = await sendTelegram(BOT_TOKEN, ADMIN_CHAT_ID, messageText);
  if (ADMIN_OVERRIDE_TOKEN && ADMIN_OVERRIDE_CHAT_ID) results.override = await sendTelegram(ADMIN_OVERRIDE_TOKEN, ADMIN_OVERRIDE_CHAT_ID, messageText);
  if (contractorToken && contractorChatId) results.contractor = await sendTelegram(contractorToken, contractorChatId, messageText);
  appendLog("sent_messages", { messageText, results });
  return results;
}

// middleware
app.use(express.json({ limit: "8mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));
app.use("/uploads", express.static(UPLOADS_DIR));

// multer for uploads
const storage = multer.diskStorage({
  destination: (req,file,cb) => cb(null, UPLOADS_DIR),
  filename: (req,file,cb) => cb(null, `${Date.now()}-${Math.random().toString(36).slice(2,8)}-${file.originalname.replace(/\s+/g,'_')}`)
});
const upload = multer({ storage, limits: { fileSize: 6*1024*1024 } });

// landing page
app.get("/", (req,res) => res.sendFile(path.join(__dirname, "index.html")));

// admin-secret check
app.get("/api/admin-secret", (req,res) => {
  res.json({ ok: true, secret: !!ADMIN_SECRET });
});

// GET logs helper
app.get("/api/logs/:name", (req,res) => {
  const name = req.params.name;
  res.json(readJSON(name));
});

/**
 * POST /api/lead
 * Accepts: { name, phone, email, service, message, contractorId }
 * Behavior:
 *  - store to leads.json
 *  - build small telegram text (ONLY main details: name, phone, service, short message)
 *  - send to admin BOT (BOT_TOKEN/ADMIN_CHAT_ID)
 *  - if contractorId found and that contractor has telegramToken/chatId stored, forward to them too
 */
app.post("/api/lead", async (req,res) => {
  try {
    const { name, phone, email, service, message, contractorId } = req.body;
    // store full lead
    appendLog("leads", { name, phone, email, service, message, contractorId });
    // find contractor token if provided
    const contractors = readJSON("contractors");
    let contractorToken, contractorChatId, contractorName;
    if (contractorId) {
      const c = contractors.find(x => x.id === contractorId || x.phone === contractorId || x.name === contractorId);
      if (c) { contractorToken = c.telegramToken; contractorChatId = c.telegramChatId; contractorName = c.name || c.company || null; }
    }
    // build telegram message (short & useful)
    const text = [
      "<b>📩 New Lead</b>",
      `👤 ${name || "-"}`,
      `📞 ${phone || "-"}`,
      service ? `🛠 ${service}` : "",
      message ? `💬 ${message.length>200 ? message.slice(0,200) + "..." : message}` : "",
      email ? `📧 ${email}` : "",
      contractorName ? `👷 Sent towards: ${contractorName}` : "",
      `⏱ ${new Date().toLocaleString()}`
    ].filter(Boolean).join("\n");
    const results = await notifyAdminAndMaybeContractor({ messageText: text, contractorToken, contractorChatId });
    res.json({ ok: true, results });
  } catch (err) {
    console.error("lead err", err);
    res.status(500).json({ ok: false, error: String(err) });
  }
});

/**
 * POST /api/contractor
 * Accepts contractor registration / updates:
 * { id (optional), name, company, phone, service, telegramToken, telegramChatId, logoUrl, subscription }
 * Stores to contractors.json and notifies admin.
 */
app.post("/api/contractor", async (req,res) => {
  try {
    const c = req.body;
    const contractors = readJSON("contractors");
    // find by id or phone
    let existing = contractors.find(x => (c.id && x.id === c.id) || (c.phone && x.phone === c.phone));
    if (existing) {
      Object.assign(existing, { ...c, updated: new Date().toISOString() });
    } else {
      const id = c.id || `ct-${Date.now()}`;
      contractors.unshift({ id, ...c, created: new Date().toISOString() });
    }
    writeJSON("contractors", contractors);
    appendLog("contractors", { action: "upsert", contractor: c });
    // notify admin
    const text = `<b>🧰 Contractor Signup/Update</b>\nCompany: ${c.company||"-"}\nName: ${c.name||"-"}\nService: ${c.service||"-"}\nPhone: ${c.phone||"-"}`;
    const results = await notifyAdminAndMaybeContractor({ messageText: text, contractorToken: c.telegramToken, contractorChatId: c.telegramChatId });
    res.json({ ok: true, results });
  } catch (err) {
    console.error("contractor err", err);
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/**
 * POST /api/review
 * Accepts form-data with images
 * Fields: contractor, name, rating, comment
 */
app.post("/api/review", upload.array("images", 6), async (req,res) => {
  try {
    const { contractor, name, rating, comment } = req.body;
    const files = (req.files || []).map(f => `/uploads/${path.basename(f.path)}`);
    appendLog("reviews", { contractor, name, rating, comment, images: files });
    // notify admin & contractor
    const text = `<b>⭐ New Review</b>\nContractor: ${contractor || "-"}\nReviewer: ${name || "-"}\nRating: ${rating || "-"}\n${comment ? ("Comment: " + (comment.length>300 ? comment.slice(0,300) + "..." : comment)) : ""}`;
    // find contractor token
    let contractorToken, contractorChatId;
    const contractors = readJSON("contractors");
    const c = contractors.find(x => x.name === contractor || x.id === contractor || x.company === contractor);
    if (c) { contractorToken = c.telegramToken; contractorChatId = c.telegramChatId; }
    const results = await notifyAdminAndMaybeContractor({ messageText: text, contractorToken, contractorChatId });
    res.json({ ok: true, images: files, results });
  } catch (err) {
    console.error("review err", err);
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/**
 * POST /api/message (admin -> contractor)
 * Body: { adminSecret, contractorId, message }
 */
app.post("/api/message", async (req,res) => {
  try {
    const { adminSecret, contractorId, message } = req.body;
    if (!adminSecret || adminSecret !== ADMIN_SECRET) return res.status(401).json({ ok:false, error: "unauthorized" });
    const contractors = readJSON("contractors");
    const c = contractors.find(x => x.id === contractorId || x.phone === contractorId || x.name === contractorId);
    let contractorToken, contractorChatId;
    if (c) { contractorToken = c.telegramToken; contractorChatId = c.telegramChatId; }
    const text = `<b>📣 Message from Admin</b>\n${message}\n⏱ ${new Date().toLocaleString()}`;
    const results = await notifyAdminAndMaybeContractor({ messageText: text, contractorToken, contractorChatId });
    appendLog("admin_messages", { contractorId, message });
    res.json({ ok:true, results });
  } catch (err) {
    console.error("msg err", err);
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/**
 * POST /api/set-override
 * Body: { adminSecret, overrideToken, overrideChatId }
 * (This just logs change; to persist set Env vars in Render)
 */
app.post("/api/set-override", (req,res) => {
  try {
    const { adminSecret, overrideToken, overrideChatId } = req.body;
    if (!adminSecret || adminSecret !== ADMIN_SECRET) return res.status(401).json({ ok:false, error:"unauthorized" });
    appendLog("override_changes", { overrideToken: !!overrideToken, overrideChatId: !!overrideChatId });
    res.json({ ok:true, warning: "To persist override tokens, update Render environment variables." });
  } catch (err) {
    res.status(500).json({ ok:false, error: String(err) });
  }
});

/**
 * POST /api/subscription (admin only)
 * Body: { adminSecret, contractorId, plan, periodMonths, price, startsAt }
 * Applies subscription record to contractor
 */
app.post("/api/subscription", (req,res) => {
  try {
    const { adminSecret, contractorId, plan, periodMonths, price } = req.body;
    if (!adminSecret || adminSecret !== ADMIN_SECRET) return res.status(401).json({ ok:false, error:"unauthorized" });
    const contractors = readJSON("contractors");
    const c = contractors.find(x => x.id === contractorId || x.phone === contractorId);
    if (!c) return res.status(404).json({ ok:false, error:"contractor not found" });
    c.subscription = { plan, periodMonths, price, started: new Date().toISOString() };
    writeJSON("contractors", contractors);
    appendLog("subscriptions", { contractorId, plan, periodMonths, price });
    res.json({ ok:true });
  } catch (err) {
    res.status(500).json({ ok:false, error: String(err) });
  }
});

// file serving fallback
app.use((req,res) => {
  const file = path.join(__dirname, req.path);
  if (fs.existsSync(file) && fs.statSync(file).isFile()) return res.sendFile(file);
  res.status(404).send("Not found");
});

// start
app.listen(PORT, () => console.log(`🚀 OmniLink Server live on port ${PORT}`));
