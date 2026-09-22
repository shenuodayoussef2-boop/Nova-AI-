export default function handler(req,res){
  return res.status(200).json({
    success: true,
    data: [
      { id: "nova-2.0-pro", name: "Nova 2.0 Pro", description: "أقوى موديل من Nova AI - ذكاء خارق", context: "1M" },
      { id: "nova-2.0-flash", name: "Nova 2.0 Flash", description: "سريع وذكي للردود اليومية", context: "1M" },
      { id: "nova-2.0-mini", name: "Nova 2.0 Mini", description: "خفيف وسريع جدا", context: "128k" }
    ]
  });
}
