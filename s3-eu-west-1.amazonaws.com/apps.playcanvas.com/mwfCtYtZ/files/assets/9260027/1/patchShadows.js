var PatchShadows = pc.createScript('patchShadows');

// initialize code called once per entity
PatchShadows.prototype.initialize = function() {
    pc.shaderChunks.shadowStandardGL2PS = this.app.assets.find("shadowTweakedGL2PS").resource;
};

// update code called every frame
PatchShadows.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// PatchShadows.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/