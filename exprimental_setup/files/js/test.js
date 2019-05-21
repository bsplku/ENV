// Concentration task page is similar to Emotional questionnaires page
$(() => {
  const socket = io.connect("http://localhost:8000");
  let choice_list = document.querySelectorAll("span"); // Select all candidates (choices) texts and make a list
  const len = choice_list.length;

  let curr = Math.floor((Math.random() * len));
  choice_list[curr].style.color = "yellow";

  let now = new Date();
  let now_str = now.getTime() + "";
  socket.emit("test", now_str);

  window.onkeydown = function(event) {
    // If a participant presses the '3' key, then highlight the previous candidate
    if (event.keyCode === 51){
      // Reset highlighted text
      choice_list[curr].style.color = "white";

      // Determine the next candidate
      if (curr === 0) {
        curr = 3;
      } else{
        curr -= 1;
      }

      // Highlight current candidate
      choice_list[curr].style.color = "yellow";
    }

    // If a participant presses the '4' key, then highlight the next candidate
    else if (event.keyCode === 52) {
      // Reset highlighted text
      choice_list[curr].style.color = "white";

      // Determine the next candidate
      if (curr === 3) {
        curr = 0;
      } else{
        curr += 1;
      }

      // Highlight current candidate
      choice_list[curr].style.color = "yellow";
    }

    // If a participant presses the '2' key, select current candidate and send it to the server
    else if (event.keyCode === 50) {
      let sel = (curr + 1) + "";
      now = new Date();
      now_str = now.getTime() + "";
      const test_data = sel + "@" + now_str;
      socket.emit("test choice", test_data); // Send "test choice" event (+ response) to the server
      window.location.href = "http://localhost:8000/cross3";
    }
  };
});
