var DynShadows = pc.createScript('dynShadows');

DynShadows.attributes.add('floorObject', {
    type: 'string'
});

DynShadows.prototype.findByName = function(name) {
    var meshes = this.app.scene.drawCalls;
    for(var i=0; i<meshes.length; i++) {
        if (meshes[i].node && meshes[i].node.name === name) {
            return meshes[i];
        }
    }
    return null;
};

// initialize code called once per entity
DynShadows.prototype.initialize = function() {
    var tex = new pc.Texture(this.app.graphicsDevice, {
        width: 512,
        height: 512,
        mipmaps: false,
        format: pc.PIXELFORMAT_R8_G8_B8_A8
    });
    this.rt = new pc.RenderTarget({
        colorBuffer: tex
    });
    this.tex = tex;
    this.clearOptions = {
        color: [1, 1, 1, 1],
        flags: pc.CLEARFLAG_COLOR
    };
    
    var obj = this.findByName(this.floorObject);
    var aabb = obj.aabb;
    var min = aabb.getMin();
    this.bounds = new pc.Vec4(1.0/(aabb.halfExtents.x*2), 1.0/(aabb.halfExtents.z*2), min.x, min.z);
    
    var vs = pc.shaderChunks.fullscreenQuadVS;
    var ps = this.app.assets.find("drawShadowBlobPS").resource;
    this.shader = pc.shaderChunks.createShaderFromCode(this.app.graphicsDevice, vs, ps, "shadowBlob");
    
    var size = this.tex.width;
    var aoSize = 7.5 * 0.5;
    var quadWidth = (aoSize / (aabb.halfExtents.x*2)) * size;
    var quadHeight = (aoSize / (aabb.halfExtents.z*2)) * size;
    this.rect = new pc.Vec4(0, 0, quadWidth, quadHeight);
    
    this.app.graphicsDevice.scope.resolve("texture_globalDynLight").setValue(this.tex);
    this.params = new pc.Vec4();
    this.constParams = this.app.graphicsDevice.scope.resolve("params");
    
    pc.shaderChunks.lightmapSinglePS = this.app.assets.find("lightmapDynLitPS").resource;
};

// update code called every frame
DynShadows.prototype.postUpdate = function(dt) {

    var i;
    var light, alpha;
    
    var device = this.app.graphicsDevice;
    var size = this.tex.width;
    device.setRenderTarget(this.rt);
    device.updateBegin();
    device.setViewport(0, 0, size, size);
    device.setScissor(0, 0, size, size);
    device.clear(this.clearOptions);
    
    var players = playerModels;
    if (!players) return;
    
    var pos, x, y;
    var bounds = this.bounds;
    device.setBlending(true);
    device.setBlendFunction(pc.BLENDMODE_DST_COLOR, pc.BLENDMODE_ZERO);
    device.setColorWrite(true, false, false, false);
    this.params.x = 1;
    this.params.y = 1;
    this.constParams.setValue(this.params.data);
    for(i in players) {
        if (!players.hasOwnProperty(i)) continue;
        pos = players[i].position;
        x = (pos.x - bounds.z) * bounds.x;
        y = (pos.z - bounds.w) * bounds.y;
        this.rect.x = x * size - this.rect.z*0.5;
        this.rect.y = y * size - this.rect.w*0.5;
        pc.drawQuadWithShader(device, this.rt, this.shader, this.rect, this.rect, true);
    }
    
    device.setColorWrite(false, true, false, false);
    var z = this.rect.z;
    var w = this.rect.w;
    for(i=0; i<lightEffects.list.length; i++) {
        light = lightEffects.list[i];
        if (light.time > 1) continue;
        light.time += dt * light.speed;
        alpha = 1 - Math.abs(light.time * 2 - 1);
        
        x = (light.x - bounds.z) * bounds.x;
        y = (light.z - bounds.w) * bounds.y;
        this.rect.x = x * size - this.rect.z*0.5*light.size;
        this.rect.y = y * size - this.rect.w*0.5*light.size;
        this.rect.z = z * light.size;
        this.rect.w = w * light.size;
        this.params.x = alpha;
        this.params.y = 0.25;
        this.constParams.setValue(this.params.data);
        pc.drawQuadWithShader(device, this.rt, this.shader, this.rect, this.rect, true);
    }
    this.rect.z = z;
    this.rect.w = w;
    
    //this.mat = this.app.root.findByName("minimap quad").model.model.meshInstances[0].material;
    //this.mat.emissiveMap = this.tex;
    //this.mat.update();
};

// swap method called for script hot-reloading
// inherit your script state here
// DynShadows.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/