var Batching = pc.createScript('batching');

// Init common data
Batching.prototype.initialize = function() {
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
    
    // Patch setSkinning
    this.app.renderer.setSkinning = function(device, meshInstance, material) {
        if (meshInstance.skinInstance) {
            this._skinDrawCalls++;
            this.skinPosOffsetId.setValue(meshInstance.skinInstance.rootNode.getPosition().data);
            if (device.supportsBoneTextures) {
                boneTexture = meshInstance.skinInstance.boneTexture;
                this.boneTextureId.setValue(boneTexture);
                boneTextureSize[0] = boneTexture.width;
                boneTextureSize[1] = boneTexture.height;
                this.boneTextureSizeId.setValue(boneTextureSize);
            } else {
                this.poseMatrixId.setValue(meshInstance.skinInstance.matrixPalette);
            }
            
        } else if (meshInstance.batchMatrices) {
            this.poseMatrixId.setValue(meshInstance.batchMatrices);
            
        }
    };
    
    // Patch findShadowShader after engine update
    this.app.renderer.findShadowShader = function(meshInstance, type, shadowType) {
        if (shadowType >= numShadowModes) shadowType -= numShadowModes;
        var material = meshInstance.material;
        if (material._upd) {
            material.updateShader(this.device, pc.Application.getApplication().scene, meshInstance._shaderDefs, meshInstance._staticLightList, pc.SHADER_FORWARD); // <- this
            var numShadowModes = 5;
            if (this.device.webgl2) {
                return meshInstance._shader[pc.SHADER_SHADOW + pc.SHADOW_PCF5 + pc.LIGHTTYPE_DIRECTIONAL * numShadowModes];
            } else {
                return meshInstance._shader[pc.SHADER_SHADOW + pc.SHADOW_PCF3 + pc.LIGHTTYPE_DIRECTIONAL * numShadowModes];
            }
        }
        return this.library.getProgram('depthrgba', {
                            skin: !!meshInstance.skinInstance,
                            opacityMap: !!material.opacityMap,
                            opacityChannel: material.opacityMap? (material.opacityMapChannel || 'r') : null,
                            shadowType: shadowType,
                            instancing: meshInstance.instancingData,
                            type: type,
                            chunks: material.chunks
                        });
    };
    
    // Load the shadow shader
    //var boneLimit = "#define BONE_LIMIT " + this.app.graphicsDevice.getBoneLimit() + "\n";
    var boneLimit = "#define BONE_LIMIT " + 32 + "\n";
    this.transformVS = boneLimit +
                                  this.app.assets.find("transformBatchedVS").resource;
    this.normalVS = pc.shaderChunks.normalSkinnedVS;
    
    var numShadowModes = 5;
    if (!this.app.graphicsDevice.webgl2) {
        this.shadowShader = pc.shaderChunks.createShaderFromCode(this.app.graphicsDevice, 
                                                               boneLimit + this.app.assets.find("shadowBatchedVS").resource,
                                                               this.app.assets.find("shadowBatchedPCF3PS").resource,
                                                               "shadowShaderGL1");
        this.shadowModeDir = pc.SHADOW_PCF3 + pc.LIGHTTYPE_DIRECTIONAL * numShadowModes;
    } else {
        this.shadowShader = pc.shaderChunks.createShaderFromCode(this.app.graphicsDevice,
                                                               boneLimit + this.app.assets.find("shadowBatchedVS").resource,
                                                               this.app.assets.find("shadowBatchedPCF5PS").resource,
                                                               "shadowShaderGL2");
        this.shadowModeDir = pc.SHADOW_PCF5 + pc.LIGHTTYPE_DIRECTIONAL * numShadowModes;
    }
    
    pc.batching = this;
};

// Generate and return Batch object
Batching.prototype.generateBatch = function(meshInstances) {
    var i;
    var batch = {};
    
    batch.origMeshInstances = meshInstances;
    batch._aabb = new pc.BoundingBox();
    
    // Check which vertex format and buffer size are needed, find out material
    var material = null;
    var mesh, elems, numVerts, vertSize, index;
    var hasPos, hasNormal, hasUv, hasTangent;
    var batchNumVerts = 0;
    var batchNumIndices = 0;
    for(i=0; i<meshInstances.length; i++) {
        if (!material) {
            material = meshInstances[i].material;
        } else {
            if (material !== meshInstances[i].material) {
                console.error("batchModel: multiple materials");
                return;
            }
        }
        mesh = meshInstances[i].mesh;
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
    }
    if (!hasPos) {
        console.error("batchModel: no position");
        return;
    }
    material = material.clone();
    
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
    var matrices = new Float32Array(meshInstances.length * 16);
    //console.log("matrices: " + meshInstances.length);
    
    // Fill vertex/index/matrix buffers
    var data, indexBase, numIndices, indexData, mtx;
    var verticesOffset = 0;
    var indexOffset = 0;
    var vbOffset = 0;
    for(i=0; i<meshInstances.length; i++) {
        mesh = meshInstances[i].mesh;
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
            //batchData.setUint8(j * batchVertSize + batchOffsetE + vbOffset,            i, true);
            batchData.setFloat32(j * batchVertSize + batchOffsetE + vbOffset,            i, true);
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
        
        mtx = meshInstances[i].node.getWorldTransform().data;
        for(j=0; j<16; j++) {
            matrices[i * 16 + j] = mtx[j];
        }
    }
    batch._matrices = matrices;

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
        //components: 4,
        //type: pc.ELEMENTTYPE_UINT8,
        components: 1,
        type: pc.ELEMENTTYPE_FLOAT32,
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
    node.name = "Batch";
    //node.setLocalScale(0.025, 0.025, 0.025);
    var meshInstance = new pc.MeshInstance(node, mesh, material);
    //this.batchMeshInstance = meshInstance;
    
    // Patch the material
    material.chunks.transformVS = this.transformVS;
    material.chunks.normalVS = this.normalVS;
    meshInstance.setParameter('matrix_pose[0]', matrices);
    meshInstance.batchMatrices = matrices;
    
    // Patch the shadow shader
    var self = this;
    material._upd = material.updateShader;
    material.updateShader = function(device, scene, objDefs, staticLightList, pass) {
        material._upd(device, scene, objDefs, staticLightList, pass);
        material.shader.definition.attributes.vertex_boneIndices = pc.SEMANTIC_BLENDINDICES;
        meshInstance._shader[pc.SHADER_SHADOW + self.shadowModeDir] = self.shadowShader;
    };

    meshInstance._updateAabb = false;
    batch.meshInstance = meshInstance;
    
    this.updateBatch(batch);
    
    return batch;
};

// Update batch matrices and AABB
Batching.prototype.updateBatch = function(batch) {
    var mtx, j;
    batch._aabb.copy(batch.origMeshInstances[0].aabb);
    for(var i=0; i<batch.origMeshInstances.length; i++) {
        mtx = batch.origMeshInstances[i].node.getWorldTransform().data;
        if (batch._matrices) {
            for(j=0; j<16; j++) {
                batch._matrices[i * 16 + j] = mtx[j];
            }
        }
        if (i > 0) batch._aabb.add(batch.origMeshInstances[i].aabb);
    }
    batch.meshInstance.aabb = batch._aabb;
    batch._aabb._radiusVer = -1;
    batch.meshInstance._aabbVer = 0;
};

Batching.prototype.cloneBatch = function(batch, clonedMeshInstances) {
    var i, j;
    
    var batch2 = {};
    batch2.origMeshInstances = clonedMeshInstances;
    batch2._aabb = new pc.BoundingBox();
    batch2._matrices = new Float32Array(clonedMeshInstances.length * 16);
    
    var mtx;
    for(i=0; i<clonedMeshInstances.length; i++) {
        mtx = clonedMeshInstances[i].node.getWorldTransform().data;
        for(j=0; j<16; j++) {
            batch2._matrices[i * 16 + j] = mtx[j];
        }
    }
    
    batch2.meshInstance = new pc.MeshInstance(batch.meshInstance.node, batch.meshInstance.mesh, batch.meshInstance.material);
    batch2.meshInstance._shader = batch.meshInstance._shader;
    batch2.meshInstance.setParameter('matrix_pose[0]', batch2._matrices);
    batch2.meshInstance.batchMatrices = batch2._matrices;
    
    return batch2;
};

// swap method called for script hot-reloading
// inherit your script state here
// Batching.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/