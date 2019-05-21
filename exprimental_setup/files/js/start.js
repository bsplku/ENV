// After loading of Start page,
$(() => {
  // Connect to the Node.js server
  const socket = io.connect("http://localhost:8000");

  // If any keypress is detected (which is, fMRI start signal)
  $(document).keypress(() => {
    const now = new Date();
    const now_str = now.getTime() + "";
    socket.emit("start", now_str); // Send "start" event to the server, with the current timepoint
    window.location.href = "http://localhost:8000/intro" // Then move to Intro page
  });
});
