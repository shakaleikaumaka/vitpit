/* The Esmeralda P.I.T. (formerly edgeTV) audio range-shim v2 — taur.link static hosting doesn't support HTTP ranges,
   so this worker serves 206 slices from cached audio files. Seeking lives here.
   v2 (Jul 25): purge stale caches + verify cached size against the network once
   per session, so a truncated file from build iterations can never haunt a
   browser forever (the "fragment word-clock" bug). */
const CACHE = 'edgetv-audio-v3';
const verified = new Set(); // paths already size-checked this session

self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => clients.claim())
));

async function fetchFresh(cache, path) {
  const net = await fetch(path);
  if (!net.ok) return net;
  try { await cache.put(path, net.clone()); } catch (putErr) { /* quota — serve uncached */ }
  return net;
}

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin || !url.pathname.startsWith('/audio/')) return;
  const range = e.request.headers.get('range');
  if (!range) return; // ordinary full-file requests pass through to network

  e.respondWith((async () => {
    let buf = null;
    try {
      const cache = await caches.open(CACHE);
      let full = await cache.match(url.pathname);
      if (full && !verified.has(url.pathname)) {
        /* one cheap size check per file per session: if the server's copy grew
           (rebuilt word-clock), drop the stale fragment and refetch */
        try {
          const head = await fetch(url.pathname, { method: 'HEAD' });
          const netLen = +(head.headers.get('content-length') || 0);
          const cachedLen = +(full.headers.get('content-length') || 0);
          if (netLen && cachedLen && netLen !== cachedLen) full = null;
        } catch (headErr) { /* offline — serve what we have */ }
        verified.add(url.pathname);
      }
      if (!full) full = await fetchFresh(cache, url.pathname);
      buf = await full.arrayBuffer();
    } catch (err) {
      // cache layer failed entirely — fall back to a plain network fetch
      const net = await fetch(url.pathname);
      if (!net.ok) return net;
      buf = await net.arrayBuffer();
    }
    const m = range.match(/bytes=(\d+)-(\d*)/);
    if (!m) return new Response(buf, { status: 200, headers: { 'Content-Type': 'audio/mpeg' } });
    const start = +m[1];
    const end = m[2] ? Math.min(+m[2], buf.byteLength - 1) : buf.byteLength - 1;
    if (start >= buf.byteLength) {
      return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${buf.byteLength}` } });
    }
    return new Response(buf.slice(start, end + 1), {
      status: 206,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Range': `bytes ${start}-${end}/${buf.byteLength}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(end - start + 1)
      }
    });
  })());
});
