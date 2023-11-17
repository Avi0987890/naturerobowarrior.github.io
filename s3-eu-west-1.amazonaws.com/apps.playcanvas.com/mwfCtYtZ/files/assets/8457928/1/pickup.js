var Pickup = pc.createScript('pickup');

Pickup.attributes.add('id', {
    type: 'number',
    default: 0
});

Pickup.attributes.add('weapon', {
    type: 'number',
    default: 0
});

// initialize code called once per entity
Pickup.prototype.initialize = function() {
    if (!pc.pickups) {
        pc.pickups = [];
        pc.pickupData = [];
    }
    pc.pickups[this.id] = this;
    var pos = this.entity.getPosition();
    pc.pickupData[this.id] = {x: pos.x, z: pos.z, type: this.weapon};
};

// update code called every frame
Pickup.prototype.update = function(dt) {
    
    this.entity.rotate(0, dt*-50, 0);
    
};

// swap method called for script hot-reloading
// inherit your script state here
// Pickup.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/