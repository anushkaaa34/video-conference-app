const express = require("express");
const app = express();
const server = require("http").Server(app);
const io = require("socket.io")(server);
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
  debug: true,
});
const { v4: uuidV4 } = require("uuid");
const session = require("express-session");
const bcrypt = require("bcrypt");

// Middleware for session
app.use(
  session({
    secret: "your-secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use("/peerjs", peerServer);
app.set("view engine", "ejs");
app.use(express.static("public"));

// Example list of users (replace with your own user data or database)
const users = [
  {
    id: 1,
    username: "Roshan",
    password: "$2b$10$AJ2LMsYfvlff0GkRLjw9leOG/EoWlCJU.mcdSfgaCm6MWpDCh/jbG", // hashed password: 12345
  },
  {
    id: 2,
    username: "John",
    password: "$2b$10$AJ2LMsYfvlff0GkRLjw9leOG/EoWlCJU.mcdSfgaCm6MWpDCh/jbG", // hashed password: 12345
  },
  {
    id: 3,
    username: "Jane",
    password: "$2b$10$AJ2LMsYfvlff0GkRLjw9leOG/EoWlCJU.mcdSfgaCm6MWpDCh/jbG", // hashed password: 12345
  },
];

// Authentication middleware to check if user is logged in
const requireLogin = (req, res, next) => {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.redirect("/login");
  }
};

// Route for login page
app.get("/login", (req, res) => {
  res.render("login");
});

// Route for login (POST)
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Find user in array. If found, return the user object.
  const user = users.find((u) => u.username === username);

  // If user not found, return error
  if (!user) {
    return res.status(400).send({
      message: "User Not Exist",
    });
  }

  // Compare crypted password and see if it checks out. If it does, return user object.
  if (bcrypt.compareSync(password, user.password)) {
    req.session.userId = user.id;
    return res.redirect("/room");
  }

  // If password does not match, return error
  return res.status(400).send({
    message: "Wrong Password",
  });
});

// Route for register page
app.get("/register", (req, res) => {
  res.render("register");
});

// Route for register (POST)
app.post("/register", (req, res) => {
  const { username, password } = req.body;

  // Check if user already exist. If exist, return error
  if (users.find((u) => u.username === username)) {
    return res.status(400).send({
      message: "User Already Exist",
    });
  }

  // Create user object, salt and hash the password, then add user to the array
  const newUser = {
    id: users.length + 1,
    username,
    password: bcrypt.hashSync(password, 10),
  };
  users.push(newUser);

  // Redirect to login page
  res.redirect("/login");
});

// Route for logout
app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.log(err);
    }
    res.redirect("/login");
  });
});

// Generate a unique room ID and redirect to the room
app.get("/room", requireLogin, (req, res) => {
  res.redirect(`/${uuidV4()}`);
});

// Route for joining a specific room
app.get("/:room", requireLogin, (req, res) => {
  const roomId = req.params.room;
  res.render("room", { roomId });
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);

    // Emit the list of connected users to the room
    io.to(roomId).emit("users-list", getRoomUsers(roomId));

    // Broadcast a message to all users in the room (except the sender)
    socket.to(roomId).broadcast.emit("user-connected", userId);

    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", {
        userId: userId,
        message: message,
      });
    });

    socket.on("disconnect", () => {
      socket.to(roomId).broadcast.emit("user-disconnected", userId);

      // Update the users list after a user disconnects
      io.to(roomId).emit("users-list", getRoomUsers(roomId));
    });

    socket.on("close-video", () => {
      socket.to(roomId).emit("close-video");
    });
  });
});

io.on("createMessage", (message) => {
  io.emit("message", message);
});

io.on("connection", (socket) => {
  // ...

  socket.on("message", (message) => {
    io.to(roomId).emit("createMessage", {
      userId: userId,
      message: message,
    });
  });

  // ...
});

io.on("connection", (socket) => {
  socket.on("join-room", (roomId, userId) => {
    socket.join(roomId);

    // Emit the list of connected users to the room
    io.to(roomId).emit("users-list", getRoomUsers(roomId));

    // Broadcast a message to all users in the room (except the sender)
    socket.to(roomId).broadcast.emit("user-connected", userId);

    socket.on("message", (message) => {
      io.to(roomId).emit("createMessage", {
        userId: userId,
        message: message,
      });
    });

    socket.on("disconnect", () => {
      socket.to(roomId).broadcast.emit("user-disconnected", userId);

      // Update the users list after a user disconnects
      io.to(roomId).emit("users-list", getRoomUsers(roomId));
    });
  });
});

// Helper function to get the list of connected users in a room
function getRoomUsers(roomId) {
  const room = io.sockets.adapter.rooms.get(roomId);
  if (room) {
    return Array.from(room).map((socketId) => ({
      userId: socketId,
    }));
  }
  return [];
}

app.get("/room/new", requireLogin, (req, res) => {
  const roomId = uuidV4();
  res.redirect(`/room/${roomId}`);
});

// Route for joining an existing room
app.get("/room/:room", requireLogin, (req, res) => {
  const roomId = req.params.room;
  res.render("room", { roomId });
});

server.listen(process.env.PORT || 3030, () => {
  console.log("Server started on port 3030");
});
