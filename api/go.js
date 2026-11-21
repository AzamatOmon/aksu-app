const { pipeline } = require("./_redis");

const IOS = "https://apps.apple.com/app/id6786201223";
const ANDROID = "https://play.google.com/store/apps/details?id=uz.aksu.app";
const BOT = /bot|crawl|spider|preview|telegram|facebookexternalhit|whatsapp|slack|discord|curl|wget/i;

function today() {
  // Toshkent vaqti (UTC+5)
  return new Date(Date.now() + 5 * 3600 * 1000).toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  const ua = req.headers["user-agent"] || "";
  const src = String((req.query && req.query.src) || "umumiy").toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40) || "umumiy";

  let os = "boshqa", target = "/tanlash.html";
  if (/iPhone|iPad|iPod/i.test(ua)) { os = "ios"; target = IOS; }
  else if (/Android/i.test(ua)) { os = "android"; target = ANDROID; }

  if (!BOT.test(ua)) {
    await pipeline([
      ["HINCRBY", "jami", src, 1],
      ["HINCRBY", "os:" + src, os, 1],
      ["HINCRBY", "kun:" + today(), src, 1],
    ]);
  }

  res.setHeader("Cache-Control", "no-store");
  res.statusCode = 302;
  res.setHeader("Location", target);
  res.end();
};
