var ObjExportLib = pc.createScript('objExportLib');

function convertToObj(entities) {
    var i, j, k;
    var vec = new pc.Vec3();
    var u, v;
    var v0, v1, v2;
    var voffset = 1;
    var obj = "";
    for(i=0; i<entities.length; i++) {
        var model = entities[i].model;
        if (model) {
            var meshes = entities[i].model.model.meshInstances;
            for(j=0; j<meshes.length; j++) {
                var mesh = meshes[j].mesh;
                var vb = mesh.vertexBuffer;
                var elems = vb.format.elements;
                var numVerts = vb.numVertices;
                var vertSize = vb.format.size;
                var index;
                var offsetP, offsetN, offsetUv;
                for(k=0; k<elems.length; k++) {
                    if (elems[k].name===pc.SEMANTIC_POSITION) {
                        offsetP = elems[k].offset;
                    } else if (elems[k].name===pc.SEMANTIC_NORMAL) {
                        offsetN = elems[k].offset;
                    } else if (elems[k].name===pc.SEMANTIC_TEXCOORD0) {
                        offsetUv = elems[k].offset;
                    }
                }
                var dataF = new Float32Array(vb.storage);
                var offsetPF = offsetP / 4;
                var offsetNF = offsetN / 4;
                var offsetUvF = offsetUv / 4;
                var vertSizeF = vertSize / 4;
                var ib = mesh.indexBuffer[0];
                var dataIb = ib.storage;
                if (ib.bytesPerIndex===1) {
                    dataIb = new Uint8Array(dataIb);
                } else if (ib.bytesPerIndex===2) {
                    dataIb = new Uint16Array(dataIb);
                } else if (ib.bytesPerIndex===4) {
                    dataIb = new Uint32Array(dataIb);
                }
                var ibOffset = mesh.primitive[0].base;
                var numTris = mesh.primitive[0].count / 3;
                var transform = meshes[j].node.getWorldTransform();
                //obj += "g " + entities[i].name + "_" + meshes[j].node.name + "_" + i+"_"+j + "\n";
                obj += "g " + entities[i].name + "_" + meshes[j].node.name + ":" + meshes[j].material.name + "\n";
                for(k=0; k<numVerts; k++) {
                    vec.set(dataF[k * vertSizeF + offsetPF],
                            dataF[k * vertSizeF + offsetPF + 1],
                            dataF[k * vertSizeF + offsetPF + 2]);
                    transform.transformPoint(vec, vec);
                    obj += "v " + vec.x + " " + vec.y + " " + vec.z + "\n";
                }
                for(k=0; k<numVerts; k++) {
                    vec.set(dataF[k * vertSizeF + offsetNF],
                            dataF[k * vertSizeF + offsetNF + 1],
                            dataF[k * vertSizeF + offsetNF + 2]);
                    transform.transformVector(vec, vec).normalize();
                    obj += "vn " + vec.x + " " + vec.y + " " + vec.z + "\n";
                }
                for(k=0; k<numVerts; k++) {
                    u = dataF[k * vertSizeF + offsetUvF];
                    v = dataF[k * vertSizeF + offsetUvF + 1];
                    obj += "vt " + u + " " + v + "\n";
                }
                for(k=0; k<numTris; k++) {
                    v0 = dataIb[k*3+ibOffset] + voffset;
                    v1 = dataIb[k*3+1+ibOffset] + voffset;
                    v2 = dataIb[k*3+2+ibOffset] + voffset;
                    obj += "f " +   v0+"/"+v0+"/"+v0 + " " +
                                    v1+"/"+v1+"/"+v1 + " " +
                                    v2+"/"+v2+"/"+v2 + "\n";
                }
                voffset += numVerts;
            }
        }
    }
    return obj;
}

function download(filename, text) {
  var element = document.createElement('a');
  element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
  element.setAttribute('download', filename);

  element.style.display = 'none';
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
}

// initialize code called once per entity
ObjExportLib.prototype.initialize = function() {
    //var entities = this.app.root.getChildren()[0].getChildren();
    //var entities = this.app.root.findByTag("nav");
    var entities = this.app.root.findByTag("lightmapped");
    //console.log( convertToObj(entities) );
    download('test.txt', convertToObj(entities));
};

// update code called every frame
ObjExportLib.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// ObjExportLib.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/