const videoWrapper = document.querySelector("d2l-labs-media-player");
const video = videoWrapper.shadowRoot.querySelector("video");
let skipInterval = 5; // seconds
let mouseInVideoPlayer = true;

function videoShortcuts(key) {
    // if (!video) return;

    switch (key) {
        case "ArrowRight":
            video.currentTime += skipInterval;
            break;

        case "ArrowLeft":
            video.currentTime -= skipInterval;
            break;

        case "ArrowUp":
            video.volume = Math.min(1, video.volume + 0.1);
            break;

        case "ArrowDown":
            video.volume = Math.max(0, video.volume - 0.1);
            break;

        case " ":
            if (video.paused) {
                video.play();
                break;
            }

            video.pause();
            break;

        case "f":
            if (document.fullscreenElement?.nodeName == "D2L-LABS-MEDIA-PLAYER") {
                document.exitFullscreen();
                break;
            }

            videoWrapper.requestFullscreen();
            break;

        case "m":
            video.muted = !video.muted;
            break;
    }
}

// Checks if the mouse is inside the player wrapper area
function mouseInVideo() {
    mouseInVideoPlayer = true;
    console.log(mouseInVideoPlayer);
}

// Checks if the mouse leaves the player wrapper area
function mouseOutPlayer() {
    mouseInVideoPlayer = false;
    console.log(mouseInVideoPlayer);
}

// Setup eventlisteners
function setupShortcuts() {
    document.onkeydown = videoShortcuts;
    console.log(videoWrapper.parentNode);

    if (videoWrapper) {
        videoWrapper.addEventListener("mouseenter", mouseInVideo);
        videoWrapper.addEventListener("mouseleave", mouseOutPlayer);
    }
}

setupShortcuts();
