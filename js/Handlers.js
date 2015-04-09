var now;
var then = Date.now();
var interval = 1000 / fps;
var delta;

if (debug)
{
    var stats = new Stats();
    stats.setMode(0); // 0: fps, 1: ms

    // align top-left
    stats.domElement.style.position = 'absolute';
    stats.domElement.style.left = '0px';
    stats.domElement.style.top = '0px';

    document.body.appendChild(stats.domElement);
}

// Beat detection code courtesy of Felix Turner
// http://www.airtightinteractive.com/2013/10/making-audio-reactive-visuals/
var AudioHandler = function ()
{
    //PUBLIC/////////////
    var waveData = []; //waveform - from 0 - 1 . no sound is 0.5. Array [binCount]
    var levelsData = []; //levels of each frequecy - from 0 - 1 . no sound is 0. Array [levelsCount]
    var volume = 0; // averaged normalized level from 0 - 1
    var bpmTime = 0; // bpmTime ranges from 0 to 1. 0 = on beat. Based on tap bpm
    var ratedBPMTime = 550; //time between beats (msec) multiplied by BPMRate
    var levelHistory = []; //last 256 ave norm levels
    var bpmStart; //FIXME
    var BEAT_HOLD_TIME = 40; //num of frames to hold a beat
    var BEAT_DECAY_RATE = 0.98;
    var BEAT_MIN = 0.15; //level less than this is no beat
    //BPM STUFF
    var count = 0;
    var msecsFirst = 0;
    var msecsPrevious = 0;
    var msecsAvg = 633; //time between beats (msec)
    var timer;
    var gotBeat = false;
    var debugCtx;
    var debugW = 250;
    var debugH = 200;
    var chartW = 220;
    var chartH = 160;
    var aveBarWidth = 30;
    var bpmHeight = debugH - chartH;
    var debugSpacing = 2;
    var gradient;
    var freqByteData; //bars - bar data is from 0 - 256 in 512 bins. no sound is 0;
    var timeByteData; //waveform - waveform data is from 0-256 for 512 bins. no sound is 128.
    var levelsCount = 16; //should be factor of 512
    var binCount; //512
    var levelBins;
    var isPlayingAudio = false;
    var beatCutOff = 0;
    var beatTime = 0;
    var source;
    var buffer;
    var audioBuffer;
    var dropArea;
    var audioContext;
    //var processor;
    var analyser;
    var high = 0;

    function init()
    {
        //EVENT HANDLERS
        events.on("update", update);
        //Get an Audio Context
        try
        {
            window.AudioContext = window.AudioContext || window.webkitAudioContext;
            audioContext = new window.AudioContext();
        }
        catch (e)
        {
            //Web Audio API is not supported in this browser
            alert(
                "Sorry! This browser does not support the Web Audio API. Please use Chrome, Safari or Firefox."
            );
            return;
        }
        analyser = audioContext.createAnalyser();
        analyser.smoothingTimeConstant = 0.9; //smooths out bar chart movement over time
        analyser.fftSize = 128;
        analyser.minDecibels = -70;
        analyser.maxDecibels = -15;
        analyser.connect(audioContext.destination);
        binCount = analyser.frequencyBinCount; // = 512
        levelBins = Math.floor(binCount / levelsCount); //number of bins in each level
        freqByteData = new Uint8Array(binCount);
        timeByteData = new Uint8Array(binCount);
        var length = 256;
        for (var i = 0; i < length; i++)
        {
            levelHistory.push(0);
        }
        //INIT DEBUG DRAW
        var canvas = document.getElementById("audioDebug");
        debugCtx = canvas.getContext("2d");
        debugCtx.width = debugW;
        debugCtx.height = debugH;
        debugCtx.fillStyle = "rgb(40, 40, 40)";
        debugCtx.lineWidth = 2;
        debugCtx.strokeStyle = "rgb(255, 255, 255)";
        $("#audioDebug").style.visibility = "hidden";
        gradient = debugCtx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(1, "#330000");
        gradient.addColorStop(0.75, "#aa0000");
        gradient.addColorStop(0.25, "#aaaa00");
        gradient.addColorStop(0, "#aaaaaa");
        //assume 120BPM
        msecsAvg = 640;
        timer = setInterval(onBMPBeat, msecsAvg);
    }

    function initSound()
    {
        source = audioContext.createBufferSource();
        source.connect(analyser);
    }

    function startSound()
    {
        source.buffer = audioBuffer;
        source.loop = true;
        source.start(0.0);
        isPlayingAudio = true;
    }

    function stopSound()
    {
        isPlayingAudio = false;
        if (source)
        {
            source.stop(0);
            source.disconnect();
        }
        debugCtx.clearRect(0, 0, debugW, debugH);
    }

    function onShowDebug()
    {
        if (debug)
        {
            $("#audioDebug").style.visibility = "visible";
        }
        else
        {
            $("#audioDebug").style.visibility = "hidden";
        }
    }

    function onMP3Drop(evt)
    {
        stopSound();
        initSound();
        var droppedFiles = evt.dataTransfer.files;
        var reader = new FileReader();
        id3(droppedFiles[0], function (err, tags)
        {
            console.dir(tags);
            $(".title").innerHTML = tags.title;
            $(".names").innerHTML = tags.artist;
            if ("v2" in tags)
            {
                if ("image" in tags.v2)
                {
                    var image = tags.v2.image;
                    var binary = '';
                    var bytes = new Uint8Array(image.data);
                    var len = bytes.byteLength;
                    for (var i = 0; i < len; i++)
                    {
                        binary += String.fromCharCode(bytes[i]);
                    }
                    $(".art img").src = "data:" + image.mime + ";base64," +
                        window.btoa(binary);
                }
                else
                {
                    $(".art img").src = "";
                }
            }
        });
        reader.onload = function (fileEvent)
        {
            var data = fileEvent.target.result;
            onDroppedMP3Loaded(data);
        };
        reader.readAsArrayBuffer(droppedFiles[0]);
        $("#hue").style.visibility = "hidden";
    }

    function onDroppedMP3Loaded(data)
    {
        if (audioContext.decodeAudioData)
        {
            audioContext.decodeAudioData(data, function (buffer)
            {
                audioBuffer = buffer;
                startSound();
            }, function (e)
            {
                console.log(e);
            });
        }
        else
        {
            audioBuffer = audioContext.createBuffer(data, false);
            startSound();
        }
    }

    function onBeat()
    {
        gotBeat = true;
        if (ControlsHandler.audioParams.bpmMode) return;
        events.emit("onBeat");
    }

    function onBMPBeat()
    {
        bpmStart = new Date().getTime();
        if (!ControlsHandler.audioParams.bpmMode) return;
        gotBeat = false;
    }

    function update()
    {
        now = Date.now();
        delta = now - then;
        if (delta > interval) then = now - (delta % interval);
        if (delta > interval || !limitFps)
        {
            if (debug) stats.begin();
            Smoke.updateSmoke();
            Smoke.drawSmoke();
            Stars.loopStars();
            if (!isPlayingAudio)
            {
                if (debug) stats.end();
                return;
            }
            analyser.getByteFrequencyData(freqByteData); //<-- bar chart
            analyser.getByteTimeDomainData(timeByteData); // <-- waveform
            for (var i = 0; i < binCount; i++)
            {
                waveData[i] = ((timeByteData[i] - 128) / 128) * ControlsHandler.audioParams
                    .volSens;
            }
            for (var i = 0; i < levelsCount; i++)
            {
                var sum = 0;
                for (var j = 0; j < levelBins; j++)
                {
                    sum += freqByteData[(i * levelBins) + j];
                }
                levelsData[i] = sum / levelBins / 256 * ControlsHandler.audioParams
                    .volSens;
            }
            var sum = 0;
            for (var j = 0; j < levelsCount; j++)
            {
                sum += levelsData[j];
            }
            volume = sum / levelsCount;
            levelHistory.push(volume);
            levelHistory.shift(1);
            if (volume > beatCutOff && volume > BEAT_MIN)
            {
                onBeat();
                beatCutOff = volume * 1.1;
                beatTime = 0;
            }
            else
            {
                if (beatTime <= ControlsHandler.audioParams.beatHoldTime)
                {
                    beatTime++;
                }
                else
                {
                    beatCutOff *= ControlsHandler.audioParams.beatDecayRate;
                    beatCutOff = Math.max(beatCutOff, BEAT_MIN);
                }
            }
            bpmTime = (new Date().getTime() - bpmStart) / msecsAvg;
            if (debug) debugDraw();
            normalDraw();
            if (debug) stats.end();
        }
    }

    function normalDraw()
    {
        window.ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
        window.ctx.fillStyle = "#1AAAAE"; //bar color
        var meterNum = Math.round(window.canvas.width / (14 + 4) / 2);
        var width = 14;
        var spacing = 4;
        for (var i = 0; i < (meterNum); i++)
        {
            var value = freqByteData[i];
            var distFromCentre = (window.canvas.width / 2) - (width) - (spacing *
                4) + i * (width + spacing) + (spacing * 2.5);
            window.ctx.fillRect(distFromCentre, window.canvas.height - value -
                2, width, window.canvas.height);
            window.ctx.fillRect(window.canvas.width - distFromCentre - (spacing *
                    4 * 2.5), window.canvas.height - value - 2, width, window.canvas
                .height);
        }
    }

    function debugDraw()
        {
            debugCtx.clearRect(0, 0, debugW, debugH);
            debugCtx.fillStyle = "#000";
            debugCtx.fillRect(0, 0, debugW, debugH);
            var barWidth = chartW / levelsCount;
            debugCtx.fillStyle = gradient;
            for (var i = 0; i < levelsCount; i++)
            {
                debugCtx.fillRect(i * barWidth, chartH, barWidth - debugSpacing, -
                    levelsData[i] * chartH);
            }
            if (beatTime < 10)
            {
                debugCtx.fillStyle = "#FFF";
            }
            debugCtx.fillRect(chartW, chartH, aveBarWidth, -volume * chartH);
            debugCtx.beginPath();
            debugCtx.moveTo(chartW, chartH - beatCutOff * chartH);
            debugCtx.lineTo(chartW + aveBarWidth, chartH - beatCutOff * chartH);
            debugCtx.stroke();
            debugCtx.beginPath();
            for (var i = 0; i < binCount; i++)
            {
                debugCtx.lineTo(i / binCount * chartW, waveData[i] * chartH / 2 +
                    chartH / 2);
            }
            debugCtx.stroke();
            var bpmMaxSize = bpmHeight;
            var size = bpmMaxSize - bpmTime * bpmMaxSize;
            debugCtx.fillStyle = "#020";
            debugCtx.fillRect(0, chartH, bpmMaxSize, bpmMaxSize);
            debugCtx.fillStyle = "#0F0";
            debugCtx.fillRect((bpmMaxSize - size) / 2, chartH + (bpmMaxSize - size) /
                2, size, size);
        }
    return {
        onMP3Drop: onMP3Drop,
        onShowDebug: onShowDebug,
        update: update,
        init: init,
        getLevelsData: function ()
        {
            return levelsData;
        },
        getVolume: function ()
        {
            return volume;
        },
        getBPMTime: function ()
        {
            return bpmTime;
        },
        gotBeat: function ()
        {
            return gotBeat;
        },
        isPlayingAudio: function ()
        {
            return isPlayingAudio;
        },
        beatTime: function ()
        {
            return beatTime;
        },
    };
}();

var ControlsHandler = function ()
{
    var audioParams = {
        showDebug: false,
        volSens: 1,
        beatHoldTime: 40,
        beatDecayRate: 0.97,
        bpmMode: false,
        bpmRate: 0,
        sampleURL: ""
    };

    function init()
    {
        AudioHandler.onShowDebug();
    }
    return {
        init: init,
        audioParams: audioParams
    };
}();
