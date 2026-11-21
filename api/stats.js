const { pipeline } = require("./_redis");

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const toObj = (arr) => { const o = {}; for (let i = 0; arr && i < arr.length; i += 2) o[arr[i]] = Number(arr[i + 1]); return o; };

module.exports = async (req, res) => {
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  if (!process.env.STATS_KEY || req.query.key !== process.env.STATS_KEY) {
    res.statusCode = 401;
    return res.end("<h3>Parol noto'g'ri. /statistika?key=PAROL</h3>");
  }
  const days = [];
  for (let i = 0; i < 30; i++) days.push(new Date(Date.now() + 5 * 3600e3 - i * 864e5).toISOString().slice(0, 10));

  const r1 = await pipeline([["HGETALL", "jami"]]);
  const jami = toObj(r1 && r1[0] && r1[0].result);
  const srcs = Object.keys(jami).sort((a, b) => jami[b] - jami[a]);
  const r2 = await pipeline([...srcs.map((s) => ["HGETALL", "os:" + s]), ...days.map((d) => ["HGETALL", "kun:" + d])]) || [];
  const osMap = srcs.map((_, i) => toObj(r2[i] && r2[i].result));
  const dayMap = days.map((_, i) => toObj(r2[srcs.length + i] && r2[srcs.length + i].result));

  const total = srcs.reduce((a, s) => a + jami[s], 0);
  let rows = srcs.map((s, i) => `<tr><td>${esc(s)}</td><td><b>${jami[s]}</b></td><td>${osMap[i].ios || 0}</td><td>${osMap[i].android || 0}</td><td>${osMap[i].boshqa || 0}</td></tr>`).join("");
  let dayRows = days.map((d, i) => {
    const sum = Object.values(dayMap[i]).reduce((a, b) => a + b, 0);
    if (!sum) return "";
    const det = Object.entries(dayMap[i]).map(([k, v]) => `${esc(k)}: ${v}`).join(", ");
    return `<tr><td>${d}</td><td><b>${sum}</b></td><td>${det}</td></tr>`;
  }).join("");

  res.end(`<!DOCTYPE html><html lang="uz"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>Aksu QR statistika</title>
<style>body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:720px;margin:24px auto;padding:0 16px;color:#111}table{width:100%;border-collapse:collapse;margin:12px 0 28px}td,th{border-bottom:1px solid #eee;padding:8px;text-align:left}th{color:#666;font-weight:500}</style></head><body>
<h2>Aksu QR — skanerlar: ${total}</h2>
<table><tr><th>Joy</th><th>Jami</th><th>iPhone</th><th>Android</th><th>Boshqa</th></tr>${rows || "<tr><td colspan=5>Hali skaner yo'q</td></tr>"}</table>
<h3>Oxirgi 30 kun</h3><table><tr><th>Kun</th><th>Jami</th><th>Joylar</th></tr>${dayRows || "<tr><td colspan=3>—</td></tr>"}</table>
</body></html>`);
};
