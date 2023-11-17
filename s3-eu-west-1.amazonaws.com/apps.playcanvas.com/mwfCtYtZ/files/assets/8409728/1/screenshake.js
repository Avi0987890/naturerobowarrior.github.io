var Screenshake = pc.createScript('screenshake');

// initialize code called once per entity
Screenshake.prototype.initialize = function() {
    pc.shake = this;
    this.defaultPos = this.entity.getLocalPosition().clone();
    this.right = this.entity.right;
    this.up = this.entity.up;
    this.tmpVec = new pc.Vec3();
    this.tmpVec2 = new pc.Vec3();
    this.prevPos = this.defaultPos.clone();
    this.power = 0;
    this.maxPower = 1;//.2;
    this.multiplier = 0.5;
};

// update code called every frame
Screenshake.prototype.update = function(dt) {
    var pos = this.entity.getLocalPosition();

    if (this.power > 0) {
        var pow = this.power * this.power * this.power * this.multiplier;
        //pow *= 1000;
        
        var offset = (Math.random() * 2 - 1) * pow;
        this.tmpVec.copy(this.right).scale(offset);
        
        offset = (Math.random() * 2 - 1) * pow;
        this.tmpVec2.copy(this.up).scale(offset).add(this.tmpVec);

        //pos.copy(this.defaultPos);
            //this.tmpVec2.scale(dt * 50);
        pos.add(this.tmpVec2); // actually looks better when constantly ofsetting, but to need to lerp back
        
        /*this.tmpVec.copy(pos).sub(this.prevPos);
        this.prevPos.copy(pos);
        
        this.tmpVec2.scale(dt * dt);
        pos.add(this.tmpVec2);//.add(this.tmpVec);*/
        
        //this.entity.setLocalPosition(pos);
    }
    this.power -= dt;
    if (this.power < 0) this.power = 0;
    
    pos.lerp(pos, this.defaultPos, dt * (1.0 - this.power) * 4);
    
    this.entity.setLocalPosition(pos);
};

Screenshake.prototype.shake = function(power, limit) {
    if (!limit) {
        this.power += power;
    } else if (this.power < limit) {
        this.power += power;
        if (this.power > limit) this.power = limit;
    }
    if (this.power > this.maxPower) this.power = this.maxPower;
};

// swap method called for script hot-reloading
// inherit your script state here
// Screenshake.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/