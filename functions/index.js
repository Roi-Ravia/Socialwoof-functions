const functions = require("firebase-functions");
const express = require("express");
const app = express();

const FBAuth = require("./util/fbAuth");

const { db } = require("./util/admin");

const {
  getAllWoofs,
  postOneWoof,
  getWoof,
  commentOnWoof,
  likeWoof,
  unLikeWoof,
  deleteWoof,
} = require("./handlers/woofs");

const {
  signUp,
  login,
  uploadImage,
  addUserDetails,
  getAuthenticatedUserDetails,
  getUserDetails,
  markNotificationRead,
} = require("./handlers/users");

//Posts routes
app.get("/woofs", getAllWoofs);
app.post("/woof", FBAuth, postOneWoof);
app.get("/woof/:woofId", getWoof);
app.delete("/woof/:woofId", FBAuth, deleteWoof);
app.post("/woof/:woofId/comment", FBAuth, commentOnWoof);
app.get("/woof/:woofId/like", FBAuth, likeWoof);
app.get("/woof/:woofId/unlike", FBAuth, unLikeWoof);

//Users routes
app.post("/signup", signUp);
app.post("/login", login);
app.post("/user/image", FBAuth, uploadImage);
app.post("/user", FBAuth, addUserDetails);
app.get("/user", FBAuth, getAuthenticatedUserDetails);
app.get("/user/:handle", getUserDetails);
app.post("/notifications", FBAuth, markNotificationRead);

exports.api = functions.region("europe-west1").https.onRequest(app);

//Notifications DB triggers

exports.createNotificationOnLike = functions
  .region("europe-west1")
  .firestore.document("likes/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/woofs/${snapshot.data().woofId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle, // doc refers to the woof document - maker of woof
            sender: snapshot.data().userHandle, // snapshot refers to like document - commentor
            type: "like",
            read: false,
            woofId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.error(err);
      });
  });

exports.deleteNotificationOnUnlike = functions
  .region("europe-west1")
  .firestore.document("likes/{id}")
  .onDelete((snapshot) => {
    return db
      .doc(`notifications/${snapshot.id}`)
      .delete()
      .catch((err) => {
        console.error(err);
        return;
      });
  });

exports.createNotificationOnComment = functions
  .region("europe-west1")
  .firestore.document("comments/{id}")
  .onCreate((snapshot) => {
    return db
      .doc(`/woofs/${snapshot.data().woofId}`)
      .get()
      .then((doc) => {
        if (
          doc.exists &&
          doc.data().userHandle !== snapshot.data().userHandle
        ) {
          return db.doc(`/notifications/${snapshot.id}`).set({
            createdAt: new Date().toISOString(),
            recipient: doc.data().userHandle,
            sender: snapshot.data().userHandle, // snapshot refers to comment document
            type: "comment",
            read: false,
            woofId: doc.id,
          });
        }
      })
      .catch((err) => {
        console.error(err);
        return;
      });
  });

// UX DB triggers

// Update user image everywhere
exports.onUserImageChange = functions
  .region("europe-west1")
  .firestore.document("/users/{userId}")
  .onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
      console.log("Image has changed");
      const batch = db.batch();
      return db
        .collection("woofs")
        .where("userHandle", "==", change.before.data().handle)
        .get()
        .then((data) => {
          data.forEach((doc) => {
            const woof = db.doc(`/woofs/${doc.id}`);
            batch.update(woof, { userImage: change.after.data().imageUrl });
          });
          return db
            .collection("comments")
            .where("userHandle", "==", change.before.data().handle)
            .get();
        })
        .then((data) => {
          data.forEach((doc) => {
            const comment = db.doc(`/comments/${doc.id}`);
            batch.update(comment, { userImage: change.after.data().imageUrl });
          });
          return batch.commit();
        })
        .catch((err) => {
          console.error(err);
        });
    }
  });

// Delete all documents related to a deleted woof
exports.onWoofDelete = functions
  .region("europe-west1")
  .firestore.document("/woofs/{woofId}")
  .onDelete((snapshot, context) => {
    const woofId = context.params.woofId;
    const batch = db.batch();
    return db
      .collection("comments")
      .where("woofId", "==", woofId)
      .get()
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db.collection("likes").where("woofId", "==", woofId).get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
          .collection("notifications")
          .where("woofId", "==", woofId)
          .get();
      })
      .then((data) => {
        data.forEach((doc) => {
          batch.delete(db.doc(`notifications/${doc.id}`));
        });
        return batch.commit();
      })
      .catch((err) => {
        console.error(err);
      });
  });
