const DB_NAME = "habit_tracker_db";
const DB_VERSION = 1;

function reqToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function openDb() {
  const request = indexedDB.open(DB_NAME, DB_VERSION);
  request.onupgradeneeded = () => {
    const db = request.result;
    if (!db.objectStoreNames.contains("habits")) {
      db.createObjectStore("habits", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("entries")) {
      const store = db.createObjectStore("entries", { keyPath: "id" });
      store.createIndex("byHabitId", "habitId", { unique: false });
      store.createIndex("byDate", "date", { unique: false });
    }
    if (!db.objectStoreNames.contains("projects")) {
      db.createObjectStore("projects", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("settings")) {
      db.createObjectStore("settings", { keyPath: "key" });
    }
  };
  return reqToPromise(request);
}

export async function tx(db, storeNames, mode, fn) {
  const names = Array.isArray(storeNames) ? storeNames : [storeNames];
  const transaction = db.transaction(names, mode);
  const stores = Object.fromEntries(names.map((n) => [n, transaction.objectStore(n)]));
  const result = await fn(stores, transaction);
  await new Promise((resolve, reject) => {
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error);
  });
  return result;
}

export async function getAll(store, query, count) {
  return reqToPromise(store.getAll(query, count));
}

export async function get(store, key) {
  return reqToPromise(store.get(key));
}

export async function put(store, value) {
  return reqToPromise(store.put(value));
}

export async function del(store, key) {
  return reqToPromise(store.delete(key));
}

