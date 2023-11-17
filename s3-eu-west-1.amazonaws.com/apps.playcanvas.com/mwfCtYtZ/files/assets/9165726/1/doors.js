var Doors = pc.createScript('doors');

var DOOR_CLOSED = 0;
var DOOR_OPEN = 1;
var DOOR_MOVING = 2;

// initialize code called once per entity
Doors.prototype.initialize = function() {
    
    pc.doors = this;
    
    this.doorOpenY = -4.005;
    this.doorSpeed = 10;
    
    this.doorMeshInstances = [];
    this.doorState = [];
    this.doorStateTarget = [];
    this.doorLerpA = [];
    this.doorLerpLength = [];
    this.doorLerpEnd = [];
    this.doorDecal = [];
    
    var meshes = this.entity.model.meshInstances;
    var id;
    for(var i=0; i<meshes.length; i++) {
        if (meshes[i].node.name.substr(0,4) === "door") {
            console.log(meshes[i].node.name);
            id = parseInt(meshes[i].node.name.substr(4,1));
            this.doorMeshInstances[id] = meshes[i];
            this.doorState[id] = DOOR_CLOSED;
            this.doorStateTarget[id] = DOOR_CLOSED;
            this.doorLerpEnd[id] = 0;
            this.doorLerpLength[id] = 0;
            this.doorClosedY = meshes[i].node.getPosition().y;
            this.doorLerpA[id] = this.doorClosedY;
            
            this.open(id);
            
        } else if (meshes[i].node.name.substr(0,4) === "Plan") {
            id = parseInt(meshes[i].node.parent.name.substr(4,1));
            this.doorDecal[id] = meshes[i];
            
        }
    }
    
};

Doors.prototype.open = function(id) {
    this.doorStateTarget[id] = DOOR_OPEN;
    this.doorState[id] = DOOR_MOVING;
    var y = this.doorMeshInstances[id].node.getPosition().y;
    var diff = Math.abs(this.doorOpenY - y);
    this.doorLerpA[id] = y;
    this.doorLerpLength[id] = (diff / this.doorSpeed) * 1000;
    this.doorLerpEnd[id] = pc.now() + this.doorLerpLength[id];
    if (colModels.level) colModels.level.setStateByName(id, false);
};

Doors.prototype.close = function(id) {
    this.doorStateTarget[id] = DOOR_CLOSED;
    this.doorState[id] = DOOR_MOVING;
    var y = this.doorMeshInstances[id].node.getPosition().y;
    var diff = Math.abs(this.doorClosedY - y);
    this.doorLerpA[id] = y;
    this.doorLerpLength[id] = (diff / this.doorSpeed) * 1000;
    this.doorLerpEnd[id] = pc.now() + this.doorLerpLength[id];
    if (colModels.level) colModels.level.setStateByName(id, true);
};

Doors.prototype.setNotification = function(id, state) {
    this.doorDecal[id].visible = state;
};

// update code called every frame
Doors.prototype.update = function(dt) {
  
    var a, b, c;
    var t = pc.now();
    var pos;
    for(var i=0; i<this.doorMeshInstances.length; i++) {
        if (this.doorState[i] !== this.doorStateTarget[i]) {
            a = this.doorLerpA[i];
            b = this.doorStateTarget[i] === DOOR_OPEN ? this.doorOpenY : this.doorClosedY;
            c = (this.doorLerpEnd[i] - t) / this.doorLerpLength[i];
            if (c <= 0) c = 0;
            pos = this.doorMeshInstances[i].node.getPosition();
            pos.y = pc.math.lerp(b, a, c);
            this.doorMeshInstances[i].node.setPosition(pos);
            if (c === 0) this.doorState[i] = this.doorStateTarget[i];
        }
    }
    
};

// swap method called for script hot-reloading
// inherit your script state here
// Doors.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/