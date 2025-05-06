const video = document.getElementById('webcam');
const liveView = document.getElementById('liveView');
const demosSection = document.getElementById('demos');
const enableWebcamButton = document.getElementById('webcamButton');

// Check if webcam access is supported.
function getUserMediaSupported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}

// Enable webcam button event listener
if (getUserMediaSupported()) {
    enableWebcamButton.addEventListener('click', enableCam);
} else {
    console.warn('getUserMedia() is not supported by your browser');
}

// Enable the live webcam view and start classification.
function enableCam(event) {
    if (!model) {
        return;
    }
    
    event.target.classList.add('removed');  
    
    const constraints = {
        video: true
    };
  
    navigator.mediaDevices.getUserMedia(constraints).then(function(stream) {
        video.srcObject = stream;
        video.addEventListener('loadeddata', predictWebcam);
    });
}

// Store the resulting model in the global scope
var model = undefined;

cocoSsd.load().then(function (loadedModel) {
    model = loadedModel;
    demosSection.classList.remove('invisible');
});

var children = [];

function predictWebcam() {
    // Clear previous highlighters
    for (let i = 0; i < children.length; i++) {
        liveView.removeChild(children[i]);
    }
    children.splice(0);

    // Detect objects in the current frame
    model.detect(video).then(function (predictions) {
        // Get video's displayed dimensions to scale bounding boxes
        const videoRect = video.getBoundingClientRect();
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;
        const scaleX = videoRect.width / videoWidth;
        const scaleY = videoRect.height / videoHeight;

        const logContainer = document.getElementById('logContainer');
        const timestamp = new Date().toLocaleTimeString();

        // Process each prediction
        for (let n = 0; n < predictions.length; n++) {
            if (predictions[n].score > 0.4) {
                // Log detection
                const logLine = `[${timestamp}] ${predictions[n].class} (${Math.round(predictions[n].score * 100)}%)`;
                const logDiv = document.createElement('div');
                logDiv.textContent = logLine;
                logContainer.appendChild(logDiv);

                // Keep only the last 24 log lines
                const logLines = logContainer.querySelectorAll('div');
                if (logLines.length > 24) {
                    logContainer.removeChild(logLines[0]);
                }

                // Create a container for each prediction
                const predictionContainer = document.createElement('div');
                predictionContainer.classList.add('prediction-container');

                // Create label
                const p = document.createElement('p');
                p.innerText = `${predictions[n].class} - with ${Math.round(predictions[n].score * 100)}% confidence.`;
                
                // Create highlighter
                const highlighter = document.createElement('div');
                highlighter.classList.add('highlighter');

                // Scale and position the highlighter and label
                const bbox = predictions[n].bbox;
                const left = bbox[0] * scaleX;
                const top = bbox[1] * scaleY;
                const width = bbox[2] * scaleX;
                const height = bbox[3] * scaleY;

                p.style = `left: ${left}px; top: ${top - 20}px; width: ${width}px;`;
                highlighter.style = `left: ${left}px; top: ${top}px; width: ${width}px; height: ${height}px;`;

                // Add fade-in effect
                highlighter.style.opacity = '1';
                setTimeout(() => {
                    highlighter.style.opacity = '1';
                    highlighter.style.transition = 'opacity 200ms ease-in';
                }, 0);

                // Append to container
                predictionContainer.appendChild(highlighter);
                predictionContainer.appendChild(p);
                liveView.appendChild(predictionContainer);
                children.push(predictionContainer);
            }
        }

        // Continue predicting
        window.requestAnimationFrame(predictWebcam);
    });
}