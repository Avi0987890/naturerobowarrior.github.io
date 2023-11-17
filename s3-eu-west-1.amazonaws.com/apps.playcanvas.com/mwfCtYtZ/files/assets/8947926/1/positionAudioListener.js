var PositionAudioListener = pc.createScript('positionAudioListener');

// initialize code called once per entity
PositionAudioListener.prototype.initialize = function() {
    
};

// update code called every frame
PositionAudioListener.prototype.update = function(dt) {
    
    if (!pc.GAMECLIENT) return;
    var obj = playerModels[pc.GAMECLIENT.id];
    if (!obj) return;
    
    this.entity.setPosition(obj.getPosition());
    this.entity.setRotation(obj.getRotation());
    this.entity.rotate(0, 180, 0);
    
};

// swap method called for script hot-reloading
// inherit your script state here
// PositionAudioListener.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/