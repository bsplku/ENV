// After loading of Intro page,
$(() => {
  // Connect to the Node.js server
  const socket = io.connect("http://localhost:8000");
  const now = new Date();
  const now_str = now.getTime() + "";
  socket.emit("intro", now_str); // Send "intro" event to the server with the current timepoint
  setTimeout(() => {
    window.location.href = "http://localhost:8000/cross"; // Move to Cross page after 10s (10000 ms)
  }, 10000);
});
