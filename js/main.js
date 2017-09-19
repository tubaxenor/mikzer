// set up basic variables for app

var record = document.querySelector('.record');
var mix = document.querySelector('.mix');
var soundClips = document.querySelector('.sound-clips');
var canvas = document.querySelector('.visualizer');
var mainSection = document.querySelector('.main-controls');

// visualiser setup - create web audio api context and canvas

var audioCtx = new (window.AudioContext || webkitAudioContext)();
var canvasCtx = canvas.getContext("2d");

//main block for doing the audio recording

if (navigator.mediaDevices.getUserMedia) {
  console.log('getUserMedia supported.');

  var constraints = { audio: true };
  var chunks = [];

  var onSuccess = function(stream) {
    var mediaRecorder = new MediaRecorder(stream);
    var recording = false;

    visualize(stream);

    record.onclick = function() {
      if(recording) {
        recording = false;
        mediaRecorder.stop();
        console.log(mediaRecorder.state);
        console.log("recorder stopped");
        record.style.background = "";
        mix.style.background = "";
        record.style.color = "";
        record.textContent = "Record"
        // mediaRecorder.requestData();
        mix.disabled = false;
      } else {
        recording = true;
        mediaRecorder.start();
        console.log(mediaRecorder.state);
        console.log("recorder started");
        record.style.background = "red";
        mix.style.background = "red";
        record.textContent = "Stop"
        mix.disabled = true;
      }
    }

    mix.onclick = function() {
      var values = [].filter.call(document.querySelectorAll('.mixbox'), function(c) {
        return c.checked;
      }).map(function(c) {
        console.log(c.dataset.url)
        var xhr = new XMLHttpRequest();
        var bufferSource = audioCtx.createBufferSource();

        xhr.open('GET', c.dataset.url, true);
        xhr.responseType = 'arraybuffer';
        xhr.onload = function() {
          // Make sure we get a successful response back.
          var code = (xhr.status + '')[0];
          if (code !== '0' && code !== '2' && code !== '3') {
            console.log("Load audio error")
            return;
          }

          audioCtx.decodeAudioData(xhr.response, function(buffer) {
            if (buffer) {
              console.log("audio loaded")
              bufferSource.buffer = buffer;
              bufferSource.connect(audioCtx.destination);
            }
          });
        };

        xhr.send();

        return bufferSource;
      });

      // ES6
      // var values = [].filter.call(mixingClips, (c) => c.checked).map(c => c.value);

      values.map(function(c) {
        c.start();
      })
    }

    mediaRecorder.onstop = function(e) {
      console.log("data available after MediaRecorder.stop() called.");

      var clipName = prompt('Enter a name for your sound clip?','My unnamed clip');
      console.log(clipName);
      var clipContainer = document.createElement('article');
      var clipDiv = document.createElement('div');
      var clipLabel = document.createElement('p');
      var audio = document.createElement('audio');
      var deleteButton = document.createElement('button');
      var downloadLink = document.createElement('a');
      var mixBox = document.createElement('input');

      clipContainer.classList.add('clip');
      clipDiv.className = "clip-wrapper"
      audio.setAttribute('controls', '');
      deleteButton.textContent = 'Delete';
      deleteButton.className = 'delete';

      downloadLink.textContent = 'Download';
      downloadLink.name = clipName + ".webm";
      downloadLink.setAttribute("download", downloadLink.name);
      downloadLink.className = 'download';

      mixBox.type = "checkbox";
      mixBox.className = "mixbox";

      if(clipName === null) {
        clipLabel.textContent = 'My unnamed clip';
      } else {
        clipLabel.textContent = clipName;
      }


      clipContainer.appendChild(clipDiv)
      clipDiv.appendChild(mixBox);
      clipDiv.appendChild(audio);

      clipContainer.appendChild(clipLabel);
      clipContainer.appendChild(deleteButton);
      clipContainer.appendChild(downloadLink);
      soundClips.appendChild(clipContainer);

      audio.controls = true;
      var blob = new Blob(chunks, { 'type' : 'audio/ogg; codecs=opus' });
      chunks = [];
      var audioURL = window.URL.createObjectURL(blob);
      audio.src = audioURL;
      downloadLink.href = audioURL;
      mixBox.dataset.url = audioURL;
      console.log("recorder stopped");

      deleteButton.onclick = function(e) {
        evtTgt = e.target;
        evtTgt.parentNode.parentNode.removeChild(evtTgt.parentNode);
      }

      clipLabel.onclick = function() {
        var existingName = clipLabel.textContent;
        var newClipName = prompt('Enter a new name for your sound clip?');
        if(newClipName === null) {
          clipLabel.textContent = existingName;
        } else {
          clipLabel.textContent = newClipName;
        }
      }
    }

    mediaRecorder.ondataavailable = function(e) {
      chunks.push(e.data);
    }
  }

  var onError = function(err) {
    console.log('The following error occured: ' + err);
  }

  navigator.mediaDevices.getUserMedia(constraints).then(onSuccess, onError);

} else {
   console.log('getUserMedia not supported on your browser!');
}

function visualize(stream) {
  var source = audioCtx.createMediaStreamSource(stream);

  var analyser = audioCtx.createAnalyser();
  analyser.fftSize = 2048;
  var bufferLength = analyser.frequencyBinCount;
  var dataArray = new Uint8Array(bufferLength);

  source.connect(analyser);
  //analyser.connect(audioCtx.destination);

  draw()

  function draw() {
    WIDTH = canvas.width
    HEIGHT = canvas.height;

    requestAnimationFrame(draw);

    analyser.getByteTimeDomainData(dataArray);

    canvasCtx.fillStyle = 'rgb(200, 200, 200)';
    canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

    canvasCtx.lineWidth = 2;
    canvasCtx.strokeStyle = 'rgb(0, 0, 0)';

    canvasCtx.beginPath();

    var sliceWidth = WIDTH * 1.0 / bufferLength;
    var x = 0;


    for(var i = 0; i < bufferLength; i++) {

      var v = dataArray[i] / 128.0;
      var y = v * HEIGHT/2;

      if(i === 0) {
        canvasCtx.moveTo(x, y);
      } else {
        canvasCtx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    canvasCtx.lineTo(canvas.width, canvas.height/2);
    canvasCtx.stroke();

  }
}

window.onresize = function() {
  canvas.width = mainSection.offsetWidth;
}

window.onresize();
