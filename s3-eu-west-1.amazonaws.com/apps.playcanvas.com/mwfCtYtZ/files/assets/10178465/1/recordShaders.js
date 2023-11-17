var RecordShaders = pc.createScript('recordShaders');

// initialize code called once per entity
RecordShaders.prototype.initialize = function() {
    this.ext = this.app.graphicsDevice.gl.getExtension("WEBGL_debug_shaders");
};

RecordShaders.prototype.download = function(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
};


// update code called every frame
RecordShaders.prototype.update = function(dt) {
    
    if (this.app.keyboard.wasPressed(pc.KEY_TAB)) {
        //console.log("Recording the shader cache...");
        var data = "";
        var cache = pc.app.graphicsDevice.programLib._cache;
        for(var entry in cache) {
            if (cache.hasOwnProperty(entry)) {
                var def = cache[entry].definition;
                if (def.transformFeedback) continue;
                var vsCode = def.vshader;
                var fsCode = def.fshader;
                //var vsCode = this.ext.getTranslatedShaderSource(cache[entry].vshader);
                //var fsCode = this.ext.getTranslatedShaderSource(cache[entry].fshader);
                var attribs = def.attributes;
                data += "^SH^";
                data += entry;
                data += "^VS^";
                data += vsCode;
                data += "^PS^";
                data += fsCode;
                data += "^AT^";
                for(var a in attribs) {
                    if (attribs.hasOwnProperty(a)) {
                        data += a;
                        data += ",";
                        data += attribs[a];
                        data += ",";
                    }
                }
            }
        }
        //console.log(data);
        this.download("shaders.txt", data);
    }
    
};

// swap method called for script hot-reloading
// inherit your script state here
// RecordShaders.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/