import express from "express";
import { createServer } from "node:http";

import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { Server } from "socket.io";
import * as jsonpatch from "fast-json-patch/index.mjs";
import { auth } from "express-openid-connect";
// import persistence from "./persistence.mjs";

import { env } from 'custom-env';
env();


const app = express();
const server = createServer(app);
const io = new Server(server);

const __dirname = dirname(fileURLToPath(import.meta.url));

if (process.env.SECRET)
  app.use(
    auth({
      authRequired: true,
      idpLogout: true,
      routes: {
        login: "/login",
        logout: "/logout",
        postLogoutRedirect: "http://localhost:4000",
      },
    })
  );


app.get("/", (req, res) => {
  if (req.oidc) {
    res.cookie("session", req.oidc.user.sub);
    console.log(req.oidc.user)
  }
  res.sendFile(join(__dirname, "dist", "index.html"));
});

app.use(express.static("dist"));

const range = (N) => {
  const r = [];
  for (let i = 0; i < N; i++) {
    r.push(i);
  }
  return r;
};

const randomInt = (N) => Math.trunc(Math.random() * N);

const use = (v, f) => f(v);

const shuffle = (arr, r = []) =>
  use(
    arr.map((e) => e),
    (a) => range(arr.length).map((i) => a.splice(randomInt(a.length), 1)[0])
  );

const users = [];

io.on("connection", (socket) => {
  socket.on("i am", async (msg) => {
    console.log("i am", msg);
    const useridx = msg.id;
    if (users.findIndex((u) => u.idx === useridx) < 0)
      users.push({ socket, idx: useridx });
    io.emit("hi", { id: useridx, users: users.map((u) => u.idx) });
    console.log(
      "a user connected",
      users.map((u) => u.idx)
    );

    socket.on("disconnect", () => {
      console.log("user disconnected");
      users.splice(
        users.findIndex((e) => e.idx === useridx),
        1
      );
      io.emit("goodbye", { id: useridx, users: users.map((u) => u.idx) });
    });
    socket.on("chat message", (msg) => {
      io.emit("chat message", msg);
    });

    socket.on("game", async (msg) => {
      const gameid = `game-${useridx}-${msg.user}`;
      console.log("creating game", gameid);
      socket.join(gameid);
      users.find((u) => u.idx === msg.user).socket.join(gameid);

      //      io.to(gameid).emit("field", game.pop());
    });

  });

});

server.listen(4000, () => {
  console.log("server running at http://localhost:4000");
});
