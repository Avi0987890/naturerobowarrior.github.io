var Capturetower = pc.createScript('capturetower');

Capturetower.attributes.add('id', {
    type: 'number',
    default: 0
});

var captureTime = 5000;
var teamColorVec = [
    (new pc.Vec3(255, 0, 43*0.25)).scale(1.0 / 255.0).scale(16),
    (new pc.Vec3(0, 255, 191)).scale(1.0 / 255.0).scale(16),
    (new pc.Vec3(0, 149*0.25, 255)).scale(1.0 / 255.0).scale(16),
    (new pc.Vec3(255, 159, 0)).scale(1.0 / 255.0).scale(16),
    (new pc.Vec3(255, 255, 255)).scale(1.0 / 255.0)
];

// initialize code called once per entity
Capturetower.prototype.initialize = function() {
    
    if (!pc.captureTowers) {
        pc.captureTowers = [];
        pc.capturePoints = [];
    }
    pc.captureTowers[this.id] = this;
    pc.capturePoints[this.id] = {x:this.entity.getPosition().x, z:this.entity.getPosition().z, ticksLeft:0};
    
    /*var meshes = this.entity.model.model.meshInstances;
    for(var i=0; i<meshes.length; i++) {
        if (meshes[i].node.name === "lamps") {
            this.lamps = meshes[i];
        } else if (meshes[i].node.name === "ray") {
            this.ray = meshes[i];
        }
    }*/
    
    this.decal = this.app.root.findByName("capturePointDecal" + this.id).model.meshInstances[0];
    //this.decal.setParameter("material_emissive", teamColorVec[4].data);
    this.decal.material.chunks.emissiveTexConstFloatPS = this.app.assets.find("emissiveCapturePointPS").resource;
    this.decal.material.update();
    this.decal.material.setParameter("texture_mask", this.app.assets.find("clockwise.png").resource);
    this.decal.setParameter("progress", 1);
    this.tintA = teamColorVec[4].clone();
    this.tintB = teamColorVec[4].clone();
    this.decal.setParameter("tintA", this.tintA.data);
    this.decal.setParameter("tintB", this.tintB.data);
    
    /*this.rayColor = new pc.Vec3(0.5, 0.5, 0.5);
    if (this.ray) {
        this.ray.setParameter("material_emissive", this.rayColor.data);
    }
    this.alpha = 0;
    this.startAlpha = 0;
    this.startRayColor = new pc.Vec3();

    this.lampTransform = new pc.Vec4(0.125, 0.125, -1, 0);
    this.lamps.setParameter("texture_emissiveMapTransform", this.lampTransform.data);
    this.startLampTransform = new pc.Vec4();*/
    
    //this.lamps.material.chunks.emissiveTexConstFloatPS = this.app.assets.find("emissiveLampsPS").resource;
    //this.lamps.material.update();
    
    this.teamA = -1; // current team
    this.teamB = -1; // team we're interpolating to
    this.teamMidTarget = -1; // mid-interpolated target
    this.teamMidLerp = 0;
    this.endTime = 0;
    this.lerpLength = captureTime;
    
    this.time = 0;
    //this.rayColorBright = new pc.Vec3();
};

Capturetower.prototype.setState = function(teamA, teamB, endTime) {
    //console.log("c: " + this.id +" "+teamB);
    
    //console.log("capture " + this.id + ": " + teamA + " -> " + teamB + ", left: " + ((endTime - pc.now())/1000)+"s");
    
    var oldteamB = this.teamB;
    
    this.teamA = teamA;
    this.teamB = teamB;
    this.endTime = endTime;
    /*this.startAlpha = this.alpha;
    this.startRayColor.copy(this.rayColor);
    this.startLampTransform.copy(this.lampTransform);*/
    
    /*if (teamB >= 0) {
        if (oldteamB >= 0) {
            this.tintA.copy(this.tintB);
        } else {
            this.tintA.copy(teamColorVec[4]);
        }
        this.tintB.copy(teamColorVec[teamB < 0 ? 4 : teamB]);
    }*/
    
    if (teamB >= 0) {
        this.tintA.copy(teamColorVec[oldteamB < 0 ? 4 : oldteamB]);
        this.tintB.copy(teamColorVec[teamB < 0 ? 4 : teamB]);
    } else {
        this.tintB.copy(teamColorVec[oldteamB < 0 ? 4 : oldteamB]);
        this.tintA.copy(teamColorVec[teamB < 0 ? 4 : teamB]);
    }
    //if (this.id===0) console.log(oldteamB+" "+teamB);
    //} else {
        //this.tintB.copy(teamColorVec[teamB < 0 ? 4 : teamB]);
        //this.tintA.copy(teamColorVec[4]);
    //}
    
    /*if (pc.now() >= endTime) {
        this.tintA.copy(teamColorVec[teamB < 0 ? 4 : teamB]);
        this.tintB.copy(teamColorVec[teamB < 0 ? 4 : teamB]);
    }*/
};

// update code called every frame
Capturetower.prototype.update = function(dt) {
    
    var endTime = this.endTime;
    //if (!endTime) return;
    
    var t = pc.now();
    var lerp;
    lerp = 1.0 - (endTime - t) / this.lerpLength;
    if (lerp > 1) {
        lerp = 1;
        //if (this.teamB >= 0) {
            this.teamA = this.teamB;
            this.minimapColor.copy(teamColorVec[this.teamA >= 0 ? this.teamA : 4]);
        //} else {
          //  this.tintB.copy(teamColorVec[4]);
            //this.teamB = -1;
            //this.minimapColor.copy(teamColorVec[4]);
        //}
        //this.lamps.setParameter("material_emissiveIntensity", 1);
    }
    
    if (this.teamB >= 0) {
        this.decal.setParameter("progress", lerp);
    } else {
        this.decal.setParameter("progress", 1.0 - lerp);
    }
    
    /*var targetAlpha = this.teamB >= 0 ? 0.7 : 0;
    this.alpha = pc.math.lerp(this.startAlpha, targetAlpha, lerp);
    if (this.ray) this.ray.setParameter("material_opacity", this.alpha);
    
    
    if (this.teamB >= 0) {
        this.rayColor.lerp(this.startRayColor, teamColorVec[this.teamB], lerp);
    }

    this.rayColorBright.copy(this.rayColor).scale(this.alpha * 4);
    this.decal.setParameter("material_emissive", this.rayColorBright.data);
    
    if (this.startLampTransform.z === -1) { // start -> end
        this.lampTransform.w = this.teamB * 0.125;
        this.lampTransform.z = this.teamB >= 0 ? (lerp * 2 - 1) : -1;
        
    } else { // start -> no team -> end
    
        if (lerp < 0.5) {
            lerp *= 2;
            this.lampTransform.z = pc.math.lerp(this.startLampTransform.z, -1, lerp);
        } else {
            lerp = lerp * 2 - 1;
            this.lampTransform.w = this.teamB * 0.125;
            this.lampTransform.z = this.teamB >= 0 ? (lerp * 2 - 1) : -1;
        }
        
    }*/
    
    //if (lerp < 1) {
      //  this.time += dt;
        //this.lamps.setParameter("material_emissiveIntensity", 1 + (Math.cos(this.time * 10)*0.5+0.5)*0.5);
    //}
    
    /*if (this.teamA === this.teamB && this.teamMidLerp === 0) {
        if (this.teamA < 0) {
            this.ray.setParameter("material_opacity", 0);
        } else {
            this.ray.setParameter("material_opacity", 0.7);
            this.rayColor.copy(teamColorVec[this.teamA]);
        }
        
    } else if (this.teamMidTarget < 0 || this.teamMidTarget === this.teamB) { // A -> B
        lerp = 1.0 - (endTime - t) / this.lerpLength;
        if (lerp > 1) lerp = 1;
        this.teamMidTarget = this.teamB;
        this.teamMidLerp = lerp;
        
        if (this.teamA < 0) {
            // no team -> team
            this.ray.setParameter("material_opacity", lerp * 0.7);
            this.rayColor.copy(teamColorVec[this.teamB]);
        } else if (this.teamB < 0) {
            // team -> no team
            this.ray.setParameter("material_opacity", (1.0 - lerp) * 0.7);
        } else {
            // team -> team
            this.rayColor.lerp(teamColorVec[this.teamA], teamColorVec[this.teamB], lerp);
        }
            
    } else { // midTarget -> no team -> team
        lerp = 1.0 - (endTime - t) / captureTime;
        if (lerp > 1) lerp = 1;
        var unlerp = this.teamMidLerp - lerp * 2;
        if (unlerp > 0) {
            this.ray.setParameter("material_opacity", unlerp * 0.7);
        } else {
            this.teamA = -1;
            this.teamMidTarget = -1;
            this.teamMidLerp = 0;
        }
    }*/
    
};

// swap method called for script hot-reloading
// inherit your script state here
// Capturetower.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/