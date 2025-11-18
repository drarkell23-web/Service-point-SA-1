// server.js — OmniLead API Server (Express + Supabase)
import express from "express";
import fileUpload from "express-fileupload";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import path from "path";
import fs from "fs";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());
app.use(express.static("public"));
app.use(express.static("./public"));

// ENV
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID_ADMIN = process.env.TELEGRAM_CHAT_ID_ADMIN;

// validate
if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env");
  process.exit(1);
}

// supabase client (service role)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// ADMIN PAGE INJECTION (optional)
app.get("/admin-create-contractor.html", (req, res) => {
  try {
    const html = fs.readFileSync("public/admin-create-contractor.html", "utf8");
    res.send(html);
  } catch (err) {
    res.status(500).send("Admin page missing.");
  }
});

// GET services (proxy)
app.get("/api/services", async (req, res) => {
  try {
    const { data, error } = await supabase.from("services").select("*").order("name", { ascending: true });
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, services: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// GET contractors (proxy)
app.get("/api/contractors", async (req, res) => {
  try {
    const { data, error } = await supabase.from("contractors").select("*").order("created_at", { ascending: false }).limit(1000);
    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, contractors: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST create contractor (admin page)
app.post("/api/admin/create-contractor", async (req, res) => {
  try {
    const { company, phone, password, telegram } = req.body;
    if (!company || !phone || !password) return res.status(400).json({ ok: false, error: "Missing fields" });

    const password_hash = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from("contractors")
      .insert([{ company, phone, password_hash, telegram_chat_id: telegram || null, created_at: new Date().toISOString() }])
      .select()
      .maybeSingle();

    if (error) return res.status(500).json({ ok: false, error: error.message });
    res.json({ ok: true, contractor: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST contractor login (phone + password)
app.post("/api/contractor/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) return res.status(400).json({ ok: false, error: "Missing" });

    const { data, error } = await supabase.from("contractors").select("*").eq("phone", phone).maybeSingle();
    if (error) return res.status(500).json({ ok: false, error: error.message });
    if (!data) return res.status(404).json({ ok: false, error: "Not found" });

    const match = await bcrypt.compare(password, data.password_hash || "");
    if (!match) return res.status(401).json({ ok: false, error: "Invalid password" });

    // hide hash
    delete data.password_hash;
    res.json({ ok: true, contractor: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// POST /api/lead — save lead and (optionally) notify telegram
app.post("/api/lead", async (req, res) => {
  try {
    const body = req.body || {};
    const payload = {
      name: body.name || null,
      phone: body.phone || null,
      email: body.email || null,
      service: body.service || body.service_needed || null,
      message: body.message || body.description || null,
      contractor_id: body.contractor_id || body.contractorId || null,
      source: body.source || "web",
      created_at: new Date().toISOString(),
    };

    if (!payload.name || !payload.phone || !payload.service) {
      return res.status(400).json({ ok: false, error: "name, phone and service are required" });
    }

    const { data, error } = await supabase.from("leads").insert([payload]).select().maybeSingle();
    if (error) return res.status(500).json({ ok: false, error: error.message });

    // send telegram notification if configured
    if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID_ADMIN) {
      try {
        const textParts = [
          `New Lead Received`,
          `Name: ${payload.name}`,
          `Phone: ${payload.phone}`,
          payload.email ? `Email: ${payload.email}` : null,
          `Service: ${payload.service}`,
          payload.contractor_id ? `Contractor: ${payload.contractor_id}` : `No contractor assigned`,
          payload.message ? `Message: ${payload.message}` : null,
          `Source: ${payload.source}`,
        ].filter(Boolean);

        const text = textParts.join("\n");
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID_ADMIN, text }),
        });
      } catch (tgErr) {
        console.warn("Telegram notify failed:", tgErr);
      }
    }

    res.status(201).json({ ok: true, lead: data });
  } catch (err) {
    res.status(500).json({ ok: false, error: String(err) });
  }
});

// catch-all for simple health
app.get("/health", (req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`OmniLead API running on port ${PORT}`));
