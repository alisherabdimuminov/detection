import { FaceDetector, FilesetResolver } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0";
const demosSection = document.getElementById("demos");
let faceDetector;
let runningMode = "VIDEO";

// Initialize the object detector
const initializefaceDetector = async () => {
    const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm");
    faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
            delegate: "GPU"
        },
        runningMode: runningMode
    });
};
initializefaceDetector();

/********************************************************************
 // Demo 2: Continuously grab image from webcam stream and detect it.
 ********************************************************************/
let video = document.getElementById("webcam");
console.log(video.width)
console.log(video.height)
const liveView = document.getElementById("liveView");
let enableWebcamButton;
// Check if webcam access is supported.
const hasGetUserMedia = () => { var _a; return !!((_a = navigator.mediaDevices) === null || _a === void 0 ? void 0 : _a.getUserMedia); };
// Keep a reference of all the child elements we create
// so we can remove them easilly on each render.
var children = [];
// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
    enableWebcamButton = document.getElementById("webcamButton");
    enableWebcamButton.addEventListener("click", enableCam);
}
else {
    console.warn("getUserMedia() is not supported by your browser");
}
// Enable the live webcam view and start detection.
async function enableCam(event) {
    if (!faceDetector) {
        alert("Face Detector is still loading. Please try again..");
        return;
    }
    // Hide the button.
    enableWebcamButton.classList.add("removed");
    // getUsermedia parameters
    const constraints = {
        video: true
    };
    // Activate the webcam stream.
    navigator.mediaDevices
        .getUserMedia(constraints)
        .then(function (stream) {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
    })
        .catch((err) => {
        console.error(err);
    });
}
let lastVideoTime = -1;
async function predictWebcam() {
    // if image mode is initialized, create a new classifier with video runningMode
    let startTimeMs = performance.now();
    // Detect faces using detectForVideo
    if (video.currentTime !== lastVideoTime) {
        lastVideoTime = video.currentTime;
        const detections = faceDetector.detectForVideo(video, startTimeMs)
            .detections;
        displayVideoDetections(detections);
    }
    // Call this function again to keep predicting when the browser is ready
    window.requestAnimationFrame(predictWebcam);
}
let canvas = document.getElementById("canvas");
let photo = document.getElementById("photo");

function displayVideoDetections(detections) {
    // Remove any highlighting from previous frame.
    // console.log(detections[0].boundingBox)
    let sx = detections[0].boundingBox['originX']
    let sy = detections[0].boundingBox['originY']
    let swidth = detections[0].boundingBox['width']
    let sheight = detections[0].boundingBox['height']
    takepicture(canvas, photo, sx, sy, swidth, sheight);
    for (let child of children) {
        liveView.removeChild(child);
    }
    children.splice(0);
    // Iterate through predictions and draw them to the live view
    for (let detection of detections) {
        const p = document.createElement("p");
        p.innerText =
            "Confidence: " +
                Math.round(parseFloat(detection.categories[0].score) * 100) +
                "% .";
        p.style =
            "left: " +
                (video.offsetWidth -
                    detection.boundingBox.width -
                    detection.boundingBox.originX) +
                "px;" +
                "top: " +
                (detection.boundingBox.originY) +
                "px; " +
                "width: " +
                (detection.boundingBox.width) +
                "px;";
        const highlighter = document.createElement("div");
        highlighter.setAttribute("class", "highlighter");
        highlighter.style =
            "left: " +
                (video.offsetWidth -
                    detection.boundingBox.width -
                    detection.boundingBox.originX) +
                "px;" +
                "top: " +
                detection.boundingBox.originY +
                "px;" +
                "width: " +
                (detection.boundingBox.width) +
                "px;" +
                "height: " +
                detection.boundingBox.height +
                "px;";
        liveView.appendChild(highlighter);
        liveView.appendChild(p);
        // Store drawn objects in memory so they are queued to delete at next call
        children.push(highlighter);
        children.push(p);
        for (let keypoint of detection.keypoints) {
            const keypointEl = document.createElement("spam");
            keypointEl.className = "key-point";
            keypointEl.style.top = `${keypoint.y * video.offsetHeight - 3}px`;
            keypointEl.style.left = `${video.offsetWidth - keypoint.x * video.offsetWidth - 3}px`;
            liveView.appendChild(keypointEl);
            children.push(keypointEl);
        }
    }
}

const width = 700;
const height = 500;

function takepicture(canvas, photo, sx, sy, swidth, sheight) {
    const context = canvas.getContext("2d");
    if (width && height) {
      canvas.width = width;
      canvas.height = height;
      context.drawImage(video, sx, sy, swidth, sheight, 100, 100, swidth, sheight);

      const data = canvas.toDataURL("image/png");
      photo.setAttribute("src", data);
    } else {
      console.log("error")
    }
  }