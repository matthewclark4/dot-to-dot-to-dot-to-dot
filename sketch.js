// Settings:
const LINE_SPEED = 2; //
const LINE_THICKNESS = 15; // Diameter of each line segment

const DOT_CUTOFF = 50; // (Affects length of the tail) Number of dots on segment before we stop drawing it, higher values will mean worse performance
const DOT_SIZE = 2; // (Affects how fast the tail will fade) Diameter of each black dot
const COLOR_DIFF_THRESHOLD = 1; // The lower this is the closer to the target colour the pixel must be (black currently)
const SAMPLING_ACCURACY = 2; // Number of pixels between each sample taken from image to check colour.
const CORRECT_PIXELS_REQUIRED = 1; // Number of pixels in sampled area required to pass that sample as correct.

const WIDTH = window.innerWidth; // Video and canvas element size.
const HEIGHT = window.innerHeight;
/////////////////////////

// DOM Elements
let video;
let snapButton;
// let connectShapeToggle;
let toggleCamButton;
let resetButton;

// Data
let lines = [];
let snapshot;
let outputPoints = [];
let isBackCamActive = true;

function setup() {
  // Create DOM elements
  canv = createCanvas(WIDTH, HEIGHT);
  canv.parent("drawing-container");

  setupVideoCapture("environment");

  snapButton = createButton("Snap");
  snapButton.size(WIDTH / 3 - 20, 90);
  snapButton.mousePressed(takesnap);
  snapButton.parent("control-buttons");

  // connectShapeToggle = createCheckbox("Connect shape", false);
  // connectShapeToggle.parent("control-toggles");

  // debugImageToggle = createCheckbox("Show debug", false);
  // debugImageToggle.parent("control-toggles");
  
  // document.getElementById("control-toggles").style.width = ""+ (WIDTH/3-20) + "px";

  toggleCamButton = createButton("Toggle Camera");
  toggleCamButton.size(WIDTH / 3 - 20, 90);
  toggleCamButton.mousePressed(toggleCam);
  toggleCamButton.parent("control-buttons");

  resetButton = createButton("Reset");
  resetButton.size(WIDTH / 3 - 20, 90);
  resetButton.mousePressed(reset);
  resetButton.parent("control-buttons");
  
  // Only draw background once to begin.
  background(0);
}

function toggleCam() {
  isBackCamActive = !isBackCamActive;

  if (isBackCamActive) setupVideoCapture("environment");
  else setupVideoCapture("user");
}

function setupVideoCapture(type) {
  if (video) video.remove();

  video = createCapture({
    audio: false,
    video: {
      facingMode: type // If parameter is true, use back cam, else use front.
    }
  });

  video.size(WIDTH, HEIGHT);
  video.id("user-video");
  video.parent("camera-container");
}

function reset(){
  background(0);
  document.getElementById("camera-container").style.display = "block";
  document.getElementById("drawing-container").style.display = "none";
}

function draw() {
  // Draw and Update the lines.
  for (let i = 0; i < lines.length; i++) {
    lines[i].update();
    lines[i].draw();

    if (i < lines.length - 1 && lines[i].complete === true) {
      lines[i + 1].canDraw = true;
    }
  }
}

function takesnap() {
  document.getElementById("loading-icon").style.display = "block";
  document.getElementById("camera-container").style.display = "none";
  document.getElementById("drawing-container").style.display = "block";
  
  
  setTimeout(() => {
    video.pause();
  snapshot = video.get();

  outputPoints = detectPointsDrawn();

  if (outputPoints.length > 1) addLines();
  else console.log("Only 1 point detected!");

    document.getElementById("loading-icon").style.display = "none";
    
    video.play();
  } ,100);
}

function drawPreview() {
  image(snapshot, 0, 0, WIDTH, HEIGHT);

  for (let i = 0; i < outputPoints.length; i++) {
    ellipse(outputPoints[i].x, outputPoints[i].y, 15, 15);
  }
}

function addLines() {
  //background(0); // Draw background at the start of this to remove old lines.
  lines = [];

  // if (debugImageToggle.checked() == true) drawPreview();
  drawPreview();

  for (let i = 1; i < outputPoints.length; i++) {
    const startPoint = createVector(outputPoints[i - 1].x, outputPoints[i - 1].y);
    const endPoint = createVector(outputPoints[i].x, outputPoints[i].y);

    lines.push(new AnimatedLine(startPoint, endPoint));
  }

  // Join the first and last points to complete shape if enabled.
  if (/*connectShapeToggle.checked() == true &&*/ outputPoints.length > 1) {
    lines.push(new AnimatedLine(createVector(outputPoints[outputPoints.length - 1].x, outputPoints[outputPoints.length - 1].y), createVector(outputPoints[0].x, outputPoints[0].y)));
  }

  lines[0].canDraw = true; // Begin animation
}

function detectPointsDrawn() { // Sample the snapped image to find where the target colour is
  let samplePoints = [];
  const cols = (WIDTH / SAMPLING_ACCURACY) - 1;
  const rows = (HEIGHT / SAMPLING_ACCURACY) - 1;

  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const this_x = j * SAMPLING_ACCURACY;
      const this_y = i * SAMPLING_ACCURACY;

      if (checkSamplePointArea(color(0), SAMPLING_ACCURACY, this_x, this_y) === true) {
        samplePoints.push(createVector(this_x, this_y));
      }
    }
  }

  // Sort the sample points found to be the target colour into groups (ie each shape drawn)
  const groupedPoints = groupPoints(samplePoints);

  // Then use the grouped points to find the centre of each group, so we know where to draw from on each shape.
  let centres = [];
  for (let i = 0; i < groupedPoints.length; i++) {
    const centre = findCentreOfPoints(groupedPoints[i]);
    centres.push(createVector(centre.x, centre.y));
  }

  // The centres are the final output coordinates used by the line drawing classes.
  return centres;
}

function checkSamplePointArea(targetCol, SAMPLING_ACCURACY, x, y) {
  let count = 0;

  // For ease of comparison convert each colour to greyscale by finding the average of their rgb values.
  const greyScaleTarget = (targetCol.levels[0] + targetCol.levels[1] + targetCol.levels[2]) / 3;

  for (let i = 0; i < SAMPLING_ACCURACY; i++) {
    for (let j = 0; j < SAMPLING_ACCURACY; j++) {
      const currentColor = snapshot.get(int(x + i), int(y + j)); // Get the colour of the current pixel from the snapped image
      const greyScaleValue = (currentColor[0], currentColor[1], currentColor[2]) / 3;

      // Find the absoulte difference between the two greyscale values to check if it is close enough to the colour we want (within the threshold set).
      const colorDiff = abs(greyScaleTarget - greyScaleValue);
      if (colorDiff < COLOR_DIFF_THRESHOLD) count++;
    }
  }

  // If there are enough pixels of the correct colour in the area being checked, return true.
  if (count < CORRECT_PIXELS_REQUIRED) {
    return false;
  } else {
    return true;
  }
}

function groupPoints(points) {
  let unGroupedPoints = points;
  let groupedPoints = [];

  // Essentially a breadth first search of the ungrouped points. Process as follows:
  // 1- Move first item in ungrouped to current group.
  // 2- Check each remaining item in ungrouped, if any item is directly next to the current point, move it to the current group.
  // 3- Repeat step 2 for each item in current group (grows if more are move to it from ungrouped)
  // 4- Repeat from step 1 until ungrouped is empty.

  while (unGroupedPoints.length > 0) {
    let currentGroup = [unGroupedPoints[0]];
    unGroupedPoints.splice(0, 1);

    for (let i = 0; i < currentGroup.length; i++) {
      for (let j = unGroupedPoints.length - 1; j >= 0; j--) {
        if ((currentGroup[i].x == unGroupedPoints[j].x && currentGroup[i].y - SAMPLING_ACCURACY == unGroupedPoints[j].y) || // UP
          (currentGroup[i].x == unGroupedPoints[j].x && currentGroup[i].y + SAMPLING_ACCURACY == unGroupedPoints[j].y) || // Down
          (currentGroup[i].x - SAMPLING_ACCURACY == unGroupedPoints[j].x && currentGroup[i].y == unGroupedPoints[j].y) || // Left
          (currentGroup[i].x + SAMPLING_ACCURACY == unGroupedPoints[j].x && currentGroup[i].y == unGroupedPoints[j].y)) { // Right

          currentGroup.push(unGroupedPoints[j]);
          unGroupedPoints.splice(j, 1);
        }
      }
    }
    groupedPoints.push(currentGroup);
  }
  return groupedPoints;
}

function findCentreOfPoints(points) {
  // Formula for this is just finding the average of the X and Y values respectively then return those as a vector.
  let sum_x = 0;
  let sum_y = 0;

  for (let i = 0; i < points.length; i++) {
    sum_x += points[i].x;
    sum_y += points[i].y;
  }

  return createVector(sum_x / points.length, sum_y / points.length);
}
