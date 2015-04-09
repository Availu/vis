var limitFps = true;
var debug = false;
var fps = 60;
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

var $ = document.querySelector.bind(document);
var ctx = $("#canvas").getContext("2d");
var canvas = $("#canvas");
var background = $("#bg");
var fog_background = $("#bg_fog");
fog_background.width = window.innerWidth;
fog_background.height = window.innerHeight;
fog_background.style.width = window.innerWidth;
fog_background.style.width = window.innerHeight;

var Smoke = new(function ()
{
    var prev = [];
    var particles = [];
    // The amount of particles to render
    var particleCount = 15;
    // The maximum velocity in each direction
    var maxVelocity = 1;
    // Create an image object (only need one instance)
    var imageObj = new Image();
    // Once the image has been downloaded then set the image on all of the particles
    imageObj.onload = function ()
    {
        particles.forEach(function (particle)
        {
            particle.setImage(imageObj);
        });
    };

    // Where to set an artificial y-axis boundary.
    var cutoff = (fog_background.height / 10) * 7;

    // Once the callback is arranged then set the source of the image
    imageObj.src = "smoke2.png";
    // A function to create a particle object.

    function Particle(context)
    {
        // Set the initial x and y positions
        this.x = 0;
        this.y = 0;
        // Set the initial velocity
        this.xVelocity = 0;
        this.yVelocity = 0;
        // Set the radius
        this.radius = 5;
        // Store the context which will be used to draw the particle
        this.context = context;
        // The function to draw the particle on the canvas.
        this.draw = function ()
        {
            // If an image is set draw it
            if (this.image)
            {
                this.context.drawImage(this.image, this.x - (this.image.width /
                    2), this.y - (this.image.height / 2));
                // If the image is being rendered do not draw the circle so break out of the draw function
                return;
            }
            // Draw the circle as before, with the addition of using the position and the radius from this object.
            this.context.beginPath();
            this.context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
            this.context.fillStyle = "rgba(0, 255, 255, 1)";
            this.context.fill();
            this.context.closePath();
        };
        // Update the particle.
        this.update = function ()
        {
            // Update the position of the particle with the addition of the velocity.
            this.x += this.xVelocity;
            this.y += this.yVelocity;
            // Check if has crossed the right edge
            if (this.x >= fog_background.width)
            {
                this.xVelocity = -this.xVelocity;
                this.x = fog_background.width;
            }
            // Check if has crossed the left edge
            else if (this.x <= 0)
            {
                this.xVelocity = -this.xVelocity;
                this.x = 0;
            }
            // Check if has crossed the bottom edge
            if (this.y >= cutoff)
            {
                this.yVelocity = -this.yVelocity;
                this.y = cutoff;
            }
            // Check if has crossed the top edge
            else if (this.y <= 0)
            {
                this.yVelocity = -this.yVelocity;
                this.y = 0;
            }
        };
        // A function to set the position of the particle.
        this.setPosition = function (x, y)
        {
            this.x = x;
            this.y = y;
        };
        // Function to set the velocity.
        this.setVelocity = function (x, y)
        {
            this.xVelocity = x;
            this.yVelocity = y;
        };
        this.setImage = function (image)
        {
            this.image = image;
        }
    }

    var context_fog;
    context_fog = fog_background.getContext('2d');
    for (var i = 0; i < particleCount; ++i)
    {
        var particle = new Particle(context_fog);
        // Set the position to be inside the canvas bounds
        particle.setPosition(generateRandom(0, fog_background.width), generateRandom(0,
            cutoff));
        // Set the initial velocity to be either random and either negative or positive
        particle.setVelocity(generateRandom(-maxVelocity, maxVelocity),
            generateRandom(-maxVelocity, maxVelocity));
        particles.push(particle);
    }

    this.initSmoke = function ()
    {
        if (fog_background.getContext)
        {
            for (var i = 0; i < particleCount; ++i)
            {
                var particle = particles[i];
                if (particle.x !== 0 && particle.y !== 0 && prev.length > 0)
                {
                    particle.setPosition(particle.x * (fog_background.width / prev[0]), particle.y * (fog_background.height / prev[1]));
                }
                else
                {
                    particle.setPosition(generateRandom(0, fog_background.width),
                        generateRandom(0, cutoff));
                    particle.setVelocity(generateRandom(-maxVelocity, maxVelocity),
                        generateRandom(-maxVelocity, maxVelocity));
                }
            }
        }
        else
        {
            alert("Please use a modern browser");
        }
    }

    this.drawSmoke = function ()
    {
        context_fog.fillStyle = "rgba(0, 0, 0, 0.5)";
        context_fog.fillRect(0, 0, fog_background.width, fog_background.height);
        particles.forEach(function (particle)
        {
            particle.draw();
        });
    }

    this.updateSmoke = function ()
    {
        particles.forEach(function (particle)
        {
            particle.update();
        });
    }
})();
var Stars = new(function Stars()
{
    var MAX_DEPTH = Math.pow(2, 5);     
    var ctx2 = background.getContext("2d");    
    var stars = new Array(Math.pow(2, 8));

    this.initStars = function ()
    {      
        for (var i = 0; i < stars.length; i++)
        {        
            stars[i] = {          
                x: generateRandom(-75, 75),
                y: generateRandom(-75, 75),
                z: generateRandom(1, MAX_DEPTH)         
            }      
        }    
    };

    this.loopStars = function ()
    {      
        var halfWidth  = background.width / 2;      
        var halfHeight = background.height / 2;       
        ctx2.fillStyle = "rgba(0,0,0,0.5)";      
        ctx2.fillRect(0, 0, background.width, background.height);   
        for (var i = 0; i < stars.length; i++)
        {   
            if (AudioHandler.beatTime() < 6 && AudioHandler.gotBeat() && AudioHandler.isPlayingAudio()) 
            { 
                stars[i].z -= 0.025;
            }
            else if (!AudioHandler.isPlayingAudio())
            {
                stars[i].z -= 0;
            }
            else
            {
                stars[i].z -= 0.01;
            }
            if (stars[i].z <= 0)
            {   
                stars[i].x = generateRandom(-75, 75);          
                stars[i].y = generateRandom(-75, 75);          
                stars[i].z = MAX_DEPTH;        
            }         
            var k  = 128.0 / stars[i].z;        
            var px = stars[i].x * k + halfWidth;        
            var py = stars[i].y * k + halfHeight;         
            if (px >= 0 && px <= background.width && py >= 0 && py <= background.height)
            {          
                var size = (1 - stars[i].z / 32.0) * 4;          
                ctx2.fillStyle = "rgba(255,255,255," + (size / 4) +
                    ")";
                ctx2.fillRect(px, py, size, size);        
            }      
        }
    };
})();

doResizeStuff();

function generateRandom(min, max)
{
    return Math.random() * (max - min) + min;
}

Smoke.initSmoke();

function doResizeStuff()
{
    canvas.width = window.innerWidth - 75;
    background.width = window.innerWidth;
    background.height = window.innerHeight;
    background.style.width = window.innerWidth;
    background.style.width = window.innerHeight;
    prev = [fog_background.width, fog_background.height];
    fog_background.width = window.innerWidth;
    fog_background.height = window.innerHeight;
    fog_background.style.width = window.innerWidth;
    fog_background.style.width = window.innerHeight;
    Smoke.initSmoke();
}
window.onresize = doResizeStuff

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
    /* var gotBeat = false;
    var isPlayingAudio = false;
    var beatTime = 0;
    var bpmTime = 0;
    var ratedBPMTime = 0; */
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
        gotBeat: function()
        {
            return gotBeat;
        },
        isPlayingAudio: function()
        {
            return isPlayingAudio;
        },
        beatTime: function()
        {
            return beatTime;
        },
    };
}();

function Events(e)
{
    var t = {},
        n, r, i, s = Array;
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
    Stars.initStars();
})();
