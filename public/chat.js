const socket = io();
const input = document.getElementById("message-input");
const messages = document.getElementById("messages");

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && input.value.trim() !== "") {
    socket.emit("chat message", input.value.trim());
    input.value = "";
  }
});

socket.on("chat message", (msg) => {
  const div = document.createElement("div");
  div.textContent = msg;
  messages.appendChild(div);
  messages.scrollTop = messages.scrollHeight;
});
