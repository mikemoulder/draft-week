const [url, ...subs] = process.argv.slice(2);
const t0 = Date.now(); const counts = {}; const first = {};
const ws = new WebSocket(url);
ws.onopen = () => { console.log('open', Date.now()-t0, 'ms'); subs.forEach(s => ws.send(s)); };
ws.onmessage = (e) => { for (const line of String(e.data).split("\n").filter(Boolean)) { let m; try { m = JSON.parse(line) } catch { m = {raw: line.slice(0,200)} }
  const k = m.type || m.channel || m.e || (m.result!==undefined||m.id!==undefined ? 'ack' : 'other');
  counts[k] = (counts[k]||0)+1; if (!first[k]) { first[k]=1; console.log(k, "->", JSON.stringify(m).slice(0,400)); } } };
ws.onerror = (e) => console.log('error', e.message);
ws.onclose = (e) => console.log('close', e.code, e.reason);
setTimeout(() => { console.log('counts in 12s', counts); process.exit(0); }, 12000);
