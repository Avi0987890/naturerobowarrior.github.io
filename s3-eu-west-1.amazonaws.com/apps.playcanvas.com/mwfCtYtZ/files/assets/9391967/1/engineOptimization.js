var EngineOptimization = pc.createScript('engineOptimization');

var _postEffectQuadVB = null;
var _postEffectQuadDraw = {
            type: pc.PRIMITIVE_TRISTRIP,
            base: 0,
            count: 4,
            indexed: false
};

// initialize code called once per entity
EngineOptimization.prototype.initialize = function() {
    
    // Remove object creation
    pc.drawQuadWithShader = function (device, target, shader, rect, scissorRect, useBlend) {
        if (_postEffectQuadVB === null) {
            var vertexFormat = new pc.VertexFormat(device, [{
                semantic: pc.SEMANTIC_POSITION,
                components: 2,
                type: pc.ELEMENTTYPE_FLOAT32
            }]);
            _postEffectQuadVB = new pc.VertexBuffer(device, vertexFormat, 4);

            var iterator = new pc.VertexIterator(_postEffectQuadVB);
            iterator.element[pc.SEMANTIC_POSITION].set(-1.0, -1.0);
            iterator.next();
            iterator.element[pc.SEMANTIC_POSITION].set(1.0, -1.0);
            iterator.next();
            iterator.element[pc.SEMANTIC_POSITION].set(-1.0, 1.0);
            iterator.next();
            iterator.element[pc.SEMANTIC_POSITION].set(1.0, 1.0);
            iterator.end();
        }

        var oldRt = device.renderTarget;
        device.setRenderTarget(target);
        device.updateBegin();
        var x, y, w, h;
        var sx, sy, sw, sh;
        if (!rect) {
            w = (target !== null) ? target.width : device.width;
            h = (target !== null) ? target.height : device.height;
            x = 0;
            y = 0;
        } else {
            x = rect.x;
            y = rect.y;
            w = rect.z;
            h = rect.w;
        }

        if (!scissorRect) {
            sx = x;
            sy = y;
            sw = w;
            sh = h;
        } else {
            sx = scissorRect.x;
            sy = scissorRect.y;
            sw = scissorRect.z;
            sh = scissorRect.w;
        }

        device.setViewport(x, y, w, h);
        device.setScissor(sx, sy, sw, sh);

        var oldDepthTest = device.getDepthTest();
        var oldDepthWrite = device.getDepthWrite();
        var oldCull = device.getCullMode();
        device.setDepthTest(false);
        device.setDepthWrite(false);
        device.setCullMode(pc.CULLFACE_NONE);
        if (!useBlend) device.setBlending(false);
        device.setVertexBuffer(_postEffectQuadVB, 0);
        device.setShader(shader);
        device.draw(_postEffectQuadDraw);
        device.setDepthTest(oldDepthTest);
        device.setDepthWrite(oldDepthWrite);
        device.setCullMode(oldCull);
        device.updateEnd();

        device.setRenderTarget(oldRt);
        device.updateBegin();
    };
    
    // Remove clone
    // Remove new Vec3 in transformPoint
    this._invViewProjMat = new pc.Mat4();
    this._far = new pc.Vec3();
    this._farW = new pc.Vec3();
    var self = this;
    pc.Camera.prototype.screenToWorld = function (x, y, z, cw, ch, worldCoord) {
        if (worldCoord === undefined) {
            worldCoord = new pc.Vec3();
        }

        var projMat = this.getProjectionMatrix();
        var wtm = this._node.getWorldTransform();
        this._viewMat.copy(wtm).invert();
        this._viewProjMat.mul2(projMat, this._viewMat);
        //var invViewProjMat = this._viewProjMat.clone().invert();
        self._invViewProjMat.copy(this._viewProjMat).invert();
        var invViewProjMat = self._invViewProjMat;

        if (this._projection === pc.PROJECTION_PERSPECTIVE) {
            // Calculate the screen click as a point on the far plane of the
            // normalized device coordinate 'box' (z=1)
            self._far.set(x / cw * 2 - 1, (ch - y) / ch * 2 - 1, 1);

            // Transform to world space
            invViewProjMat.transformPoint(self._far, self._farW);
            var farW = self._farW;

            var w = self._far.x * invViewProjMat.data[3] +
                    self._far.y * invViewProjMat.data[7] +
                    self._far.z * invViewProjMat.data[11] +
                    invViewProjMat.data[15];

            farW.scale(1 / w);

            var alpha = z / this._farClip;
            worldCoord.lerp(this._node.getPosition(), farW, alpha);
        } else {
            // Calculate the screen click as a point on the far plane of the
            // normalized device coordinate 'box' (z=1)
            var range = this._farClip - this._nearClip;
            _deviceCoord.set(x / cw * 2 - 1, (ch - y) / ch * 2 - 1, (this._farClip - z) / range * 2 - 1);
            // Transform to world space
            invViewProjMat.transformPoint(_deviceCoord, worldCoord);
        }

        return worldCoord;
    };
    
};

// update code called every frame
EngineOptimization.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// EngineOptimization.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/