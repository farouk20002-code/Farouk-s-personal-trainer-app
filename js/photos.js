// Progress photos in IndexedDB (too big for localStorage). Each photo is resized to ~900 px JPEG.
const DB = 'farouk-coach-photos', STORE = 'photos';
let dbp = null;
function db() {
  if (!dbp) dbp = new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
  });
  return dbp;
}
const tx = async (mode, fn) => { const d = await db(); return new Promise((res, rej) => { const t = d.transaction(STORE, mode); const out = fn(t.objectStore(STORE)); t.oncomplete = () => res(out?.result ?? out); t.onerror = () => rej(t.error); }); };

export async function resize(file, max = 900) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
    const k = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', 0.8);
  } finally { URL.revokeObjectURL(url); }
}
// pose: front | side | back | neck
export async function addPhoto(date, pose, file) { const data = await resize(file); const p = { id: date + '_' + pose + '_' + Date.now(), date, pose, data }; await tx('readwrite', s => s.put(p)); return p; }
export async function listPhotos() { const all = await tx('readonly', s => s.getAll()); return (all || []).sort((a, b) => a.date < b.date ? -1 : 1); }
export async function deletePhoto(id) { await tx('readwrite', s => s.delete(id)); }
export async function importPhotos(list) { for (const p of list || []) if (p && p.id && p.data) await tx('readwrite', s => s.put(p)); }
