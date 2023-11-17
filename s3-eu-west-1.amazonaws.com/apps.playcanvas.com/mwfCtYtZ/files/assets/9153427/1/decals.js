var Decals = pc.createScript('decals');

Decals.attributes.add('staticModelNames', {
    type: 'string',
    array: true
});

// initialize code called once per entity
Decals.prototype.initialize = function() {
    pc.decals = this;
};

Decals.prototype.initializeDecals = function(colModel) {
    var boxTris = [];
    var boxNormals = [];
    var boxTriPlanes = [];
    var boxTriAabbs = [];
    
    var normalPush = 0.01;
    var boxMargin = 10;//2.5;
    
    var meshInstances = [];
    var meshIndexData = [];
    var meshTriPlanes = [];
    var meshVertexData = [];
    var meshNormalData = [];
    var meshReadyVertexData = [];
    var meshReadyNormalData = [];
    var triAabbGroups = [];
    var triPlanes = [];
    
    var i, meshes, j, k;
    var bboxIdentity = new pc.BoundingBox();
    var bbox = new pc.BoundingBox();
    var triBbox = new pc.BoundingBox();
    var minPos, maxPos;
    var indexBase, numIndices, mesh, v0, v1, v2, x0, y0, z0, x1, y1, z1, x2, y2, z2;
    var indexData, vertexData, normalData, vertexSize, vertexSizeF, numVerts;
    var fmin = Math.min;
    var fmax = Math.max;
    var fsqrt = Math.sqrt;
    var triAabbs;
    var tmpVec1 = new pc.Vec3();
    var tmpVecData1 = tmpVec1.data;
    var tmpVec2 = new pc.Vec3();
    var tmpVecData2 = tmpVec2.data;
    var matrix;
    var elems, offsetN, offsetNF;
    var px, py, pz, qx, qy, qz, rx, ry, rz, len;
    var triAabbsIndex, triPlanesIndex;
    var kv;
    
    var tt = pc.now();
    var ttt;
    this.timeVertex = 0;
    this.timeIndex = 0;
    
    // Collect static mesh data for decal generation
    for(i=0; i<this.staticModelNames.length; i++) {
        meshes = this.app.root.findByName(this.staticModelNames[i]).model.meshInstances;
        for(j=0; j<meshes.length; j++) {
            meshInstances.push(meshes[j]);
            
            matrix = meshes[j].node.getWorldTransform();
            pc.testMesh = meshes[j].node;
            mesh = meshes[j].mesh;
            indexBase = mesh.primitive[0].base;
            numIndices = mesh.primitive[0].count;
            indexData = new Uint16Array(mesh.indexBuffer[0].storage);
            vertexData = new Float32Array(mesh.vertexBuffer.storage);
            vertexSize = mesh.vertexBuffer.format.size;
            vertexSizeF = vertexSize / 4;
            numVerts = mesh.vertexBuffer.numVertices;
            
            elems = mesh.vertexBuffer.format.elements;
            for(k=0; k<elems.length; k++) {
                if (elems[k].name === pc.SEMANTIC_NORMAL) {
                    offsetN = elems[k].offset;
                    offsetNF = offsetN / 4;
                }
            }
            
            // Push verts slightly in normal direction and transform to world space
            meshReadyVertexData[j] = new Float32Array(numVerts * 3);
            meshReadyNormalData[j] = new Float32Array(numVerts * 3);
            ttt = pc.now();
            kv = 0;
            for(k=0; k<numVerts; k++) {
                kv = k * vertexSizeF;
                
                /*tmpVecData1[0] = vertexData[kv]     ;//   + x1 * normalPush;
                tmpVecData1[1] = vertexData[kv + 1] ;//   + y1 * normalPush;
                tmpVecData1[2] = vertexData[kv + 2] ;//   + z1 * normalPush;
                matrix.transformPoint(tmpVec1, tmpVec1);
                meshReadyVertexData[j][k * 3] = tmpVecData1[0];
                meshReadyVertexData[j][k * 3 + 1] = tmpVecData1[1];
                meshReadyVertexData[j][k * 3 + 2] = tmpVecData1[2];*/
                
                // transform is just -90 0 0 anyway
                meshReadyVertexData[j][k * 3] = vertexData[kv];
                meshReadyVertexData[j][k * 3 + 1] = vertexData[kv + 2];
                meshReadyVertexData[j][k * 3 + 2] = -vertexData[kv + 1];
                
                kv += offsetNF;
                /*tmpVecData1[0] = vertexData[kv];
                tmpVecData1[1] = vertexData[kv + 1];
                tmpVecData1[2] = vertexData[kv + 2];
                matrix.transformVector(tmpVec1, tmpVec1);
                meshReadyNormalData[j][k * 3] = tmpVecData1[0];
                meshReadyNormalData[j][k * 3 + 1] = tmpVecData1[1];
                meshReadyNormalData[j][k * 3 + 2] = tmpVecData1[2];*/
                
                meshReadyNormalData[j][k * 3] = vertexData[kv];
                meshReadyNormalData[j][k * 3 + 1] = vertexData[kv + 2];
                meshReadyNormalData[j][k * 3 + 2] = -vertexData[kv + 1];
            }
            this.timeVertex += pc.now() - ttt;
            vertexData = meshReadyVertexData[j];
            normalData = meshReadyNormalData[j];
            
            //triAabbs = [];
            //triPlanes = [];
            triAabbs = new Float32Array((numIndices/3)*6); triAabbsIndex = 0;
            triPlanes = new Float32Array((numIndices/3)*4); triPlanesIndex = 0;
            
            ttt = pc.now();
            // Collect triangle AABBs and planes
            for(k=indexBase; k<indexBase + numIndices; k += 3) {
                v0 = indexData[k];
                v1 = indexData[k + 1];
                v2 = indexData[k + 2];
                
                x0 = vertexData[v0 * 3];
                y0 = vertexData[v0 * 3 + 1];
                z0 = vertexData[v0 * 3 + 2];
                
                x1 = vertexData[v1 * 3];
                y1 = vertexData[v1 * 3 + 1];
                z1 = vertexData[v1 * 3 + 2];
                
                x2 = vertexData[v2 * 3];
                y2 = vertexData[v2 * 3 + 1];
                z2 = vertexData[v2 * 3 + 2];
                
                /*
                triAabbs.push(fmin(fmin(x0,x1),x2));
                triAabbs.push(fmax(fmax(x0,x1),x2));
                
                triAabbs.push(fmin(fmin(y0,y1),y2));
                triAabbs.push(fmax(fmax(y0,y1),y2));
                
                triAabbs.push(fmin(fmin(z0,z1),z2));
                triAabbs.push(fmax(fmax(z0,z1),z2));
                */
                
                triAabbs[triAabbsIndex] = fmin(fmin(x0,x1),x2); triAabbsIndex++;
                triAabbs[triAabbsIndex] = fmax(fmax(x0,x1),x2); triAabbsIndex++;
                
                triAabbs[triAabbsIndex] = fmin(fmin(y0,y1),y2); triAabbsIndex++;
                triAabbs[triAabbsIndex] = fmax(fmax(y0,y1),y2); triAabbsIndex++;
                
                triAabbs[triAabbsIndex] = fmin(fmin(z0,z1),z2); triAabbsIndex++;
                triAabbs[triAabbsIndex] = fmax(fmax(z0,z1),z2); triAabbsIndex++;
                
                // Get the vectors for two edges of the triangle.
                /*px = x0 - x1;
                py = y0 - y1;
                pz = z0 - z1;
                
                qx = x1 - x2;
                qy = y1 - y2;
                qz = z1 - z2;
                
                // Compute their cross product.
                rx = py * qz - qy * pz;
                ry = pz * qx - qz * px;
                rz = px * qy - qx * py;

                //Normalize
                len = 1.0 / fsqrt(rx*rx + ry*ry + rz*rz);
                rx *= len;
                ry *= len;
                rz *= len;*/
                
                x0 = normalData[v0 * 3];
                y0 = normalData[v0 * 3 + 1];
                z0 = normalData[v0 * 3 + 2];
                
                x1 = normalData[v1 * 3];
                y1 = normalData[v1 * 3 + 1];
                z1 = normalData[v1 * 3 + 2];
                
                x2 = normalData[v2 * 3];
                y2 = normalData[v2 * 3 + 1];
                z2 = normalData[v2 * 3 + 2];
                
                rx = x0 + x1 + x2;
                ry = y0 + y1 + y2;
                rz = z0 + z1 + z2;
                
                len = 1.0 / fsqrt(rx*rx + ry*ry + rz*rz);
                rx *= len;
                ry *= len;
                rz *= len;
                
                /*
                triPlanes.push(rx);
                triPlanes.push(ry);
                triPlanes.push(rz);
                triPlanes.push(rx*x0 + ry*y0 + rz*z0);
                */
                
                triPlanes[triPlanesIndex] = rx;
                triPlanes[triPlanesIndex+1] = ry;
                triPlanes[triPlanesIndex+2] = rz;
                triPlanes[triPlanesIndex+3] = rx*x0 + ry*y0 + rz*z0;
                triPlanesIndex += 4;
            }
            this.timeIndex += pc.now() - ttt;
            
            meshIndexData.push(indexData);
            meshTriPlanes.push(triPlanes);
            meshVertexData.push(vertexData);
            meshNormalData.push(normalData);
            triAabbGroups.push(triAabbs);
        }
    }
    
    this.timeCollect = pc.now() - tt;
    tt = pc.now();
    
    // Assign vertex positions, triangle AABBs and planes to each intersecting collision model box
    var index, tris, planes, planeIndex, triAabbsOutput, normals, res1, res2;
    for(i=0; i<colModel.boxCount; i++) {
        tris = [];
        triPlanes = [];
        triAabbsOutput = [];
        normals = [];
        
        for(j=0; j<16; j++) {
            ColUtils.transform.data[j] = colModel.boxes[i * 16 + j];
        }
        bbox.setFromTransformedAabb(bboxIdentity, ColUtils.transform);
        bbox.halfExtents.x += boxMargin * 0.5;
        bbox.halfExtents.y += boxMargin * 0.5;
        bbox.halfExtents.z += boxMargin * 0.5;
        minPos = bbox.getMin().data;
        maxPos = bbox.getMax().data;
        for(j=0; j<meshInstances.length; j++) {
            if (!meshInstances[j].aabb.intersects(bbox)) continue;
            
            triAabbs = triAabbGroups[j];
            mesh = meshInstances[j].mesh;
            indexBase = mesh.primitive[0].base;
            numIndices = mesh.primitive[0].count;
            indexData = meshIndexData[j];
            vertexData = meshVertexData[j];
            normalData = meshNormalData[j];
            vertexSize = mesh.vertexBuffer.format.size;
            planes = meshTriPlanes[j];
            
            index = indexBase;
            planeIndex = 0;
            for(k=0; k<triAabbs.length; k += 6) {
                
                /*tmpVecData1[0] = triAabbs[k];
                tmpVecData1[1] = triAabbs[k+2];
                tmpVecData1[2] = triAabbs[k+4];
                
                tmpVecData2[0] = triAabbs[k+1];
                tmpVecData2[1] = triAabbs[k+3];
                tmpVecData2[2] = triAabbs[k+5];*/
                
                //triBbox.setMinMax(tmpVec1, tmpVec2);
                //res1 = triBbox.intersects(bbox);
                res2 = (triAabbs[k] <= maxPos[0] && triAabbs[k+1] >= minPos[0] &&
                   triAabbs[k+2] <= maxPos[1] && triAabbs[k+3] >= minPos[1] &&
                   triAabbs[k+4] <= maxPos[2] && triAabbs[k+5] >= minPos[2]);
                
                //if (res1 !== res2) {
                    //console.log("!");
                //}
                
                if (!res2) {
                    index += 3;
                    planeIndex += 4;
                    continue;
                }
                
                v0 = indexData[index];
                v1 = indexData[index + 1];
                v2 = indexData[index + 2];
                
                x0 = vertexData[v0 * 3];
                y0 = vertexData[v0 * 3 + 1];
                z0 = vertexData[v0 * 3 + 2];
                
                x1 = vertexData[v1 * 3];
                y1 = vertexData[v1 * 3 + 1];
                z1 = vertexData[v1 * 3 + 2];
                
                x2 = vertexData[v2 * 3];
                y2 = vertexData[v2 * 3 + 1];
                z2 = vertexData[v2 * 3 + 2];
                
                tris.push(x0);
                tris.push(y0);
                tris.push(z0);
                
                tris.push(x1);
                tris.push(y1);
                tris.push(z1);
                
                tris.push(x2);
                tris.push(y2);
                tris.push(z2);
                
                x0 = normalData[v0 * 3];
                y0 = normalData[v0 * 3 + 1];
                z0 = normalData[v0 * 3 + 2];
                
                x1 = normalData[v1 * 3];
                y1 = normalData[v1 * 3 + 1];
                z1 = normalData[v1 * 3 + 2];
                
                x2 = normalData[v2 * 3];
                y2 = normalData[v2 * 3 + 1];
                z2 = normalData[v2 * 3 + 2];
                
                normals.push(x0);
                normals.push(y0);
                normals.push(z0);
                
                normals.push(x1);
                normals.push(y1);
                normals.push(z1);
                
                normals.push(x2);
                normals.push(y2);
                normals.push(z2);
                
                triPlanes.push(planes[planeIndex]);
                triPlanes.push(planes[planeIndex + 1]);
                triPlanes.push(planes[planeIndex + 2]);
                triPlanes.push(planes[planeIndex + 3]);
                
                triAabbsOutput.push(triAabbs[k]);
                triAabbsOutput.push(triAabbs[k+1]);
                triAabbsOutput.push(triAabbs[k+2]);
                triAabbsOutput.push(triAabbs[k+3]);
                triAabbsOutput.push(triAabbs[k+4]);
                triAabbsOutput.push(triAabbs[k+5]);
                
                /*
                triAabbsOutput.push(triBbox.center.data[0]);
                triAabbsOutput.push(triBbox.center.data[1]);
                triAabbsOutput.push(triBbox.center.data[2]);
                triAabbsOutput.push(triBbox.halfExtents.data[0]);
                triAabbsOutput.push(triBbox.halfExtents.data[1]);
                triAabbsOutput.push(triBbox.halfExtents.data[2]);
                */
                
                index += 3;
                planeIndex += 4;
            }
        }
        
        boxTris[i] = tris;
        boxNormals[i] = normals;
        boxTriPlanes[i] = triPlanes;
        boxTriAabbs[i] = triAabbsOutput;
    }
    this.timeAssign = pc.now() - tt;
    
    // Add "floor" data, because it's not in the collision model
    tris = [-100, 0.01, 100,
            100, 0.01, -100,
           -100, 0.01, -100,
           
           -100, 0.01, 100,
           100, 0.01, 100,
           100, 0.01, -100];
    
    triPlanes = [0,1,0,0, 0,1,0,0];
    
    normals = [0,1,0, 0,1,0];
    
    /*triAabbsOutput = [0,0,0, 100,0.01,100,
              0,0,0, 100,0.01,100];*/
    triAabbsOutput = [-50,50, -0.05,0.05, -50,50,
                      -50,50, -0.05,0.05, -50,50];
    
    boxTris.push(tris);
    boxNormals.push(normals);
    boxTriPlanes.push(triPlanes);
    boxTriAabbs.push(triAabbsOutput);
    
    // Save data
    this.boxTris = boxTris;
    this.boxNormals = boxNormals;
    this.boxTriPlanes = boxTriPlanes;
    this.boxTriAabbs = boxTriAabbs;
    this.triBbox = triBbox;
    this.bbox = bbox;
    
    // Create decal vertex format
    var formatDesc = [];
    formatDesc.push({
        semantic: pc.SEMANTIC_POSITION,
        components: 3,
        type: pc.ELEMENTTYPE_FLOAT32,
        normalize: false
    });
    formatDesc.push({
        semantic: pc.SEMANTIC_NORMAL,
        components: 3,
        type: pc.ELEMENTTYPE_FLOAT32,
        normalize: false
    });
    formatDesc.push({
        semantic: pc.SEMANTIC_TEXCOORD0,
        components: 2,
        type: pc.ELEMENTTYPE_FLOAT32,
        normalize: false
    });
    this.vertexFormat = new pc.VertexFormat(this.app.graphicsDevice, formatDesc);
    
    // Create temp vectors
    this.right = new pc.Vec3();
    this.up = new pc.Vec3();
    this.tmpVec1 = tmpVec1;
    this.matrix = new pc.Mat4();
    this.matrixInv = new pc.Mat4();
};

Decals.prototype.createGroup = function(material, maxVertsInDecal, maxDecals, normalMapped, offset) {
    var vertexBuffer = new pc.VertexBuffer(this.app.graphicsDevice, this.vertexFormat, maxDecals * maxVertsInDecal, pc.BUFFER_STATIC);
    var vertexData = new Float32Array(vertexBuffer.lock());
    vertexBuffer.unlock();
    //indexBuffer.unlock();
    
    var mesh = new pc.Mesh();
    mesh.vertexBuffer = vertexBuffer;
    //mesh.indexBuffer[0] = indexBuffer;
    mesh.primitive[0].type = pc.PRIMITIVE_TRIANGLES;
    mesh.primitive[0].base = 0;
    mesh.primitive[0].count = maxDecals * maxVertsInDecal;
    mesh.primitive[0].indexed = false;//true;
    
    var node = new pc.GraphNode();
    node.setPosition(offset);
    var meshInstance = new pc.MeshInstance(node, mesh, material);
    meshInstance.node.name = "decal";
    meshInstance.cull = false;
    var aabb = meshInstance.aabb;
    meshInstance._updateAabb = false;
    meshInstance._aabb = new pc.BoundingBox(offset.clone().scale(-10000), pc.Vec3.ONE);
    
    this.app.scene.drawCalls.push(meshInstance);
    
    return {
        meshInstance: meshInstance,
        maxDecals: maxDecals,
        maxVertsInDecal: maxVertsInDecal,
        vertexData: vertexData,
        vertexOffset: 0,
        decalVertStarts: [],
        decalCounter: 0,
        normalMapped: normalMapped//,
        //offset: offset
    };
};

Decals.prototype.clearGroup = function(group) {
    var vb = group.vertexData;
    for(var i=0; i<vb.length; i++) {
        vb[i] = 0;
    }
    group.meshInstance.mesh.vertexBuffer.unlock();
    group.vertexOffset = 0;
    group.decalVertStarts.length = 0;
    group.decalCounter = 0;
};

Decals.prototype.addDecal = function(boxId, pos, normal, group, size, cameraNormal) {
    if (boxId === -1) return;
    var isPlane = boxId === -2;
    if (boxId === -2) boxId = this.boxTris.length - 1;
    
    var depth = 2;
    
    var meshInstance = group.meshInstance;
    var material = meshInstance.material;
    var maxDecals = group.maxDecals;
    var maxVertsInDecal = group.maxVertsInDecal;
    var groupVertexData = group.vertexData;
    var decalVertStarts = group.decalVertStarts;
    var normalMapped = group.normalMapped;
    
    var i;
    var tris = this.boxTris[boxId];
    var triNormals = this.boxNormals[boxId];
    var triPlanes = this.boxTriPlanes[boxId];
    var triAabbs = this.boxTriAabbs[boxId];
    var numIndices = tris.length / 3;
    var numTris = numIndices / 3;
    
    var bbox = this.bbox;
    var triBbox = this.triBbox;
    //var triBboxCenter = triBbox.center.data;
    //var triBboxHalfExtents = triBbox.halfExtents.data;
    var matrix = this.matrix;
    var matrixInv = this.matrixInv;
    
    // Find decal right/up vectors from normal; also find decal AABB
    bbox.center.copy(pos);
    var halfSize = size * 0.5;
    var absnx = Math.abs(normal.x);
    var absny = Math.abs(normal.y);
    var absnz = Math.abs(normal.z);
    var right = this.right;
    var up = this.up;
    if (absnx > absny && absnx > absnz) {
        bbox.halfExtents.set(halfSize * depth, halfSize, halfSize);
        up.copy(pc.Vec3.UP).scale(size);
        right.cross(normal, pc.Vec3.UP).scale(size);
    } else if (absnz > absnx && absnz > absny) {
        bbox.halfExtents.set(halfSize, halfSize, halfSize * depth);
        up.copy(pc.Vec3.UP).scale(size);
        right.cross(normal, pc.Vec3.UP).scale(size);
    } else {
        bbox.halfExtents.set(halfSize, halfSize * depth, halfSize);
        up.copy(pc.Vec3.FORWARD).scale(size);
        right.cross(normal, pc.Vec3.FORWARD).scale(size);
    }
    var minPos = bbox.getMin().data;
    var maxPos = bbox.getMax().data;
    
    //var indexBuffer = new pc.IndexBuffer(this.app.graphicsDevice, pc.INDEXFORMAT_UINT16, tris.length/3, pc.BUFFER_STATIC);
    //var indexData = new Uint16Array(indexBuffer.lock());
    
    // Filter triangles
    var px, py, pz, pd;
    var decalNormal = normal.data;
    var camNormal = cameraNormal.data;
    var vertexData = [];
    var normalData = [];
    var vertsAdded = 0;
    var decalPlaneD = pos.dot(normal);
    var th = 0.1;
    var res2, r2;
    for(i=0; i<numTris; i++) {
        px = triPlanes[i * 4];
        py = triPlanes[i * 4 + 1];
        pz = triPlanes[i * 4 + 2];
        if (px*camNormal[0] + py*camNormal[1] + pz*camNormal[2] < 0) continue; // filter by camera normal (could be static preprocess)
        //if (px*decalNormal[0] + py*decalNormal[1] + pz*decalNormal[2] < 0.5) continue; // filter by decal normal
        if (px*decalNormal[0] + py*decalNormal[1] + pz*decalNormal[2] < 0.01) continue; // filter by decal normal
        
        /*
        triBboxCenter[0] = triAabbs[i * 6];
        triBboxCenter[1] = triAabbs[i * 6 + 1];
        triBboxCenter[2] = triAabbs[i * 6 + 2];
        
        triBboxHalfExtents[0] = triAabbs[i * 6 + 3];
        triBboxHalfExtents[1] = triAabbs[i * 6 + 4];
        triBboxHalfExtents[2] = triAabbs[i * 6 + 5];
        
        if (!triBbox.intersects(bbox)) continue; // filter by AABB
        */
        r2 = i * 6;
        res2 = (triAabbs[r2] <= maxPos[0] && triAabbs[r2+1] >= minPos[0] &&
           triAabbs[r2+2] <= maxPos[1] && triAabbs[r2+3] >= minPos[1] &&
           triAabbs[r2+4] <= maxPos[2] && triAabbs[r2+5] >= minPos[2]);
        if (!res2) continue; // filter by AABB
        
        
        x0 = tris[(i * 3) * 3];
        y0 = tris[(i * 3) * 3 + 1];
        z0 = tris[(i * 3) * 3 + 2];
        if (x0*decalNormal[0] + y0*decalNormal[1] + z0*decalNormal[2] - decalPlaneD > th) continue; // filter by normal plane
        
        x1 = tris[(i * 3 + 1) * 3];
        y1 = tris[(i * 3 + 1) * 3 + 1];
        z1 = tris[(i * 3 + 1) * 3 + 2];
        if (x1*decalNormal[0] + y1*decalNormal[1] + z1*decalNormal[2] - decalPlaneD > th) continue;
        
        x2 = tris[(i * 3 + 2) * 3];
        y2 = tris[(i * 3 + 2) * 3 + 1];
        z2 = tris[(i * 3 + 2) * 3 + 2];
        if (x2*decalNormal[0] + y2*decalNormal[1] + z2*decalNormal[2] - decalPlaneD > th) continue;
        
        vertexData.push(x0);
        vertexData.push(y0);
        vertexData.push(z0);
        
        vertexData.push(x1);
        vertexData.push(y1);
        vertexData.push(z1);
        
        vertexData.push(x2);
        vertexData.push(y2);
        vertexData.push(z2);
        
        x0 = triNormals[(i * 3) * 3];
        y0 = triNormals[(i * 3) * 3 + 1];
        z0 = triNormals[(i * 3) * 3 + 2];
        
        x1 = triNormals[(i * 3 + 1) * 3];
        y1 = triNormals[(i * 3 + 1) * 3 + 1];
        z1 = triNormals[(i * 3 + 1) * 3 + 2];
        
        x2 = triNormals[(i * 3 + 2) * 3];
        y2 = triNormals[(i * 3 + 2) * 3 + 1];
        z2 = triNormals[(i * 3 + 2) * 3 + 2];
        
        normalData.push(x0);
        normalData.push(y0);
        normalData.push(z0);
        
        normalData.push(x1);
        normalData.push(y1);
        normalData.push(z1);
        
        normalData.push(x2);
        normalData.push(y2);
        normalData.push(z2);
        
        vertsAdded += 3;
        //if (vertsAdded > maxVertsInDecal) return;
    }
    if (vertexData.length === 0) return;
    
    // Wrap vertex offset in group vertex buffer
    if (group.vertexOffset + vertsAdded >= maxDecals * maxVertsInDecal) {
        group.vertexOffset = 0;
        group.decalCounter = 0;
    }
    // Find offset to which overwrite to prevent half-rendered decals
    var currentVertEnding = group.vertexOffset + vertsAdded;
    var currentVertEndingWithOverwrite = currentVertEnding;
    for(i=1; i<decalVertStarts.length; i++) {
        vertStart = decalVertStarts[i];
        if (vertStart < currentVertEnding) {
            if (i < decalVertStarts.length - 1) {
                currentVertEndingWithOverwrite = decalVertStarts[i + 1];
            } else {
                currentVertEndingWithOverwrite = maxDecals * maxVertsInDecal;
            }
        }
    }
    decalVertStarts[group.decalCounter] = group.vertexOffset;
    group.decalCounter++;
    
    
    // Create world->decal matrix and inverse
    matrix.data[0] = right.x;
    matrix.data[1] = right.y;
    matrix.data[2] = right.z;
    matrix.data[3] = 0;
    
    matrix.data[4] = up.x;
    matrix.data[5] = up.y;
    matrix.data[6] = up.z;
    matrix.data[7] = 0;
    
    matrix.data[8] = normal.x;
    matrix.data[9] = normal.y;
    matrix.data[10] = normal.z;
    matrix.data[11] = 0;
    
    matrix.data[12] = pos.x;
    matrix.data[13] = pos.y;
    matrix.data[14] = pos.z;
    matrix.data[15] = 1;
    
    matrixInv.copy(matrix).invert();
    
    var numVerts = vertexData.length / 3;
    var tmpVec = this.tmpVec1;
    var tmp = tmpVec.data;
    //var vertexDataFull = new Float32Array((vertexData.length/3) * (3+3+2));
    var vertSizeFull = 3+3+2;
    var vertexDataFull = new Float32Array(groupVertexData.buffer, group.vertexOffset * vertSizeFull * 4);
    
    
    var rightData = right.data;
    var upData = up.data;
    
    var angle = Math.random() * Math.PI * 2;
	var ca = Math.cos(angle);
	var sa = Math.sin(angle);
    
    var angleEuler = angle * pc.math.RAD_TO_DEG;
    var decalNormalRotatedX = decalNormal[0] * angleEuler;
    var decalNormalRotatedY = decalNormal[1] * angleEuler;
    var decalNormalRotatedZ = decalNormal[2] * angleEuler;
	//float4 rotationMatrix = float4(c, -s, s, c);
    
    /*var camOffsetX = camNormal[0] * 0.01 * group.offset;
    var camOffsetY = camNormal[1] * 0.01 * group.offset;
    var camOffsetZ = camNormal[2] * 0.01 * group.offset;*/
    
    for(i=0; i<numVerts; i++) {
        tmpVec.set(vertexData[i * 3], vertexData[i * 3 + 1], vertexData[i * 3 + 2]);
        matrixInv.transformPoint(tmpVec, tmpVec);
        
        // Clamp XY position to clip decal
        if (tmp[0] < -0.5) {
            tmp[0] = -0.5;
        } else if (tmp[0] > 0.5) {
            tmp[0] = 0.5;
        }
        
        if (tmp[1] < -0.5) {
            tmp[1] = -0.5;
        } else if (tmp[1] > 0.5) {
            tmp[1] = 0.5;
        }
        
        // Generate randomly rotated decal UVs from positions
        vertexDataFull[i * vertSizeFull + 6] = tmp[0] * ca + tmp[1] * sa;
        vertexDataFull[i * vertSizeFull + 7] = tmp[0] * -sa + tmp[1] * ca;
        
        matrix.transformPoint(tmpVec, tmpVec);
        
        vertexDataFull[i * vertSizeFull] = tmp[0];// + camOffsetX;
        vertexDataFull[i * vertSizeFull + 1] = tmp[1];// + camOffsetY;
        vertexDataFull[i * vertSizeFull + 2] = tmp[2];// + camOffsetZ;
        
        //vertexDataFull[i * vertSizeFull + 3] = decalNormal[0];
        //vertexDataFull[i * vertSizeFull + 4] = decalNormal[1];
        //vertexDataFull[i * vertSizeFull + 5] = decalNormal[2];
        
        //vertexDataFull[i * vertSizeFull + 3] = normalData[i * 3];
        //vertexDataFull[i * vertSizeFull + 4] = normalData[i * 3 + 1];
        //vertexDataFull[i * vertSizeFull + 5] = normalData[i * 3 + 2];
        
        if (normalMapped) {
            vertexDataFull[i * vertSizeFull + 3] = decalNormalRotatedX;
            vertexDataFull[i * vertSizeFull + 4] = decalNormalRotatedY;
            vertexDataFull[i * vertSizeFull + 5] = decalNormalRotatedZ;
        } else {
            if (isPlane) {
                vertexDataFull[i * vertSizeFull + 3] = 1;
                vertexDataFull[i * vertSizeFull + 4] = 0;
                vertexDataFull[i * vertSizeFull + 5] = 0;
            } else {
                vertexDataFull[i * vertSizeFull + 3] = normalData[i * 3]*decalNormal[0] + 
                normalData[i * 3 + 1]*decalNormal[1] + 
                normalData[i * 3 + 2]*decalNormal[2];
            }
        }
    }
    
    // Clear partial decal data
    for(i=currentVertEnding; i<currentVertEndingWithOverwrite; i++) {
        vertexDataFull[i * vertSizeFull] = -10000;
        vertexDataFull[i * vertSizeFull + 1] = -10000;
        vertexDataFull[i * vertSizeFull + 2] = -10000;
    }
    
    group.meshInstance.mesh.vertexBuffer.unlock();
    group.vertexOffset += vertsAdded;
    
    //console.log("decal verts: " + (vertexData.length/3))
    
    //vertexData = new Float32Array(vertexDataFull);
    
    //var vertexData = new Float32Array(tris);
    //for(i=0; i<tris.length/3; i++) {
      //  indexData[i] = i;
    //}
    
    /*var vertexBuffer = new pc.VertexBuffer(this.app.graphicsDevice, this.vertexFormat, vertexData.length/3, pc.BUFFER_STATIC, vertexDataFull.buffer);
    //indexBuffer.unlock();
    
    var mesh = new pc.Mesh();
    mesh.vertexBuffer = vertexBuffer;
    //mesh.indexBuffer[0] = indexBuffer;
    mesh.primitive[0].type = pc.PRIMITIVE_TRIANGLES;
    mesh.primitive[0].base = 0;
    mesh.primitive[0].count = vertexData.length/3;
    mesh.primitive[0].indexed = false;//true;
    
    var node = new pc.GraphNode();
    var meshInstance = new pc.MeshInstance(node, mesh, material);
    meshInstance.node.name = "decal";
    meshInstance.cull = false;
    
    this.app.scene.drawCalls.push(meshInstance);*/
};

// update code called every frame
Decals.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// Decals.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/