var Spawn = pc.createScript('spawn');

Spawn.attributes.add('id', {
    type: 'number',
    default: 0
});

// initialize code called once per entity
Spawn.prototype.initialize = function() {
    if (!pc.spawns) {
        pc.spawns = [];
        pc.spawnAreas = [];
    }
    pc.spawns[this.id] = this;
    var pos = this.entity.getPosition();
    var scale = this.entity.getLocalScale();
    pc.spawnAreas[this.id] = {x:pos.x, z:pos.z, sx:scale.x, sz:scale.z};
};

// update code called every frame
Spawn.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// Spawn.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/