'use strict';
var Physics = pc.createScript('physics');

Physics.attributes.add('floorObject', {
    type: 'string'
});

var phEngine;
var phFps = 60;
var phBounciness = 0.5;
var phStiffness = 1.0;
var phFriction = 0.2;
var phSleepThreshold = 0.002;//0.001;
var phAwakeThreshold = 0.0002;//0.001;
var phDebug = true;
var phDebug2 = false;
var phMaxTicks = 10;

var phDelta = (1000.0 / phFps) / 1000.0;
var phGravityAccel = -9.81 * phDelta * phDelta;
var phBounceFactor = (1 + phBounciness) * 0.5;
var phPrevUpdate = 0;
var phTime = 0;

var phNumSleeping = 0;
var phNumKinematic = 0;
var phLinksUpdated = 0;
var phChecksPerformed = 0;
var phStaticChecksPerformed = 0;
var phLinkTime = 0;
var phCollisionTime = 0;

var phPos = [];
var phRadius = [];
var phState = [];
var phName = [];
var phUsed = [];
// 16 bits for cell index
// bit 17 = also occupies negative neighbour
// bit 18 = also occupies positive neighbour
var phCellX = [];
var phCellZ = [];
var phFlagNeg = 1 << 17;
var phFlagPos = 1 << 18;
var phMask16 = 0xFFFF;

var phColorRed = new pc.Vec3(1,0,0);
var phColorGreen = new pc.Vec3(0,1,0);

var phDeltaPos = [];
//var phPrevPos = [];
var phStaticObstacles = [];
var phStaticList = [];
var phStaticGrid = [];
var phWallsMinX, phWallsMinZ, phWallsMaxX, phWallsMaxZ;
var phAccel = [];
var phForceSleepCounter = [];
var phRbs = [null]; // define dummy RB for 0 index
var phDebugEntity = [];
var phLineEntities = [];
var phTriEntities = [];
var phRbIndex = [];
var phAngleConstraints = [];
var phDampings = [];
var phLevelCollision = [];

var PHSTATE_ACTIVE = 0;
var PHSTATE_SLEEP = 1;
var PHSTATE_KINEMATIC = 2;
var PHSTATE_ACTIVE2 = 3;

var phMinX = -70;
var phMaxX = 70;
var phMinZ = -60;//-85;
var phMaxZ = 60;//85;

var phCellSize = 10;
var phInvCellSize = 1.0 / 10;
var phMaxParticles = 1024;
var phMaxParticleInts = phMaxParticles / 32;
var phGridWidth = (phMaxX - phMinX) / phCellSize;
var phGridHeight = (phMaxZ - phMinZ) / phCellSize;
var phBitsInCell = new Uint32Array(phMaxParticleInts);
var phParticlesInCell = new Uint32Array(phMaxParticles);

var phTimeToForceSleep = 10;//5;

var phRows = [];
var phRowBits = [];
var phColumns = [];
var phColumnBits = [];

var phRay = new pc.Ray();
var phPickedPos = new pc.Vec3();
var phPickedNormal = new pc.Vec3();

var phRigidBody = function() {
    this.rangeStart = 0;
    this.rangeEnd = 0;
    this.linkLen = [];
    this.indexed = false;
    this.ids = null;
};

var phLineEntity = function() {
    this.startP = 0;
    this.endP = 0;
    this.entity = null;
    this.onlyDirection = false;
    this.up = null;
    this.right = null;
    this.scale = null;
};

var phTriEntity = function() {
    this.startP = 0;
    this.localMatrix = new pc.Mat4();
    this.entity = null;
};

var phAngleConstraint = function() {
    this.prt1 = 0;
    this.local2world = null;
    this.world2local = null;
    this.posAngle = 0;
    this.negAngle = 0;
    this.lock = false;
};

var phDamping = function() {
    this.id = 0;
    this.damp = 0;
    this.targetPos = new pc.Vec3();
};

phAngleConstraint.prototype.setMatrix = function(m) {
    this.local2world.copy(m);
    this.world2local.copy(m).invert();
};

Physics.prototype.addDamping = function() {
    var d = new phDamping();
    phDampings.push(d);
    return d;
};

Physics.prototype.removeDamping = function(damp) {
    phDampings.splice(phDampings.indexOf(damp), 1);
};

Physics.prototype._debugParticlesInCell = function(count) {
    var str = "";
    for(var i=0; i<count; i++) {
        str += phName[phParticlesInCell[i]]+" ";
    }
    console.log(str);
};

Physics.prototype.addParticle = function(x,y,z, radius, state, dontDebug, name) {
    var id = phUsed.indexOf(false);
    if (id < 0) id = phUsed.length;
    if (id === phMaxParticles) {
        console.error("Particle limit reached!");
    }
    
    phPos[id * 3] = x;
    phPos[id * 3 + 1] = y;
    phPos[id * 3 + 2] = z;
    
    phDeltaPos[id * 3] = 0;
    phDeltaPos[id * 3 + 1] = 0;
    phDeltaPos[id * 3 + 2] = 0;
    
    phAccel[id * 3] = 0;
    phAccel[id * 3 + 1] = phGravityAccel;
    phAccel[id * 3 + 2] = 0;
    
    phRadius[id] = radius;
    phState[id] = state === undefined ? PHSTATE_ACTIVE : state;
    phRbIndex[id] = 0;
    phLevelCollision[id] = false;
    phForceSleepCounter[id] = phTimeToForceSleep;
    
    phName[id] = name;
    phUsed[id] = true;
    
    if (phDebug2) dontDebug = false;
    if (phDebug) {
        if (dontDebug) {
            //phDebugEntity[id].push(null);
        } else {
            if (!phDebugEntity[id]) {
                var src = this.app.root.findByName("phParticle");
                var sph = src.clone();
                src.parent.addChild(sph);
                sph.enabled = true;
                sph.setLocalPosition(x,y,z);
                sph.setLocalScale(radius*2, radius*2, radius*2);
                phDebugEntity[id] = sph;
            } else {
                var sph = phDebugEntity[id];
                sph.enabled = true;
                sph.setLocalPosition(x,y,z);
                sph.setLocalScale(radius*2, radius*2, radius*2);
            }
        }
    }
        
    var cell;
    if (y < 100) { // ignore unused allocaed particles
        var cellX = Math.floor((x - phMinX) * phInvCellSize);
        var cellMinX = Math.floor(((x - radius) - phMinX) * phInvCellSize);
        var cellMaxX = Math.floor(((x + radius) - phMinX) * phInvCellSize);
        phCellX[id] = cellX | (cellMinX!==cellX?phFlagNeg:0) | (cellMaxX!==cellX?phFlagPos:0);
        //if (cellMinX!==cellX && cellMaxX!==cellX) console.error("both flags set 1");
        for(cell=cellMinX; cell<=cellMaxX; cell++) {
            if (cell >= 0 && cell < phGridWidth) {
                phRows[cell].push(id);
                phRowBits[cell][Math.floor(id/32)] |= 1 << (id % 32);
            }
        }
        var cellZ = Math.floor((z - phMinZ) * phInvCellSize);
        var cellMinZ = Math.floor(((z - radius) - phMinZ) * phInvCellSize);
        var cellMaxZ = Math.floor(((z + radius) - phMinZ) * phInvCellSize);
        phCellZ[id] = cellZ | (cellMinZ!==cellZ?phFlagNeg:0) | (cellMaxZ!==cellZ?phFlagPos:0);
        for(cell=cellMinZ; cell<=cellMaxZ; cell++) {
            if (cell >= 0 && cell < phGridHeight) {
                phColumns[cell].push(id);
                phColumnBits[cell][Math.floor(id/32)] |= 1 << (id % 32);
            }
        }
    } else {
        phCellX[id] = -1;
        phCellZ[id] = -1;
    }
    
    
    return id;
};

Physics.prototype.removeParticle = function(id) {
    phPos[id*3] = 0;
    phPos[id*3+1] = 100000;
    phPos[id*3+2] = 0;
    
    phDeltaPos[id*3] = 0;
    phDeltaPos[id*3+1] = 0;
    phDeltaPos[id*3+2] = 0;
    
    phState[id] = PHSTATE_KINEMATIC;
    
    phUsed[id] = false;
    
    if (phDebugEntity[id]) {
        phDebugEntity[id].enabled = false;
    }
    
    this.updateGrid(id);
};

Physics.prototype.updateGrid = function(id) {
    var cellVal, cellValPrev, cell, cellPrev, cellMin, cellMax;
    if (phPos[id*3+1] > 100) { // remove from grid
        if (phCellX[id] >= 0) { // is in grid?
            // remove from cell X
            cellVal = phCellX[id];
            cell = cellVal & phMask16;
            if (cell >= 0 && cell < phGridWidth) {
                phRows[cell].splice(phRows[cell].indexOf(id),1);
                phRowBits[cell][Math.floor(id/32)] &= ~(1 << (id % 32));
                    //if (cell===1) console.log(phRows[cell].length);
            }
            if (cellVal & phFlagNeg) {
                // remove from cell - 1
                cell--;
                if (cell >= 0 && cell < phGridWidth) {
                    phRows[cell].splice(phRows[cell].indexOf(id),1);
                    phRowBits[cell][Math.floor(id/32)] &= ~(1 << (id % 32));
                        //if (cell===1) console.log(phRows[cell].length);
                }
            } else if (cellVal & phFlagPos) {
                // remove from cell + 1
                cell++;
                if (cell >= 0 && cell < phGridWidth) {
                    phRows[cell].splice(phRows[cell].indexOf(id),1);
                    phRowBits[cell][Math.floor(id/32)] &= ~(1 << (id % 32));
                       // if (cell===1) console.log(phRows[cell].length);
                }
            }
            phCellX[id] = -1;
        }
         
        if (phCellZ[id] >= 0) { // is in grid?
            // remove from cell Z
            cellVal = phCellZ[id];
            cell = cellVal & phMask16;
            if (cell >= 0 && cell < phGridHeight) {
                phColumns[cell].splice(phColumns[cell].indexOf(id),1);
                phColumnBits[cell][Math.floor(id/32)] &= ~(1 << (id % 32));
            }
            if (cellVal & phFlagNeg) {
                // remove from cell - 1
                cell--;
                if (cell >= 0 && cell < phGridHeight) {
                    phColumns[cell].splice(phColumns[cell].indexOf(id),1);
                    phColumnBits[cell][Math.floor(id/32)] &= ~(1 << (id % 32));
                }
            } else if (cellVal & phFlagPos) {
                // remove from cell + 1
                cell++;
                if (cell >= 0 && cell < phGridHeight) {
                    phColumns[cell].splice(phColumns[cell].indexOf(id),1);
                    phColumnBits[cell][Math.floor(id/32)] &= ~(1 << (id % 32));
                }
            }
            phCellZ[id] = -1;
        }
        
    } else {
        
        cell = Math.floor((phPos[id*3] - phMinX) * phInvCellSize);
        cellMin = Math.floor(((phPos[id*3] - phRadius[id]) - phMinX) * phInvCellSize);
        cellMax = Math.floor(((phPos[id*3] + phRadius[id]) - phMinX) * phInvCellSize);
        cellVal = cell | (cellMin!==cell?phFlagNeg:0) | (cellMax!==cell?phFlagPos:0);
        //if (cellMin!==cell && cellMax!==cell) console.error("both flags set 3");
        if (phCellX[id] !== cellVal) { // check if cell changed (X)
            // remove from cell X
            cellValPrev = phCellX[id];
            cellPrev = cellValPrev & phMask16;
            if (cellPrev >= 0 && cellPrev < phGridWidth) {
                phRows[cellPrev].splice(phRows[cellPrev].indexOf(id),1);
                phRowBits[cellPrev][Math.floor(id/32)] &= ~(1 << (id % 32));
                    //if (cell===1) console.log(phRows[cell].length);
            }
            if (cellValPrev & phFlagNeg) {
                // remove from cell - 1
                cellPrev--;
                if (cellPrev >= 0 && cellPrev < phGridWidth) {
                    phRows[cellPrev].splice(phRows[cellPrev].indexOf(id),1);
                    phRowBits[cellPrev][Math.floor(id/32)] &= ~(1 << (id % 32));
                        //if (cell===1) console.log(phRows[cell].length);
                }
            } else if (cellValPrev & phFlagPos) {
                // remove from cell + 1
                cellPrev++;
                if (cellPrev >= 0 && cellPrev < phGridWidth) {
                    phRows[cellPrev].splice(phRows[cellPrev].indexOf(id),1);
                    phRowBits[cellPrev][Math.floor(id/32)] &= ~(1 << (id % 32));
                        //if (cell===1) console.log(phRows[cell].length);
                }
            }
            
            // add to cell X
            if (cell >= 0 && cell < phGridWidth) {
                phRows[cell].push(id);
                phRowBits[cell][Math.floor(id/32)] |= 1 << (id % 32);
            }
            if (cellMin !== cell) {
                // add to cell - 1
                if (cellMin >= 0 && cellMin < phGridWidth) {
                    phRows[cellMin].push(id);
                    phRowBits[cellMin][Math.floor(id/32)] |= 1 << (id % 32);
                }
            } else if (cellMax !== cell) {
                // add to cell + 1
                if (cellMax >= 0 && cellMax < phGridWidth) {
                    phRows[cellMax].push(id);
                    phRowBits[cellMax][Math.floor(id/32)] |= 1 << (id % 32);
                }
            }
            phCellX[id] = cellVal;
        }
        
        
        cell = Math.floor((phPos[id*3+2] - phMinZ) * phInvCellSize);
        cellMin = Math.floor(((phPos[id*3+2] - phRadius[id]) - phMinZ) * phInvCellSize);
        cellMax = Math.floor(((phPos[id*3+2] + phRadius[id]) - phMinZ) * phInvCellSize);
        cellVal = cell | (cellMin!==cell?phFlagNeg:0) | (cellMax!==cell?phFlagPos:0);
        if (phCellZ[id] !== cellVal) { // check if cell changed (Z)
            // remove from cell Z
            cellValPrev = phCellZ[id];
            cellPrev = cellValPrev & phMask16;
            if (cellPrev >= 0 && cellPrev < phGridHeight) {
                phColumns[cellPrev].splice(phColumns[cellPrev].indexOf(id),1);
                phColumnBits[cellPrev][Math.floor(id/32)] &= ~(1 << (id % 32));
            }
            if (cellValPrev & phFlagNeg) {
                // remove from cell - 1
                cellPrev--;
                if (cellPrev >= 0 && cellPrev < phGridHeight) {
                    phColumns[cellPrev].splice(phColumns[cellPrev].indexOf(id),1);
                    phColumnBits[cellPrev][Math.floor(id/32)] &= ~(1 << (id % 32));
                }
            } else if (cellValPrev & phFlagPos) {
                // remove from cell + 1
                cellPrev++;
                if (cellPrev >= 0 && cellPrev < phGridHeight) {
                    phColumns[cellPrev].splice(phColumns[cellPrev].indexOf(id),1);
                    phColumnBits[cellPrev][Math.floor(id/32)] &= ~(1 << (id % 32));
                }
            }
            
            // add to cell Z
            if (cell >= 0 && cell < phGridHeight) {
                phColumns[cell].push(id);
                phColumnBits[cell][Math.floor(id/32)] |= 1 << (id % 32);
            }
            if (cellMin !== cell) {
                // add to cell - 1
                if (cellMin >= 0 && cellMin < phGridHeight) {
                    phColumns[cellMin].push(id);
                    phColumnBits[cellMin][Math.floor(id/32)] |= 1 << (id % 32);
                }
            } else if (cellMax !== cell) {
                // add to cell + 1
                if (cellMax >= 0 && cellMax < phGridHeight) {
                    phColumns[cellMax].push(id);
                    phColumnBits[cellMax][Math.floor(id/32)] |= 1 << (id % 32);
                }
            }
            phCellZ[id] = cellVal;
        }
    }
};

Physics.prototype.wakeUp = function(id) {
    phForceSleepCounter[id] = phTimeToForceSleep;
    phState[id] = PHSTATE_ACTIVE;
};

Physics.prototype.moveParticleTo = function(id, x, y, z) { // setParticlePos + affects velocity
    var dx = x - phPos[id * 3];
    var dy = y - phPos[id * 3 + 1];
    var dz = z - phPos[id * 3 + 2];
    phPos[id * 3] = x;
    phPos[id * 3 + 1] = y;
    phPos[id * 3 + 2] = z;
    phDeltaPos[id * 3] += dx;
    phDeltaPos[id * 3 + 1] += dy;
    phDeltaPos[id * 3 + 2] += dz;

    this.updateGrid(id);
    
    phForceSleepCounter[id] = phTimeToForceSleep;
    if (phState[id] === PHSTATE_SLEEP) phState[id] = PHSTATE_ACTIVE;
};

Physics.prototype.setParticlePos = function(id, x, y, z) {
    phPos[id * 3] = x;
    phPos[id * 3 + 1] = y;
    phPos[id * 3 + 2] = z;
    
    this.updateGrid(id);
    
    phForceSleepCounter[id] = phTimeToForceSleep;
    if (phState[id] === PHSTATE_SLEEP) phState[id] = PHSTATE_ACTIVE;
};

Physics.prototype.getParticlePos = function(id, pos) {
    pos.x = phPos[id * 3];
    pos.y = phPos[id * 3 + 1];
    pos.z = phPos[id * 3 + 2];
};

Physics.prototype.setParticleVelocity = function(id, vec) {
    phDeltaPos[id * 3] = vec.x;
    phDeltaPos[id * 3 + 1] = vec.y;
    phDeltaPos[id * 3 + 2] = vec.z;
};

Physics.prototype.getParticleVelocity = function(id, pos) {
    pos.x = phDeltaPos[id * 3];
    pos.y = phDeltaPos[id * 3 + 1];
    pos.z = phDeltaPos[id * 3 + 2];
};

Physics.prototype.setParticleRadius = function(id, r) {
    phRadius[id] = r;
};

Physics.prototype.getParticleRadius = function(id) {
    return phRadius[id];
};

Physics.prototype.addParticleImpulse = function(id, vx, vy, vz) {
    phDeltaPos[id * 3] += vx;
    phDeltaPos[id * 3 + 1] += vy;
    phDeltaPos[id * 3 + 2] += vz;
};

Physics.prototype.explosion = function(pos, radius, power) {
    var numParticles = phRadius.length;
    var p1, p1x, p1y, p1z, x1, y1, z1;
    var dx, dy, dz;
    var x2 = pos.x;
    var y2 = pos.y;
    var z2 = pos.z;
    var sqLen, len, invLen, falloff;
    var sqRadius = radius * radius;
    var cutoff = 1.0 / (sqRadius + 1.0);
    for(p1=0; p1<numParticles; p1++) {
        p1x = p1 * 3;
        p1y = p1x + 1;
        p1z = p1x + 2;
        x1 = phPos[p1x];
        y1 = phPos[p1y];
        z1 = phPos[p1z];

        dx = x1 - x2;
        dy = y1 - y2;
        dz = z1 - z2;

        sqLen = dx*dx + dy*dy + dz*dz;
        if (sqLen >= sqRadius) continue;
        
        len = Math.sqrt(sqLen);
        if (len === 0) len = 0.001;
        invLen = 1.0 / len;

        falloff = (1.0 / sqLen + 1.0) - cutoff;
        falloff *= invLen * power;
        dx *= falloff;
        dy *= falloff;
        dz *= falloff;
        
        phDeltaPos[p1 * 3] += dx;
        phDeltaPos[p1 * 3 + 1] += dy;
        phDeltaPos[p1 * 3 + 2] += dz;
        if (phState[p1] === PHSTATE_SLEEP) phState[p1] = PHSTATE_ACTIVE;
    }
};

Physics.prototype.defineRigidBody = function(addedCount) {
    var rb = new phRigidBody();
    rb.rangeStart = phRadius.length - addedCount;
    rb.rangeEnd = phRadius.length;
    var dx,dy,dz, dist;
    var i, j;
    for(i=rb.rangeStart; i<phRadius.length; i++) {
        phRbIndex[i] = phRbs.length;
        for(j=(i + 1); j<phRadius.length; j++) {
            dx = phPos[i * 3] - phPos[j * 3];
            dy = phPos[i * 3 + 1] - phPos[j * 3 + 1];
            dz = phPos[i * 3 + 2] - phPos[j * 3 + 2];
            dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            rb.linkLen.push(dist * 0.5);
        }
    }
    phRbs.push(rb);
    return rb;
};

Physics.prototype.removeRigidBody = function(rb) {
    phRbs.splice(phRbs.indexOf(rb), 1);
};

Physics.prototype.defineRigidBodyIndexed = function(phids) {
    var rb = new phRigidBody();
    rb.indexed = true;
    rb.ids = phids;
    var dx,dy,dz, dist;
    var i, j;
    var id, id2;
    for(i=0; i<phids.length; i++) {
        id = phids[i];
        phRbIndex[id] = phRbs.length;
        for(j=(i + 1); j<phids.length; j++) {
            id2 = phids[j];
            dx = phPos[id * 3] - phPos[id2 * 3];
            dy = phPos[id * 3 + 1] - phPos[id2 * 3 + 1];
            dz = phPos[id * 3 + 2] - phPos[id2 * 3 + 2];
            dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            rb.linkLen.push(dist * 0.5);
        }
    }
    phRbs.push(rb);
    return rb;
};

Physics.prototype.attachEntityToLine = function(obj, startP, endP) {
    var l = new phLineEntity();
    l.startP = startP;
    l.endP = endP;
    l.entity = obj;
    phLineEntities.push(l);
    return l;
};

Physics.prototype.removeLine = function(obj) {
    phLineEntities.splice(phLineEntities.indexOf(obj), 1);
};

Physics.prototype.attachEntityToTri = function(obj, rb) {//startP, rb) {
    var l = new phTriEntity();
    //l.startP = startP;
    l.entity = obj;
    l.rb = rb;
    
    var p1;// = rb.indexed ? rb.ids[0] : rb.rangeStart;// startP;
    var p2, p3;
    var x1, y1, z1;
    var x2, y2, z2;
    var x3, y3, z3;
    var dx, dy, dz;
    var dx2, dy2, dz2;
    var dx3, dy3, dz3;
    var cx, cy, cz;
    var sqLen, len, invLen;
    
    var j;
    /*var particles = rb.ids;
    if (!rb.indexed) {
        particles = [];
        for(j=rb.rangeStart; j<rb.rangeEnd; j++) {
            particles.push(j);
        }
    }*/
    /*var particleMin, particleMid, particleMax;
    var minX = Number.MAX_VALUE;
    var minY = Number.MAX_VALUE;
    var minZ = Number.MAX_VALUE;
    var maxX = -Number.MAX_VALUE;
    var maxY = -Number.MAX_VALUE;
    var maxZ = -Number.MAX_VALUE;
    for(j=0; j<particles.length; j++) {
        p1 = particles[j];
        x1 = phPos[p1 * 3]; // = pos
        y1 = phPos[p1 * 3 + 1];
        z1 = phPos[p1 * 3 + 2];
        
        if (x1 <= minX && y1 <= minY && z1 <= minZ) {
            particleMin = p1;
            minX = x1;
            minY = y1;
            minZ = z1;
        }
        
        if (x1 >= maxX && y1 >= maxY && z1 >= maxZ) {
            particleMax = p1;
            maxX = x1;
            maxY = y1;
            maxZ = z1;
        }
    }
    for(j=0; j<particles.length; j++) {
        p1 = particles[j];
        if (p1 !== particleMin && p1 !== particleMax) {
            particleMid = p1;
            break;
        }
    }
    l.particleX = particleMin;
    l.particleY = particleMid;
    l.particleZ = particleMax;*/
    
    p1 = rb.indexed ? rb.ids[0] : (rb.rangeStart + 0);//p1 + 1; particleMin;
    x1 = phPos[p1 * 3]; // = pos
    y1 = phPos[p1 * 3 + 1];
    z1 = phPos[p1 * 3 + 2];

    p2 = rb.indexed ? rb.ids[1] : (rb.rangeStart + 1);//p1 + 1;
    x2 = phPos[p2 * 3];
    y2 = phPos[p2 * 3 + 1];
    z2 = phPos[p2 * 3 + 2];

    //p3 = p1 + 2;
    p3 = rb.indexed ? rb.ids[2] : (rb.rangeStart + 2);
    x3 = phPos[p3 * 3];
    y3 = phPos[p3 * 3 + 1];
    z3 = phPos[p3 * 3 + 2];

    // Determine -X axis
    dx = x1 - x2;
    dy = y1 - y2;
    dz = z1 - z2;

    // Determine Y axis (tri normal)
    dx2 = x2 - x3;
    dy2 = y2 - y3;
    dz2 = z2 - z3;
    // cross
    cx = dy * dz2 - dy2 * dz;
    cy = dz * dx2 - dz2 * dx;
    cz = dx * dy2 - dx2 * dy;

            // normalize all
            sqLen = dx*dx + dy*dy + dz*dz;
            len = Math.sqrt(sqLen);
            if (len === 0) len = 0.001;
            invLen = 1.0 / len;
            dx = dx * invLen;
            dy = dy * invLen;
            dz = dz * invLen;

            sqLen = cx*cx + cy*cy + cz*cz;
            len = Math.sqrt(sqLen);
            if (len === 0) len = 0.001;
            invLen = 1.0 / len;
            cx = cx * invLen;
            cy = cy * invLen;
            cz = cz * invLen;
        
        // Determine Z axis (cross)
        dx3 = dy * cz - cy * dz;
        dy3 = dz * cx - cz * dx;
        dz3 = dx * cy - cx * dy;
        
            sqLen = dx3*dx3 + dy3*dy3 + dz3*dz3;
            len = Math.sqrt(sqLen);
            if (len === 0) len = 0.001;
            invLen = 1.0 / len;
            dx3 = dx3 * invLen;
            dy3 = dy3 * invLen;
            dz3 = dz3 * invLen;

    // Set tri matrix
    var triMatrix = this.tmpMatrix;
    var triData = triMatrix.data;
    triData[0] = dx;
    triData[1] = dy;
    triData[2] = dz;
    triData[3] = 0;

    triData[4] = cx;
    triData[5] = cy;
    triData[6] = cz;
    triData[7] = 0;

    triData[8] = dx3;
    triData[9] = dy3;
    triData[10] = dz3;
    triData[11] = 0;

    triData[12] = x1;
    triData[13] = y1;
    triData[14] = z1;
    triData[15] = 1;
    
    triMatrix.invert();
    l.localMatrix.mul2(triMatrix, obj.getWorldTransform());
    
    phTriEntities.push(l);
    return l;
};

Physics.prototype.removeTri = function(obj) {
    phTriEntities.splice(phTriEntities.indexOf(obj), 1);
};

Physics.prototype.addAngleConstraint = function(particle, matrix, positiveLimit, negativeLimit) {
    var c = new phAngleConstraint();
    //c.prt0 = parentParticle;
    c.prt1 = particle;
    c.local2world = matrix.clone();
    c.world2local = matrix.clone().invert();
    c.posAngle = positiveLimit;
    c.negAngle = negativeLimit;
    phAngleConstraints.push(c);
    return c;
};

Physics.prototype.findByName = function(name) {
    var meshes = this.app.scene.drawCalls;
    for(var i=0; i<meshes.length; i++) {
        if (meshes[i].node && meshes[i].node.name === name) {
            return meshes[i];
        }
    }
    return null;
};

// initialize code called once per entity
Physics.prototype.initialize = function() {
    phEngine = this;
    this.tmpMatrix = new pc.Mat4();
    this.tmpMatrix2 = new pc.Mat4();
    this.tmpPos = new pc.Vec3();
    this.tmpPos2 = new pc.Vec3();    
    var self = this;
    //setInterval(function(){ self.updateFixed(phDelta); }, 1000.0 / phFps);
    var i, j;
    for(i=0; i<phGridWidth; i++) {
        phRowBits[i] = new Uint32Array(phMaxParticleInts);
        phRows[i] = [];
    }
    for(i=0; i<phGridHeight; i++) {
        phColumnBits[i] = new Uint32Array(phMaxParticleInts);
        phColumns[i] = [];
    }
    
    var floor = this.findByName(this.floorObject);
    var aabb = floor.aabb;
    var min = aabb.getMin();
    var max = aabb.getMax();
    phWallsMinX = min.x;
    phWallsMinZ = min.z;
    phWallsMaxX = max.x;
    phWallsMaxZ = max.z;
};

Physics.prototype.createStaticObstacles = function(spheres) {
    phStaticObstacles = spheres;
    phStaticList = [];
    phStaticGrid = [];
    var gridArrays = [];
    var i, x, y, px, py, pz, pr;
    var cellX, cellZ, cellMinX, cellMinZ, cellMaxX, cellMaxZ, index;
    
    for(i=0; i<spheres.length/4; i++) {
        px = spheres[i * 4];
        py = spheres[i * 4 + 1];
        pz = spheres[i * 4 + 2];
        pr = spheres[i * 4 + 3];

        cellX = Math.floor((px - phMinX) * phInvCellSize);
        cellMinX = Math.floor(((px - pr) - phMinX) * phInvCellSize);
        cellMaxX = Math.floor(((px + pr) - phMinX) * phInvCellSize);
        
        cellZ = Math.floor((pz - phMinZ) * phInvCellSize);
        cellMinZ = Math.floor(((pz - pr) - phMinZ) * phInvCellSize);
        cellMaxZ = Math.floor(((pz + pr) - phMinZ) * phInvCellSize);
        
        for(cellZ=cellMinZ; cellZ<=cellMaxZ; cellZ++) {
            if (cellZ < 0 || cellZ >= phGridHeight) continue;
            for(cellX=cellMinX; cellX<=cellMaxX; cellX++) {
                if (cellX < 0 || cellX >= phGridWidth) continue;
                index = cellZ * phGridWidth + cellX;
                if (gridArrays[index] === undefined) gridArrays[index] = [];
                gridArrays[index].push(i);
            }
        }
    }
    
    var offset = 0;
    var length = 0;
    for(y=0; y<phGridHeight; y++) {
        for(x=0; x<phGridWidth; x++) {
            index = y * phGridWidth + x;
            
            if (gridArrays[index] === undefined) {
                phStaticGrid[index * 2] = -1;
                phStaticGrid[index * 2 + 1] = -1;
                continue;
            }
            
            length = gridArrays[index].length;
            for(i=0; i<length; i++) {
                phStaticList.push(gridArrays[index][i]);
            }
            
            phStaticGrid[index * 2] = offset;
            phStaticGrid[index * 2 + 1] = length;
            offset += length;
        }
    }
};

Physics.prototype.updateVariable = function(dt) {
    phTime += dt;
    var ticks = Math.floor((phTime - phPrevUpdate) / phDelta);
    if (ticks > phMaxTicks) ticks = phMaxTicks;
    for(var i=0; i<ticks; i++) {
        this.updateFixed(phDelta);
    }
    phPrevUpdate += ticks * phDelta;
};

Physics.prototype.updateFixed = function(dt) {
    var p1, p2;
    var numParticles = phRadius.length;
    var p1x, p1y, p1z;
    var state;
    var cellX, cellZ;
    
    phChecksPerformed = 0;
    phStaticChecksPerformed = 0;
    phLinksUpdated = 0;
    phNumKinematic = 0;
    
    var mathAbs = Math.abs;
    var mathFloor = Math.floor;
    
    // ##### Move #####
    for(p1=0; p1<numParticles; p1++) {
        if (phState[p1] === PHSTATE_ACTIVE) {
            phForceSleepCounter[p1] -= phDelta;
            if (phForceSleepCounter[p1] <= 0) {
                p1x = p1 * 3;
                p1y = p1x + 1;
                p1z = p1x + 2;
                //console.log("ph: particle sleep timeout");
                phState[p1] = PHSTATE_SLEEP;
                phDeltaPos[p1x] = 0;
                phDeltaPos[p1y] = 0;
                phDeltaPos[p1z] = 0;
                phForceSleepCounter[p1] = phTimeToForceSleep;
            }
        }
        
        if (phState[p1] === PHSTATE_SLEEP) continue;
       
        p1x = p1 * 3;
        p1y = p1x + 1;
        p1z = p1x + 2;

        if (phState[p1] === PHSTATE_KINEMATIC) {
            phDeltaPos[p1x] = 0;
            phDeltaPos[p1y] = 0;
            phDeltaPos[p1z] = 0;
            phNumKinematic++;
            continue;
        }
        
        phDeltaPos[p1x] += phAccel[p1x];
        phDeltaPos[p1y] += phAccel[p1y];
        phDeltaPos[p1z] += phAccel[p1z];

        //phPrevPos[p1x] = phPos[p1x];
        //phPrevPos[p1y] = phPos[p1y];
        //phPrevPos[p1z] = phPos[p1z];
        
        phPos[p1x] += phDeltaPos[p1x];
        phPos[p1y] += phDeltaPos[p1y];
        phPos[p1z] += phDeltaPos[p1z];
        
        this.updateGrid(p1);
    }
    
    var p2start;
    var p2x, p2y, p2z;
    var x1, y1, z1, r1, x2, y2, z2, r2;
    var dx, dy, dz, sqLen, radSum, sqRadSum, ndx, ndy, ndz;
    var len, invLen, push, exchangeVel;
    var underDelta, frictionFactor;

    var numRbs = phRbs.length;
    var rb, lengths, p1start, p1end;
    var linkId;
    var i, j;
    
    // Angle constraints
    var numConstraints = phAngleConstraints.length;
    var angle, constraint;
    /*for(i=0; i<numConstraints; i++) {
        constraint = phAngleConstraints[i];

        p2 = constraint.prt1;
        if (phState[p2] === PHSTATE_KINEMATIC) continue;
        p2x = p2 * 3;
        p2y = p2x + 1;
        p2z = p2x + 2;
        x2 = phPos[p2x];
        y2 = phPos[p2y];
        z2 = phPos[p2z];
        
        this.tmpPos.set(x2,y2,z2);
        constraint.world2local.transformPoint(this.tmpPos, this.tmpPos);
        
        //if (constraint.posAngle === 0 && constraint.negAngle === 0) {
            // fix to plane
            this.tmpPos.x = 0;
        //}
        this.tmpPos2.copy(this.tmpPos).normalize();
        len = this.tmpPos.length();
        angle = Math.atan2(this.tmpPos2.z, this.tmpPos2.y);
        
        // limit angle here
        //if (constraint.lock) {
          //  angle = Math.PI;
          //  
            //if (angle < 0) {
            //    angle = pc.math.lerp(angle, -Math.PI, phDelta*20);
            //} else {
             //   angle = pc.math.lerp(angle, Math.PI, phDelta*20);
            //}
        
        //}
        
        var limit = Math.PI * 0.5;
        if (angle < limit && angle > 0) {
            angle = limit;
        } else if (angle > -limit && angle < 0) {
            angle = -limit;
        }
        
        this.tmpPos.y = Math.cos(angle) * len;
        this.tmpPos.z = Math.sin(angle) * len;
        
        constraint.local2world.transformPoint(this.tmpPos, this.tmpPos);
        dx = this.tmpPos.x - x2;
        dy = this.tmpPos.y - y2;
        dz = this.tmpPos.z - z2;
        phPos[p2x] = this.tmpPos.x;
        phPos[p2y] = this.tmpPos.y;
        phPos[p2z] = this.tmpPos.z;
        phDeltaPos[p2x] += dx;
        phDeltaPos[p2y] += dy;
        phDeltaPos[p2z] += dz;
    }*/
    
    // Damping
    var damping, invDamp;
    for(i=0; i<phDampings.length; i++) {
        damping = phDampings[i];
        invDamp = 1.0 - damping.damp;
        x1 = phPos[damping.id * 3];
        y1 = phPos[damping.id * 3 + 1];
        z1 = phPos[damping.id * 3 + 2];
        x2 = x1 * invDamp + damping.targetPos.x * damping.damp;
        y2 = y1 * invDamp + damping.targetPos.y * damping.damp;
        z2 = z1 * invDamp + damping.targetPos.z * damping.damp;
        phPos[damping.id * 3] = x2;
        phPos[damping.id * 3 + 1] = y2;
        phPos[damping.id * 3 + 2] = z2;
        phDeltaPos[damping.id * 3] += x2 - x1;
        phDeltaPos[damping.id * 3 + 1] += y2 - y1;
        phDeltaPos[damping.id * 3 + 2] += z2 - z2;
        
        this.updateGrid(damping.id);
    }

    
    //RB contraints
    phLinkTime = pc.now();
    //for(var linkIter=0; linkIter<4; linkIter++) {
        //for(i=0; i<numRbs; i++) {
        for(i=1; i<numRbs; i++) { // skip dummy RB
            rb = phRbs[i];
            if (rb.indexed) continue;
            p1start = rb.rangeStart;
            if (phState[p1start] === PHSTATE_SLEEP) continue;

            p1end = rb.rangeEnd;
            lengths = rb.linkLen;
            linkId = 0;
            for(p1=p1start; p1<p1end; p1++) {
                p1x = p1 * 3;
                p1y = p1x + 1;
                p1z = p1x + 2;
                x1 = phPos[p1x];
                y1 = phPos[p1y];
                z1 = phPos[p1z];

                for(p2=(p1 + 1); p2<p1end; p2++) {
                    p2x = p2 * 3;
                    p2y = p2x + 1;
                    p2z = p2x + 2;
                    x2 = phPos[p2x];
                    y2 = phPos[p2y];
                    z2 = phPos[p2z];

                    dx = x2 - x1;
                    dy = y2 - y1;
                    dz = z2 - z1;
                    sqLen = dx*dx + dy*dy + dz*dz;
                    len = Math.sqrt(sqLen);
                    if (len === 0) len = 0.001;
                    invLen = 1.0 / len;
                    ndx = dx * invLen;
                    ndy = dy * invLen;
                    ndz = dz * invLen;

                    len = lengths[linkId];

                    // goal1
                    if (phState[p1] !== PHSTATE_KINEMATIC) {
                        dx = (x1 + x2) * 0.5 - ndx * len;
                        dy = (y1 + y2) * 0.5 - ndy * len;
                        dz = (z1 + z2) * 0.5 - ndz * len;
                        dx = (dx - x1) * phStiffness;
                        dy = (dy - y1) * phStiffness;
                        dz = (dz - z1) * phStiffness;
                        phPos[p1x] = x1 = x1 + dx;
                        phPos[p1y] = y1 = y1 + dy;
                        phPos[p1z] = z1 = z1 + dz;
                        phDeltaPos[p1x] += dx;
                        phDeltaPos[p1y] += dy;
                        phDeltaPos[p1z] += dz;

                        this.updateGrid(p1);
                    }

                    // goal2
                    if (phState[p2] !== PHSTATE_KINEMATIC) {
                        dx = (x1 + x2) * 0.5 + ndx * len;
                        dy = (y1 + y2) * 0.5 + ndy * len;
                        dz = (z1 + z2) * 0.5 + ndz * len;
                        dx = (dx - x2) * phStiffness;
                        dy = (dy - y2) * phStiffness;
                        dz = (dz - z2) * phStiffness;
                        phPos[p2x] += dx;
                        phPos[p2y] += dy;
                        phPos[p2z] += dz;
                        phDeltaPos[p2x] += dx;
                        phDeltaPos[p2y] += dy;
                        phDeltaPos[p2z] += dz;

                        this.updateGrid(p2);
                    }
                    
                    if (p1 == window.DEBUGPARTICLE) {
                        window.DEBUGLIST2.push(p2);
                    } else if (p2 == window.DEBUGPARTICLE) {
                        window.DEBUGLIST2.push(p1);
                    }

                    phLinksUpdated++;

                    linkId++;
                }
            }
        }

        //Indexed RB contraints
        var k;
        for(i=1; i<numRbs; i++) { // skip dummy RB
            rb = phRbs[i];
            if (!rb.indexed) continue;
            if (phState[rb.ids[0]] === PHSTATE_SLEEP) continue;

            p1end = rb.ids.length;
            lengths = rb.linkLen;
            linkId = 0;
            for(j=0; j<p1end; j++) {
                p1 = rb.ids[j];
                p1x = p1 * 3;
                p1y = p1x + 1;
                p1z = p1x + 2;
                x1 = phPos[p1x];
                y1 = phPos[p1y];
                z1 = phPos[p1z];

                for(k=(j + 1); k<p1end; k++) {
                    p2 = rb.ids[k];
                    p2x = p2 * 3;
                    p2y = p2x + 1;
                    p2z = p2x + 2;
                    x2 = phPos[p2x];
                    y2 = phPos[p2y];
                    z2 = phPos[p2z];

                    dx = x2 - x1;
                    dy = y2 - y1;
                    dz = z2 - z1;
                    sqLen = dx*dx + dy*dy + dz*dz;
                    len = Math.sqrt(sqLen);
                    if (len === 0) len = 0.001;
                    invLen = 1.0 / len;
                    ndx = dx * invLen;
                    ndy = dy * invLen;
                    ndz = dz * invLen;

                    len = lengths[linkId];

                    if (p1 == window.DEBUGPARTICLE) {
                        window.DEBUGLIST2.push(p2);
                    } else if (p2 == window.DEBUGPARTICLE) {
                        window.DEBUGLIST2.push(p1);
                    }
                    
                    // goal1
                    if (phState[p1] !== PHSTATE_KINEMATIC) {
                        dx = (x1 + x2) * 0.5 - ndx * len;
                        dy = (y1 + y2) * 0.5 - ndy * len;
                        dz = (z1 + z2) * 0.5 - ndz * len;
                        dx = (dx - x1) * phStiffness;
                        dy = (dy - y1) * phStiffness;
                        dz = (dz - z1) * phStiffness;
                        phPos[p1x] = x1 = x1 + dx;
                        phPos[p1y] = y1 = y1 + dy;
                        phPos[p1z] = z1 = z1 + dz;
                        phDeltaPos[p1x] += dx;
                        phDeltaPos[p1y] += dy;
                        phDeltaPos[p1z] += dz;

                        this.updateGrid(p1);
                    }

                    // goal2
                    if (phState[p2] !== PHSTATE_KINEMATIC) {
                        dx = (x1 + x2) * 0.5 + ndx * len;
                        dy = (y1 + y2) * 0.5 + ndy * len;
                        dz = (z1 + z2) * 0.5 + ndz * len;
                        dx = (dx - x2) * phStiffness;
                        dy = (dy - y2) * phStiffness;
                        dz = (dz - z2) * phStiffness;
                        phPos[p2x] += dx;
                        phPos[p2y] += dy;
                        phPos[p2z] += dz;
                        phDeltaPos[p2x] += dx;
                        phDeltaPos[p2y] += dy;
                        phDeltaPos[p2z] += dz;

                        this.updateGrid(p2);
                    }

                    phLinksUpdated++;

                    linkId++;
                }
            }
        }
    //}
    phLinkTime = pc.now() - phLinkTime;
    
    // Collide
    var bitsX, bitsZ, smallestArray, arrId, bit, count, sleepCount, jstart;
    phCollisionTime = pc.now();
    for(cellZ=0; cellZ<phGridHeight; cellZ++) {
        bitsZ = phColumnBits[cellZ];
        for(cellX=0; cellX<phGridWidth; cellX++) {
            bitsX = phRowBits[cellX];
            count = 0;
            for(i=0; i<phMaxParticleInts; i++) {
                phBitsInCell[i] = bitsX[i] & bitsZ[i];
                count += phBitsInCell[i];
            }
            if (count === 0) continue; // no bits in cell
            
            smallestArray = phRows[cellX].length < phColumns[cellZ].length ? phRows[cellX] : phColumns[cellZ];
            len = smallestArray.length;
            count = 0;
            sleepCount = 0;
            for(i=0; i<len; i++) {
                p1 = smallestArray[i];
                arrId = Math.floor(p1 / 32);
                bit = 1 << (p1 % 32);
                if (phBitsInCell[arrId] & bit) {
                    // particle is in cell
                    phParticlesInCell[count] = p1;
                    count++;
                    sleepCount += phState[p1] === PHSTATE_SLEEP ? 1 : 0;
                }
            }
            if (count === sleepCount) continue;
            
            for(i=0; i<count; i++) {
                p1 = phParticlesInCell[i];
                p1x = p1 * 3;
                p1y = p1x + 1;
                p1z = p1x + 2;
                x1 = phPos[p1x];
                y1 = phPos[p1y];
                z1 = phPos[p1z];
                r1 = phRadius[p1];

                // Other particles
                jstart = i + 1;
                for(j=jstart; j<count; j++) {
                    p2 = phParticlesInCell[j];
                    if (phRbIndex[p1] !== 0 && phRbIndex[p1] === phRbIndex[p2]) continue;

                    p2x = p2 * 3;
                    p2y = p2x + 1;
                    p2z = p2x + 2;
                    x2 = phPos[p2x];
                    y2 = phPos[p2y];
                    z2 = phPos[p2z];
                    r2 = phRadius[p2];

                    dx = x2 - x1;
                    dy = y2 - y1;
                    dz = z2 - z1;
                    sqLen = dx*dx + dy*dy + dz*dz;

                    radSum = r1 + r2;
                    sqRadSum = radSum * radSum;

                    phChecksPerformed++;

                    if (sqLen < sqRadSum) {
                        
                        if (p1 == window.DEBUGPARTICLE) {
                            window.DEBUGLIST.push(p2);
                        } else if (p2 == window.DEBUGPARTICLE) {
                            window.DEBUGLIST.push(p1);
                        }
                        
                        // push away if penetrating
                        len = Math.sqrt(sqLen);
                        if (len === 0) len = 0.001;
                        invLen = 1.0 / len;
                        ndx = dx * invLen;
                        ndy = dy * invLen;
                        ndz = dz * invLen;

                        push = (radSum - len) * 0.5;
                        dx = ndx * push;
                        dy = ndy * push;
                        dz = ndz * push;

                        phPos[p1x] = x1 = x1 - dx;
                        phPos[p1y] = y1 = y1 - dy;
                        phPos[p1z] = z1 = z1 - dz;
                        phDeltaPos[p1x] -= dx;
                        phDeltaPos[p1y] -= dy;
                        phDeltaPos[p1z] -= dz;

                        phPos[p2x] += dx;
                        phPos[p2y] += dy;
                        phPos[p2z] += dz;
                        phDeltaPos[p2x] += dx;
                        phDeltaPos[p2y] += dy;
                        phDeltaPos[p2z] += dz;

                        // exchange velocity/do bounciness
                        dx = phDeltaPos[p1x] - phDeltaPos[p2x]; // relative velocity
                        dy = phDeltaPos[p1y] - phDeltaPos[p2y];
                        dz = phDeltaPos[p1z] - phDeltaPos[p2z];
                        exchangeVel = phBounceFactor * (dx*ndx + dy*ndy + dz*ndz);
                        if (exchangeVel > 0) {
                            phDeltaPos[p1x] += ndx * exchangeVel;
                            phDeltaPos[p1y] += ndy * exchangeVel;
                            phDeltaPos[p1z] += ndz * exchangeVel;

                            phDeltaPos[p2x] -= ndx * exchangeVel;
                            phDeltaPos[p2y] -= ndy * exchangeVel;
                            phDeltaPos[p2z] -= ndz * exchangeVel;
                        }
                    }
                }
            }
        }
    }
     
    //var phRayOrigin = phRay.origin.data;
    //var phRayDir = phRay.direction.data;
    //var staticCount = phStaticObstacles.length / 4;
    var soffset, slength, slistId;
    
    for(p1=0; p1<numParticles; p1++) {
        p1x = p1 * 3;
        p1y = p1x + 1;
        p1z = p1x + 2;
        x1 = phPos[p1x];
        y1 = phPos[p1y];
            if (y1 > 100) continue;
        z1 = phPos[p1z];
        r1 = phRadius[p1];
        
        if (phLevelCollision[p1] && phState[p1] === PHSTATE_ACTIVE) {
            /*phRayOrigin[0] = phPrevPos[p1x];
            phRayOrigin[1] = phPrevPos[p1y];
            phRayOrigin[2] = phPrevPos[p1z];

            phRayDir[0] = phPos[p1x] - phPrevPos[p1x];
            phRayDir[1] = phPos[p1y] - phPrevPos[p1y];
            phRayDir[2] = phPos[p1z] - phPrevPos[p1z];

            len = Math.sqrt(phRayDir[0]*phRayDir[0] + phRayDir[1]*phRayDir[1] + phRayDir[2]*phRayDir[2]);
            if (len > 0) {
                invLen = 1.0 / len;
                phRayDir[0] *= invLen;
                phRayDir[1] *= invLen;
                phRayDir[2] *= invLen;

                if (colModels.level.intersectsRayGrid(phRay, phPickedPos, phPickedNormal, len)) {
                    this.getParticleVelocity(p1, phRay.origin);
                    phRay.direction.copy(phPickedNormal).scale(r1).add(phPickedPos);
                    this.moveParticleTo(p1, phRay.direction.x, phRay.direction.y, phRay.direction.z);

                    exchangeVel = -phBounceFactor * phRay.origin.dot(phPickedNormal);
                    if (exchangeVel > 0) {
                        phPickedNormal.scale(exchangeVel);
                        this.addParticleImpulse(p1, phPickedNormal.x, phPickedNormal.y, phPickedNormal.z);
                    }
                }
            }*/
            
            /*for(p2=0; p2<staticCount; p2++) {
                x2 = phStaticObstacles[p2 * 4];
                y2 = phStaticObstacles[p2 * 4 + 1];
                z2 = phStaticObstacles[p2 * 4 + 2];
                r2 = phStaticObstacles[p2 * 4 + 3];
                
                dx = x2 - x1;
                dy = y2 - y1;
                dz = z2 - z1;
                sqLen = dx*dx + dy*dy + dz*dz;
                
                radSum = r1 + r2;
                sqRadSum = radSum * radSum;
                
                phStaticChecksPerformed++;
                
                if (sqLen < sqRadSum) {
                    // push away if penetrating
                    len = Math.sqrt(sqLen);
                    if (len === 0) len = 0.001;
                    invLen = 1.0 / len;
                    ndx = dx * invLen;
                    ndy = dy * invLen;
                    ndz = dz * invLen;

                    push = (radSum - len);// * 0.5;
                    dx = ndx * push;
                    dy = ndy * push;
                    dz = ndz * push;

                    phPos[p1x] = x1 = x1 - dx;
                    phPos[p1y] = y1 = y1 - dy;
                    phPos[p1z] = z1 = z1 - dz;
                    phDeltaPos[p1x] -= dx;
                    phDeltaPos[p1y] -= dy;
                    phDeltaPos[p1z] -= dz;
                }
            }*/
            
            cellX = Math.floor((x1 - phMinX) * phInvCellSize);
            cellZ = Math.floor((z1 - phMinZ) * phInvCellSize);
            soffset = cellZ * phGridWidth + cellX;
            slength = phStaticGrid[soffset * 2 + 1];
            if (slength > 0) {
                soffset = phStaticGrid[soffset * 2];
                slength += soffset;
                for(slistId=soffset; slistId<slength; slistId++) {
                    p2 = phStaticList[slistId];
                    
                    x2 = phStaticObstacles[p2 * 4];
                    y2 = phStaticObstacles[p2 * 4 + 1];
                    z2 = phStaticObstacles[p2 * 4 + 2];
                    r2 = phStaticObstacles[p2 * 4 + 3];

                    dx = x2 - x1;
                    dy = y2 - y1;
                    dz = z2 - z1;
                    sqLen = dx*dx + dy*dy + dz*dz;

                    radSum = r1 + r2;
                    sqRadSum = radSum * radSum;

                    phStaticChecksPerformed++;

                    if (sqLen < sqRadSum) {
                        // push away if penetrating
                        len = Math.sqrt(sqLen);
                        if (len === 0) len = 0.001;
                        invLen = 1.0 / len;
                        ndx = dx * invLen;
                        ndy = dy * invLen;
                        ndz = dz * invLen;

                        push = (radSum - len);// * 0.5;
                        dx = ndx * push;
                        dy = ndy * push;
                        dz = ndz * push;

                        phPos[p1x] = x1 = x1 - dx;
                        phPos[p1y] = y1 = y1 - dy;
                        phPos[p1z] = z1 = z1 - dz;
                        phDeltaPos[p1x] -= dx;
                        phDeltaPos[p1y] -= dy;
                        phDeltaPos[p1z] -= dz;
                    }
                }
            }
        }
        
        /*// Other particles
        p2start = p1 + 1;
        for(p2=p2start; p2<numParticles; p2++) {
            if (phRbIndex[p1] !== 0 && phRbIndex[p1] === phRbIndex[p2]) continue;
            
            p2x = p2 * 3;
            p2y = p2x + 1;
            p2z = p2x + 2;
            x2 = phPos[p2x];
            y2 = phPos[p2y];
                if (y2 > 100) continue;
            z2 = phPos[p2z];
            r2 = phRadius[p2];
            
            dx = x2 - x1;
            dy = y2 - y1;
            dz = z2 - z1;
            sqLen = dx*dx + dy*dy + dz*dz;
            
            radSum = r1 + r2;
            sqRadSum = radSum * radSum;
            
            phChecksPerformed++;
            
            if (sqLen < sqRadSum) {
                // push away if penetrating
                len = Math.sqrt(sqLen);
                if (len === 0) len = 0.001;
                invLen = 1.0 / len;
                ndx = dx * invLen;
                ndy = dy * invLen;
                ndz = dz * invLen;
                
                push = (radSum - len) * 0.5;
                dx = ndx * push;
                dy = ndy * push;
                dz = ndz * push;
                
                phPos[p1x] = x1 = x1 - dx;
                phPos[p1y] = y1 = y1 - dy;
                phPos[p1z] = z1 = z1 - dz;
                phDeltaPos[p1x] -= dx;
                phDeltaPos[p1y] -= dy;
                phDeltaPos[p1z] -= dz;
                
                phPos[p2x] += dx;
                phPos[p2y] += dy;
                phPos[p2z] += dz;
                phDeltaPos[p2x] += dx;
                phDeltaPos[p2y] += dy;
                phDeltaPos[p2z] += dz;
             
                // exchange velocity/do bounciness
                dx = phDeltaPos[p1x] - phDeltaPos[p2x]; // relative velocity
                dy = phDeltaPos[p1y] - phDeltaPos[p2y];
                dz = phDeltaPos[p1z] - phDeltaPos[p2z];
                exchangeVel = phBounceFactor * (dx*ndx + dy*ndy + dz*ndz);
                if (exchangeVel > 0) {
                    phDeltaPos[p1x] += ndx * exchangeVel;
                    phDeltaPos[p1y] += ndy * exchangeVel;
                    phDeltaPos[p1z] += ndz * exchangeVel;
                    
                    phDeltaPos[p2x] -= ndx * exchangeVel;
                    phDeltaPos[p2y] -= ndy * exchangeVel;
                    phDeltaPos[p2z] -= ndz * exchangeVel;
                }
            }
        }*/
        
        // Floor
        underDelta = phRadius[p1] - phPos[p1y];
        underDelta = underDelta > 0? underDelta : 0;
        phPos[p1y] += underDelta;
        phDeltaPos[p1y] += underDelta;
        if (underDelta > 0) {
            
            // bounciess
            exchangeVel = phBounceFactor * underDelta;
            if (exchangeVel > 0) {
                phDeltaPos[p1y] += exchangeVel;
            }            
            
            // friction
            if (phDeltaPos[p1x] > 0) {
                phDeltaPos[p1x] -= underDelta * phFriction;
                if (phDeltaPos[p1x] < 0) phDeltaPos[p1x] = 0;
            } else {
                phDeltaPos[p1x] += underDelta * phFriction;
                if (phDeltaPos[p1x] > 0) phDeltaPos[p1x] = 0;
            }
            
            if (phDeltaPos[p1z] > 0) {
                phDeltaPos[p1z] -= underDelta * phFriction;
                if (phDeltaPos[p1z] < 0) phDeltaPos[p1z] = 0;
            } else {
                phDeltaPos[p1z] += underDelta * phFriction;
                if (phDeltaPos[p1z] > 0) phDeltaPos[p1z] = 0;
            }
        }
        
        // Walls
        underDelta = (x1 - r1) - phWallsMinX;
        if (underDelta < 0) {
            phPos[p1x] -= underDelta;
            phDeltaPos[p1x] -= underDelta;
            exchangeVel = phBounceFactor * -underDelta;
            if (exchangeVel > 0) {
                phDeltaPos[p1x] += exchangeVel;
            }
        }
        underDelta = (x1 + r1) - phWallsMaxX;
        if (underDelta > 0) {
            phPos[p1x] -= underDelta;
            phDeltaPos[p1x] -= underDelta;
            exchangeVel = phBounceFactor * underDelta;
            if (exchangeVel > 0) {
                phDeltaPos[p1x] -= exchangeVel;
            }
        }
        
        underDelta = (z1 - r1) - phWallsMinZ;
        if (underDelta < 0) {
            phPos[p1z] -= underDelta;
            phDeltaPos[p1z] -= underDelta;
            exchangeVel = phBounceFactor * -underDelta;
            if (exchangeVel > 0) {
                phDeltaPos[p1z] += exchangeVel;
            }
        }
        underDelta = (z1 + r1) - phWallsMaxZ;
        if (underDelta > 0) {
            phPos[p1z] -= underDelta;
            phDeltaPos[p1z] -= underDelta;
            if (exchangeVel > 0) {
                phDeltaPos[p1z] -= exchangeVel;
            }
        }
        
        /*// Collide with ceiling at 50
        underDelta = (y1 + r1) - 50;
        if (underDelta > 0) {
            phPos[p1y] -= underDelta;
            phDeltaPos[p1y] -= underDelta;
            if (exchangeVel > 0) {
                phDeltaPos[p1y] -= exchangeVel;
            }
        }*/
    }
    phCollisionTime = pc.now() - phCollisionTime;
    
    var lines = phLineEntities.length;
    var child;
    var awake = false;
    var triMatrix = this.tmpMatrix;
    var triData = triMatrix.data;
    for(i=0; i<lines; i++) {
        p1 = phLineEntities[i].startP;
        p2 = phLineEntities[i].endP;
        
        if (phState[p1] === PHSTATE_SLEEP) {
            awake = false;
            for(j=p1; j<=p2; j++) {
                if (Math.abs(phDeltaPos[j*3]) > phAwakeThreshold || 
                    Math.abs(phDeltaPos[j*3+1]) > phAwakeThreshold || 
                    Math.abs(phDeltaPos[j*3+2]) > phAwakeThreshold)
                    {
                        awake = true;
                        break;
                    }
            }
            if (awake) {
                for(j=p1; j<=p2; j++) {
                    if (phState[j] === PHSTATE_SLEEP) {
                        phState[j] = PHSTATE_ACTIVE;
                        //console.log("ph: wake line up");
                    }
                    phForceSleepCounter[j] = phTimeToForceSleep;
                    phNumSleeping--;
                }
            } else {
                continue;
            }
        }
        
        p1x = p1 * 3;
        p1y = p1x + 1;
        p1z = p1x + 2;
        x1 = phPos[p1x];
        y1 = phPos[p1y];
        z1 = phPos[p1z];
        
        p2x = p2 * 3;
        p2y = p2x + 1;
        p2z = p2x + 2;
        x2 = phPos[p2x];
        y2 = phPos[p2y];
        z2 = phPos[p2z];
        
        if (phLineEntities[i].onlyDirection) {
            //phLineEntities[i].entity.setLocalPosition(x1, y1, z1);
            //phLineEntities[i].entity.lookAt(x2, y2, z2);//, phLineEntities[i].up.x, phLineEntities[i].up.y, phLineEntities[i].up.z);
            dx = x1 - x2;
            dy = y1 - y2;
            dz = z1 - z2;
            sqLen = dx*dx + dy*dy + dz*dz;
            len = Math.sqrt(sqLen);
            if (len === 0) len = 0.001;
            invLen = 1.0 / len;
            ndx = dx * invLen;
            ndy = dy * invLen;
            ndz = dz * invLen;
            this.tmpPos.set(ndx, ndy, ndz);
            phLineEntities[i].right.cross(this.tmpPos, phLineEntities[i].up).normalize(); // cross(dir, axis)
            var scl = phLineEntities[i].scale;
            triData[0] = phLineEntities[i].right.x * scl.z;
            triData[1] = phLineEntities[i].right.y * scl.z;
            triData[2] = phLineEntities[i].right.z * scl.z;
            triData[3] = 0;
            triData[4] = this.tmpPos.x * scl.y;
            triData[5] = this.tmpPos.y * scl.y;
            triData[6] = this.tmpPos.z * scl.y;
            triData[7] = 0;
            triData[8] = phLineEntities[i].up.x * scl.x;
            triData[9] = phLineEntities[i].up.y * scl.x;
            triData[10] = phLineEntities[i].up.z * scl.x;
            triData[11] = 0;
            triData[12] = x1;
            triData[13] = y1;
            triData[14] = z1;
            triData[15] = 1;
            phLineEntities[i].entity.worldTransform.copy(triMatrix);
            console.log("deprecated");
            
            //phLineEntities[i].entity.dirtyWorld = false; // new engine
            
            /*for (j = 0, len = phLineEntities[i].entity._children.length; j < len; j++) {
                child = phLineEntities[i].entity._children[j];
                child.dirtyWorld = true;
                child.dirtyNormal = true;
                child._aabbVer++;
            }*/
            continue; // never sleep!
            
        } else {
            // attach to middle
            dx = (x1 + x2) * 0.5;
            dy = (y1 + y2) * 0.5;
            dz = (z1 + z2) * 0.5;
            phLineEntities[i].entity.setLocalPosition(dx, dy, dz);
            phLineEntities[i].entity.lookAt(x1, y1, z1);
        }
        
        if (phState[p1] === PHSTATE_KINEMATIC) continue;
        if (phState[p2] === PHSTATE_KINEMATIC) continue;
        if (Math.abs(phDeltaPos[p1x]) > phSleepThreshold || 
            Math.abs(phDeltaPos[p1y]) > phSleepThreshold || 
            Math.abs(phDeltaPos[p1z]) > phSleepThreshold)
            continue;
        if (Math.abs(phDeltaPos[p2x]) > phSleepThreshold || 
            Math.abs(phDeltaPos[p2y]) > phSleepThreshold || 
            Math.abs(phDeltaPos[p2z]) > phSleepThreshold)
            continue;
        for(j=p1; j<=p2; j++) {
            if (phState[j] === PHSTATE_ACTIVE) {
                phState[j] = PHSTATE_SLEEP;
                phDeltaPos[j*3] = 0;
                phDeltaPos[j*3+1] = 0;
                phDeltaPos[j*3+2] = 0;
                //console.log("ph: put line to sleep");
            }
            phNumSleeping++;
        }
    }
    
    var tris = phTriEntities.length;
    var p3, x3, y3, z3, p3x, p3y, p3z;
    var dx2, dy2, dz2;
    var dx3, dy3, dz3;
    var cx, cy, cz;
    for(i=0; i<tris; i++) {
        //p1 = phTriEntities[i].startP;
        rb = phTriEntities[i].rb;
        p1 = rb.indexed ? rb.ids[0] : rb.rangeStart;
        
        if (phState[p1] === PHSTATE_SLEEP) {
            awake = false;
            if (!rb.indexed) {
                for(j=rb.rangeStart; j<rb.rangeEnd; j++) {
                    if (Math.abs(phDeltaPos[j*3]) > phAwakeThreshold || 
                        Math.abs(phDeltaPos[j*3+1]) > phAwakeThreshold || 
                        Math.abs(phDeltaPos[j*3+2]) > phAwakeThreshold)
                        {
                            awake = true;
                            break;
                        }
                }
            } else {
                for(j=0; j<rb.ids.length; j++) {
                    if (Math.abs(phDeltaPos[rb.ids[j]*3]) > phAwakeThreshold || 
                        Math.abs(phDeltaPos[rb.ids[j]*3+1]) > phAwakeThreshold || 
                        Math.abs(phDeltaPos[rb.ids[j]*3+2]) > phAwakeThreshold)
                        {
                            awake = true;
                            break;
                        }
                }
            }
            if (awake) {
                if (!rb.indexed) {
                    for(j=rb.rangeStart; j<rb.rangeEnd; j++) {
                        if (phState[j] === PHSTATE_SLEEP) {
                            phState[j] = PHSTATE_ACTIVE;
                        }
                        phForceSleepCounter[j] = phTimeToForceSleep;
                        phNumSleeping--;
                    }
                } else {
                    for(j=0; j<rb.ids.length; j++) {
                        if (phState[rb.ids[j]] === PHSTATE_SLEEP) {
                            phState[rb.ids[j]] = PHSTATE_ACTIVE;
                            //console.log("ph: wake tri up");
                        }
                        phForceSleepCounter[rb.ids[j]] = phTimeToForceSleep;
                        phNumSleeping--;
                    }
                }
            } else {
                continue;
            }
        }
        
        p1x = p1 * 3;
        p1y = p1x + 1;
        p1z = p1x + 2;
        x1 = phPos[p1x]; // = pos
        y1 = phPos[p1y];
        z1 = phPos[p1z];
        
        //p2 = p1 + 1;
        p2 = rb.indexed ? rb.ids[1] : (rb.rangeStart + 1);
        p2x = p2 * 3;
        p2y = p2x + 1;
        p2z = p2x + 2;
        x2 = phPos[p2x];
        y2 = phPos[p2y];
        z2 = phPos[p2z];
        
        //p3 = p1 + 2;
        p3 = rb.indexed ? rb.ids[2] : (rb.rangeStart + 2);
        p3x = p3 * 3;
        p3y = p3x + 1;
        p3z = p3x + 2;
        x3 = phPos[p3x];
        y3 = phPos[p3y];
        z3 = phPos[p3z];
        
        // Determine -X axis
        dx = x1 - x2;
        dy = y1 - y2;
        dz = z1 - z2;
        
        // Determine Y axis (tri normal)
        dx2 = x2 - x3;
        dy2 = y2 - y3;
        dz2 = z2 - z3;
        // cross
        cx = dy * dz2 - dy2 * dz;
        cy = dz * dx2 - dz2 * dx;
        cz = dx * dy2 - dx2 * dy;
        
            // normalize all
            sqLen = dx*dx + dy*dy + dz*dz;
            len = Math.sqrt(sqLen);
            if (len === 0) len = 0.001;
            invLen = 1.0 / len;
            dx = dx * invLen;
            dy = dy * invLen;
            dz = dz * invLen;

            sqLen = cx*cx + cy*cy + cz*cz;
            len = Math.sqrt(sqLen);
            if (len === 0) len = 0.001;
            invLen = 1.0 / len;
            cx = cx * invLen;
            cy = cy * invLen;
            cz = cz * invLen;
        
        // Determine Z axis (cross)
        dx3 = dy * cz - cy * dz;
        dy3 = dz * cx - cz * dx;
        dz3 = dx * cy - cx * dy;
        
            sqLen = dx3*dx3 + dy3*dy3 + dz3*dz3;
            len = Math.sqrt(sqLen);
            if (len === 0) len = 0.001;
            invLen = 1.0 / len;
            dx3 = dx3 * invLen;
            dy3 = dy3 * invLen;
            dz3 = dz3 * invLen;
        
        
        // Set tri matrix
        triData[0] = dx;
        triData[1] = dy;
        triData[2] = dz;
        triData[3] = 0;

        triData[4] = cx;
        triData[5] = cy;
        triData[6] = cz;
        triData[7] = 0;

        triData[8] = dx3;
        triData[9] = dy3;
        triData[10] = dz3;
        triData[11] = 0;

        triData[12] = x1;
        triData[13] = y1;
        triData[14] = z1;
        triData[15] = 1;

        triMatrix.mul2(triMatrix, phTriEntities[i].localMatrix);
        
        /*phTriEntities[i].entity.worldTransform.copy(triMatrix);
        phTriEntities[i].entity.position.set(x1,y1,z1); // update culling
        
        for (j = 0, len = phTriEntities[i].entity._children.length; j < len; j++) {
            child = phTriEntities[i].entity._children[j];
            child.worldTransform.copy(triMatrix); // This will not respect proper hiearchy!
            child.position.set(x1,y1,z1);
        }*/
        
        // properly set transform, but it's gonna be borken, but at least normals/culling will be okay
        phTriEntities[i].entity.setLocalPosition(x1, y1, z1);
        var quat = phTriEntities[i].entity.getLocalRotation();
        quat.setFromMat4(triMatrix);
        phTriEntities[i].entity.setLocalRotation(quat);
        
        // override matrix with proper
        phTriEntities[i].entity.getWorldTransform();
        phTriEntities[i].entity.worldTransform.copy(triMatrix);

        /*// Set tri matrix
        triData[0] = dx;
        triData[1] = dy;
        triData[2] = dz;
        triData[3] = 0;

        triData[4] = cx;
        triData[5] = cy;
        triData[6] = cz;
        triData[7] = 0;

        triData[8] = dx3;
        triData[9] = dy3;
        triData[10] = dz3;
        triData[11] = 0;

        triData[12] = x1;
        triData[13] = y1;
        triData[14] = z1;
        triData[15] = 1;
        
        triMatrix.mul2(triMatrix, phTriEntities[i].localMatrix);
        phTriEntities[i].entity.worldTransform.copy(triMatrix);
        for (j = 0, len = phTriEntities[i].entity._children.length; j < len; j++) { // new engine
            child = phTriEntities[i].entity._children[j];
            child.dirtyWorld = true;
            child.dirtyNormal = true;
            child._aabbVer++;
        }*/
        
        if (phState[p1] === PHSTATE_KINEMATIC) continue;
        if (phState[p2] === PHSTATE_KINEMATIC) continue;
        if (phState[p3] === PHSTATE_KINEMATIC) continue;
        if (Math.abs(phDeltaPos[p1x]) > phSleepThreshold || 
            Math.abs(phDeltaPos[p1y]) > phSleepThreshold || 
            Math.abs(phDeltaPos[p1z]) > phSleepThreshold)
            continue;
        if (Math.abs(phDeltaPos[p2x]) > phSleepThreshold || 
            Math.abs(phDeltaPos[p2y]) > phSleepThreshold || 
            Math.abs(phDeltaPos[p2z]) > phSleepThreshold)
            continue;
        if (Math.abs(phDeltaPos[p3x]) > phSleepThreshold || 
            Math.abs(phDeltaPos[p3y]) > phSleepThreshold || 
            Math.abs(phDeltaPos[p3z]) > phSleepThreshold)
            continue;
        if (!rb.indexed) {
            for(j=rb.rangeStart; j<rb.rangeEnd; j++) {
                if (phState[j] === PHSTATE_ACTIVE) {
                    phState[j] = PHSTATE_SLEEP;
                    //console.log("ph: put tri to sleep");
                }
                phNumSleeping++;
            }
        } else {
           for(j=0; j<rb.ids.length; j++) {
                if (phState[rb.ids[j]] === PHSTATE_ACTIVE) {
                    phState[rb.ids[j]] = PHSTATE_SLEEP;
                    phDeltaPos[rb.ids[j]*3] = 0;
                    phDeltaPos[rb.ids[j]*3+1] = 0;
                    phDeltaPos[rb.ids[j]*3+2] = 0;
                    //console.log("ph: put tri to sleep");
                }
                phNumSleeping++;
            }
        }
    }
    
    if (!phDebug) return;
    var r;
    for(p1=0; p1<numParticles; p1++) {
        if (!phDebugEntity[p1]) continue;
        p1x = p1 * 3;
        p1y = p1x + 1;
        p1z = p1x + 2;
        x1 = phPos[p1x];
        y1 = phPos[p1y];
        z1 = phPos[p1z];
        r = phRadius[p1] * 2;
        phDebugEntity[p1].setLocalPosition(x1, y1, z1);
        phDebugEntity[p1].setLocalScale(r, r, r);
        if (phDebug2) phDebugEntity[p1].model.model.meshInstances[0].setParameter("material_diffuse", phState[p1]===PHSTATE_SLEEP? phColorRed.data : phColorGreen.data);
    }
};

// swap method called for script hot-reloading
// inherit your script state here
// Physics.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/