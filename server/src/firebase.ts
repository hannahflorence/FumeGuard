import admin from "firebase-admin";
import { config } from "./config.js";

let app: admin.app.App | null = null;

export function getFirebaseApp(): admin.app.App {
  if (app) return app;

  if (config.useFirebaseEmulator) {
    process.env.FIREBASE_DATABASE_EMULATOR_HOST =
      config.firebaseDatabaseEmulatorHost;
    // .env may still set this for production; Admin SDK must not load a missing file locally
    delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  }

  if (!admin.apps.length) {
    app = admin.initializeApp({
      projectId: config.firebaseProjectId,
      databaseURL: config.useFirebaseEmulator
        ? `http://${config.firebaseDatabaseEmulatorHost}?ns=${config.firebaseProjectId}-default-rtdb`
        : `https://${config.firebaseProjectId}-default-rtdb.firebaseio.com`,
    });
  } else {
    app = admin.app();
  }

  return app;
}

export function getDb(): admin.database.Database {
  return getFirebaseApp().database();
}
