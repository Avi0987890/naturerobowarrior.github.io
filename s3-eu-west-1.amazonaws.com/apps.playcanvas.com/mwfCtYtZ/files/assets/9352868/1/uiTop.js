var UiTop = pc.createScript('uiTop');

// initialize code called once per entity
UiTop.prototype.initialize = function() {
    this.refWidth = 1280;
    this.app.graphicsDevice.on('resizecanvas', this._onCanvasResized, this);
    this._onCanvasResized(this.app.graphicsDevice.width, this.app.graphicsDevice.height);
};

UiTop.prototype._onCanvasResized = function(width, height) {
    var s = Math.max(width / this.refWidth, 1);
    this.entity.setLocalScale(s,s,s);
};

// swap method called for script hot-reloading
// inherit your script state here
// UiTop.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/