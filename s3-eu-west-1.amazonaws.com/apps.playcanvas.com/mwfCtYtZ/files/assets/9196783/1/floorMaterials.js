var FloorMaterials = pc.createScript('floorMaterials');

// initialize code called once per entity
FloorMaterials.prototype.initialize = function() {
    
    pc.floorMaterials = this;
    
    this.aabbs = [];
    var children = this.entity.children;
    var aabb, bmin, bmax;
    for(var i=0; i<children.length; i++) {
        aabb = children[i].model.meshInstances[0].aabb;
        bmin = aabb.getMin();
        bmax = aabb.getMax();
        this.aabbs.push(bmin.x);
        this.aabbs.push(bmax.x);
        this.aabbs.push(bmin.z);
        this.aabbs.push(bmax.z);
    }
    
};

FloorMaterials.prototype.getMaterial = function(pos) {
    var x = pos.x;
    var z = pos.z;
    var aabbs = this.aabbs;
    var len = aabbs.length;
    for(var i=0; i<len; i += 4) {
        if (aabbs[i] < x && aabbs[i + 1] > x) {
            if (aabbs[i + 2] < z && aabbs[i + 3] > z) {
                return 1;
            }
        }
    }
    return 0;
};

// update code called every frame
//FloorMaterials.prototype.update = function(dt) {
    
//};

// swap method called for script hot-reloading
// inherit your script state here
// FloorMaterials.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/