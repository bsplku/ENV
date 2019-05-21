//#############################################################################
// Import essential libraries & Define helper functions
//#############################################################################

// Readline-sync : For command-line inputs
const readline = require("readline-sync");

// Express.js : Create a web server
const express = require("express");
const app = express();
const server = require("http").createServer(app);

// Socket.io : For communications between the server and experimental HTML pages
const sio = require("socket.io");

// System-sleep : Python-like sleep function
const sleep = require("system-sleep");

// Libraries for the file management
const path = require("path");
const fs = require("fs");

// Create & show experimental HTML pages using Pug template engine.
// Pug template files are located in the <views> directory.
app.set("view engine", "pug");

// Define the directory containing "static files" (CSS, Js, Video files)
// as <files> directory.
// Web browser now loads these "static files" from the <files> directory.
app.use(express.static(path.join(__dirname, "files")));

// Define a Python-like "range" function
function range(start, end) {
    return (new Array(end - start)).fill(undefined).map((_, i) => i + start);
}

// Define an array shuffling function
function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

//#############################################################################
// Declare & define essential variables for running this experiment
//#############################################################################

// Specify the directory location for saving rating / control data
const data_loc = "./data/";

// Initialize variables specifying current trial (block) information

let trial_list = null; // Store tasks of this run
let curr_action = ""; // Store a task of this trial (block)
let trial = 1; // Current trial number

// Initialize timepoint variables (for the etime file generation)

let start_time = 0; // Timepoint of the starting time
//let inter_time = 0; // Temporary variable used for time interval calculation
let mouse_time = 0; // Timpoint of the last mouse event

// Initialize variables for the video files (stimuli) setting
// If you want to change video clips, you may correct values in this part

const vid_loc = "./vid/"; // Location for the clips
// Starting viewpoint for each clip, in a format of "x y z"
// Note that x values change the camera in altitude direction and 
// y values change the camera in azimuth direction.
const vid_start_rotation = new Map([ 
  [1, "0 90 0"],
  [2, "0 -90 0"],
  [3, "0 -90 0"],
  [4, "0 -90 0"]
]);
const total_vid = 4; // Number of clips used in this experiment
let curr_vid = 0; // Current clip ID

// Initialize variables for processing input cursor coordinates

const screen_w = 800; // Screen width
const screen_h = 600; // Screen height

// Calculate the center coordinates
const center_w = parseInt(screen_w / 2);
const center_h = parseInt(screen_h / 2);

// Specify the radius of the center area ignoring cursor (= eye) movements
const centerzone_r = 100;

// Initialize variables for storing the previous cursor control data

let time_list = []; // Store delays between the control signals
let rotation_list = []; // Store lotation directions

// Variables for the questionnaire (scale) presentation
// Specify 10 experimental questionnaires
const scale_list = ["Engagement", "Enjoy", "Successful", "Controllable", "Clear",
                    "Discomfort", "Reality", "Arousal", "Dominance", "Valence"];

// Specify instructions corresponding to the questions
const scale_instr = new Map([
  ["Engagement", "How much did you engage\n to the scene?"],
  ["Enjoy", "Did you enjoy your\n experience with the system?"],
  ["Successful", "Were you successful\n using the system?"],
  ["Controllable", "Were you able to\n Control the system?"],
  ["Clear", "Is the information provided\n by the system clear?"],
  ["Discomfort", "Did you feel discomfort\n during your experience\n with the system?"],
  ["Reality", "How much did you feel\n the scene is real\n (i.e., reality)"],
  ["Arousal", "Arousal"],
  ["Dominance", "Dominance"],
  ["Valence", "Valence"]
]);

// Instructions presented on the left side of the 1-9 scale
const scale_left = new Map([
  ["Engagement", "Less"],
  ["Enjoy", "Less"],
  ["Successful", "Less"],
  ["Controllable", "Less"],
  ["Clear", "Less"],
  ["Discomfort", "Comfort"],
  ["Reality", "Less"],
  ["Arousal", "Calm"],
  ["Dominance", "Dominated"],
  ["Valence", "Sad"]
]);

// Instructions presented on the right side of the 1-9 scale
const scale_right = new Map([
  ["Engagement", "More"],
  ["Enjoy", "More"],
  ["Successful", "More"],
  ["Controllable", "More"],
  ["Clear", "More"],
  ["Discomfort", "Discomfort"],
  ["Reality", "More"],
  ["Arousal", "Excited"],
  ["Dominance", "Dominant"],
  ["Valence", "Happy"]
]);

const total_scale = scale_list.length; // Number of questionnaires
let curr_scale = 0; // Current question index

// Variables for the Concentration task
// If you want to change video clips, you may update variables in this part too

const test_trial = 2; // Concentration task is always presented at the second block.

// Specify test questions corresponding to the clip ID
const test_questions = new Map([
  [1, "What was NOT in this VR video?"],
  [2, "What was NOT in this VR video?"],
  [3, "Which of the following commercials or sign\n was NOT in this VR video?"],
  [4, "What was NOT in this VR video?"]
]);

// Specify choices corresponding to the clip ID
const test_choices = new Map([
  [1, ["(1) Shadow of tripod(삼각대 그림자)", "(2) Rock(바위)", "(3) Moon(달)", "(4) Snow(눈)"]],
  [2, ["(1) Sunset(일몰)", "(2) Log(통나무)", "(3) Person(사람)", "(4) House(집)"]],
  [3, ["(1) CITI bank(씨티은행 광고)", "(2) Apple(애플광고)", "(3) Rifle(소총)", "(4) Faucet(주방 수도꼭지)"]],
  [4, ["(1) McDonald's(맥도널드)", "(2) Triumphal arch(개선문)", "(3) MGM", "(4) Casino(카지노)"]]
]);

//#############################################################################
// Experiment Startup
//#############################################################################

// Get the Subject ID, Run number

let subject = "S";
const s_id = readline.question("Subject ID in the group (in numbers. type 0 for the pilot) :\n");
subject += s_id;
const run_num = parseInt(readline.question("Current run #:\n"));

// Initialize  or load the "Report" file
// "Report" files contain the clip presentation order and tasks of each video.

// Specify the "Report" file location
const report_fileloc = data_loc + subject + "_report.txt";

// Try reading the "Report" file from the specified location
try {
  // If the "Report" file exists..

  // Read the file line-by-line
  // First line contains the video presentation order.
  // Second line contains the task order.
  // Next four lines contain tasks for each video
  let report_data = fs.readFileSync(report_fileloc).toString().split("\n");

  // Extract the current clip ID from the first line (line 0)
  curr_vid = parseInt((report_data[0].split(","))[run_num-1]);
  // Extract tasks from the line corresponding to the clip ID
  trial_list = report_data[curr_vid+1].split(",");
} catch(err) {
  // Cannot find the "Report" file when current run is the first run
  // Then create a new "Report" file for this Subject

  let report_data = ""; // Store a new "Report" file content

  // Shuffle the video clip order (Randomization of the stimulus presentation)
  let vid_list = shuffle(range(1, total_vid+1));
  curr_vid = vid_list[0]; // Extract current clip ID of first run
  const vid_data = vid_list.join(","); // Concatenate the shuffled list with comma
  report_data += (vid_data + "\n");

  // This part is very IMPORTANT!
  // We allocated tasks to video clips and subjects in a very specific manner.
  // For each subject, 2 "active" tasks and 2 "passive" tasks are allocated.
  // And the allocation rule is applied alternately to the subjects

  let control_list = null;

  // The pilot subject experienced first two clips in a "active" manner.
  // The clips were clip 2 and 4.
  // So you can ignore this part.
  if (s_id === "0") { // Subject S0 = Pilot subject
    control_list = ["active", "active", "active", "active"];
  } else if (s_id === "1") {
    // Then subject S1 is allocated to experience clip 2 and 4 in "passive" tasks
    // and clip 1 and 3 in "active" tasks
    // Note that the order of values in "control_list" represents clip IDs.

    control_list = ["active", "passive", "active", "passive"];
  } else {
    // From subject S2, the tasks are allocated alternately.
    // For example, subject S2 views clip 1, 3 "passively"
    // and clip 2, 4 "actively".
    // This allocation can be done by reading previous subject's "Report" file.

    const prev_subject = "S" + (parseInt(s_id) - 1);
    const prev_report_fileloc = data_loc + prev_subject + "_report.txt";
    console.log("prev file name", prev_report_fileloc);
    const prev_report_data = fs.readFileSync(prev_report_fileloc).toString().split("\n");

    // Second line (line 1) contains the active-passive allocation of previous subject
    control_list = prev_report_data[1].split(",");
    // Reverse the active / passive allocation
    control_list.map(c => c === "active" ? "passive" : "active");
  }
  // Create new active-passive allocation of this subject
  const control_data = control_list.join(",");
  report_data += (control_data + "\n");

  // For each run, participants also experience the video in "fixed" (stop) condition.
  // We allocated active (or passive) task and fixed task randomly to trials
  for (let i of range(0,total_vid)) {
    let rand_trial = ["stop"];
    rand_trial.push(control_list[i]);
    shuffle(rand_trial);
    if (i === curr_vid-1) {
      trial_list = rand_trial.slice(); // Copy tasks of current run (clip)
    }
    let trial_data = rand_trial.join(",");
    trial_data += "\n";
    report_data += trial_data; // Store to the report_data variable
  }

  // Write generated "Report" file content to a new file
  fs.writeFileSync(report_fileloc, report_data, "utf8");
  console.log("new report file is created.");
}

// Preview of current run
console.log("curr_vid:", curr_vid);
console.log("trial_list:", trial_list);

// If this run has "passive" task,
// Read the video control data from previous subject.
if (trial_list.some(t => t === "passive")) {
  // Read previous subject's "Report" file and
  // find the run number corresponding to current clip ID
  const prev_sid = parseInt(s_id)- 1;
  const prev_subject = "S" + prev_sid;
  const prev_report_fileloc = data_loc + prev_subject + "_report.txt";
  const prev_report_data = fs.readFileSync(prev_report_fileloc).toString().split("\n");
  const prev_vid_list = prev_report_data[0].split(",").map(v => parseInt(v));
  const prev_run_num = prev_vid_list.indexOf(curr_vid) + 1;

  // Read video control data ("Rotation" file) of previous "active" run
  const rot_data_fileloc = data_loc + prev_subject + "_R" + prev_run_num + "_rotation.txt";
  console.log("rotation file name:", rot_data_fileloc);
  fs.readFileSync(rot_data_fileloc).toString().split("\n").map((line) => {
    let [t,r] = line.split(":");
    t = parseInt(t);
    time_list.push(t);
    rotation_list.push(r);
  });
  console.log("Rotation data is now loaded.");
  console.log("len of time_list:", time_list.length, ", len of rotation_list", rotation_list.length);
}

// Initialize "Etime" file (containing onset/offset times and response data)
const etime_fileloc = data_loc + subject + "_R" + run_num + "_etime.etime";
const etime_f = fs.createWriteStream(etime_fileloc, {encoding : "utf8"});

// Initialize "Coor" file (containing mouse cursor locations and delays)
const coor_fileloc = data_loc + subject + "_R" + run_num + "_coor.txt";
const coor_f = fs.createWriteStream(coor_fileloc, {encoding : "utf8"});

// Initialize "Rotation" file (containing video control datas and delays)
const rotation_fileloc = data_loc + subject + "_R" + run_num + "_rotation.txt";
const rotation_f = fs.createWriteStream(rotation_fileloc, {encoding : "utf8"});

// Now start the web server
server.listen(8000);
const io = sio.listen(server);

// Start message
console.log("Initializations finished successfully. You can now proceed with the experiment.");

//#############################################################################
// Serve experimental HTML pages
//#############################################################################

// Mouse client page
// Mouse client page sends cursor coordinates while video presentation.
app.get("/mouse", (req, res) => {
  res.render("mouse");
});

// Start page
app.get("/", (req, res) => {
  res.render("index");
});

// Introduction (Instruction) page
app.get("/intro", (req, res) => {
  res.render("intro");
});

// Cross fixation page
// First fixation after the intro
app.get("/cross", (req, res) => {
  res.render("cross");
});

// Video page
// Pass the video file location and initial rotation to the renderer
app.get("/video", (req, res) => {
  const vid_file = vid_loc + curr_vid + ".mp4";
  const start_rotation = vid_start_rotation.get(curr_vid);
  res.render("video", {fileloc:vid_file, start:start_rotation});
});

// Cross 2 page
// Second fixation after the video offset
app.get("/cross2", (req, res) => {
  res.render("cross2");
});

// Scale (Questionnaires) page
// Render the scale page with repect to the current question
app.get("/scale", (req, res) => {
  const scale_name = scale_list[curr_scale];
  const scale_text = scale_instr.get(scale_name);
  const left_text = scale_left.get(scale_name);
  const right_text = scale_right.get(scale_name);
  res.render("scale", {scale_instr_text:scale_text, left:left_text,
                       right:right_text});
});

// Test (Concentration task) page
// Text lengths of candidates at clip 2 are far longer than the other clips' candidates.
// So we applied different stylesheet to align the choices.
app.get("/test", (req, res) => {
  const styleid = (curr_vid === 2) ? "choice_s" : "choice";
  const test_id = curr_vid;
  const question = test_questions.get(test_id);
  const choice_list = test_choices.get(test_id);
  res.render("test", {test_question:question, choice_style:styleid, c1:choice_list[0],
                      c2:choice_list[1], c3:choice_list[2], c4:choice_list[3]});
});

// Cross 3 page
// Final fixation before the end page
// If there are the remaining trial, return to the Intro page
// and start second trial.
app.get("/cross3", (req, res) => {
  if (trial_list.length === 0) {
    res.render("cross3");
  } else {
    trial += 1;
    console.log(" ");
    res.render("intro");
  }
});

// End page
app.get("/end", (req, res) => {
  res.render("end");
});

//#############################################################################
// Handle messages sent from experimental HTML pages
//#############################################################################

io.on("connection", (client) => {
  client.on("mouse client loaded", () => {
    console.log("### mouse client is loaded ###");
  });

  // start.js sends "start" event with current time (in ms) information when loaded.
  // Store the starting timepoint to start_time variable
  client.on("start", (data) => {
    start_time = parseInt(data);
    const start_date = new Date(start_time);
    console.log("### now start @", start_time, "ms ###");
    etime_f.write(start_date.toString() + "\n");
  });

  // intro.js sends "intro" event with current time when loaded.
  client.on("intro", (data) => {
    // Initialize experimental variables
    curr_scale = 0;
    curr_action = trial_list.shift(); // Pop first task in trial-list
    console.log("Trial #" + trial);
    console.log("Current action:", curr_action);
    console.log("has test?: ", (trial === test_trial));
    if (trial === 2) {
      etime_f.write("\n");
    }
    etime_f.write("Trial #" + trial + "\t" + curr_action + "\n");

    // "intro" event tells the onset time of the introduction page.
    const intro_onset = parseInt(data);
    //inter_time = intro_onset;
    // s_diff stores the onset time from the starting timepoint.
    const s_diff = ((intro_onset - start_time) / 1000).toFixed(2);
    console.log("Introduction onset after @", s_diff, "s");
    etime_f.write("Instruction onset\t" + s_diff + "\n");
  });

  // cross.js sends "cross" event with current time when loaded.
  client.on("cross", (data) => {
    // "cross" event tells the onset time of the cross page.
    const cross_onset = parseInt(data);
    const s_diff = ((cross_onset - start_time) / 1000).toFixed(2);

    //const t_diff = ((cross_onset - inter_time) / 1000).toFixed(2);
    //inter_time = cross_onset;

    console.log("Cross onset after @", s_diff, "s");
    etime_f.write("Cross onset\t" + s_diff + "\n");
  });

  // When the video is loaded and ready to play,
  // video.js sends "video play" event with current time.
  client.on("video play", (data) => {
    // "video play" event tells the onset time of the video start.
    const video_start = parseInt(data);
    const s_diff = ((video_start - start_time) / 1000).toFixed(2);

    //const t_diff = ((video_start - inter_time) / 1000).toFixed(2);
    //inter_time = video_start;

    console.log("\nVideo start after @", s_diff, "s");
    etime_f.write("Video start\t" + s_diff + "\n");

    // If current task is not "fixed" (active or passive) ...
    if (curr_action !== "stop") {
      // Send "mouse on" event to the mouse client page
      // Then, the mouse client page starts to send cursor coordinates.
      io.emit("mouse on", " ");
      const now = new Date();
      const now_ms = parseInt(now.getTime());
      mouse_time = now_ms;
    }

    // If current task is "passive" ...
    // Send video controls loaded from previous "rotation" file
    if (curr_action === "passive") {
      console.log("mouse data emission start");
      for (let i of range(0, rotation_list.length-1)) {
        sleep(time_list[i]);
        io.emit("rotation", rotation_list[i]); // Send a "rotation" event with a control signal
      }
      console.log("Mouse data emission finished");
    }
  });

  // After receiving "mouse on" event from the server, mouse.js starts sending "coor" events.
  // Messages with coor events contain the x-y coordinates and the timepoint.
  client.on("coor", (data) => {
    let rotation_msg = null;
    let [c, t] = data.split("@"); // Split coordinates and timepoint
    t = parseInt(t);
    const s_diff = t - mouse_time; // Calculate the event delay timing

    let c_int = c.split(",").map(x => parseInt(x));
    let [x,y] = c_int;

    // Realign the original coordinates with respect to the center coordinates
    let x_p = x - center_w;
    let y_p = (screen_h - y) - center_h;

    // Coordinates in the center circular zone are ignored.
    if ((Math.pow(x_p,2) + Math.pow(y_p,2)) < (Math.pow(centerzone_r,2))) {
      rotation_msg = "0.0,0.0,none";
    } else {
      // Otherwise, calculate directions and magnitudes of the FoV rotation.
      const dx = (-x_p / center_w).toFixed(1);
      const dy = (y_p / center_h).toFixed(1);

      // specify the up/down command : To limit the degree of rotation in y-axis (Altitude axis)
      let cmd_type = "none";
      if (y_p > 0) {
        cmd_type = "up";
      } else {
        cmd_type = "down";
      }

      // Format the control signal
      rotation_msg = dx + "," + dy + "," + cmd_type;
    }

    // If current task is "active", then send the control to the video.js with "rotation" event
    // Only "active" tasks control FoVs by the gaze positions
    if (curr_action === "active") {
      io.emit("rotation", rotation_msg);
    }

    // Write coordinates and control signals with delays to "Coor" and "Rotation" files
    if (s_diff < 1000.0) {
      const time_coor_data = s_diff + ":" + c_int + "\n";
      const time_rot_data = s_diff + ":" + rotation_msg + "\n";
      coor_f.write(time_coor_data);
      rotation_f.write(time_rot_data);
    }

    mouse_time = t;
  });

  // when the video ends, video.js sends "video end" event with current time.
  client.on("video end", (data) => {
    const video_end = parseInt(data);
    const s_diff = ((video_end - start_time) / 1000).toFixed(2);

    //const t_diff = ((video_end - inter_time) / 1000).toFixed(2);
    //inter_time = video_end;

    console.log("Video end after @", s_diff, "s\n");
    etime_f.write("Video finish\t" + s_diff + "\n");

    // Send "mouse off" event to mouse.js to stop sending cursor coordinates
    if (curr_action !== "stop") {
      io.emit("mouse off", " ");
    }
  });

  // cross2.js sends "cross2" event with current time when loaded.
  client.on("cross2", (data) => {
    const cross2_onset = parseInt(data);
    const s_diff = ((cross2_onset - start_time) / 1000).toFixed(2);

    inter_time = cross2_onset;

    console.log("Cross onset after @", s_diff, "s");
    etime_f.write("Cross onset\t" + s_diff + "\n");
  });

  // scale.js sends "scale" event with current time when loaded.
  client.on("scale", (data) => {
    const scale_onset = parseInt(data);
    const s_diff = ((scale_onset - start_time) / 1000).toFixed(2);

    //const t_diff = ((scale_onset - inter_time) / 1000).toFixed(2);
    //inter_time = scale_onset;

    console.log(scale_list[curr_scale], "scale onset after @", s_diff, "s");
    etime_f.write(scale_list[curr_scale] + " scale start\t" + s_diff + "\n");
  });

  // When the subject selects a number on the scale,
  // scale.js sends "select scale" event with response (rating score) and current time (timepoint at the response).
  client.on("select scale", (data) => {
    let [l, t] = data.split("@");
    t = parseInt(t);
    const s_diff = ((t - start_time) / 1000).toFixed(2);
    console.log("User", scale_list[curr_scale], ":", l);
    console.log(scale_list[curr_scale], "scale finish after @", s_diff, "s");

    //if (curr_scale === 0) {
      //const t_diff = ((t - inter_time) / 1000).toFixed(2);
      //inter_time = t;
    //}

    etime_f.write(l + "\n");
    etime_f.write(scale_list[curr_scale] + " scale finish\t" + s_diff + "\n");

    let scale_cmd = null;

    // If there are remaining questions ...
    // Continue to get the response of next questionnaire by sending "next" message to scale.js
    // and update the curr_scale variable
    // Next question will appear when the page is reloaded by "next" event
    if (curr_scale + 1 < total_scale) {
      curr_scale += 1;
      scale_cmd = "next";
    } else {
      // If the subject have finished the questions ...
      // Start concentration task or next trial (block)
      scale_cmd = (trial === test_trial ? "test" : "notest");
    }

    io.emit("next scale", scale_cmd);
  });

  // test.js sends "test" event with current time when loaded.
  client.on("test", (data) => {
    const test_onset = parseInt(data);
    const s_diff = ((test_onset - start_time) / 1000).toFixed(2);

    //inter_time = test_onset;

    console.log("\nTest onset after @", s_diff, "s");
    etime_f.write("test start\t" + s_diff + "\n");
  });

  // When the subject selects a item,
  // test.js sends "test choice" event with the item and current (response) time.
  client.on("test choice", (data) => {
    let [c, t] = data.split("@");
    t = parseInt(t);
    const s_diff = ((t - start_time) / 1000).toFixed(2);

    //const t_diff = ((t - inter_time) / 1000).toFixed(2);
    //inter_time = t;

    console.log(c);
    console.log("Test finish after @", s_diff, "s");
    etime_f.write(c + "\n");
    etime_f.write("Test finish\t" + s_diff + "\n");
  });

  // cross3.js sends "cross3" event with current time when loaded.
  client.on("cross3", (data) => {
    const cross3_onset = parseInt(data);
    const s_diff = ((cross3_onset - start_time) / 1000).toFixed(2);

    console.log("Final cross onset after @", s_diff, "s");
    etime_f.write("Final cross onset\t" + s_diff + "\n");
  });

  // end.js sends "end" event when loaded.
  // Close data files and terminate this script
  client.on("end", (data) => {
    console.log("### Current run has finished ###");
    console.log("### Terminating the server ... ###");
    etime_f.close();
    coor_f.close();
    rotation_f.close();
    process.exit(0);
  });
});
