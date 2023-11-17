// TODO: send matrices to shadow shader
// TODO: AABB

var HideSpheres = pc.createScript('hideSpheres');


HideSpheres.prototype.batchModel = function(entity) {
    var model = entity.model;
    var i;
    var mesh, elems, numVerts, vertSize, index;
    var offsetP, offsetN, offsetU, offsetT;
    var j, k, l, p;
    var fullMeshes = model.meshInstances;
    var material = null;
    
    var meshes = [];
    var batchNumVerts = 0;
    var batchNumIndices = 0;
    //var pos = [];
    //var normal = [];
    var hasPos, hasNormal, hasUv, hasTangent;
    
    // Check which vertex format and buffer size are needed, find out material
    for(i=0; i<fullMeshes.length; i++) {
        if (!fullMeshes[i].visible) continue;
        //if (fullMeshes[i].node.name!=="LARM" && fullMeshes[i].node.name!=="CAGE") continue;
        if (!material) {
            material = fullMeshes[i].material;
        } else {
            if (material !== fullMeshes[i].material) {
                console.error("batchModel: multiple materials");
                return;
            }
        }
        mesh = fullMeshes[i].mesh;
        elems = mesh.vertexBuffer.format.elements;
        numVerts = mesh.vertexBuffer.numVertices;
        batchNumVerts += numVerts;
        for(j=0; j<elems.length; j++) {
            if (elems[j].name === pc.SEMANTIC_POSITION) {
                hasPos = true;
            } else if (elems[j].name === pc.SEMANTIC_NORMAL) {
                hasNormal = true;
            } else if (elems[j].name === pc.SEMANTIC_TEXCOORD0) {
                hasUv = true;
            } else if (elems[j].name === pc.SEMANTIC_TANGENT) {
                hasTangent = true;
            }
        }
        batchNumIndices += mesh.primitive[0].count;
        meshes.push(fullMeshes[i]);
    }
    if (!hasPos) {
        console.error("batchModel: no position");
        return;
    }
    
    // Create buffers
    var entityIndexSize = 4;
    var batchVertSize = 3*4 + (hasNormal ? 3*4 : 0) + (hasUv ? 2*4 : 0) + (hasTangent ? 4*4 : 0) + entityIndexSize;
    //var batchOffsetP = 0;
    var batchOffsetN = 3*4;
    var batchOffsetU = hasNormal ? 3*4*2 : 3*4;
    var batchOffsetT = (hasNormal ? 3*4*2 : 3*4) + (hasUv ? 2*4 : 0);
    var batchOffsetE = (hasNormal ? 3*4*2 : 3*4) + (hasUv ? 2*4 : 0) + (hasTangent ? 4*4 : 0);
    var batchData = new DataView(new ArrayBuffer(batchNumVerts * batchVertSize));
    
    var indexBuffer = new pc.IndexBuffer(this.app.graphicsDevice, pc.INDEXFORMAT_UINT16, batchNumIndices, pc.BUFFER_STATIC);
    var batchIndexData = new DataView(indexBuffer.lock());
    var matrices = new Float32Array(meshes.length * 16);
    
    // Fill vertex/index/matrix buffers
    var data, indexBase, numIndices, indexData, mtx;
    var verticesOffset = 0;
    var indexOffset = 0;
    var vbOffset = 0;
    for(i=0; i<meshes.length; i++) {
        mesh = meshes[i].mesh;
        elems = mesh.vertexBuffer.format.elements;
        numVerts = mesh.vertexBuffer.numVertices;
        vertSize = mesh.vertexBuffer.format.size;
        for(j=0; j<elems.length; j++) {
            if (elems[j].name === pc.SEMANTIC_POSITION) {
                offsetP = elems[j].offset;
            } else if (elems[j].name === pc.SEMANTIC_NORMAL) {
                offsetN = elems[j].offset;
            } else if (elems[j].name === pc.SEMANTIC_TEXCOORD0) {
                offsetU = elems[j].offset;
            } else if (elems[j].name === pc.SEMANTIC_TANGENT) {
                offsetT = elems[j].offset;
            }
        }
        data = new DataView(mesh.vertexBuffer.storage);
        for(j=0; j<numVerts; j++) {
            batchData.setFloat32(j * batchVertSize + vbOffset,                        data.getFloat32(j * vertSize + offsetP, true), true);
            batchData.setFloat32(j * batchVertSize + 4 + vbOffset,                    data.getFloat32(j * vertSize + offsetP + 4, true), true);
            batchData.setFloat32(j * batchVertSize + 8 + vbOffset,                    data.getFloat32(j * vertSize + offsetP + 8, true), true);
            if (hasNormal) {
                batchData.setFloat32(j * batchVertSize + batchOffsetN + vbOffset,      data.getFloat32(j * vertSize + offsetN, true), true);
                batchData.setFloat32(j * batchVertSize + batchOffsetN + 4 + vbOffset,  data.getFloat32(j * vertSize + offsetN + 4, true), true);
                batchData.setFloat32(j * batchVertSize + batchOffsetN + 8 + vbOffset,  data.getFloat32(j * vertSize + offsetN + 8, true), true);
            }
            if (hasUv) {
                batchData.setFloat32(j * batchVertSize + batchOffsetU + vbOffset,      data.getFloat32(j * vertSize + offsetU, true), true);
                batchData.setFloat32(j * batchVertSize + batchOffsetU + 4 + vbOffset,  data.getFloat32(j * vertSize + offsetU + 4, true), true);
            }
            if (hasTangent) {
                batchData.setFloat32(j * batchVertSize + batchOffsetT + vbOffset,      data.getFloat32(j * vertSize + offsetT, true), true);
                batchData.setFloat32(j * batchVertSize + batchOffsetT + 4 + vbOffset,  data.getFloat32(j * vertSize + offsetT + 4, true), true);
                batchData.setFloat32(j * batchVertSize + batchOffsetT + 8 + vbOffset,  data.getFloat32(j * vertSize + offsetT + 8, true), true);
                batchData.setFloat32(j * batchVertSize + batchOffsetT + 12 + vbOffset, data.getFloat32(j * vertSize + offsetT + 12, true), true);
            }
            batchData.setUint8(j * batchVertSize + batchOffsetE + vbOffset,            i, true);
        }
        
        indexBase = mesh.primitive[0].base;
        numIndices = mesh.primitive[0].count;
        indexData = new DataView(mesh.indexBuffer[0].storage);
        for(j=0; j<numIndices; j++) {
            batchIndexData.setUint16(j * 2 + indexOffset,                   indexData.getUint16((indexBase + j) * 2, true) + verticesOffset, true);
        }
        indexOffset += numIndices * 2;
        verticesOffset += numVerts;
        vbOffset = verticesOffset * batchVertSize;
        
        mtx = meshes[i].node.getWorldTransform().data;
        for(j=0; j<16; j++) {
            matrices[i * 16 + j] = mtx[j];
        }
    }
    
    // Create the vertex format and upload GPU data
    var formatDesc = [];
    formatDesc.push({
        semantic: pc.SEMANTIC_POSITION,
        components: 3,
        type: pc.ELEMENTTYPE_FLOAT32,
        normalize: false
    });
    if (hasNormal) {
        formatDesc.push({
            semantic: pc.SEMANTIC_NORMAL,
            components: 3,
            type: pc.ELEMENTTYPE_FLOAT32,
            normalize: false
        });
    }
    if (hasUv) {
        formatDesc.push({
            semantic: pc.SEMANTIC_TEXCOORD0,
            components: 2,
            type: pc.ELEMENTTYPE_FLOAT32,
            normalize: false
        });
    }
    if (hasTangent) {
        formatDesc.push({
            semantic: pc.SEMANTIC_TANGENT,
            components: 4,
            type: pc.ELEMENTTYPE_FLOAT32,
            normalize: false
        });
    }
    formatDesc.push({
        semantic: pc.SEMANTIC_BLENDINDICES,
        components: 4,
        type: pc.ELEMENTTYPE_UINT8,
        normalize: false
    });
    
    var vertexFormat = new pc.VertexFormat(this.app.graphicsDevice, formatDesc);
    var vertexBuffer = new pc.VertexBuffer(this.app.graphicsDevice, vertexFormat, batchNumVerts, pc.BUFFER_STATIC, batchData.buffer);
    indexBuffer.unlock();
    
    // Create mesh
    mesh = new pc.Mesh();
    mesh.vertexBuffer = vertexBuffer;
    mesh.indexBuffer[0] = indexBuffer;
    mesh.primitive[0].type = pc.PRIMITIVE_TRIANGLES;
    mesh.primitive[0].base = 0;
    mesh.primitive[0].count = batchNumIndices;
    mesh.primitive[0].indexed = true;
    mesh.cull = false;
    
    // Create node
    var node = new pc.GraphNode();
    node.setLocalScale(0.025, 0.025, 0.025);
    var meshInstance = new pc.MeshInstance(node, mesh, material);
    this.batchMeshInstance = meshInstance;
    
    // Patch the material
    var boneLimit = "#define BONE_LIMIT " + this.app.graphicsDevice.getBoneLimit() + "\n";
    material.chunks.transformVS = boneLimit +
                                  this.app.assets.find("transformBatchedVS").resource;
    material.chunks.normalVS = pc.shaderChunks.normalSkinnedVS;
    material.setParameter('matrix_pose[0]', matrices);
    this.matrices = matrices;
    
    // Patch the shadow shader
    var shadowShader;
    if (!this.app.graphicsDevice.webgl2) {
        shadowShader = pc.shaderChunks.createShaderFromCode(this.app.graphicsDevice, 
                                                               boneLimit + this.app.assets.find("shadowBatchedVS").resource,
                                                               this.app.assets.find("shadowBatchedPCF3PS").resource,
                                                               "shadowShaderGL1");
    } else {
        shadowShader = pc.shaderChunks.createShaderFromCode(this.app.graphicsDevice,
                                                               boneLimit + this.app.assets.find("shadowBatchedVS").resource,
                                                               this.app.assets.find("shadowBatchedPCF5PS").resource,
                                                               "shadowShaderGL2");
    }
    
    var self = this;
    
    material._upd = material.updateShader;
    material.updateShader = function(device, scene, objDefs, staticLightList, pass) {
        material._upd(device, scene, objDefs, staticLightList, pass);
        material.shader.definition.attributes["vertex_boneIndices"] = pc.SEMANTIC_BLENDINDICES;
        //console.log(material.shader.definition.attributes);
        var numShadowModes = 5;
        if (self.app.graphicsDevice.webgl2) {
            var smode = pc.SHADOW_PCF5 + pc.LIGHTTYPE_DIRECTIONAL * numShadowModes;
            meshInstance._shader[pc.SHADER_SHADOW + smode] = shadowShader;
        } else {
            var smode = pc.SHADOW_PCF3 + pc.LIGHTTYPE_DIRECTIONAL * numShadowModes;
            meshInstance._shader[pc.SHADER_SHADOW + smode] = shadowShader;
        }
    };
    
    // Add new meshInstance to the scene
    var drawCalls = this.app.scene.drawCalls;
    var shadowCasters = this.app.scene.shadowCasters;
    drawCalls.push(meshInstance);
    shadowCasters.push(meshInstance);
    
    // Remove old meshInstances
    model.enabled = false;
    
    entity._origDestroy = entity.destroy;
    entity.destroy = function() {
        drawCalls = self.app.scene.drawCalls;
        shadowCasters = self.app.scene.shadowCasters;
        drawCalls.splice(drawCalls.indexOf(meshInstance), 1);
        shadowCasters.splice(shadowCasters.indexOf(meshInstance), 1);
        return entity._origDestroy();
    };
};

// initialize code called once per entity
HideSpheres.prototype.initialize = function() {
    
    // Patch shaderChunks attrib search   
    var attrib2Semantic = {
        vertex_position: pc.SEMANTIC_POSITION,
        vertex_normal: pc.SEMANTIC_NORMAL,
        vertex_tangent: pc.SEMANTIC_TANGENT,
        vertex_texCoord0: pc.SEMANTIC_TEXCOORD0,
        vertex_texCoord1: pc.SEMANTIC_TEXCOORD1,
        vertex_color: pc.SEMANTIC_COLOR,
        vertex_boneIndices: pc.SEMANTIC_BLENDINDICES
    };
    pc.shaderChunks.collectAttribs = function (vsCode) {
        var attribs = {};
        var attrs = 0;
        var found = vsCode.indexOf("attribute");
        while (found >= 0) {
            if (found > 0 && vsCode[found-1]==="/") break;
            var endOfLine = vsCode.indexOf(';', found);
            var startOfAttribName = vsCode.lastIndexOf(' ', endOfLine);
            var attribName = vsCode.substr(startOfAttribName + 1, endOfLine - (startOfAttribName + 1));

            var semantic = attrib2Semantic[attribName];
            if (semantic!==undefined) {
                attribs[attribName] = semantic;
            } else {
                attribs[attribName] = "ATTR" + attrs;
                attrs++;
            }

            found = vsCode.indexOf("attribute", found + 1);
        }
        return attribs;
    };
    
    // Clone model
    var entity = this.app.root.findByName("top_light_roma2").clone();
    
    // Collect original meshInstances
    var meshes = entity.model.meshInstances;
    this.meshes = [];
    this.origPos = [];
    this.batchAabb = new pc.BoundingBox();
    this.pos = new pc.Vec3();
    this.time = 0;
    for(var i=0; i<meshes.length; i++) {
        if (meshes[i].node.name.substr(0,3)==="SPH") {
            meshes[i].visible = false;
        } else {
            this.meshes.push(meshes[i]);
            this.origPos.push(meshes[i].node.getPosition().clone());
        }
    }
    
    // Disable original entity
    entity.enabled = true;
    this.clonedEntity = entity;
    
    // Generate new meshInstance
    this.batchModel(entity);
    
    this.destroyed = false;
};

// update code called every frame
HideSpheres.prototype.update = function(dt) {
    
    if (this.destroyed) return;

    if (this.app.keyboard.isPressed(pc.KEY_SPACE)) {
        this.clonedEntity.destroy();
        this.destroyed = true;
        return;
    }
    
    this.time += dt;
    var mtx, j;
    
    this.batchAabb.copy(this.meshes[0].aabb);
    
    for(var i=0; i<this.meshes.length; i++) {
        this.pos.copy(this.origPos[i]);
        this.pos.y += Math.sin(this.time * i) * 0.1;
        this.pos.x = i * 0.2 * Math.sin(this.time);
        this.meshes[i].node.setPosition(this.pos);
        
        mtx = this.meshes[i].node.getWorldTransform().data;
        if (this.matrices) {
            for(j=0; j<16; j++) {
                this.matrices[i * 16 + j] = mtx[j];
            }
        }
        if (i > 0) this.batchAabb.add(this.meshes[i].aabb);
    }
    
    this.batchMeshInstance.aabb = this.batchAabb;
};

// swap method called for script hot-reloading
// inherit your script state here
// HideSpheres.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/