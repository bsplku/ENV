// After Scale (Emotional questionnaires) page is loaded,
$(() => {
  const socket = io.connect("http://localhost:8000"); // Connect to the server
  let scale_list = document.querySelectorAll("#scale span"); // Select all 1-9 scale texts and make a list
  const len = scale_list.length;

  let curr = Math.floor((Math.random() * len)); // Find random rating score, 
  scale_list[curr].style.color = "yellow"; // and highlight the number in yellow

  let now = new Date();
  let now_str = now.getTime() + "";
  socket.emit("scale", now_str); // Send "scale" event to the server ("Emotion questionnaires page is loaded")

  // Handle keyboard (or button) responses
  window.onkeydown = function(event) {
    // If a participant presses the '3' key, then decrease the scale number
    if (event.keyCode === 51){
      // Reset previous highlighted number
      scale_list[curr].style.color = "white";

      // Determine the next scale number
      if (curr === 0) {
        curr = 8;
      } else{
        curr -= 1;
      }

      // Highlight the next scale number
      scale_list[curr].style.color = "yellow";
    }

    // If a participant presses the '4' key, then increase the scale number
    else if (event.keyCode === 52) {
      // Reset previous highlighted number
      scale_list[curr].style.color = "white";

      // Determine the next scale number
      if (curr === 8) {
        curr = 0;
      } else{
        curr += 1;
      }

      // Highlight current scale number
      scale_list[curr].style.color = "yellow";
    }

    // If a participant presses the '2' key, then select current scale number and send it to the server
    else if (event.keyCode === 50) {
      let level = (curr + 1) + "";
      now = new Date();
      now_str = now.getTime() + "";
      const scale_data = level + "@" + now_str; // Concatenate the response with the timepoint
      socket.emit("select scale", scale_data); // And send "select scale" message
    }
  };

  // After the server receives "selecct scale" event with the response,
  // The server sends back "next scale" event with a command  
  socket.on("next scale", (cmd) => {
    // If there are remaining questions, then reload this page to show the different emotional questionnaire
    if (cmd === "next") { 
      window.location.reload(true);
    } else if (cmd === "test") {
      // If all questionnaires are finished and current trial (block) is second, then move to Concentration task (test) page
      window.location.href = "http://localhost:8000/test";
    } else if (cmd === "notest") {
      // If all questionnaires are finished and current block is first, then move to Cross3 page
      window.location.href = "http://localhost:8000/cross3";
    }
  });
});
