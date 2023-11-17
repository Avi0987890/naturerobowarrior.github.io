var PatchFonts = pc.createScript('patchFonts');

// initialize code called once per entity
PatchFonts.prototype.initialize = function() {
    pc.shaderChunks.msdfPS = this.app.assets.find("msdfShadowPS").resource;
};

// update code called every frame
PatchFonts.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// PatchFonts.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/