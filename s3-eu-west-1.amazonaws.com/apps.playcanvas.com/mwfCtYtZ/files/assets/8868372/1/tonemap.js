var Tonemap = pc.createScript('tonemap');

// initialize code called once per entity
Tonemap.prototype.initialize = function() {
    
    pc.shaderChunks.tonemappingFilmicPS = this.app.assets.find("tonemappingPS").resource;
    
};

// update code called every frame
Tonemap.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// Tonemap.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/