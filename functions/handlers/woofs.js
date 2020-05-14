const { db } = require("../util/admin");

//Get all woofs

exports.getAllWoofs = function (req, res) {
  db.collection("woofs")
    .orderBy("createdAt", "desc")
    .get()
    .then((data) => {
      let woofs = [];
      data.forEach((doc) => {
        woofs.push({
          docID: doc.id,
          body: doc.data().body,
          userHandle: doc.data().userHandle,
          createdAt: doc.data().createdAt,
          userImage: doc.data().userImage,
        });
      });
      return res.json(woofs);
    })
    .catch((err) => console.error(err));
};

//Post a new Woof

exports.postOneWoof = function (req, res) {
  if (req.body.body.trim() === "") {
    return res.status(400).json({ body: "Must not be empty" });
  }

  const newWoof = {
    body: req.body.body,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    createdAt: new Date().toISOString(),
    likeCount: 0,
    commentCount: 0,
  };

  db.collection("woofs")
    .add(newWoof)
    .then((doc) => {
      const resWoof = newWoof;
      resWoof.woofId = doc.id;
      res.json({ resWoof }); //Get the response of the new woof
    })
    .catch((err) => {
      res.status(500).json({ error: "something went wrong." });
      console.error(err);
    });
};

//Get Woof

exports.getWoof = function (req, res) {
  let woofData = {};
  db.doc(`/woofs/${req.params.woofId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        console.log("Listen man, Aint no doc");
        return res.status(404).json({ error: "Woof not found" });
      }
      woofData = doc.data();
      woofData.woofId = doc.id;
      return db
        .collection("comments")
        .orderBy("createdAt", "desc")
        .where("woofId", "==", req.params.woofId)
        .get();
    })
    .then((data) => {
      woofData.comments = [];
      data.forEach((doc) => {
        woofData.comments.push(doc.data());
      });
      return res.json(woofData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

//Post a comment on a woof

exports.commentOnWoof = function (req, res) {
  const newComment = {
    body: req.body.body,
    createdAt: new Date().toISOString(),
    woofId: req.params.woofId,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl, // req.USER comes from FBAuth
  };
  if (newComment.body.trim() === "")
    return res.status(400).json({ comment: "Can not post an empty comment" });

  db.doc(`/woofs/${req.params.woofId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res
          .status(404)
          .json({ error: "Woof doesn't exist. Can not comment." });
      }
      return doc.ref.update({ commentCount: doc.data().commentCount + 1 });
    })
    .then(() => {
      return db.collection("comments").add(newComment);
    })
    .then(() => {
      res.json(newComment);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: "something went wrong" });
    });
};

//Like & unLike a woof

exports.likeWoof = function (req, res) {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("woofId", "==", req.params.woofId)
    .limit(1);

  const woofDocument = db.doc(`/woofs/${req.params.woofId}`);

  let woofData;

  woofDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        woofData = doc.data(); // extract data from document- in this case - woofdocument
        woofData.woofId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Woof not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return db
          .collection("likes")
          .add({
            woofId: req.params.woofId,
            userHandle: req.user.handle,
          })
          .then(() => {
            woofData.likeCount++;
            return woofDocument.update({ likeCount: woofData.likeCount });
          })
          .then(() => {
            return res.json(woofData);
          });
      } else {
        return res.status(400).json({ error: "Already liked." });
      }
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.unLikeWoof = function (req, res) {
  const likeDocument = db
    .collection("likes")
    .where("userHandle", "==", req.user.handle)
    .where("woofId", "==", req.params.woofId)
    .limit(1);

  const woofDocument = db.doc(`/woofs/${req.params.woofId}`);

  let woofData;

  woofDocument
    .get()
    .then((doc) => {
      if (doc.exists) {
        woofData = doc.data(); // extract data from document- in this case - woofdocument
        woofData.woofId = doc.id;
        return likeDocument.get();
      } else {
        return res.status(404).json({ error: "Woof not found" });
      }
    })
    .then((data) => {
      if (data.empty) {
        return res.status(400).json({ error: "Woof not liked." });
      } else {
        return db
          .doc(`/likes/${data.docs[0].id}`)
          .delete()
          .then(() => {
            woofData.likeCount--;
            return woofDocument.update({ likeCount: woofData.likeCount });
          })
          .then(() => {
            res.json({ woofData });
          });
      }
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};

exports.deleteWoof = function (req, res) {
  const document = db.doc(`/woofs/${req.params.woofId}`);

  document
    .get()
    .then((doc) => {
      if (!doc.exists) {
        return res.status(404).json({ error: "Woof not found" });
      }
      if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ message: "Unauthorized" });
      } else {
        return document.delete();
      }
    })
    .then(() => {
      res.json({ message: "Woof has been deleted." });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};
