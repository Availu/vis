var $ = document.querySelector.bind(document);
var ctx = $("#canvas").getContext("2d");
var canvas = $("#canvas");
var bg = $("#bg");
var bg_fog = $("#bg_fog");
var fogs = [];
var fog = bg_fog.getContext("2d");
bg_fog.width = window.innerWidth;
bg_fog.height = window.innerHeight;
bg_fog.style.width = window.innerWidth;
bg_fog.style.width = window.innerHeight;
function generateSmoke()
{
    var fog = bg_fog.getContext("2d");
    for (var i = 0; i < 128; i++)
    {
        fogs.push([randomRange(-100, bg_fog.width), randomRange(-100, bg_fog.height),
            200]);
    }
}
doResizeStuff();
generateSmoke();
for (var i = 0; i < fogs.length; i++)
{
    var f = fogs[i];
    drawGradient(fog, f[0], f[1], f[2]);
}
boxBlurCanvasRGBA('bg_fog', 0, 0, bg_fog.width, bg_fog.width, 1, 1);

function doResizeStuff()
{
    canvas.width = window.innerWidth - 75;
    bg.width = window.innerWidth;
    bg.height = window.innerHeight;
    bg.style.width = window.innerWidth;
    bg.style.width = window.innerHeight;
}
var gotBeat = false;
var isPlayingAudio = false;
var beatTime = 0;
var bpmTime = 0;
var ratedBPMTime = 0;
window.onresize = doResizeStuff

function drawGradient(context, x, y, radius)
{
    var radialGradient = context.createRadialGradient(x + radius, y + radius, 0,
        x + radius, y + radius, radius);
    var fogDensity = 0.08;
    radialGradient.addColorStop(0.2, "rgba(130, 130, 130, " + fogDensity + ")");
    radialGradient.addColorStop(1, "rgba(130, 130, 130, 0)");
    context.fillStyle = radialGradient;
    context.fillRect(x, y, 2 * radius, 2 * radius);
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
        //audioContext = new window.webkitAudioContext();
        //processor = audioContext.createJavaScriptNode(2048 , 1 , 1 );
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
        window.isPlayingAudio = true;
    }

    function stopSound()
    {
        isPlayingAudio = false;
        window.isPlayingAudio = false;
        if (source)
        {
            source.stop(0);
            source.disconnect();
        }
        debugCtx.clearRect(0, 0, debugW, debugH);
    }

    function onShowDebug()
    {
        if (ControlsHandler.audioParams.showDebug)
        {
            $("#audioDebug").style.visibility = "visible";
        }
        else
        {
            $("#audioDebug").style.visibility = "hidden";
        }
    }
    //load dropped MP3

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
    //called from dropped MP3

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
        //console.log("BEAT");
        // TweenLite.to(this, 1, {debugLum:, ease:Power2.easeOut});
        // TweenMax.to(this, 1, css:{ color: "FFFFFF" } );
        //experimental combined beat + bpm mode
        gotBeat = true;
        window.gotBeat = true;
        if (ControlsHandler.audioParams.bpmMode) return;
        events.emit("onBeat");
    }

    function onBMPBeat()
    {
        //console.log("onBMPBeat");
        bpmStart = new Date().getTime();
        if (!ControlsHandler.audioParams.bpmMode) return;
        //only fire bpm beat if there was an on onBeat in last timeframe
        //experimental combined beat + bpm mode
        //if (gotBeat){
        //NeonShapes.onBPMBeat();
        //GoldShapes.onBPMBeat();
        gotBeat = false;
        window.gotBeat = false;
        //}
    }
    //called every frame
    //update published viz data

    function update()
    {
        //console.log("audio.update");
        if (!isPlayingAudio) return;
        //GET DATA
        analyser.getByteFrequencyData(freqByteData); //<-- bar chart
        analyser.getByteTimeDomainData(timeByteData); // <-- waveform
        //normalize waveform data
        for (var i = 0; i < binCount; i++)
        {
            waveData[i] = ((timeByteData[i] - 128) / 128) * ControlsHandler.audioParams
                .volSens;
        }
        //TODO - cap levels at 1 and -1 ?
        //normalize levelsData from freqByteData
        for (var i = 0; i < levelsCount; i++)
        {
            var sum = 0;
            for (var j = 0; j < levelBins; j++)
            {
                sum += freqByteData[(i * levelBins) + j];
            }
            levelsData[i] = sum / levelBins / 256 * ControlsHandler.audioParams
                .volSens; //freqData maxs at 256
            //adjust for the fact that lower levels are percieved more quietly
            //make lower levels smaller
            //levelsData[i] *=  1 + (i/levelsCount)/2; //??????
        }
        //TODO - cap levels at 1?
        //GET AVG LEVEL
        var sum = 0;
        for (var j = 0; j < levelsCount; j++)
        {
            sum += levelsData[j];
        }
        volume = sum / levelsCount;
        // high = Math.max(high,level);
        levelHistory.push(volume);
        levelHistory.shift(1);
        //BEAT DETECTION
        if (volume > beatCutOff && volume > BEAT_MIN)
        {
            onBeat();
            beatCutOff = volume * 1.1;
            beatTime = 0;
            window.beatTime = 0;
        }
        else
        {
            if (beatTime <= ControlsHandler.audioParams.beatHoldTime)
            {
                beatTime++;
                window.beatTime++;
            }
            else
            {
                beatCutOff *= ControlsHandler.audioParams.beatDecayRate;
                beatCutOff = Math.max(beatCutOff, BEAT_MIN);
            }
        }
        bpmTime = (new Date().getTime() - bpmStart) / msecsAvg;
        //trace(bpmStart);
        if (ControlsHandler.audioParams.showDebug) debugDraw();
        normalDraw();
    }

    function normalDraw()
    {
        window.ctx.clearRect(0, 0, window.canvas.width, window.canvas.height);
        window.ctx.fillStyle = "#1AAAAE"; //bar color
        var meterNum = Math.round(window.canvas.width / (14 + 4) / 2);
        var width = 14;
        var spacing = 4;
        // var step = Math.round(freqByteData.length / meterNum);
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
        //draw chart bkgnd
        debugCtx.fillStyle = "#000";
        debugCtx.fillRect(0, 0, debugW, debugH);
        //DRAW BAR CHART
        // Break the samples up into bars
        var barWidth = chartW / levelsCount;
        debugCtx.fillStyle = gradient;
        for (var i = 0; i < levelsCount; i++)
        {
            debugCtx.fillRect(i * barWidth, chartH, barWidth - debugSpacing, -
                levelsData[i] * chartH);
        }
        //DRAW AVE LEVEL + BEAT COLOR
        if (beatTime < 10)
        {
            debugCtx.fillStyle = "#FFF";
        }
        debugCtx.fillRect(chartW, chartH, aveBarWidth, -volume * chartH);
        //DRAW CUT OFF
        debugCtx.beginPath();
        debugCtx.moveTo(chartW, chartH - beatCutOff * chartH);
        debugCtx.lineTo(chartW + aveBarWidth, chartH - beatCutOff * chartH);
        debugCtx.stroke();
        //DRAW WAVEFORM
        debugCtx.beginPath();
        for (var i = 0; i < binCount; i++)
        {
            debugCtx.lineTo(i / binCount * chartW, waveData[i] * chartH / 2 +
                chartH / 2);
        }
        debugCtx.stroke();
        //DRAW BPM
        var bpmMaxSize = bpmHeight;
        var size = bpmMaxSize - bpmTime * bpmMaxSize;
        debugCtx.fillStyle = "#020";
        debugCtx.fillRect(0, chartH, bpmMaxSize, bpmMaxSize);
        debugCtx.fillStyle = "#0F0";
        debugCtx.fillRect((bpmMaxSize - size) / 2, chartH + (bpmMaxSize - size) /
            2, size, size);
    }

    function onTap()
    {
        console.log("ontap");
        clearInterval(timer);
        timeSeconds = new Date();
        msecs = timeSeconds.getTime();
        //after 2 seconds, new tap counts as a new sequnce
        if ((msecs - msecsPrevious) > 2000)
        {
            count = 0;
        }
        if (count === 0)
        {
            console.log("First Beat");
            msecsFirst = msecs;
            count = 1;
        }
        else
        {
            bpmAvg = 60000 * count / (msecs - msecsFirst);
            msecsAvg = (msecs - msecsFirst) / count;
            count++;
            console.log("bpm: " + Math.round(bpmAvg * 100) / 100 + " , taps: " +
                count + " , msecs: " + msecsAvg);
            onBMPBeat();
            clearInterval(timer);
            timer = setInterval(onBMPBeat, msecsAvg);
        }
        msecsPrevious = msecs;
    }

    function onChangeBPMRate()
    {
        //change rate without losing current beat time
        //get ratedBPMTime from real bpm
        switch (ControlsHandler.audioParams.bpmRate)
        {
        case -3:
            ratedBPMTime = msecsAvg * 8;
            break;
        case -2:
            ratedBPMTime = msecsAvg * 4;
            break;
        case -1:
            ratedBPMTime = msecsAvg * 2;
            break;
        case 0:
            ratedBPMTime = msecsAvg;
            break;
        case 1:
            ratedBPMTime = msecsAvg / 2;
            break;
        case 2:
            ratedBPMTime = msecsAvg / 4;
            break;
        case 3:
            ratedBPMTime = msecsAvg / 8;
            break;
        case 4:
            ratedBPMTime = msecsAvg / 16;
            break;
        }
        console.log("ratedBPMTime: " + ratedBPMTime);
        //get distance to next beat
        bpmTime = (new Date().getTime() - bpmStart) / msecsAvg;
        timeToNextBeat = ratedBPMTime - (new Date().getTime() - bpmStart);
        //set one-off timer for that
        clearInterval(timer);
        timer = setInterval(onFirstBPM, timeToNextBeat);
        //set timer for new beat rate
    }

    function onFirstBPM()
    {
        clearInterval(timer);
        timer = setInterval(onBMPBeat, ratedBPMTime);
    }
    // function toggleBPMMode(tog){
    //  console.log("PP");
    // }
    return {
        onMP3Drop: onMP3Drop,
        onShowDebug: onShowDebug,
        update: update,
        init: init,
        onTap: onTap,
        onChangeBPMRate: onChangeBPMRate,
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
    };
}();

function Events(e)
{
    var t = {}, n, r, i, s = Array;
    e = e || this;
    e.on = function (e, n, r)
    {
        t[e] || (t[e] = []);
        t[e].push(
        {
            f: n,
            c: r
        })
    };
    e.off = function (e, i)
    {
        r = t[e] || [];
        n = r.length = i ? r.length : 0;
        while (~--n < 0) i == r[n].f && r.splice(n, 1)
    };
    e.emit = function ()
    {
        i = s.apply([], arguments);
        r = t[i.shift()] || [];
        i = i[0] instanceof s && i[0] || i;
        n = r.length;
        while (~--n < 0) r[n].f.apply(r[n].c, i)
    }
}
//UberViz ControlsHandler
//Handles side menu controls
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
var events = new Events();
var UberVizMain = function ()
{
    function init()
    {
        document.onselectstart = function ()
        {
            return false;
        };
        document.addEventListener("drop", onDocumentDrop, false);
        document.addEventListener("dragover", onDocumentDragOver, false);
        AudioHandler.init();
        ControlsHandler.init();
        update();
    }

    function update()
    {
        requestAnimationFrame(update);
        window.bpmTime = AudioHandler.getBPMTime();
        events.emit("update");
    }

    function onDocumentDragOver(evt)
    {
        evt.stopPropagation();
        evt.preventDefault();
        return false;
    }

    function onDocumentDrop(evt)
    {
        evt.stopPropagation();
        evt.preventDefault();
        AudioHandler.onMP3Drop(evt);
    }
    return {
        init: init
    };
}();
(function ()
{
    UberVizMain.init();
})();
MAX_DEPTH = Math.pow(2, 7);     
var canvas2, ctx2;    
var stars = new Array(Math.pow(2, 10));     
window.onload = function ()
{      
    canvas2 = document.getElementById("bg");      
    if (canvas2 && canvas2.getContext)
    {        
        ctx2 = canvas2.getContext("2d");        
        initStars();
        setInterval(loop, 17);       
    }    
}     

function randomRange(minVal, maxVal)
{      
    return Math.floor(Math.random() * (maxVal - minVal - 1)) + minVal;    
}     

function initStars()
{      
    for (var i = 0; i < stars.length; i++)
    {        
        stars[i] = {          
            x: randomRange(-75, 75),
            y: randomRange(-75, 75),
            z: randomRange(1, MAX_DEPTH)         
        }      
    }    
}

function loop()
{      
    var halfWidth  = canvas2.width / 2;      
    var halfHeight = canvas2.height / 2;       
    ctx2.fillStyle = "rgba(0,0,0,0.5)";      
    ctx2.fillRect(0, 0, canvas2.width, canvas2.height);   
    for (var i = 0; i < stars.length; i++)
    {   
        if (beatTime < 6 && gotBeat && isPlayingAudio) 
        { 
            stars[i].z -= 0.025;
        }
        else if (!isPlayingAudio)
        {
            stars[i].z -= 0;
        }
        else
        {
            stars[i].z -= 0.01;
        }
        if (stars[i].z <= 0)
        {   
            stars[i].x = randomRange(-75, 75);          
            stars[i].y = randomRange(-75, 75);          
            stars[i].z = MAX_DEPTH;        
        }         
        var k  = 128.0 / stars[i].z;        
        var px = stars[i].x * k + halfWidth;        
        var py = stars[i].y * k + halfHeight;         
        if (px >= 0 && px <= canvas2.width && py >= 0 && py <= canvas2.height)
        {          
            var size = (1 - stars[i].z / 32.0) * 4;          
            //             var shade = parseInt((1 - stars[i].z / 32.0) * 200) + 55;          
            //             ctx2.fillStyle = "rgba(" + shade + "," + shade + "," + shade +
            //                 ",1)";  
            ctx2.fillStyle = "rgba(255,255,255," + (1 - stars[i].z / 32.0) +
                ")";
            ctx2.fillRect(px, py, size, size);        
        }      
    }
}
