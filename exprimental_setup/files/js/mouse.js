// After Mose client page is loaded
$(() => {
  let isMove = false;

  // Attach the event to the document which continuously captures cursor x,y coordinates,
  // Whenever the cursor moves
  $(document).mousemove((e) => {
    window.mouseX = e.clientX;
    window.mouseY = e.clientY;
    isMove = true;
  })

  const socket = io.connect("http://" + document.domain + ":" + location.port); // Connect to the Node.js server
  socket.emit("mouse client loaded"); // and send "mouse client loaded" event
  let timerID = null;
  socket.on("mouse on", () => { // After receiving "mouse on" event (which is, the video starts playing), 
    timerID = setInterval(() => { // Run following commands for every 20ms
      const now = new Date();
      const now_str = now.getTime() + "";
      const mouse_data = window.mouseX + "," + window.mouseY;
      const coor_data = mouse_data + "@" + now_str; // Structure the cursor coordinates and current timepoint
      if (isMove) {
        socket.emit("coor", coor_data); // and send it with "coor" event to the server
        isMove = false;
      }
    }, 20);
  });
  socket.on("mouse off", () => { // After receiving "mouse off" event (which is, the video stops playing),
    clearInterval(timerID); // Stop sending cursor coordinates (and "coor" events)
  });
});
