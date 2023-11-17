var LoadShaders = pc.createScript('loadShaders');

LoadShaders.attributes.add('cache', { type: 'asset', assetType: 'text' });

// initialize code called once per entity
LoadShaders.prototype.initialize = function() {
    
    var device = this.app.graphicsDevice;
    var cache = device.programLib._cache;
    
    var data = this.cache.resource;
    var shaders = data.split("^SH^");
    for(var i=1; i<shaders.length; i++) {
        var str = shaders[i];
        
        var vsStart = str.indexOf("^VS^");
        var psStart = str.indexOf("^PS^");
        var atStart = str.indexOf("^AT^");
        
        var entry = str.substring(0, vsStart);
        if (cache[entry]) continue;
        
        var vsCode = str.substring(vsStart+4, psStart);
        var psCode = str.substring(psStart+4, atStart);
        var attribsString = str.substring(atStart+4, str.length);
        
        var a1 = attribsString.split(",");
        var attribs = {};
        for(var j=0; j<a1.length-1; j+=2) {
            attribs[a1[j]] = a1[j+1];
        }
        
        var def = {
                    vshader: vsCode,
                    fshader: psCode,
                    attributes: attribs
                  };
        
        cache[entry] = new pc.Shader(device, def);
        device.setShader(cache[entry]);
    }
    
};

// update code called every frame
LoadShaders.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// LoadShaders.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/