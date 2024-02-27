// import block
import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";


// variables
let faceLandmarker;
let webCameraRunnig = true;
let warningText = "";
let warningClassName = "";
let photoTaken = false;
let cameraWidth = 0;
let cameraHeight = 0;
let x1 = cameraWidth;
let y1 = cameraHeight;
let x2 = 0;
let y2 = 0;
let cropedImageWidth = x2 - x1 + 40;
let cropedImageHeight = y2 - y1 + 40;
let q = Math.max(cropedImageHeight, cropedImageWidth) - Math.min(cropedImageHeight, cropedImageWidth);
let lastVideoTime = -1;
let results = null;
let videoHeight = 0;
let warning = document.getElementById("warning");
let canvas = document.getElementById("canvas");
let photo = document.getElementById("canvas");
let button = document.getElementById("webcamButton");


// constantas
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
const videoWidth = 400;
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasContext = canvasElement.getContext("2d");
const printf = console.log;


// functions
// create face landmarker function
async function createFaceLandmarker() {
    const filesetResolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode: "VIDEO",
        numFaces: 10
    });
}
// call createFaceLandmarker() function
createFaceLandmarker();

// take picture from video function
function takePicture(x, y, width, height) {
    const context = canvas.getContext("2d");
    canvas.width = 160;
    canvas.height = 160;
    context.drawImage(video, x, y, width, height, 0, 0, 160, 160);
    const data = canvas.toDataURL("image/png");
    photo.setAttribute("src", data);
    return;
}

// check web camera access is supported function.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// start camera function.
function startCamera(event) {
    if (!faceLandmarker) {
        printf("Please wait! faceLandmarker not loaded yet.");
        return;
    }
    if (webCameraRunnig === true) {
        webCameraRunnig = false;
    } else {
        webCameraRunnig = true;
    }
    // getUserMedia parameters
    const features = {
        video: true
    };
    // activate the webcamera stream.
    navigator.mediaDevices.getUserMedia(features).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
        // get user camera settings
        let settings = stream.getVideoTracks()[0].getSettings();
        cameraWidth = settings.width;
        cameraHeight = settings.height;
        printf("Camera width: ", cameraWidth);
        printf("Camera height: ", cameraHeight);
    }).catch(e => console.log(e));
}

button.addEventListener("click", startCamera);

// draw rectangle function
function drawRect(color) {
    canvasContext.rect(cameraWidth / 5, cameraHeight / 5, cameraWidth / 1.5, cameraHeight / 1.5);
    canvasContext.lineWidth = "5";
    canvasContext.strokeStyle = color;
    canvasContext.stroke();
}

// Rodrigues fucntion
function rodrigues(matrix) {
    const trace = matrix[0] + matrix[4] + matrix[8];
    let angle = Math.acos((trace - 1) / 2);
    let axis = [
        matrix[5] - matrix[7],
        matrix[6] - matrix[2],
        matrix[1] - matrix[3]
    ];
    const denominator = 2 * Math.sin(angle);
    axis = axis.map(element => element / denominator);
    const rotationVector = axis.map(element => element * angle * 180 / Math.PI);
    return rotationVector;
}

const drawingUtils = new DrawingUtils(canvasContext);
// predict webcamera function
async function predictWebcam() {
    const radio = video.videoHeight / video.videoWidth;
    videoHeight = videoWidth * radio;
    video.style.width = videoWidth + "px";
    video.style.height = videoHeight + "px";
    canvasElement.style.width = videoWidth + "px";
    canvasElement.style.height = videoHeight + "px";
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
    drawRect("red");

    let startTimeMS = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = faceLandmarker.detectForVideo(video, startTimeMS);
    }

    if (results.faceLandmarks.length == 1) {
        results.faceLandmarks.forEach((element) => {
            for (let i of element) {
                // get cordinate
                let cordX = i.x * cameraWidth;
                let cordY = i.y * cameraHeight;
                // calculate x1, y1, x2 and y2
                if (cordX < x1) {
                    x1 = cordX;
                }
                if (cordY < y1) {
                    y1 = cordY;
                }
                if (cordX > x2) {
                    x2 = cordX;
                }
                if (cordY > y2) {
                    y2 = cordY;
                }
            }
        });

        // detect incorrect position of human
        if (x1 < cameraWidth / 6.0 || x1 > cameraWidth * 5 / 6 || y1 < cameraHeight / 6 || y1 > cameraHeight * 5 / 6 ||
        x2 < cameraWidth / 6.0 || x2 > cameraWidth * 5 / 6 || y2 < cameraHeight / 6 || y2 > cameraHeight * 5 / 6) {
            drawRect("red");
        } else {
            drawRect("green");
        }

        // detect user pose estimation
        results.facialTransformationMatrixes.forEach((element) => {
            const matrix = [
                element.data[0], element.data[1], element.data[2],
                element.data[4], element.data[5], element.data[6],
                element.data[8], element.data[9], element.data[10]
            ];
            const rodriguesVector = rodrigues(matrix);
            let pitch = rodriguesVector[0];
            let yaw = rodriguesVector[1];
            let roll = rodriguesVector[2];

            // detect look right/left
            if (yaw < -15) {
                warningText = "O'ng tomonga qaradingiz!";
                warningClassName = "alert-danger";
                drawRect("red");
            }
            else if (yaw > 15) {
                warningText = "Chap tomonga qaradingiz!";
                drawRect("red");
            }
            // detect look up/down
            else if (pitch < -15) {
                warningText = "Tepaga qaradingiz!";
                warningClassName = "alert-danger";
                drawRect("red");
            }
            else if (pitch > 15) {
                warningText = "Pastga qaradingiz!";
                warningClassName = "alert-danger";
                drawRect("red");
            }
            // detect turn right/left
            else if (roll < -15) {
                warningText = "Chap tomonga buruldingiz!";
                warningClassName = "alert-danger";
                drawRect("red");
            }
            else if (roll > 15) {
                warningText = "O'ng tomonga buruldingiz!";
                warningClassName = "alert-danger";
                drawRect("red");
            }
            // detect turn on
            else {
                warningText = "To'g'riga qaradingiz!";
                warningClassName = "alert-success";
                if (!photoTaken) {
                    takePicture(x1 - 20 - q / 2, y1 - 50, Math.max(cropedImageWidth, cropedImageHeight), Math.max(cropedImageWidth, cropedImageHeight));
                }
            }
            warning.innerHTML = warningText;
            warning.classList = [];
            warning.classList.add("alert", warningClassName);
        });
    }
    else if (results.faceLandmarks.length >= 2) {
        warningText = `Aniqlangan odamlar: ${results.faceLandmarks.length}`;
        warning.innerHTML = warningText;
        warningClassName = "alert-warning";
        warning.classList = "";
        warning.classList.add("alert", warningClassName);
    } else {
        warningText = "Odam topilmadi";
        warning.innerHTML = warningText;
        warningClassName = "alert-warning";
        warning.classList = "";
        warning.classList.add("alert", warningClassName);
    }

    if (webCameraRunnig === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}
