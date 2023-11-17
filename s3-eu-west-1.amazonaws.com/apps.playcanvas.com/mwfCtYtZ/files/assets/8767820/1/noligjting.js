var Nolighting = pc.createScript('noligjting');

Nolighting.attributes.add('lmObject', {
    type: 'string'
});

// initialize code called once per entity
Nolighting.prototype.initialize = function() {
    var meshes = this.entity.model.model.meshInstances;
    for(var i=0; i<meshes.length; i++) {
        if (meshes[i].node.name === this.lmObject) {
            meshes[i].mask = 0;
        }
    }
};

// update code called every frame
Nolighting.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// Nolighting.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/