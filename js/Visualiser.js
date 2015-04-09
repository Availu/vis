var events = new Events();
var Visualiser = function ()
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

Stars.initStars();
Visualiser.init();

function extend()
{
    for (var i = 1; i < arguments.length; i++)
        for (var key in arguments[i])
            if (arguments[i].hasOwnProperty(key))
                arguments[0][key] = arguments[i][key];
    return arguments[0];
}

Config = extend(Config, localStorage) || Config;
Config.gain = parseInt(Math.pow(localStorage["gain"], 0.5) * 100) || 100;
Config.limitFPS = JSON.parse(Config.limitFPS);
Config.debug = JSON.parse(Config.debug);

var gui = new dat.GUI();
gui.closed = true;
gui.add(Config, 'limitFPS').name("Limit FPS").onChange(function (value)
{
    localStorage['limitFPS'] = value;
});
gui.add(Config, 'FPS', 1, 144).name("Maximum FPS").onChange(function (value)
{
    localStorage['FPS'] = value;
});
gui.add(Config, 'debug').name("Show Debug UI").onChange(function (value)
{
    localStorage['debug'] = value;
});
gui.add(Config, 'gain', 0, 100).name("Volume").onChange(function (value)
{
    gainNode.gain.value = Math.pow(parseInt(value) / parseInt(100), 2);
    localStorage["gain"] = gainNode.gain.value;
});
