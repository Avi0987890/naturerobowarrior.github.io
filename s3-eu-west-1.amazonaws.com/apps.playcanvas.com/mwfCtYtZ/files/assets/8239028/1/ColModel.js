'use strict';
var ColUtils = {};
ColUtils.transform = new pc.Mat4();
ColUtils.transformedRay = new pc.Ray();
ColUtils.gridRay = new pc.Ray();
ColUtils.absDiff = new pc.Vec3();
ColUtils.prod = new pc.Vec3();
ColUtils.invR = new pc.Vec3();
ColUtils.tbot = new pc.Vec3();
ColUtils.ttop = new pc.Vec3();
//ColUtils.boxmin = new pc.Vec3(-0.5, -0.5, -0.5);
//ColUtils.boxmax = new pc.Vec3(0.5, 0.5, 0.5);
ColUtils.boxmin = new pc.Vec3(-0.5, -0.5, -0.5);
ColUtils.boxmax = new pc.Vec3(0.5, 0.5, 0.5);
ColUtils.tmin = new pc.Vec3();
ColUtils.tmax = new pc.Vec3();
ColUtils.t0 = new pc.Vec2();
ColUtils.tmpQuat = new pc.Quat();
ColUtils.posOnBox = new pc.Vec3();
ColUtils.localPosOnBox = new pc.Vec3();
ColUtils.closestPos = new pc.Vec3();
ColUtils.localClosestPos = new pc.Vec3();
ColUtils.hitBoxId = -1;


var ColModel = function(boxCount) {
    this.boxCount = boxCount;
    this.boxes = [];
    this.boxesInv = [];
    this.boxesR = [];
    this.boxesTRInv = [];
    this.boxesScale = [];
    this.boxesEnabled = [];
    
    this.boxNameToId = {};
    
    this.grid = null;
    this.cellsX = 0;
    this.cellsZ = 0;
    this.gridWidth = 0;
    this.gridHeight = 0;
    this.gridMinX = 0;
    this.gridMinZ = 0;
    this.worldToGridX = 0;
    this.worldToGridZ = 0;
    this.cellSize = 0;
    this.maxHeight = 0;
    this.gridBbox = null;
};

ColModel.prototype.setStateByName = function(name, state) {
    var boxId = this.boxNameToId[name];
    this.boxesEnabled[boxId] = state;
};

ColModel.prototype.setBoxMatrix = function(id, mtx, pos, rot, scale) {

    var i;
    ColUtils.transform.copy(mtx);
    for(i=0; i<16; i++) {
        this.boxes[id * 16 + i] = ColUtils.transform.data[i];
    }

    ColUtils.transform.invert();
    for(i=0; i<16; i++) {
        this.boxesInv[id * 16 + i] = ColUtils.transform.data[i];
    }

    this.boxesR[id * 4 + 0] = rot.x;
    this.boxesR[id * 4 + 1] = rot.y;
    this.boxesR[id * 4 + 2] = rot.z;
    this.boxesR[id * 4 + 3] = rot.w;

    ColUtils.transform.setTRS(pos, rot, pc.Vec3.ONE).invert();
    for(i=0; i<16; i++) {
        this.boxesTRInv[id * 16 + i] = ColUtils.transform.data[i];
    }

    this.boxesScale[id * 3 + 0] = scale.x;
    this.boxesScale[id * 3 + 1] = scale.y;
    this.boxesScale[id * 3 + 2] = scale.z;
    
    this.boxesEnabled[id] = true;
};

ColModel.prototype.constructGrid = function(cellSize, maxHeight) {
    var i, j;
    var grid = this.grid = [];
    var bboxIdentity = new pc.BoundingBox();
    var bbox = new pc.BoundingBox();
    var minPos, maxPos, minx, minz, maxx, maxz;
    var gridMinX = Number.MAX_VALUE;
    var gridMinZ = Number.MAX_VALUE;
    var gridMaxX = -Number.MAX_VALUE;
    var gridMaxZ = -Number.MAX_VALUE;
    this.cellSize = cellSize;
    this.maxHeight = maxHeight;
    var invCellSize = 1.0 / cellSize;
    
    for(i=0; i<this.boxCount; i++) {
        for(j=0; j<16; j++) {
            ColUtils.transform.data[j] = this.boxes[i * 16 + j];
        }
        bbox.setFromTransformedAabb(bboxIdentity, ColUtils.transform);
        minPos = bbox.getMin();
        maxPos = bbox.getMax();
        if (minPos.x < gridMinX) {
            gridMinX = minPos.x;
        }
        if (minPos.z < gridMinZ) {
            gridMinZ = minPos.z;
        }
        if (maxPos.x > gridMaxX) {
            gridMaxX = maxPos.x;
        }
        if (maxPos.z > gridMaxZ) {
            gridMaxZ = maxPos.z;
        }
    }
    
    var gridWidth = this.gridWidth = gridMaxX - gridMinX;
    var gridHeight = this.gridHeight = gridMaxZ - gridMinZ;
    var cellsX = this.cellsX = Math.floor(gridWidth * invCellSize);
    var cellsZ = this.cellsZ = Math.floor(gridHeight * invCellSize);
    this.gridMinX = gridMinX;
    this.gridMinZ = gridMinZ;
    
    var invGridWidth = 1.0 / gridWidth;
    var invGridHeight = 1.0 / gridHeight;
    var worldToGridX = this.worldToGridX = invGridWidth * cellsX;
    var worldToGridZ = this.worldToGridZ = invGridHeight * cellsZ;
    var x, z;
    
    for(i=0; i<this.boxCount; i++) {
        for(j=0; j<16; j++) {
            ColUtils.transform.data[j] = this.boxes[i * 16 + j];
        }
        bbox.setFromTransformedAabb(bboxIdentity, ColUtils.transform);
        minPos = bbox.getMin();
        maxPos = bbox.getMax();
        
        minx = Math.floor((minPos.x - gridMinX) * worldToGridX);
        maxx = Math.floor((maxPos.x - gridMinX) * worldToGridX);
        minz = Math.floor((minPos.z - gridMinZ) * worldToGridZ);
        maxz = Math.floor((maxPos.z - gridMinZ) * worldToGridZ);
        
        for(z=minz; z<=maxz; z++) {
            for(x=minx; x<=maxx; x++) {
                j = z * cellsX + x;
                if (!grid[j]) grid[j] = [];
                grid[j].push(i);
            }
        }
    }
    
    this.gridBbox = new pc.BoundingBox();
    this.gridBbox.center.x = (gridMinX + gridMaxX) * 0.5;
    this.gridBbox.center.y = maxHeight * 0.5;
    this.gridBbox.center.z = (gridMinZ + gridMaxZ) * 0.5;
    this.gridBbox.halfExtents.x = gridWidth * 0.5;
    this.gridBbox.halfExtents.y = maxHeight * 0.5;
    this.gridBbox.halfExtents.z = gridHeight * 0.5;
};

ColModel.prototype.intersectsRayGrid = function(ray, pickedPoint, pickedNormal, maxLength) {
    if (ray.direction.x === 0 && ray.direction.y === 0 && ray.direction.z === 0) {
        return false;
    }
    
    if (ray.origin.y > this.maxHeight) {
        this.gridBbox.intersectsRay(ray, ColUtils.gridRay.origin);
    } else {
        ColUtils.gridRay.origin.copy(ray.origin);
    }
    ColUtils.gridRay.direction.copy(ray.direction);
    ray = ColUtils.gridRay;
    
    var i, j;
    var grid = this.grid;
    var gridMinX = this.gridMinX;
    var gridMinZ = this.gridMinZ;
    var worldToGridX = this.worldToGridX;
    var worldToGridZ = this.worldToGridZ;
    var cellsX = this.cellsX;
    var cellsZ = this.cellsZ;
    var step = this.cellSize;
    var rayX = ray.origin.x;
    var rayY = ray.origin.y;
    var rayZ = ray.origin.z;
    var gridRayX = Math.floor((rayX - gridMinX) * worldToGridX);
    var gridRayZ = Math.floor((rayZ - gridMinZ) * worldToGridZ);
    var maxHeight = this.maxHeight;
    var boxes, index;
    var hit = false;
    
    var rayDir = ColUtils.transformedRay.direction;
    var diff = ColUtils.transformedRay.origin;
    var absDiff = ColUtils.absDiff;
    var prod = ColUtils.prod;
    var halfExtents = 0.5;
    var closestDist = Number.MAX_VALUE;
    var closestBox = 0;
    
    var stepX = ray.direction.x * step;
    var stepY = ray.direction.y * step;
    var stepZ = ray.direction.z * step;
    var maxLengthSq = maxLength * maxLength;
    var distMoved = 0;
    var iterationsDone = 0;
    var checksDone = 0;
    
    var boxesEnabled = this.boxesEnabled;
    
    while(!hit) {
        index = gridRayZ * cellsX + gridRayX;
        boxes = grid[index];
        if (boxes) {
            for(index=0; index<boxes.length; index++) {
                i = boxes[index];
                if (!boxesEnabled[i]) continue;
                
                // ----- START COPY OF intersectsRay CODE -----
                for(j=0; j<16; j++) {
                    ColUtils.transform.data[j] = this.boxesInv[i * 16 + j];
                }

                ColUtils.transform.transformPoint(ray.origin, ColUtils.transformedRay.origin);
                ColUtils.transform.transformVector(ray.direction, ColUtils.transformedRay.direction).normalize();

                // Fast check
                absDiff.set(Math.abs(diff.x), Math.abs(diff.y), Math.abs(diff.z));
                prod.mul2(diff, rayDir);

                if (absDiff.x > halfExtents && prod.x >= 0)
                    continue;

                if (absDiff.y > halfExtents && prod.y >= 0)
                    continue;

                if (absDiff.z > halfExtents && prod.z >= 0)
                    continue;

                absDiff.set(Math.abs(rayDir.x), Math.abs(rayDir.y), Math.abs(rayDir.z));
                prod.cross(rayDir, diff);
                prod.set(Math.abs(prod.x), Math.abs(prod.y), Math.abs(prod.z));

                if (prod.x > halfExtents * absDiff.z + halfExtents * absDiff.y)
                    continue;

                if (prod.y > halfExtents * absDiff.z + halfExtents * absDiff.x)
                    continue;

                if (prod.z > halfExtents * absDiff.y + halfExtents * absDiff.x)
                    continue;
                
                // Precise check
                ColUtils.invR.set(1.0 / rayDir.x, 1.0 / rayDir.y, 1.0 / rayDir.z);
                ColUtils.tbot.copy(ColUtils.boxmin).sub(diff).mul(ColUtils.invR);
                ColUtils.ttop.copy(ColUtils.boxmax).sub(diff).mul(ColUtils.invR);

                ColUtils.tmin.set(
                    Math.min(ColUtils.ttop.x, ColUtils.tbot.x),
                    Math.min(ColUtils.ttop.y, ColUtils.tbot.y),
                    Math.min(ColUtils.ttop.z, ColUtils.tbot.z)
                );
                ColUtils.tmax.set(
                    Math.max(ColUtils.ttop.x, ColUtils.tbot.x),
                    Math.max(ColUtils.ttop.y, ColUtils.tbot.y),
                    Math.max(ColUtils.ttop.z, ColUtils.tbot.z)
                );

                ColUtils.t0.set(Math.max(ColUtils.tmin.x, ColUtils.tmin.y),
                                Math.max(ColUtils.tmin.x, ColUtils.tmin.z));
                var nearDist = Math.max(ColUtils.t0.x, ColUtils.t0.y);
                
                for(j=0; j<16; j++) {
                    ColUtils.transform.data[j] = this.boxes[i * 16 + j];
                }

                ColUtils.posOnBox.copy(ColUtils.transformedRay.direction).scale(nearDist).add(ColUtils.transformedRay.origin);
                if (pickedNormal) {
                    ColUtils.localPosOnBox.copy(ColUtils.posOnBox);
                }
                ColUtils.transform.transformPoint(ColUtils.posOnBox, ColUtils.posOnBox);

                var dist = ColUtils.transformedRay.origin.sub2(ray.origin, ColUtils.posOnBox).lengthSq();
                if (dist > maxLengthSq) { // DIFFERENCE FROM COPY
                    continue;
                }
                
                if (dist < closestDist) {
                    closestDist = dist;
                    ColUtils.closestPos.copy(ColUtils.posOnBox);
                    hit = true;
                    if (pickedNormal) {
                        ColUtils.localClosestPos.copy(ColUtils.localPosOnBox);
                    }
                    closestBox = i;
                }
                // ----- END COPY OF intersectsRay CODE -----
                checksDone++;
            }
        }
        iterationsDone++;
        if (iterationsDone > 100) {
            console.log("Collision raymarching stuck! " + stepX + " " + stepZ);
            break;
        }
        if (hit) break;
        if (distMoved > maxLength) break;
        distMoved += step;
        rayX += stepX;
        rayY += stepY;
        rayZ += stepZ;
        gridRayX = Math.floor((rayX - gridMinX) * worldToGridX);
        gridRayZ = Math.floor((rayZ - gridMinZ) * worldToGridZ);
        if (gridRayX < 0 || gridRayZ < 0 || gridRayX >= cellsX || gridRayZ >= cellsZ) break;
        if (rayY < -10 || rayY > maxHeight) break;
    }
    
    // ----- START COPY OF intersectsRay CODE 2 -----
    if (hit) {
        ColUtils.hitBoxId = closestBox;
        pickedPoint.copy(ColUtils.closestPos);
        if (pickedNormal) {
            var lx, ly, lz, alx, aly, alz;
            lx = ColUtils.localClosestPos.x;
            ly = ColUtils.localClosestPos.y;
            lz = ColUtils.localClosestPos.z;
            alx = Math.abs(lx);
            aly = Math.abs(ly);
            alz = Math.abs(lz);
            if (alx > aly && alx > alz) {
                if (lx > 0) {
                    pickedNormal.set(1,0,0);
                } else {
                    pickedNormal.set(-1,0,0);
                }
            } else if (aly > alx && aly > alz) {
                if (ly > 0) {
                    pickedNormal.set(0,1,0);
                } else {
                    pickedNormal.set(0,-1,0);
                }
            } else {
                if (lz > 0) {
                    pickedNormal.set(0,0,1);
                } else {
                    pickedNormal.set(0,0,-1);
                }
            }
            for(j=0; j<16; j++) {
                ColUtils.transform.data[j] = this.boxes[closestBox * 16 + j];
            }
            ColUtils.transform.transformVector(pickedNormal, pickedNormal).normalize();
        }
        return true;
    }
    return false;
    // ----- END COPY OF intersectsRay CODE 2 -----
};

ColModel.prototype.intersectsRay = function(ray, pickedPoint, pickedNormal, maxLength) {
    if (!maxLength) maxLength = Number.MAX_VALUE;
    if (this.grid) return this.intersectsRayGrid(ray, pickedPoint, pickedNormal, maxLength);
    var i, j;
    var rayDir = ColUtils.transformedRay.direction;
    var diff = ColUtils.transformedRay.origin;
    var absDiff = ColUtils.absDiff;
    var prod = ColUtils.prod;
    var halfExtents = 0.5;
    var closestDist = Number.MAX_VALUE;
    var hit = false;
    var closestBox = 0;
    var boxesEnabled = this.boxesEnabled;
    for(i=0; i<this.boxCount; i++) {
        if (!boxesEnabled[i]) continue;
        
        for(j=0; j<16; j++) {
            ColUtils.transform.data[j] = this.boxesInv[i * 16 + j];
        }
        // TODO: use TRinv and R like in pushSphereOut for performance and indentical ray distance

        // Inverse tranform ray into unit box
        ColUtils.transform.transformPoint(ray.origin, ColUtils.transformedRay.origin);
        ColUtils.transform.transformVector(ray.direction, ColUtils.transformedRay.direction).normalize();

        // Fast check
        absDiff.set(Math.abs(diff.x), Math.abs(diff.y), Math.abs(diff.z));
        prod.mul2(diff, rayDir);

        if (absDiff.x > halfExtents && prod.x >= 0)
            continue;

        if (absDiff.y > halfExtents && prod.y >= 0)
            continue;

        if (absDiff.z > halfExtents && prod.z >= 0)
            continue;

        absDiff.set(Math.abs(rayDir.x), Math.abs(rayDir.y), Math.abs(rayDir.z));
        prod.cross(rayDir, diff);
        prod.set(Math.abs(prod.x), Math.abs(prod.y), Math.abs(prod.z));

        if (prod.x > halfExtents * absDiff.z + halfExtents * absDiff.y)
            continue;

        if (prod.y > halfExtents * absDiff.z + halfExtents * absDiff.x)
            continue;

        if (prod.z > halfExtents * absDiff.y + halfExtents * absDiff.x)
            continue;

        // Precise check
        ColUtils.invR.set(1.0 / rayDir.x, 1.0 / rayDir.y, 1.0 / rayDir.z);
        ColUtils.tbot.copy(ColUtils.boxmin).sub(diff).mul(ColUtils.invR);
        ColUtils.ttop.copy(ColUtils.boxmax).sub(diff).mul(ColUtils.invR);

        ColUtils.tmin.set(
            Math.min(ColUtils.ttop.x, ColUtils.tbot.x),
            Math.min(ColUtils.ttop.y, ColUtils.tbot.y),
            Math.min(ColUtils.ttop.z, ColUtils.tbot.z)
        );
        ColUtils.tmax.set(
            Math.max(ColUtils.ttop.x, ColUtils.tbot.x),
            Math.max(ColUtils.ttop.y, ColUtils.tbot.y),
            Math.max(ColUtils.ttop.z, ColUtils.tbot.z)
        );

        ColUtils.t0.set(Math.max(ColUtils.tmin.x, ColUtils.tmin.y),
                        Math.max(ColUtils.tmin.x, ColUtils.tmin.z));
        var nearDist = Math.max(ColUtils.t0.x, ColUtils.t0.y);

        /*ColUtils.t0.set(Math.min(ColUtils.tmax.x, ColUtils.tmax.y),
                        Math.min(ColUtils.tmax.x, ColUtils.tmax.z));
        var farDist = Math.min(ColUtils.t0.x, ColUtils.t0.y);

        if (nearDist > farDist) continue;*/

        for(j=0; j<16; j++) {
            ColUtils.transform.data[j] = this.boxes[i * 16 + j];
        }

        ColUtils.posOnBox.copy(ColUtils.transformedRay.direction).scale(nearDist).add(ColUtils.transformedRay.origin);
        if (pickedNormal) {
            ColUtils.localPosOnBox.copy(ColUtils.posOnBox);
        }
        ColUtils.transform.transformPoint(ColUtils.posOnBox, ColUtils.posOnBox);

        var dist = ColUtils.transformedRay.origin.sub2(ray.origin, ColUtils.posOnBox).lengthSq();
        if (dist < closestDist) {
            closestDist = dist;
            ColUtils.closestPos.copy(ColUtils.posOnBox);
            hit = true;
            if (pickedNormal) {
                ColUtils.localClosestPos.copy(ColUtils.localPosOnBox);
            }
            closestBox = i;
        }
    }
    if (hit) {
        ColUtils.hitBoxId = closestBox;
        pickedPoint.copy(ColUtils.closestPos);
        if (pickedNormal) {
            var lx, ly, lz, alx, aly, alz;
            lx = ColUtils.localClosestPos.x;
            ly = ColUtils.localClosestPos.y;
            lz = ColUtils.localClosestPos.z;
            alx = Math.abs(lx);
            aly = Math.abs(ly);
            alz = Math.abs(lz);
            if (alx > aly && alx > alz) {
                if (lx > 0) {
                    pickedNormal.set(1,0,0);
                } else {
                    pickedNormal.set(-1,0,0);
                }
            } else if (aly > alx && aly > alz) {
                if (ly > 0) {
                    pickedNormal.set(0,1,0);
                } else {
                    pickedNormal.set(0,-1,0);
                }
            } else {
                if (lz > 0) {
                    pickedNormal.set(0,0,1);
                } else {
                    pickedNormal.set(0,0,-1);
                }
            }
            for(j=0; j<16; j++) {
                ColUtils.transform.data[j] = this.boxes[closestBox * 16 + j];
            }
            ColUtils.transform.transformVector(pickedNormal, pickedNormal).normalize();
        }
        return true;
    }
    return false;
};

ColModel.prototype.pushSphereOutGrid = function(sphere, normal) {
    var prod = ColUtils.prod;
    var grid = this.grid;
    var cellsX = this.cellsX;
    var boxesEnabled = this.boxesEnabled;
    var center = sphere.center;
    var radius = sphere.radius;
    var gridMinX = Math.floor(((center.x - radius) - this.gridMinX) * this.worldToGridX);
    var gridMaxX = Math.floor(((center.x + radius) - this.gridMinX) * this.worldToGridX);
    var gridMinZ = Math.floor(((center.z - radius) - this.gridMinZ) * this.worldToGridZ);
    var gridMaxZ = Math.floor(((center.z + radius) - this.gridMinZ) * this.worldToGridZ);
    var gz, gx, i, j, sq, out, pn, bMin, bMax, val, pushLen;
    var index, boxes;
    var pushed = false;
    for(gz=gridMinZ; gz<=gridMaxZ; gz++) {
        for(gx=gridMinX; gx<=gridMaxX; gx++) {
            index = gz * cellsX + gx;
            boxes = grid[index];
            if (boxes) {
                for(index=0; index<boxes.length; index++) {
                    i = boxes[index];
                    if (!boxesEnabled[i]) continue;
                    
                    // normal push code start
                    for(j=0; j<16; j++) {
                        ColUtils.transform.data[j] = this.boxesTRInv[i * 16 + j];
                    }
                    ColUtils.transform.transformPoint(center, ColUtils.transformedRay.origin);
                    
                    // _distanceToBoundingSphereSq
                    // prod = closest pos on box
                    sq = 0;
                    for (j = 0; j < 3; ++j) {
                        out = 0;
                        pn = ColUtils.transformedRay.origin.data[j];
                        prod.data[j] = pn;
                        bMin = this.boxesScale[i * 3 + j] * -0.5;// boxMin.data[i];
                        bMax = this.boxesScale[i * 3 + j] * 0.5;// boxMax.data[i];
                        val = 0;

                        if (pn < bMin) {
                            val = (bMin - pn);
                            prod.data[j] = bMin;
                            out += val * val;
                        }

                        if (pn > bMax) {
                            val = (pn - bMax);
                            prod.data[j] = bMax;
                            out += val * val;
                        }

                        sq += out;
                    }
                    // intersectsBoundingSphere
                    if (sq > radius * radius) continue;

                    pushLen = sphere.radius - Math.sqrt(sq);
                    prod.x = ColUtils.transformedRay.origin.x - prod.x;
                    prod.y = ColUtils.transformedRay.origin.y - prod.y;
                    prod.z = ColUtils.transformedRay.origin.z - prod.z;
                    prod.normalize().scale(pushLen);

                    ColUtils.tmpQuat.x = this.boxesR[i * 4 + 0];
                    ColUtils.tmpQuat.y = this.boxesR[i * 4 + 1];
                    ColUtils.tmpQuat.z = this.boxesR[i * 4 + 2];
                    ColUtils.tmpQuat.w = this.boxesR[i * 4 + 3];

                    ColUtils.tmpQuat.transformVector(prod, prod);
                    sphere.center.add(prod);
                    pushed = true;
                    if (normal) {
                        normal.copy(prod);
                    }
                    
                }
            }
        }
    }
    return pushed;
};

ColModel.prototype.pushSphereOut = function(sphere, normal) {
    if (this.grid) return this.pushSphereOutGrid(sphere, normal);
    var i, j, sq;
    var rayDir = ColUtils.transformedRay.direction;
    var diff = ColUtils.transformedRay.origin;
    var absDiff = ColUtils.absDiff;
    var prod = ColUtils.prod;
    var halfExtents = 0.5;
    var pushed = false;
    var boxesEnabled = this.boxesEnabled;
    for(i=0; i<this.boxCount; i++) {
        if (!boxesEnabled[i]) continue;
        
        for(j=0; j<16; j++) {
            ColUtils.transform.data[j] = this.boxesTRInv[i * 16 + j];
        }
        ColUtils.transform.transformPoint(sphere.center, ColUtils.transformedRay.origin);

        // _distanceToBoundingSphereSq
        // prod = closest pos on box
        sq = 0;
        for (j = 0; j < 3; ++j) {
            var out = 0;
            var pn = ColUtils.transformedRay.origin.data[j];
            prod.data[j] = pn;
            var bMin = this.boxesScale[i * 3 + j] * -0.5;// boxMin.data[i];
            var bMax = this.boxesScale[i * 3 + j] * 0.5;// boxMax.data[i];
            var val = 0;

            if (pn < bMin) {
                val = (bMin - pn);
                prod.data[j] = bMin;
                out += val * val;
            }

            if (pn > bMax) {
                val = (pn - bMax);
                prod.data[j] = bMax;
                out += val * val;
            }

            sq += out;
        }
        // intersectsBoundingSphere
        if (sq > sphere.radius * sphere.radius) continue;

        var pushLen = sphere.radius - Math.sqrt(sq);
        prod.x = ColUtils.transformedRay.origin.x - prod.x;
        prod.y = ColUtils.transformedRay.origin.y - prod.y;
        prod.z = ColUtils.transformedRay.origin.z - prod.z;
        prod.normalize().scale(pushLen);

        ColUtils.tmpQuat.x = this.boxesR[i * 4 + 0];
        ColUtils.tmpQuat.y = this.boxesR[i * 4 + 1];
        ColUtils.tmpQuat.z = this.boxesR[i * 4 + 2];
        ColUtils.tmpQuat.w = this.boxesR[i * 4 + 3];

        ColUtils.tmpQuat.transformVector(prod, prod);
        sphere.center.add(prod);
        pushed = true;
        if (normal) {
            normal.copy(prod);
        }
    }
    return pushed;
};
