import m from "mithril";
import tagl from "tagl-mithril";
import io from "socket.io/client-dist/socket.io";
const { trunc } = Math;
const { span, div, ul, li, h1, h3, form, input, button, table, tr, td, pre } =
  tagl(m);
const messages = [];
const use = (v, f) => f(v);

const socket = io();

const range = (N) => {
  const r = [];
  for (let i = 0; i < N; i++) {
    r.push(i);
  }
  return r;
};

socket.on("connect", () => {
  const userID =
    localStorage.getItem("id") || localStorage.setItem("id", socket.id);
  socket.emit("i am", { id: userID });
});

let users = [];
let ownid = undefined;

const connectEvent = (eventName, callback) =>
  socket.on(eventName, (p) => {
    callback(p);
    m.redraw();
  });

connectEvent("hi", (msg) => {
  messages.push({ sender: "OPERATOR", msg: "Welcome " + msg.id });
  users = msg.users;
  ownid = ownid || msg.id;
  games = msg.games || [];
  console.log(ownid, users);
});

connectEvent("chat message", (msg) => {
  messages.push(msg);
  window.scrollTo(0, document.body.scrollHeight);
});

connectEvent("field", (msg) => {
  game = msg;
});

connectEvent("games", (msg) => {
  games = msg;
});

const state = {
  msg: "",
};

const mygame = () => (game && game.playerB === ownid) || game.playerW === ownid;

const send = () => {
  socket.emit("chat message", { sender: socket.id, msg: state.msg });
  state.msg = "";
};

const enterGame = (gameid) => {
  socket.emit("enter game", { gameid });
};

const fcol = (v) => `f${figures[v].color}`;

const fieldClass = (idx) =>
  (idx + trunc(idx / 8)) % 2 === 0 ? "black" : "white";

const isSelected = (idx) => idx === game.selected;
const isValid = (idx) => game.valid.indexOf(idx) >= 0;
const isCheck = (idx) => game.check === idx;

const select = (idx) => {
  socket.emit("select", { selected: idx, gameid: game.id });
};

function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen();
  } else if (document.exitFullscreen) {
    document.exitFullscreen();
  }
}

// Swap the field if the player is white
const it = (cb) =>
  use(game.playerW === ownid ? (i) => 63 - i : (i) => i, (map) =>
    range(64)
      .map(map)
      .map((i) => cb(game.field[i], i))
  );

const userListC = (vnode) => ({
  view: (vnode) =>
    ul(
      users.map((u) =>
        li(
          u,
          u === ownid ? " (This is you)" : null,
          button(
            { onclick: () => socket.emit("game", { user: u }) },
            "Challenge"
          )
        )
      )
    ),
});

const chatC = (vnode) => ({
  view: (vnode) => [
    ul.$messages(messages.map((msg) => li(msg.sender + ": " + msg.msg))),
    div.$form(
      input.$input({
        value: state.msg,
        oninput: (e) => (state.msg = e.target.value),
        onkeydown: (e) => {
          if (e.key === "Enter") {
            send();
          }
        },
        autocomplete: "off",
      }),
      button({ onclick: (e) => send() }, "Send")
    ),
  ],
});

m.mount(document.body, {
  view: (vnode) => [
    [m(userListC), m(chatC)],
    button({ onclick: toggleFullScreen }, "Toggle Fullscreen"),
    // pre(ownid + "\n" + JSON.stringify(game, null, 2)),
  ],
});

