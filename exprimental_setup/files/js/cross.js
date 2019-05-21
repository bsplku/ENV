// All Cross, Cross2, and Cross3 pages are similar
// After loading,
$(() => {
  // Connect to the server,
  const socket = io.connect("http://localhost:8000");
  const now = new Date();
  const now_str = now.getTime() + "";
  socket.emit("cross", now_str); // And send "cross" event (+ timepoint) to the server 
  setTimeout(() => {
    window.location.href = "http://localhost:8000/video"; // Then move to the next page (e.g., Video page) after 10s
  }, 10000);
});
