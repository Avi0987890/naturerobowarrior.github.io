var Settings = pc.createScript('settings');

Settings.attributes.add('staticModelNames', {
    type: 'string',
    array: true
});

// initialize code called once per entity
Settings.prototype.initialize = function() {
    this.app.root.findByName("Sun dynamic").light.shadowResolution = 1700;
    
    var lowq = false;
    
    var i, j;
    
    var params = window.location.search.substr(1).split("&");
    for(i=0; i<params.length; i++) {
        if (params[i] === "lowq") {
            lowq = true;
        }
    }
    
    this.lmArray = [];
    
    if (lowq) {
        this.app.root.findByName("Sun dynamic").enabled = false;
        this.app.root.findByName("Sun static").enabled = true;
        this.app.root.findByName("level_baked_walls").model.lightmapped = true;
        this.app.root.findByName("level_baked_floor").model.lightmapped = true;
        
        // bugfix: remove LM
        for(i=0; i<this.staticModelNames.length; i++) {
            meshes = this.app.root.findByName(this.staticModelNames[i]).model.meshInstances;
            for(j=0; j<meshes.length; j++) {
                this.lmArray.push(meshes[j].material.lightMap);
                meshes[j].material.lightMap = null;
            }
        }
    }
    
    this.lowq = lowq;
    pc.gameSettings = this;
};

Settings.prototype.setLow = function() {
    if (this.lowq) return;
    
    var i, j;
    
    this.app.root.findByName("Sun dynamic").enabled = false;
    this.app.root.findByName("Sun static").enabled = true;
    this.app.root.findByName("level_baked_walls").model.lightmapped = true;
    this.app.root.findByName("level_baked_floor").model.lightmapped = true;

    // bugfix: remove LM
    for(i=0; i<this.staticModelNames.length; i++) {
        meshes = this.app.root.findByName(this.staticModelNames[i]).model.meshInstances;
        for(j=0; j<meshes.length; j++) {
            this.lmArray.push(meshes[j].material.lightMap);
            meshes[j].material.lightMap = null;
        }
    }
    
    var casters = this.app.scene.shadowCasters;
    var casters2 = [];
    for(i=0; i<casters.length; i++) {
        if (casters[i].node.getParent()) {
            casters2.push(casters[i]); // fix to not cast shadows from batches
        }
    }
    this.app.scene.shadowCasters = casters2;
    this.app.lightmapper.bake();
    this.app.scene.shadowCasters = casters;
    
    this.lowq = true;
};

Settings.prototype.fixShadows = function() {
    var casters = this.app.scene.shadowCasters;
    for(i=0; i<casters.length; i++) {
        if (!casters[i].node.getParent()) {
            casters[i].material.updateShader(this.app.graphicsDevice, this.app.scene); // fix huge shadow
        }
    }
};

Settings.prototype.setHigh = function() {
    if (!this.lowq) return;
    
    var i, j;
    
    this.app.root.findByName("Sun dynamic").enabled = true;
    this.app.root.findByName("Sun static").enabled = false;
    this.app.root.findByName("level_baked_walls").model.lightmapped = false;
    this.app.root.findByName("level_baked_floor").model.lightmapped = false;
    
    // get lm back
    var c = 0;
    for(i=0; i<this.staticModelNames.length; i++) {
        meshes = this.app.root.findByName(this.staticModelNames[i]).model.meshInstances;
        for(j=0; j<meshes.length; j++) {
            meshes[j].material.lightMap = this.lmArray[c];
            c++;
        }
    }
    this.lmArray.length = 0;
    
    this.app.lightmapper.bake();
    
    var self = this;
    setTimeout(function(){self.fixShadows();}, 100);
    
    this.lowq = false;
};

// swap method called for script hot-reloading
// inherit your script state here
// Settings.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/