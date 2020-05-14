//This is for planning the db structure.

let db = {
  users: [
    {
      userId: "askjdnalksjcnas",
      email: "random@email.com",
      handle: "user",
      createdAt: "2020-05-11T14:40:38.249Z",
      imageUrl: "image/askdjnasd/askdjans",
      bio: "Hello there this is my bio about...",
      website: "https://Yo.com",
      location: "Tel aviv, Israel",
      likes: [],
      comments: [],
    },
  ],
  woofs: [
    {
      userHandle: "user",
      body: "This is the woof body",
      createdAt: "2020-05-11T14:40:38.249Z",
      likeCount: 5,
      commentCount: 3,
    },
  ],
  comments: [
    {
      userHandle: "user",
      woofId: "12dj92jxo29cm",
      body: "So cute!",
      createdAt: "2020-05-11T14:40:38.249Z",
    },
  ],
  notifications: [
    {
      recipient: "user",
      sender: "john",
      read: "true | false",
      woofId: "12iu3h1827hd28",
      type: "like | comment",
      createdAt: "2020-05-11T14:40:38.249Z",
    },
  ],
};
