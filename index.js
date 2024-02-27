import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3"
// import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
let faceLandmarker;
let runningMode = "VIDEO";
let enableWebcamButton;
let webcamRunning = false;
let warningText = ""
const videoWidth = 400;
let photoTaken = false;
let cameraWidth = 0;
let cameraHeight = 0;
let warning = document.getElementById("warning");
let className = "";
let canTakePhoto1 = false;
let canTakePhoto2 = false;


let canvas = document.getElementById("canvas");
let photo = document.getElementById("photo");

function uploadImage(image) {
    let storageRef = firebase.storage().ref("images/");
    let uploadTask = storageRef.put(image);

    uploadTask.on("state_changed", () => {
        uploadTask.snapshot.ref.getDownloadURL().then((url) => {
            console.log(url);
        })
    })
}

async function createFaceLandmarker() {
    const filesetResolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        outputFacialTransformationMatrixes: true,
        runningMode,
        numFaces: 10
    });
}
createFaceLandmarker();

const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
let p = document.getElementById("error");
function takepicture(canvas, photo, sx, sy, swidth, sheight) {
    const context = canvas.getContext("2d");
    canvas.width = cameraWidth;
    canvas.height = cameraHeight;
    context.drawImage(video, 0, 0, cameraWidth, cameraHeight, 0, 0, cameraWidth, cameraHeight);
    const data = canvas.toDataURL("image/png");
    // photo.setAttribute("src", data);
    p.innerHTML = "Iltimos kuting."
    fetch("https://imagestorage.pythonanywhere.com/upload/", {
        headers: {
            'Content-Type': "application/json"
        },
        method: "post",
        body: JSON.stringify({"image": data})
    }).then(
        response => response.json()
    )
        .then(
            success => {
                console.log(success.url)
                let apiUrl = "https://proctoring.platon.uz/face-recognition/predict";
                fetch(apiUrl, {
                    headers: {
                        'Content-Type': "application/json"
                    },
                    method: "post",
                    body: JSON.stringify({"image1": "https://imagestorage.pythonanywhere.com/media/images/javohir.jpg", "image2": success.url})
                }).then(response => response.json())
                  .then(success => {
                    console.log("data: ", success.similarity);
                    if (success.similarity >= 0.26) {
                        p.innerHTML = "Kechirasiz. Yuzlar mos kelmadi." + success.similarity;
                    } else {
                        p.innerHTML = "Yuzlar mos keldi." + success.similarity;
                    }
                  })
            }
        ).catch(e => {
            console.log(e)
        })
}
// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}
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
function enableCam(event) {
    if (!faceLandmarker) {
        console.log("Wait! faceLandmarker not loaded yet.");
        return;
    }
    if (webcamRunning === true) {
        webcamRunning = false;
        enableWebcamButton.innerText = "ENABLE PREDICTIONS";
    }
    else {
        webcamRunning = true;
        enableWebcamButton.innerText = "DISABLE PREDICTIONS";
    }
    // getUsermedia parameters.
    const constraints = {
        video: true
    };
    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
        video.srcObject = stream;
        video.addEventListener("loadeddata", predictWebcam);
        let settings = stream.getVideoTracks()[0].getSettings();
        cameraWidth = settings.width;
        cameraHeight = settings.height;
        // console.log("w: ", cameraWidth);
        // console.log("h: ", cameraHeight);
    });
}

function drawRedRect() {
    canvasCtx.rect(cameraWidth / 5, cameraHeight / 5, cameraWidth / 1.5, cameraHeight / 1.5);
    canvasCtx.lineWidth = "6";
    canvasCtx.strokeStyle = "red";
    canvasCtx.stroke();
}

function drawGreenRect() {
    canvasCtx.rect(cameraWidth / 5, cameraHeight / 5, cameraWidth / 1.5, cameraHeight / 1.5);
    canvasCtx.lineWidth = "6";
    canvasCtx.strokeStyle = "green";
    canvasCtx.stroke();
}

let lastVideoTime = -1;
let results = undefined;
let h = 0;
const drawingUtils = new DrawingUtils(canvasCtx);
async function predictWebcam() {
    const radio = video.videoHeight / video.videoWidth;
    video.style.width = videoWidth + "px";
    video.style.height = videoWidth * radio + "px";
    h = videoWidth * radio;
    canvasElement.style.width = videoWidth + "px";
    canvasElement.style.height = videoWidth * radio + "px";
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;
    drawRedRect();

    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = faceLandmarker.detectForVideo(video, startTimeMs);
    }

    // Rodrigues
    function rodriguesRotationVectorFromMatrix(rotationMatrix) {
        const trace = rotationMatrix[0] + rotationMatrix[4] + rotationMatrix[8];
        
        let angle = Math.acos((trace - 1) / 2);

        let axis = [
            rotationMatrix[5] - rotationMatrix[7],
            rotationMatrix[6] - rotationMatrix[2],
            rotationMatrix[1] - rotationMatrix[3]
        ];
        const denominator = 2 * Math.sin(angle);
        axis = axis.map(component => component / denominator);

        const rotationVector = axis.map(component => component * angle * 180 / Math.PI);

        return rotationVector;
    }
    let x1 = cameraWidth;
    let y1 = cameraHeight;
    let x2 = 0;
    let y2 = 0;
    if (results.faceLandmarks.length == 1) {
        results.faceLandmarks.forEach((element, i) => {
            for (let a of element) {
                let cordX = a.x * cameraWidth;
                let cordY = a.y * cameraHeight;
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
        })

        if (x1 < cameraWidth / 6.0 || x1 > cameraWidth * 5 / 6 || y1 < cameraHeight / 6 || y1 > cameraHeight * 5 / 6 || 
            x2 < cameraWidth / 6.0 || x2 > cameraWidth * 5 / 6 || y2 < cameraHeight / 6 || y2 > cameraHeight * 5 / 6){
            drawRedRect();
            canTakePhoto1 = false;
        } else {
            drawGreenRect();
            canTakePhoto1 = true;
        }
        let scale = Math.max(Math.ceil(x2) - Math.ceil(x1), Math.ceil(y2) - Math.ceil(y1)) / (videoWidth / 4);
        if (scale < 1.9 || scale > 2.1) {
            drawRedRect();
        } else {
            results.facialTransformationMatrixes.forEach((element, i) => {
                const matrix = [
                    element.data[0], element.data[1], element.data[2],
                    element.data[4], element.data[5], element.data[6],
                    element.data[8], element.data[9], element.data[10]
                ];
                const rodriguesVector = rodriguesRotationVectorFromMatrix(matrix);
                let pitch = rodriguesVector[0];
                let yaw = rodriguesVector[1];
                let roll =  rodriguesVector[2];
                
                if (yaw < -7) {
                    warningText = "O'ng tomonga qaradingiz.";
                    className = "alert-danger";
                    drawRedRect();
                    canTakePhoto2 = false;
                } else if (yaw > 7) {
                    warningText = "Chap tomonga qaradingiz.";
                    className = "alert-danger";
                    drawRedRect();
                    canTakePhoto2 = false;
                } else if (pitch < -7) {
                    warningText = "Tepaga qaradingiz.";
                    className = "alert-danger";
                    drawRedRect();
                    canTakePhoto2 = false;
                } else if (pitch > 7) {
                    warningText = "Pastga qaradingiz.";
                    className = "alert-danger";
                    drawRedRect();
                    canTakePhoto2 = false;
                } else if (roll < -7) {
                    warningText = "Chap tomonga burildingiz.";
                    className = "alert-danger";
                    drawRedRect();
                    canTakePhoto2 = false;
                } else if (roll > 7) {
                    warningText = "O'ng tomonga burildingiz.";
                    className = "alert-danger";
                    drawRedRect();
                    canTakePhoto2 = false;
                } else {
                    warningText = "To'g'riga qaradingiz.";
                    className = "alert-success";
                    canTakePhoto2 = true;
                }
                let cropedImageWidth = x2 - x1 + 50;
                let cropedImageHeight = y2 - y1 + 50;
                console.log(scale);
                let q = Math.max(cropedImageHeight, cropedImageWidth) - Math.min(cropedImageHeight, cropedImageWidth);
                if (!photoTaken && canTakePhoto1 && canTakePhoto2) {
                    takepicture(canvas, photo, x1 - 20 - q / 2, y1 - 50, Math.max(cropedImageWidth, cropedImageHeight), Math.max(cropedImageWidth, cropedImageHeight));
                    photoTaken = true;
                }
                warning.innerHTML = warningText;
                warning.classList = [];
                warning.classList.add("alert", className);
            });
        }
    } else if (results.faceLandmarks.length >= 2) {
        warningText = `Aniqlangan odamlar: ${results.faceLandmarks.length}`;
        warning.innerHTML = warningText;
        className = "alert-warning";
        warning.classList = "";
        warning.classList.add("alert", className);
    } else {
        warningText = "Odam topilmadi";
        warning.innerHTML = warningText;
        className = "alert-warning";
        warning.classList = "";
        warning.classList.add("alert", className);
    }
    
    if (webcamRunning === true) {
        window.requestAnimationFrame(predictWebcam);
    }
}
