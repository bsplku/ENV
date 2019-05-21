$(() => {
  const socket = io.connect("http://localhost:8000");
  const now = new Date();
  const now_str = now.getTime() + "";
  socket.emit("end", now_str);
});
