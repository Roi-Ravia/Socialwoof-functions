const admin = require("firebase-admin");

//Initialize application with admin inorder to get all powerrrr
admin.initializeApp({
  credential: admin.credential.cert(require("../key/admin.json")),
  storageBucket: "socialwoof.appspot.com",
});

const db = admin.firestore(); // connect firebaseDB(firestore) to db variable

module.exports = { admin, db };
