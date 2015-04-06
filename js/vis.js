if (! window.AudioContext) {
  if (! window.webkitAudioContext) {
    alert('no audiocontext found, update your browser yo');
  }
  window.AudioContext = window.webkitAudioContext;
}

var context = new AudioContext();
var audioBuffer;
var sourceNode;
var analyser;
var javascriptNode;
var soundName = "track.mp3";

$(".content").hide();
var ctx = $("#canvas").get()[0].getContext("2d");

setupAudioNodes();
loadSound(soundName); //music file


function setupAudioNodes() {
  javascriptNode = context.createScriptProcessor(2048, 1, 1);
  javascriptNode.connect(context.destination);

  analyser = context.createAnalyser();
  analyser.smoothingTimeConstant = 0.3;
  analyser.fftSize = 128; //don't change!

  sourceNode = context.createBufferSource();
  sourceNode.connect(analyser);
  analyser.connect(javascriptNode);

  sourceNode.connect(context.destination);
}

function loadSound(url) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  request.onload = function() {
    context.decodeAudioData(request.response, function(buffer) {
      playSound(buffer);
    }, onError);
  }
  request.send();
}

function playSound(buffer) {
  ID3.loadTags(soundName, function () {
      var tags = ID3.getAllTags(soundName);
      $('.title').text(tags.title);
      $('.names').text(tags.artist);
      if ("picture" in tags) {
          var image = tags.picture;
          var base64String = "";
          for (var i = 0; i < image.data.length; i++) {
              base64String += String.fromCharCode(image.data[i]);
          }
          $(".art img").attr('src', "data:" + image.format + ";base64," + window.btoa(base64String));
      }
  },
  {
      tags: ["artist", "title", "picture"]
  });
  sourceNode.buffer = buffer;
  sourceNode.start(0);
  $(".content").show();
  $("#hue").hide();
}

function onError(e) {
  console.log(e);
}

javascriptNode.onaudioprocess = function() {
  var array =  new Uint8Array(analyser.frequencyBinCount);
  analyser.getByteFrequencyData(array);
  ctx.clearRect(0, 0, 1000, 325);
  ctx.fillStyle="#f61a03"; //bar color
  drawSpectrum(array);
}


function drawSpectrum(array) {
  for ( var i = 0; i < (array.length); i++ ){
    var value = array[i];
    ctx.fillRect(i*17, 325 - value, 10, 325); //1st value = bar side margins
  }
};