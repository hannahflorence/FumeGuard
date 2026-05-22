import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";

const useEmulator = import.meta.env.VITE_USE_FIREBASE_EMULATOR === "true";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

if (useEmulator) {
  const dbHost = import.meta.env.VITE_FIREBASE_DATABASE_EMULATOR_HOST ?? "127.0.0.1";
  const dbPort = Number(import.meta.env.VITE_FIREBASE_DATABASE_EMULATOR_PORT ?? 9000);
  connectDatabaseEmulator(db, dbHost, dbPort);

  const authHost = import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_HOST ?? "127.0.0.1";
  const authPort = Number(import.meta.env.VITE_FIREBASE_AUTH_EMULATOR_PORT ?? 9099);
  connectAuthEmulator(auth, `http://${authHost}:${authPort}`);
}

export const DEVICE_ID = import.meta.env.VITE_DEVICE_ID ?? "esp32-01";
