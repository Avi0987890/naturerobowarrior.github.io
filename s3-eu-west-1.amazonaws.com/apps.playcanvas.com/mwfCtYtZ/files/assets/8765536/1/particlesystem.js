var Particlesystem = pc.createScript('particlesystem');

Particlesystem.attributes.add('trailCount', {
    type: 'number',
    default: 32
});
Particlesystem.attributes.add('quadsPerTrail', {
    type: 'number',
    default: 32
});
Particlesystem.attributes.add('speed', {
    type: 'number',
    default: 1
});
Particlesystem.attributes.add('gravityForce', {
    type: 'number',
    default: -0.2
});
Particlesystem.attributes.add('quadSpacing', {
    type: 'number',
    default: 0.1
});
Particlesystem.attributes.add('endTime', {
    type: 'number',
    default: 3
});
Particlesystem.attributes.add('endTimeBlob', {
    type: 'number',
    default: 7
});
Particlesystem.attributes.add('size', {
    type: 'number',
    default: 7
});
Particlesystem.attributes.add('trailRandomness', {
    type: 'number',
    default: 0
});

// initialize code called once per entity
Particlesystem.prototype.initialize = function() {
    pc.fireworkParticles = this;
    
    var app = this.app;
    var pos = [];
    var normal = [];
    var indices = [];
    var i, j, k;
    var trailCount = this.trailCount;
    var quadsPerTrail = this.quadsPerTrail;
    var vec = new pc.Vec3();
    var offset = 0;
    var timeOffset;
    var trailTimeOffset;
    var quadRandom;
    for(i=0; i<trailCount; i++) {

        vec.x = Math.random() * 2 - 1;
        vec.y = Math.random() * 2 - 1;
        vec.z = Math.random() * 2 - 1;
        vec.normalize();

        trailTimeOffset = pc.math.lerp(0, Math.random() * quadsPerTrail * this.quadSpacing, this.trailRandomness);

        for(j=0; j<quadsPerTrail; j++) {
            timeOffset = j * this.quadSpacing - trailTimeOffset;
            quadRandom = Math.random();
            pos.push(-quadRandom); pos.push(-0.5); pos.push(timeOffset);
            pos.push(quadRandom); pos.push(-0.5); pos.push(timeOffset);
            pos.push(quadRandom); pos.push(0.5); pos.push(timeOffset);
            pos.push(-quadRandom); pos.push(0.5); pos.push(timeOffset);
            for(k=0; k<4; k++) {
                normal.push(vec.x); normal.push(vec.y); normal.push(vec.z);
            }
            indices.push(offset); indices.push(offset + 1); indices.push(offset + 2);
            indices.push(offset + 2); indices.push(offset + 3); indices.push(offset);
            offset += 4;
        }
    }
    var device = app.graphicsDevice;
    var mesh = pc.scene.procedural.createMesh(device, pos, {normals:normal, indices:indices});

    var material = new pc.Material();
    material.cullMode = pc.CULLFACE_NONE;
    material.alphaWrite = false;
    material.blend = true;
    material.blendType = pc.BLEND_ADDITIVE;
    material.depthWrite = false;
    //    material.depthWrite = true;


    /*pc.shaderChunks.collectAttribs = function (vsCode) {
        var attribs = {};
        var attrs = 0;

        var found = vsCode.indexOf("attribute");
        while (found >= 0) {
            var endOfLine = vsCode.indexOf(';', found);
            var startOfAttribName = vsCode.lastIndexOf(' ', endOfLine);
            var attribName = vsCode.substr(startOfAttribName + 1, endOfLine - (startOfAttribName + 1));

            if (attribName == "aPosition") {
                attribs.aPosition = pc.SEMANTIC_POSITION;
            } else if (attribName == "vertex_position") {
                attribs.vertex_position = pc.SEMANTIC_POSITION;
            } else if (attribName == "vertex_normal") {
                attribs.vertex_normal = pc.SEMANTIC_NORMAL;
            } else {
                attribs[attribName] = "ATTR" + attrs;
                attrs++;
            }

            found = vsCode.indexOf("attribute", found + 1);
        }
        return attribs;
    };*/
    
    this.color = new pc.Vec4(1,0.6,0,1);
    
    material.setShader( pc.shaderChunks.createShaderFromCode(device, app.assets.find("particleVS").resource, app.assets.find("particlePS").resource, "particleRobo") );
    this.material = material;
    this.material.setParameter("gravityForce", this.gravityForce);
    this.material.setParameter("invEndTime", 1.0 / (quadsPerTrail * this.quadSpacing));// this.endTime);
    this.material.setParameter("color", this.color.data);
    this.material.setParameter("size", this.size);
    //this.reset();

    this.material.setParameter("time", 0);
    this.material.setParameter("globalFade", 0);
    this.material.setParameter("globalFadeBlob", 0);
    this.material.setParameter("fadePow", 1);
    this.material.setParameter("globalFlicker", 0);

    //var instance = new pc.scene.MeshInstance(this.entity, mesh, material);
    var entity = this.app.root.findByName("firework");
    entity.model.model.meshInstances[0].mesh = mesh;
    entity.model.model.meshInstances[0].material = material;
    this.firework = entity;
    this.mesh = mesh;
    this.material = material; 
};

// update code called every frame
Particlesystem.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// Particlesystem.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/