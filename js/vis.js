var ctx = $("#canvas").get()[0].getContext("2d");
var canvas = $("#canvas").get()[0];
document.getElementById("bg").width = $(window).width();
document.getElementById("bg").height = $(window).height();
document.getElementById("bg").style.width = $(window).width();
document.getElementById("bg").style.width = $(window).height();

var gotBeat = false;
var isPlayingAudio = false;
var beatTime = 0;

canvas.width = window.innerWidth - 75;
window.onresize = function ()
{
    canvas.width = window.innerWidth - 75;
    document.getElementById("bg").width = $(window).width();
    document.getElementById("bg").height = $(window).height();
    document.getElementById("bg").style.width = $(window).width();
    document.getElementById("bg").style.width = $(window).height();
}
// Beat detection code courtesy of Felix Turner
// http://www.airtightinteractive.com/2013/10/making-audio-reactive-visuals/
var AudioHandler = function ()
{
    var waveData = [];
    var levelsData = [];
    var level = 0;
    var bpmTime = 0;
    var ratedBPMTime = 550;
    var levelHistory = [];
    var bpmStart;
    var sampleAudioURL = "";
    var BEAT_HOLD_TIME = 40;
    var BEAT_DECAY_RATE = 0.98;
    var BEAT_MIN = 0.15;
    var count = 0;
    var msecsFirst = 0;
    var msecsPrevious = 0;
    var msecsAvg = 633;
    var timer;
    var gotBeat = false;
    var beatCutOff = 0;
    var beatTime = 0;
    var debugCtx;
    var debugW = 330;
    var debugH = 250;
    var chartW = 300;
    var chartH = 250;
    var aveBarWidth = 30;
    var debugSpacing = 2;
    var gradient;
    var freqByteData;
    var timeByteData;
    var levelsCount = 16;
    var binCount;
    var levelBins;
    var isPlayingAudio = false;
    var source;
    var buffer;
    var audioBuffer;
    var dropArea;
    var audioContext;
    var analyser;

    function init()
    {
        events.on("update", update);
        audioContext = new(window.AudioContext)();
        analyser = audioContext.createAnalyser();
        analyser.smoothingTimeConstant = 0.9;
        analyser.fftSize = 128;
        analyser.minDecibels = -70;
        analyser.maxDecibels = -15;
        analyser.connect(audioContext.destination);
        binCount = analyser.frequencyBinCount;
        levelBins = Math.floor(binCount / levelsCount);
        freqByteData = new Uint8Array(binCount);
        timeByteData = new Uint8Array(binCount);
        var length = 256;
        for (var i = 0; i < length; i++)
        {
            levelHistory.push(0);
        }
        var canvas = document.getElementById("audioDebug");
        debugCtx = canvas.getContext('2d');
        debugCtx.width = debugW;
        debugCtx.height = debugH;
        debugCtx.fillStyle = "rgb(40, 40, 40)";
        debugCtx.lineWidth = 2;
        debugCtx.strokeStyle = "rgb(255, 255, 255)";
        $('#audioDebug').hide();
        gradient = debugCtx.createLinearGradient(0, 0, 0, 256);
        gradient.addColorStop(1, '#330000');
        gradient.addColorStop(0.75, '#aa0000');
        gradient.addColorStop(0.5, '#aaaa00');
        gradient.addColorStop(0, '#aaaaaa');
        debugDraw();
    }

    function initSound()
    {
        source = audioContext.createBufferSource();
        source.connect(analyser);
    }

    function onTogglePlay()
    {
        if (ControlsHandler.audioParams.play)
        {
            startSound();
        }
        else
        {
            stopSound();
        }
    }

    function startSound()
    {
        source.buffer = audioBuffer;
        source.loop = true;
        source.start(0.0);
        isPlayingAudio = true;
        window.isPlayingAudio = true;
        //startViz();
        $("#preloader").hide();
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

    function onUseMic()
    {
        if (ControlsHandler.audioParams.useMic)
        {
            ControlsHandler.audioParams.useSample = false;
            getMicInput();
        }
        else
        {
            stopSound();
        }
    }

    function onUseSample()
    {
        if (ControlsHandler.audioParams.useSample)
        {
            loadSampleAudio();
            ControlsHandler.audioParams.useMic = false;
        }
        else
        {
            stopSound();
        }
    }

    function onMP3Drop(evt)
    {
        ControlsHandler.audioParams.useSample = false;
        ControlsHandler.audioParams.useMic = false;
        stopSound();
        initSound();
        var droppedFiles = evt.dataTransfer.files;
        var reader = new FileReader();
        ID3.loadTags(droppedFiles[0], function ()
        {
            var tags = ID3.getAllTags(droppedFiles[0]);
            console.dir(tags);
            $('.title').text(tags.title);
            $('.names').text(tags.artist);
            if ("picture" in tags)
            {
                var image = tags.picture;
                var base64String = "";
                for (var i = 0; i < image.data.length; i++)
                {
                    base64String += String.fromCharCode(image.data[i]);
                }
                $(".art img").attr('src', "data:" + image.format +
                    ";base64," + window.btoa(base64String));
            }
        },
        {
            tags: ["artist", "title", "picture"],
            dataReader: FileAPIReader(droppedFiles[0])
        });
        reader.onload = function (fileEvent)
        {
            var data = fileEvent.target.result;
            onDroppedMP3Loaded(data);
        };
        reader.readAsArrayBuffer(droppedFiles[0]);
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
        window.gotBeat = true;
        if (ControlsHandler.audioParams.bpmMode) return;
        events.emit("onBeat");
        console.log('EVENT: onBeat');
    }

    function update()
    {
        if (!isPlayingAudio) return;
        analyser.getByteFrequencyData(freqByteData);
        analyser.getByteTimeDomainData(timeByteData);
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
            //levelsData[i] *=  1 + (i/levelsCount)/2;
        }
        //TODO - cap levels at 1?
        //GET AVG LEVEL
        var sum = 0;
        for (var j = 0; j < levelsCount; j++)
        {
            sum += levelsData[j];
        }
        level = sum / levelsCount;
        levelHistory.push(level);
        levelHistory.shift(1);
        if (level > beatCutOff && level > BEAT_MIN)
        {
            onBeat();
            beatCutOff = level * 1.1;
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
        debugDraw();
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
        window.ctx.clearRect(0, 0, canvas.width, canvas.height);
        window.ctx.fillStyle = "#1AAAAE"; //bar color
        var meterNum = Math.round(canvas.width / (14 + 4) / 2);
        var step = Math.round(freqByteData.length / meterNum);
        for (var i = 0; i < (meterNum); i++)
        {
            var value = freqByteData[i * step];
            var width = 14;
            var spacing = 4;
            var distFromCentre = (canvas.width / 2) - (width) - (spacing * 4) +
                i * (width + spacing) + (spacing * 2.5);
            window.ctx.fillRect(distFromCentre, canvas.height - value - 2, 14,
                canvas.height);
            window.ctx.fillRect(canvas.width - distFromCentre - (spacing * 4 *
                2.5), canvas.height - value - 2, 14, canvas.height);
        }
        if (beatTime < 6)
        {
            debugCtx.fillStyle = "#FFF";
        }
        debugCtx.fillRect(chartW, chartH, aveBarWidth, -level * chartH);
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
    }
    return {
        onMP3Drop: onMP3Drop,
        onUseMic: onUseMic,
        onUseSample: onUseSample,
        update: update,
        init: init,
        level: level,
        levelsData: levelsData,
        onTogglePlay: onTogglePlay
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
var ControlsHandler = function ()
{
    var audioParams = {
        useMic: false,
        useSample: false,
        volSens: 1,
        beatHoldTime: 40,
        beatDecayRate: 0.97,
        sampleURL: ""
    };

    function init()
    {
        AudioHandler.onUseMic();
        AudioHandler.onUseSample();
    }
    return {
        init: init,
        audioParams: audioParams,
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
        document.addEventListener('drop', onDocumentDrop, false);
        document.addEventListener('dragover', onDocumentDragOver, false);
        AudioHandler.init();
        ControlsHandler.init();
        update();
    }

    function update()
    {
        requestAnimationFrame(update);
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
$(document).ready(function ()
{
    UberVizMain.init();
});
MAX_DEPTH = 128;     
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
            x: randomRange(-50, 50),
            y: randomRange(-50, 50),
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
            stars[i].z -= 0.05;
        }
        else if (!isPlayingAudio)
        {
            stars[i].z -= 0;
        }
        else
        {
            stars[i].z -= 0.02;
        }
        if (stars[i].z <= 0)
        {   
            stars[i].x = randomRange(-50, 50);          
            stars[i].y = randomRange(-50, 50);          
            stars[i].z = MAX_DEPTH;        
        }         
        var k  = 128.0 / stars[i].z;        
        var px = stars[i].x * k + halfWidth;        
        var py = stars[i].y * k + halfHeight;         
        if (px >= 0 && px <= canvas2.width && py >= 0 && py <= canvas2.height)
        {          
            var size = (1 - stars[i].z / 32.0) * 4;          
            var shade = parseInt((1 - stars[i].z / 32.0) * 255);          
            ctx2.fillStyle = "rgba(" + shade + "," + shade + "," + shade +
                ",0.8)";          
            ctx2.fillRect(px, py, size, size);        
        }      
    }    
}