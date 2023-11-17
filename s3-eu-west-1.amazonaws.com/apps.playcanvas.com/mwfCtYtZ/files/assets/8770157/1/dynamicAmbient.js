var DynamicAmbient = pc.createScript('dynamicAmbient');

DynamicAmbient.attributes.add('floorLightmap', {
    type: 'asset',
    assetType: 'texture'
});

DynamicAmbient.attributes.add('floorObject', {
    type: 'string'
});

DynamicAmbient.prototype.findByName = function(name) {
    var meshes = this.app.scene.drawCalls;
    for(var i=0; i<meshes.length; i++) {
        if (meshes[i].node && meshes[i].node.name === name) {
            return meshes[i];
        }
    }
    return null;
};

// initialize code called once per entity
DynamicAmbient.prototype.initialize = function() {
    //pc.shaderChunks.ambientConstantPS = this.app.assets.find("ambientDynFromLmPS").resource;
    pc.shaderChunks.lightDiffuseLambertPS = this.app.assets.find("ambientDynFromLmPS").resource;
    this.app.graphicsDevice.scope.resolve("texture_floorLightmap").setValue(this.floorLightmap.resource);
    
    var obj = this.findByName(this.floorObject);
    var aabb = obj.aabb;
    var min = aabb.getMin();
    var bounds = new pc.Vec4(-1.0/(aabb.halfExtents.x*2), 1.0/(aabb.halfExtents.z*2), min.x, min.z);
    this.app.graphicsDevice.scope.resolve("texture_floorBounds").setValue(bounds.data);
    
    var size = this.floorLightmap.resource.width;
    this.app.graphicsDevice.scope.resolve("texture_floorTexelSize").setValue(1.0 / size);
};

// update code called every frame
DynamicAmbient.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// DynamicAmbient.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/