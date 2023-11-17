var TransparentShader = pc.createScript('transparentShader');

// initialize code called once per entity
TransparentShader.prototype.initialize = function() {
    
    var meshInstance = this.entity.model.meshInstances[0];
    var mat = meshInstance.material;
    mat.chunks.endPS = this.app.assets.find("endTransparentPS").resource;
    //mat.redWrite = mat.greenWrite = mat.blueWrite = mat.alphaWrite = false;
    //meshInstance.layer++;
    
    //meshInstance.updateKey = function () {
        //this.key = pc._getDrawcallSortKey(this.layer, mat.blendType, false, -1); // force drawing after before skybox
    //};
    
};

// update code called every frame
TransparentShader.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// TransparentShader.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/