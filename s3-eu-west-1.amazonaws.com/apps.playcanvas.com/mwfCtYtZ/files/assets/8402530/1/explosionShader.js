var ExplosionShader = pc.createScript('explosionShader');

// initialize code called once per entity
ExplosionShader.prototype.initialize = function() {
  
    var vsCode = this.app.assets.find("expVS").resource;
    var psCode = this.app.assets.find("expPS").resource;
    
    var shader = pc.shaderChunks.createShaderFromCode(this.app.graphicsDevice, vsCode, psCode, "explosion");
    
    var mat = this.app.root.findByName("explosionSph").model.model.meshInstances[0].material;
    mat.updateShader = function() {
        this.shader = shader;
    };
    
    this.time = 0;
    this.mat = mat;
  
    pc.explosionShader = this;
};

// update code called every frame
ExplosionShader.prototype.update = function(dt) {
    this.time += dt;
    this.mat.setParameter("time", this.time);
};

// swap method called for script hot-reloading
// inherit your script state here
// ExplosionShader.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/