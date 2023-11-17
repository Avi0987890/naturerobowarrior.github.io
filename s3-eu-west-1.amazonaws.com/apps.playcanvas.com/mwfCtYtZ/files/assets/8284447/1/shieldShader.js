var ShieldShader = pc.createScript('shieldShader');

// initialize code called once per entity
ShieldShader.prototype.initialize = function() {
    
    var vsCode = this.app.assets.find("forceFieldVS").resource;
    var psCode = this.app.assets.find("forceFieldPS").resource;
    
    var shader = pc.shaderChunks.createShaderFromCode(this.app.graphicsDevice, vsCode, psCode, "shield");
    
    var mat = this.app.root.findByName("shield").model.model.meshInstances[0].material;
    mat.updateShader = function() {
        this.shader = shader;
    };
    
    this.time = 0;
    this.mat = mat;
};

// update code called every frame
ShieldShader.prototype.update = function(dt) {
    this.time += dt;
    this.mat.setParameter("time", this.time);
};

// swap method called for script hot-reloading
// inherit your script state here
// ShieldShader.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/