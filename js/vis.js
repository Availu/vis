if (!window.AudioContext)
{
    if (!window.webkitAudioContext)
    {
        alert('no audiocontext found, update your browser yo');
    }
    window.AudioContext = window.webkitAudioContext;
}
var context = new AudioContext();
var audioBuffer;
var sourceNode;
var analyser;
var javascriptNode;
var ctx = $("#canvas").get()[0].getContext("2d");
setupAudioNodes();

function setupAudioNodes()
{
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

function loadFromFile(file)
{
    var reader = new FileReader();
    reader.onload = function (e)
    {
        var wrapper = function (f)
        {
            return function (buffer)
            {
                playSound(buffer, f);
            }
        }
        context.decodeAudioData(e.target.result, wrapper(file), onError);
    }

    reader.readAsArrayBuffer(file);
}

function playSound(buffer, f)
{
    ID3.loadTags(f, function ()
    {
        var tags = ID3.getAllTags(f);
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
            $(".art img").attr('src', "data:" + image.format + ";base64," +
                window.btoa(base64String));
        }
    },
    {
        tags: ["artist", "title", "picture"],
        dataReader: FileAPIReader(f)
    });
    sourceNode.buffer = buffer;
    sourceNode.start(0);
    $("#hue").hide();
}

function onError(e)
{
    console.log(e);
}
javascriptNode.onaudioprocess = function ()
{
    var array = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(array);
    ctx.clearRect(0, 0, 1000, 325);
    ctx.fillStyle = "#f61a03"; //bar color
    drawSpectrum(array);
}

function drawSpectrum(array)
{
    for (var i = 0; i < (array.length); i++)
    {
        var value = array[i];
        ctx.fillRect(i * 17, 325 - value, 10, 325); //1st value = bar side margins
    }
};