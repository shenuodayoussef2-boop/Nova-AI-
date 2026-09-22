import crypto from "crypto";

export default function handler(req,res){
  // نسمح بـ GET و POST عشان تقدر تفتحه من المتصفح
  if(req.method !== "POST" && req.method !== "GET"){
    return res.status(405).json({error:"POST only"});
  }

  const newKey = `NOVA-sk-${crypto.randomBytes(16).toString("hex")}`;

  return res.status(200).json({
    success: true,
    api_key: newKey,
    example: {
      model: "nova-2.0-pro",
      header: `x-nova-key: ${newKey}`
    },
    note: "خد المفتاح ده وحطه في Vercel Env باسم NOVA_KEYS"
  });
}
