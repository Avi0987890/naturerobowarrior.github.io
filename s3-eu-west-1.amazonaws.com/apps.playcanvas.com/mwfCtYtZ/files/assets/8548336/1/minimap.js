var Minimap = pc.createScript('minimap');

Minimap.attributes.add('floorObject', {
    type: 'string'
});

Minimap.attributes.add('texBg', {
    type: 'asset'
});

Minimap.attributes.add('texCpoint', {
    type: 'asset'
});

Minimap.attributes.add('texPlayer', {
    type: 'asset'
});

Minimap.prototype.findByName = function(name) {
    var meshes = this.app.scene.drawCalls;
    for(var i=0; i<meshes.length; i++) {
        if (meshes[i].node && meshes[i].node.name === name) {
            return meshes[i];
        }
    }
    return null;
};

// initialize code called once per entity
Minimap.prototype.postInitialize = function() {
    var tex = new pc.Texture(this.app.graphicsDevice, {
        width: 256,
        height: 256,
        mipmaps: false,
        format: pc.PIXELFORMAT_R8_G8_B8_A8
    });
    var rt = new pc.RenderTarget({
        colorBuffer: tex
    });
    this.rt = rt;
    //this.entity.camera.renderTarget = rt;
    //this.entity.camera.aspectRatio = 1;
    this.tex = tex;
    this.mat = this.app.root.findByName("minimap quad").model.model.meshInstances[0].material;
    this.mat.emissiveMap = this.tex;
    this.mat.opacityMap = this.tex;
    this.mat.opacityMapChannel = 'a';
    this.mat.update();
    
    
    var obj = this.findByName(this.floorObject);
    var aabb = obj.aabb;
    var min = aabb.getMin();
    this.bounds = new pc.Vec4(1.0/(aabb.halfExtents.x*2), 1.0/(aabb.halfExtents.z*2), min.x, min.z);
    var bounds = this.bounds;
        
    var size = this.tex.width;
    var quadSize = 16;//7.5 * 1.5;
    var quadWidth = (quadSize / (aabb.halfExtents.x*2)) * size;
    var quadHeight = (quadSize / (aabb.halfExtents.z*2)) * size;
    this.rect = new pc.Vec4(0, 0, quadWidth, quadHeight);
    
    var vs = pc.shaderChunks.fullscreenQuadVS;
    var ps = this.app.assets.find("drawMinimapCpointPS").resource;
    this.shader = pc.shaderChunks.createShaderFromCode(this.app.graphicsDevice, vs, ps, "minimapCpoint");
    
    //var point = this.app.root.findByName("navmesh_vis_point");
    var cpoints = pc.captureTowers;
    var cpoint, clone;
    var pos;
    //this.points = [];
    this.pointRect = [];
    this.pointColor = [];
    for(var id in cpoints) {
        if (!cpoints.hasOwnProperty(id)) continue;
        cpoint = cpoints[id].entity;
        //clone = point.clone();
        //point.getParent().addChild(clone);
        pos = cpoint.getPosition();
        //clone.setLocalPosition(pos.x, 1, pos.z);
        //this.points[id] = clone.model.meshInstances[0];
        this.pointColor[id] = new pc.Vec3(1,1,1);//0.2, 0.2, 0.2);
        //this.points[id].setParameter("material_emissive", this.pointColor[id].data);
        cpoints[id].minimapColor = this.pointColor[id];
        
        this.pointRect[id] = new pc.Vec4();
        this.pointRect[id].x = 1.0 - (pos.x - bounds.z) * bounds.x;
        this.pointRect[id].y = (pos.z - bounds.w) * bounds.y;
        this.pointRect[id].x = this.pointRect[id].x * size - this.rect.z*0.5;
        this.pointRect[id].y = this.pointRect[id].y * size - this.rect.w*0.5;
        this.pointRect[id].z = this.rect.z;
        this.pointRect[id].w = this.rect.w;
    }
    
    this.rect.z *= 0.5;
    this.rect.w *= 0.5;
    
    //point.setLocalScale(5,1,5);
    //this.point = point;
    this.client = this.app.root.findByName("Root").script.client;
    
    this.screenQuadAnchor = this.app.root.findByName("minimap_onscreen");
    this.cam = this.app.root.findByName("Camera").camera;
        
    this.params = new pc.Vec4();
    this.constParams = this.app.graphicsDevice.scope.resolve("params");
    this.constSource = this.app.graphicsDevice.scope.resolve("source");
    
    this.clearOptions = {
        color: [0, 0, 0, 1],
        flags: pc.CLEARFLAG_COLOR
    };
    
    var ps2 = this.app.assets.find("drawMinimapBgPS").resource;
    this.shaderBg = pc.shaderChunks.createShaderFromCode(this.app.graphicsDevice, vs, ps2, "minimapBg");
    this.rectBg = new pc.Vec4(0, 0, this.tex.width, this.tex.height);
};

// update code called every frame
Minimap.prototype.update = function(dt) {
    var pos = this.screenQuadAnchor.getPosition();
    //this.cam.screenToWorld(0, this.app.graphicsDevice.height, 30, pos);
    this.cam.screenToWorld(this.app.graphicsDevice.width, this.app.graphicsDevice.height, 30, pos);
    this.screenQuadAnchor.setPosition(pos);

    var i;
    
    var device = this.app.graphicsDevice;
    var size = this.tex.width;
    device.setRenderTarget(this.rt);
    device.updateBegin();
    device.setViewport(0, 0, size, size);
    device.setScissor(0, 0, size, size);
    device.setDepthTest(false);
    device.setColorWrite(true, true, true, true);
    //device.clear(this.clearOptions);
    //return;
    
    this.constSource.setValue(this.texBg.resource);
    this.params.w = 0.55;//0.45;
    this.constParams.setValue(this.params.data);
    device.setBlending(false);
    pc.drawQuadWithShader(device, this.rt, this.shaderBg, this.rectBg, this.rectBg, true);
    
    var cpoints = this.pointRect;
    
    var bounds = this.bounds;
    device.setBlending(true);
    device.setBlendFunction(pc.BLENDMODE_SRC_ALPHA, pc.BLENDMODE_ONE_MINUS_SRC_ALPHA);
    //device.setColorWrite(true, true, true, true);
    this.params.w = 0;
    var t = pc.now();
    var cosT = Math.cos(t * 0.01);
    for(i in cpoints) {
        if (!cpoints.hasOwnProperty(i)) continue;
        if (t < pc.captureTowers[i].endTime && cosT < 0) continue;
        this.params.x = this.pointColor[i].x;
        this.params.y = this.pointColor[i].y;
        this.params.z = this.pointColor[i].z;
        this.constParams.setValue(this.params.data);
        this.constSource.setValue(this.texCpoint.resource);
        pc.drawQuadWithShader(device, this.rt, this.shader, cpoints[i], cpoints[i], true);
    }
    
    var model = playerModels[this.client.id];
    if (!model) return;
    pos = model.getLocalPosition();
    this.params.x = 124/255.0;
    this.params.y = 222/255.0;
    this.params.z = 216/255.0;
    var fwd = model.forward;
    this.params.w = Math.atan2(-fwd.x, -fwd.z);
    this.constParams.setValue(this.params.data);
    this.constSource.setValue(this.texPlayer.resource);
    var x = 1.0 - (pos.x - bounds.z) * bounds.x;
    var y = (pos.z - bounds.w) * bounds.y;
    this.rect.x = x * size - this.rect.z*0.5;
    this.rect.y = y * size - this.rect.w*0.5;
    pc.drawQuadWithShader(device, this.rt, this.shader, this.rect, this.rect, true);
    
    //this.mat = this.app.root.findByName("minimap quad").model.model.meshInstances[0].material;
    //this.mat.emissiveMap = this.tex;
    //this.mat.opacityMap = this.tex;
    //this.mat.opacityMapChannel = 'a';
    //this.mat.update();
};


// swap method called for script hot-reloading
// inherit your script state here
// Minimap.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/