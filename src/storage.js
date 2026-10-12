/* Speicher: IndexedDB, Fallback localStorage (dann Fotos als data:-URL, mit wenig Platz).
   Kennt nur Datensätze, Bilddaten und Metadaten, keine Logik. */

import { COLLECTIONS } from './model.js';

const DB_NAME = 'entwicklungs-app', DB_VERSION = 2, LS_KEY = 'entwicklungs-app-v1';
const STORES = [...COLLECTIONS, 'blobs'];

const req = r => new Promise((res, rej) => { r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
const blobToDataUrl = b => new Promise((res, rej) => { const f = new FileReader(); f.onload = () => res(f.result); f.onerror = () => rej(f.error); f.readAsDataURL(b); });

export const Store = {
  db: null, ls: false,

  async open() {
    try {
      this.db = await new Promise((res, rej) => {
        const r = indexedDB.open(DB_NAME, DB_VERSION);
        r.onupgradeneeded = () => {
          for (const s of STORES) if (!r.result.objectStoreNames.contains(s)) r.result.createObjectStore(s, { keyPath: 'id' });
          if (!r.result.objectStoreNames.contains('meta')) r.result.createObjectStore('meta', { keyPath: 'key' });
        };
        r.onsuccess = () => res(r.result);
        r.onerror = () => rej(r.error);
      });
    } catch { this.ls = true; }
  },

  // ---------- localStorage-Fallback ----------
  _lsGet() {
    let v = null;
    try { v = JSON.parse(localStorage.getItem(LS_KEY)); } catch { /* leer */ }
    v = v && typeof v === 'object' ? v : {};
    v.meta = v.meta || {};
    STORES.forEach(s => { v[s] = v[s] || {}; }); // neue Sammlungen nach Updates
    return v;
  },
  _lsSet(v) { localStorage.setItem(LS_KEY, JSON.stringify(v)); },

  _tx(stores, mode) { return this.db.transaction(stores, mode); },

  /** Alle Datensätze einer Sammlung */
  async all(collection) {
    if (this.ls) return Object.values(this._lsGet()[collection] || {});
    return req(this._tx(collection, 'readonly').objectStore(collection).getAll());
  },

  /** Speichert Datensätze (eine Sammlung, eine Transaktion) */
  async putMany(collection, list) {
    if (this.ls) { const v = this._lsGet(); list.forEach(r => { v[collection][r.id] = r; }); return this._lsSet(v); }
    const tx = this._tx(collection, 'readwrite');
    list.forEach(r => tx.objectStore(collection).put(r));
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  },
  put(collection, rec) { return this.putMany(collection, [rec]); },

  async remove(collection, ids) {
    ids = [].concat(ids);
    if (this.ls) { const v = this._lsGet(); ids.forEach(id => { delete v[collection][id]; }); return this._lsSet(v); }
    const tx = this._tx(collection, 'readwrite');
    ids.forEach(id => tx.objectStore(collection).delete(id));
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  },

  /** Bilddaten eines Fotos */
  async getBlob(id) {
    if (this.ls) { const u = this._lsGet().blobs[id]; return u ? (await fetch(u.data)).blob() : null; }
    const r = await req(this._tx('blobs', 'readonly').objectStore('blobs').get(id));
    return r ? r.blob : null;
  },
  async putBlob(id, blob) {
    if (this.ls) { const v = this._lsGet(); v.blobs[id] = { id, data: await blobToDataUrl(blob) }; return this._lsSet(v); }
    return req(this._tx('blobs', 'readwrite').objectStore('blobs').put({ id, blob }));
  },

  /** Löscht alles außer Metadaten */
  async clearAll() {
    if (this.ls) { const v = this._lsGet(); STORES.forEach(s => { v[s] = {}; }); return this._lsSet(v); }
    const tx = this._tx(STORES, 'readwrite');
    STORES.forEach(s => tx.objectStore(s).clear());
    return new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = () => rej(tx.error); });
  },

  async getMeta(key) {
    if (this.ls) return this._lsGet().meta[key];
    const r = await req(this._tx('meta', 'readonly').objectStore('meta').get(key));
    return r ? r.value : undefined;
  },
  async setMeta(key, value) {
    if (this.ls) { const v = this._lsGet(); v.meta[key] = value; return this._lsSet(v); }
    return req(this._tx('meta', 'readwrite').objectStore('meta').put({ key, value }));
  },
};
