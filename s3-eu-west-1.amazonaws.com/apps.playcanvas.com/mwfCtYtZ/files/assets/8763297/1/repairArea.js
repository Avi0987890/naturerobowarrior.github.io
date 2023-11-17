var RepairArea = pc.createScript('repairArea');

RepairArea.attributes.add('id', {
    type: 'number',
    default: 0
});

// initialize code called once per entity
RepairArea.prototype.initialize = function() {
    if (!pc.repairs) {
        pc.repairs = [];
        pc.repairAreas = [];
    }
    pc.repairs[this.id] = this;
    
    var pos = this.entity.getPosition();
    var scale = this.entity.getLocalScale();
    pc.repairAreas[this.id] = {x:pos.x, z:pos.z, sx:scale.x, sz:scale.z, t:0};
};

// update code called every frame
RepairArea.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// RepairArea.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/
// 
// 
