// server.js (paste to project root)
// Full Express server wired to Supabase service role. Requires .env with SUPABASE_URL and SUPABASE_SERVICE_KEY and ADMIN_PORTAL_KEY

import express from "express";
import fileUpload from "express-fileupload";
import { createClient } from "@supabase/supabase-js";
import cors from "cors";
import fs from "fs";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use(fileUpload());

// env
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_KEY;
const ADMIN_PORTAL_KEY = process.env.ADMIN_PORTAL_KEY || "NO_ADMIN_KEY_SET";

if(!SUPABASE_URL || !SERVICE_ROLE){
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in env");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// static
app.use(express.static("public"));
app.use(express.static("./"));
app.use(express.static("assets"));

// admin-create page injection
app.get("/admin-create-contractor.html", (req,res)=>{
  try{
    const html = fs.readFileSync("admin-create-contractor.html","utf8");
    res.send(html.replace("{{ADMIN_PORTAL_KEY}}", ADMIN_PORTAL_KEY));
  }catch(e){ res.status(500).send("Admin page missing"); }
});

// ADMIN: create contractor (server-side hashing) — protected by key in JSON body or referer query
app.post("/api/admin/create-contractor", async (req,res)=>{
  try{
    const { key, company, phone, password, telegram } = req.body;
    if(key !== ADMIN_PORTAL_KEY) return res.json({ ok:false, error: "Invalid admin key" });
    if(!company || !phone || !password) return res.json({ ok:false, error: "Missing fields" });

    const password_hash = await bcrypt.hash(password, 10);
    const { data, error } = await supabase
      .from("contractors")
      .insert([{ company, phone, password_hash, telegram_chat_id: telegram || null, created_at: new Date().toISOString() }])
      .select();

    if(error) return res.json({ ok:false, error: error.message });
    res.json({ ok:true, contractor: data });
  }catch(e){ res.json({ ok:false, error: e.message }); }
});

// CONTRACTOR LOGIN (phone + password)
app.post("/api/contractor/login", async (req,res)=>{
  try{
    const { phone, password } = req.body;
    const { data: contractor, error } = await supabase.from("contractors").select('*').eq('phone', phone).maybeSingle();
    if(error || !contractor) return res.json({ ok:false, error: "Contractor not found" });
    const match = await bcrypt.compare(password, contractor.password_hash || contractor.password || "");
    if(!match) return res.json({ ok:false, error: "Invalid password" });
    res.json({ ok:true, contractor });
  }catch(e){ res.json({ ok:false, error: e.message }); }
});

// GET contractors (public)
app.get("/api/contractors", async (req,res)=>{
  try{
    const { data, error } = await supabase.from("contractors").select("*").order('created_at',{ascending:false}).limit(1000);
    if(error) return res.status(400).json({ ok:false, error: error.message });
    res.json({ ok:true, contractors: data });
  }catch(e){ res.status(500).json({ ok:false, error: e.message }) }
});

// GET services
app.get("/api/services", async (req,res)=>{
  try{
    const { data, error } = await supabase.from("services").select("*").order('name',{ascending:true}).limit(2000);
    if(error) return res.status(400).json({ ok:false, error: error.message });
    res.json({ ok:true, services: data });
  }catch(e){ res.status(500).json({ ok:false, error: e.message }) }
});

// GET reviews
app.get("/api/reviews", async (req,res)=>{
  try{
    const { data, error } = await supabase.from("reviews").select("*").order('created_at',{ascending:false}).limit(500);
    if(error) return res.status(400).json({ ok:false, error: error.message });
    res.json({ ok:true, reviews: data });
  }catch(e){ res.status(500).json({ ok:false, error: e.message }) }
});

// POST lead
app.post("/api/lead", async (req,res)=>{
  try{
    const { name, phone, email, service, message, contractor_id } = req.body;
    const payload = { name, phone, email, service, message, contractor_id: contractor_id || null, created_at: new Date().toISOString() };
    const { data, error } = await supabase.from("leads").insert([payload]).select();
    if(error) return res.json({ ok:false, error: error.message });
    // TODO: notify contractor via Telegram server-side if telegram_chat_id present (you can add later)
    res.json({ ok:true, lead: data });
  }catch(e){ res.json({ ok:false, error: e.message }) }
});

// POST review (multipart allowed)
app.post("/api/review", async (req,res)=>{
  try{
    const contractorId = req.body.contractor || req.body.contractor_id;
    const name = req.body.name || "Customer";
    const rating = Number(req.body.rating || 5);
    const comment = req.body.comment || "";
    const images = [];
    if(req.files){
      for(const k of Object.keys(req.files)){
        const f = req.files[k];
        const filePath = `reviews/${Date.now()}-${f.name.replace(/\s/g,'_')}`;
        const upload = await supabase.storage.from('contractor-assets').upload(filePath, f.data, { upsert:true, contentType: f.mimetype });
        if(!upload.error){
          const url = supabase.storage.from('contractor-assets').getPublicUrl(filePath).data.publicUrl;
          images.push(url);
        }
      }
    }
    const { data, error } = await supabase.from('reviews').insert([{ contractor_id: contractorId, reviewer_name: name, rating, comment, images, created_at: new Date().toISOString() }]).select();
    if(error) return res.json({ ok:false, error: error.message });
    res.json({ ok:true, review: data });
  }catch(e){ res.json({ ok:false, error: e.message }) }
});

// POST message from contractor to admin (stored)
app.post("/api/message", async (req,res)=>{
  try{
    const { contractorId, message } = req.body;
    const { data, error } = await supabase.from('messages').insert([{ contractor_id: contractorId, message, created_at: new Date().toISOString() }]).select();
    if(error) return res.json({ ok:false, error: error.message });
    res.json({ ok:true, message: data });
  }catch(e){ res.json({ ok:false, error: e.message }) }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=> console.log("OmniLead API running on port " + PORT));
