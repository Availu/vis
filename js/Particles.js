var $ = document.querySelector.bind(document);
var ctx = $("#canvas").getContext("2d");
var canvas = $("#canvas");
var background = $("#bg");
var fog_background = $("#bg_fog");
fog_background.width = window.innerWidth;
fog_background.height = window.innerHeight;
fog_background.style.width = window.innerWidth;
fog_background.style.width = window.innerHeight;

function generateRandom(min, max)
{
    return Math.random() * (max - min) + min;
}
var Smoke = new(function ()
{
    var prev = [];
    var particles = [];
    var particleCount = 15;
    var maxVelocity = 1;
    var imageObj = new Image();
    imageObj.onload = function ()
    {
        particles.forEach(function (particle)
        {
            particle.setImage(imageObj);
        });
    };

    var cutoff = (fog_background.height / 10) * 7;

    imageObj.src = "smoke2.png";

    function Particle(context)
    {
        this.x = 0;
        this.y = 0;
        this.xVelocity = 0;
        this.yVelocity = 0;
        this.radius = 5;
        this.context = context;
        this.draw = function ()
        {
            if (this.image)
            {
                this.context.drawImage(this.image, this.x - (this.image.width /
                    2), this.y - (this.image.height / 2));
                return;
            }
            this.context.beginPath();
            this.context.arc(this.x, this.y, this.radius, 0, 2 * Math.PI, false);
            this.context.fillStyle = "rgba(0, 255, 255, 1)";
            this.context.fill();
            this.context.closePath();
        };
        this.update = function ()
        {
            this.x += this.xVelocity;
            this.y += this.yVelocity;
            if (this.x >= fog_background.width)
            {
                this.xVelocity = -this.xVelocity;
                this.x = fog_background.width;
            }
            else if (this.x <= 0)
            {
                this.xVelocity = -this.xVelocity;
                this.x = 0;
            }
            if (this.y >= cutoff)
            {
                this.yVelocity = -this.yVelocity;
                this.y = cutoff;
            }
            else if (this.y <= 0)
            {
                this.yVelocity = -this.yVelocity;
                this.y = 0;
            }
        };
        this.setPosition = function (x, y)
        {
            this.x = x;
            this.y = y;
        };
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
        particle.setPosition(generateRandom(0, fog_background.width), generateRandom(0,
            cutoff));
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
window.onresize = doResizeStuff;

doResizeStuff();
Smoke.initSmoke();
