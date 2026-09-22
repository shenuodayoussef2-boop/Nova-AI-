import crypto from "crypto";

export default async function handler(req,res){
  if(req.method!== "POST") return res.status(405).json({error:"POST only"});

  const newKey = `NOVA-sk-${crypto.randomBytes(16).toString("hex")}`;

  // هنا تقدر تخزن المفتاح في Vercel KV او Supabase
  // مؤقتا هنرجعه وانت تحطه في Vercel Env باسم NOVA_KEYS
  return res.status(200).json({
    success: true,
    api_key: newKey,
    message: "خد المفتاح ده وحطه في Vercel Env باسم NOVA_KEYS جنب المفاتيح القديمة",
    usage: `Authorization: Bearer ${newKey}`
  });
}
