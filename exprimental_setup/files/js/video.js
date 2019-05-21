// Define a function to rotate FoV of the playing video, by sent control commands from the server 
function keyboard_press(directionX, directionY, cmd_type) {
  let cam = document.querySelector("#cam"); // Select the camera object whose ID is #cam
  let rotation = cam.getAttribute("rotation"); // Get current rotation value of the camera

  let is_up = false;
  let is_down = false;

  // Find out the received command is up or down
  if (cmd_type === "up") {
    is_up = true;
  } else if (cmd_type === "down") {
    is_down = true
  }

  // Update the camera's rotation value for 10 times
  // This enables smooth, continuous rotation of the camera

  // Note that rotation.x is for the "altitude" direction,
  // and rotation.y is for the "azimuth" direction
  for (let i = 0; i < 10; i++) {

    // Set limits to the altitude axis.
    // If current altitude is 90 degree and current command is up, then do not update the rotation
    // Similarly, if current altitude is -90 degree and current command is down, then do not update the rotation 
    if ((rotation.x >= 90) && (is_up === true)) {
      break;
    } else if ((rotation.x <= -26) && (is_down === true)) {
      break;
    } else {
      // If altitude value is inside the limits, update the rotation by the command with attenuation
      rotation.x += 0.08 * directionY;
      rotation.y += 0.08 * directionX;
    }

    // Set the updated rotation value to the camera (Actual FoV rotation)
    cam.setAttribute("rotation", rotation);
  }
}

// After Video page is loaded, run the code below
$(() => {
  const socket = io.connect("http://localhost:8000"); // Connect to the Node.js server
  let playingState = false;
  let endState = false;
  const vid = document.getElementById("vid"); // Select the video player object whose ID is #vid

  // If the video file is ready and can be played seamlessly, following callback function is called
  vid.oncanplaythrough = function() {
    if (playingState) return; // Prevent multiple calls for this callback
    playingState = true;
    vid.play() // Start playing the video
    const now = new Date();
    const now_str = now.getTime() + "";
    socket.emit("video play", now_str); // And send "video play" event with a timepoint to the server
  };

  // After receiving the control commands from the server,
  socket.on("rotation", (rotation_msg) => {
    let [directionX, directionY, cmd_type] = rotation_msg.split(","); // Restructure the command
    console.log(rotation_msg);
    keyboard_press(directionX, directionY, cmd_type); // And call "keyboard_press" function with the command
  });

  // If the video pauses (which is, end of the video),
  vid.onpause = function() {
    if (endState) return;
    const now = new Date();
    const now_str = now.getTime() + "";
    socket.emit("video end", now_str); // Send "video end" event with a timepoint to the server
    endState = true;
    playingState = false;
    window.location.href = "http://localhost:8000/cross2";
  };
});
