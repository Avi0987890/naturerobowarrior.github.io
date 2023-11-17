var PhEnv = pc.createScript('phEnv');

// initialize code called once per entity
PhEnv.prototype.postInitialize = function() {
    var i, j;
    
    // Separate particles
    /*for(i=0; i<4; i++) {
        phEngine.addParticle(3, i+4, 0, 0.2);
    }*/
    
    // Sticks
    /*var rb;
    for(i=0; i<10; i++) {
        for(j=0; j<4; j++) {
            phEngine.addParticle(4, j*0.4+4, i, 0.2);
        }
        rb = phEngine.defineRigidBody(4);
    }
    
    // Boxes
    for(i=0; i<32; i++) {
        
        phEngine.addParticle(6, 4+i*2, 0, 0.24);
        phEngine.addParticle(6.5, 4+i*2, 0, 0.24);
        phEngine.addParticle(6.5, 3.5+i*2, 0, 0.24);
        phEngine.addParticle(6, 3.5+i*2, 0, 0.24);

        phEngine.addParticle(6, 4+i*2, 0.5, 0.24);
        phEngine.addParticle(6.5, 4+i*2, 0.5, 0.24);
        phEngine.addParticle(6.5, 3.5+i*2, 0.5, 0.24);
        phEngine.addParticle(6, 3.5+i*2, 0.5, 0.24);

        rb = phEngine.defineRigidBody(8);
    }*/
};

// update code called every frame
PhEnv.prototype.update = function(dt) {
    
};

// swap method called for script hot-reloading
// inherit your script state here
// PhEnv.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/