import audio from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@0.10.0";
const { AudioClassifier, AudioClassifierResult, FilesetResolver } = audio;
const demosSection = document.getElementById("demos");
let isPlaying = false;
let audioClassifier;
let audioCtx;
const createAudioClassifier = async () => {
    const audio = await FilesetResolver.forAudioTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-audio@0.10.0/wasm");
    audioClassifier = await AudioClassifier.createFromOptions(audio, {
        baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/audio_classifier/yamnet/float32/1/yamnet.tflite"
        }
    });
    demosSection.classList.remove("invisible");
};
createAudioClassifier();
/*
  Demo 1 - Classify an audio file. Returns classification results for
  the whole audio file, with timestamps in MS
*/
// Button for Audio 1 - cat purring
document
    .getElementById("classifyBtn1")
    .addEventListener("click", async function () {
    await runAudioClassification("audioClip1", "audioResult1");
});
// Button for Audio 2 - train
document
    .getElementById("classifyBtn2")
    .addEventListener("click", async function () {
    await runAudioClassification("audioClip2", "audioResult2");
});
async function runAudioClassification(demo, resultText) {
    const output = document.getElementById(resultText);
    const audioClip = document.getElementById(demo);
    // If sound is playing, then pause
    if (!audioClip.paused) {
        audioClip.pause();
        return;
    }
    if (!audioClassifier) {
        alert("Audio Classifier still loading. Please try again");
        return;
    }
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    // Play the audio file
    audioClip.play();
    // Get the audio clip
    const url = audioClip.src;
    const response = await fetch(url);
    // Create audio buffer
    const sample = await response.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(sample);
    // Use AudioClassifier to run classification
    const results = audioClassifier.classify(audioBuffer.getChannelData(0), audioBuffer.sampleRate);
    displayClassificationResults(results, output);
}
function displayClassificationResults(results, output) {
    removeAllChildNodes(output);
    // Add table headers
    const tr = document.createElement("tr");
    const timeTd = document.createElement("th");
    const timeNode = document.createTextNode("Timestamp in MS");
    timeTd.appendChild(timeNode);
    const categoryTd = document.createElement("th");
    const categoryNode = document.createTextNode("Category");
    categoryTd.appendChild(categoryNode);
    const scoreTd = document.createElement("th");
    const scoreNode = document.createTextNode("Confidence");
    scoreTd.appendChild(scoreNode);
    tr.appendChild(timeTd);
    tr.appendChild(categoryTd);
    tr.appendChild(scoreTd);
    output.appendChild(tr);
    // iterate through results and display in a table
    for (const result of results) {
        const categories = result.classifications[0].categories;
        const timestamp = result.timestampMs;
        const topCategory = categories[0].categoryName;
        const topScore = categories[0].score.toFixed(3);
        const tr = document.createElement("tr");
        // timestamp column
        const timeTd = document.createElement("td");
        const timeNode = document.createTextNode(timestamp);
        timeTd.appendChild(timeNode);
        timeTd.style.textAlign = "right";
        // category column
        const categoryTd = document.createElement("td");
        const categoryNode = document.createTextNode(topCategory);
        categoryTd.appendChild(categoryNode);
        // score column
        const scoreTd = document.createElement("td");
        const scoreNode = document.createTextNode(topScore);
        scoreTd.appendChild(scoreNode);
        tr.appendChild(timeTd);
        tr.appendChild(categoryTd);
        tr.appendChild(scoreTd);
        output.appendChild(tr);
    }
    output.className = "";
}
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}
/*
  Demo 2 - Streaming classification from microphone
*/
const streamingBt = document.getElementById("microBt");
streamingBt.addEventListener("click", async function () {
    await runStreamingAudioClassification();
});
async function runStreamingAudioClassification() {
    const output = document.getElementById("microResult");
    const constraints = { audio: true };
    let stream;
    try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
    }
    catch (err) {
        console.log("The following error occured: " + err);
        alert("getUserMedia not supported on your browser");
    }
    if (!audioCtx) {
        audioCtx = new AudioContext({ sampleRate: 16000 });
    }
    else if (audioCtx.state === "running") {
        await audioCtx.suspend();
        streamingBt.firstElementChild.innerHTML = "START CLASSIFYING";
        return;
    }
    // resumes AudioContext if has been suspended
    await audioCtx.resume();
    streamingBt.firstElementChild.innerHTML = "STOP CLASSIFYING";
    const source = audioCtx.createMediaStreamSource(stream);
    const scriptNode = audioCtx.createScriptProcessor(16384, 1, 1);
    scriptNode.onaudioprocess = function (audioProcessingEvent) {
        const inputBuffer = audioProcessingEvent.inputBuffer;
        let inputData = inputBuffer.getChannelData(0);
        // Classify the audio
        const result = audioClassifier.classify(inputData);
        const categories = result[0].classifications[0].categories;
        // Display results
        output.innerText =
            categories[0].categoryName +
                "(" +
                categories[0].score.toFixed(3) +
                ")\n" +
                categories[1].categoryName +
                "(" +
                categories[1].score.toFixed(3) +
                ")\n" +
                categories[2].categoryName +
                "(" +
                categories[2].score.toFixed(3) +
                ")";
    };
    source.connect(scriptNode);
    scriptNode.connect(audioCtx.destination);
}
