$(() => {
  const socket = io.connect("http://localhost:8000");
  const now = new Date();
  const now_str = now.getTime() + "";
  socket.emit("cross3", now_str);
  setTimeout(() => {
    window.location.href = "http://localhost:8000/end";
  }, 10000);
});
