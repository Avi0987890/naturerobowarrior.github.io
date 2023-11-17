var LoadCss = pc.createScript('loadCss');

// initialize code called once per entity
LoadCss.prototype.initialize = function() {
    var asset = this.app.assets.find("gameui").resource;
    var style = pc.createStyle(asset || "");
    document.head.appendChild(style);
};

// update code called every frame
LoadCss.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// LoadCss.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/