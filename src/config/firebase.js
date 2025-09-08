const admin = require("firebase-admin");
const path = require("path");

// Tải file serviceAccountKey.json từ Firebase Project Settings -> Service accounts
const serviceAccount = require(path.join(__dirname, "../../serviceAccountKey.json"));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  storageBucket: process.env.FIREBASE_BUCKET, // ví dụ "ev-rental.appspot.com"
});

const bucket = admin.storage().bucket();

module.exports = { bucket };
