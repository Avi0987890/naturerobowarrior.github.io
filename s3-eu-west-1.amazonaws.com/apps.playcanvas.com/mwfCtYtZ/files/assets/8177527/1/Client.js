'use strict';
var Client = pc.createScript('client');

Client.attributes.add('bulletHoleMaterial', {
    type: 'asset'
});
Client.attributes.add('bulletHoleMaterial2', {
    type: 'asset'
});
Client.attributes.add('explosionDecalMaterial', {
    type: 'asset'
});

//var SV_URL = "ws://localhost:3105/";//"ws://mrz-io.moka.co/"
//var SV_URL = "ws://ec2-18-194-238-189.eu-central-1.compute.amazonaws.com:3105"; // free
//var SV_URL = "ws://ec2-18-195-147-251.eu-central-1.compute.amazonaws.com:3105"; // EU GMT+1
//var SV_URL = "ws://ec2-52-53-181-243.us-west-1.compute.amazonaws.com:3105"; // US GMT-8
/*
var urlList = ["ws://ec2-18-195-104-213.eu-central-1.compute.amazonaws.com:",
              "ws://ec2-52-53-44-178.us-west-1.compute.amazonaws.com:"];
*/

var urlList;

if (SV_DEVMODE) {
    var devUrl = "ws://ec2-18-194-160-255.eu-central-1.compute.amazonaws.com";
    urlList = [[devUrl + ":3105",
              devUrl + ":3106"],
               
                [devUrl + ":3105",
                devUrl + ":3106"],];
} else {
    urlList = [["wss://eu0.robostorm.io",
              "wss://eu1.robostorm.io"],
               
                ["wss://us0.robostorm.io",
                "wss://us1.robostorm.io"]];
}

var SV_PORT = 0;//3105;
var SV_URL = urlList[SV_URLID][SV_PORT];// + SV_PORT;

var debugDesync = false;
var extremeDebris = false;

// Intervals
var SV_UPDATERATE = 30;
var SV_DELTATIME = SV_UPDATERATE / 1000.0;//(1000.0 / SV_UPDATERATE) / 1000.0; 
var SV_SENDRATE = 50; // ?? unused

var SV_MAXHEALTHTOP = 9;//25;//9;
    var CL_HP2PARTS = 25 / SV_MAXHEALTHTOP;
var SV_MAXHEALTHBOTTOM = 7;//11;//7;
var SV_MAXHEALTHWPN = 3;//1;
var SV_GRENADERADIUS = 0.25;
var SV_EXPLOSIONRADIUS = 5;
var SV_RESPAWNTIME = 5000;
var SV_AFTERROUNDTIME = 6000;

var CL_SENDRATE = 30;//3;
var CL_LERPTIME = 100;
var CL_PREDICT = true;
var CL_CORRECTEPSILON = 0.25;//0.01;
var CL_CORRECTSMOOTH = 10;
var CL_CORRECTTHRESHOLD = 30;
var CL_CORRECTTIME = 100;
var CL_PREDICTHISTORYTIME = 1000;
var CL_RIGHT = new pc.Vec3(0.8099197149276733, 0, 0.586540699005127);
var CL_FORWARD = new pc.Vec3(-0.586540699005127, 0, 0.8099197149276733);
var CL_IMPACTPARTICLERADIUS = 0.1;
var CL_EXPLOSIONSPHERERADIUS = 1.5 * 0.5;
var CL_FIREPARTICLERADIUS = 0.01;

// Server message IDs
var MSG_CLIENTJOINED = 0;
var MSG_RECEIVEGAMEDATA = 1;
var MSG_CLIENTMOVE = 2;
var MSG_SERVERUPDATE = 3;
var MSG_REQUESTPARTS = 4;
var MSG_SETPARTS = 5;
var MSG_SERVERSCORE = 6;
var MSG_SERVERTIME = 7;
var MSG_CAPTURE = 8;
var MSG_SETPICKUPS = 9;
var MSG_PLAYERSCORE = 10;
var MSG_ROOM = 11;
var MSG_SETNAME = 12;
var MSG_SETHIGHSCORES = 13;
var MSG_PORT = 14;

// Player constants
var PLAYER_Y = 0.955;
var PLAYER_RADIUS = 0.5;
var PLAYER_SPEEDLEGS = 10;
var PLAYER_SPEEDTRACKS = 5;
var PLAYER_SPEEDSLOWFACTOR = 1;//0.75;
var PLAYER_TOPHEIGHT = 1.35;//1;
var PLAYER_LEGHEIGHT = -0.947;
//var PLAYER_LEFTLIGHTPOS = new pc.Vec3(  44.516 * 0.025,     26.213 * 0.025,     -9.662 * 0.025);
//var PLAYER_RIGHTLIGHTPOS = new pc.Vec3( -44.516 * 0.025,    26.213 * 0.025,     -9.662 * 0.025);
var PLAYER_LEFTLIGHTPOS = new pc.Vec3(  50.597 * 0.025,     31.258 * 0.025,     -9.662 * 0.025);
var PLAYER_RIGHTLIGHTPOS = new pc.Vec3( -50.597 * 0.025,    31.258 * 0.025,     -9.662 * 0.025);

var PLAYER_LEFTHEAVYPOS = new pc.Vec3(  56.023 * 0.025,     26.213 * 0.025,     -9.662 * 0.025);
var PLAYER_RIGHTHEAVYPOS = new pc.Vec3( -56.023 * 0.025,    26.213 * 0.025,     -9.662 * 0.025);
var PLAYER_WEIGHTRADIUS = 0.4;
var PLAYER_LEGBONERADIUS = 0.2;
var PLAYER_BODYBONERADIUS = 0.8;//0.4;    
var playerSpeed = 0;
var playerScore = 0;
var playerScoreDiff = 0;
var playerScoreDiffShowEndTime = 0;

var timeToNextRound = 0;

var explosionRayDirs = [
    new pc.Vec3(0, -1, 0),
    
    new pc.Vec3(-1, 0, 0),
    new pc.Vec3(1, 0, 0),
    
    new pc.Vec3(0, 0, -1),
    new pc.Vec3(0, 0, 1)
];

// Controls
var CTRL_FORWARD = 1;
var CTRL_BACK = 2;
var CTRL_LEFT = 4;
var CTRL_RIGHT = 8;
var CTRL_FIREL = 16;
var CTRL_FIRER = 32;
var CTRL_BONUS = 64;
var CTRL_USE = 128;
var CTRL_PATHFIND = 256;
var CTRL_BONUS2 = 512;
var CTRL_BONUS3 = 1024;

var CTRL_NEG_ANGLEY = 2048;
var CTRL_NEG_ANGLEW = 4096;
var CTRL_NEG_VX = 8192;
var CTRL_NEG_VZ = 16384;


var ANIM_TURNSPEED = 10;
var ANIM_TURNSPEEDFLAME = 5;

var PART_TOPLIGHT = 1 << 0;
var PART_TOPHEAVY = 1 << 1;
var PART_LEGS = 1 << 2;
var PART_TRACKS = 1 << 3;
var PART_SHIELD = 1 << 4;
var PART_SHIELDON = 1 << 5;
var PART_BOOST = 1 << 6;
var PART_BOOSTON = 1 << 7;
var PART_TEAM0 = 1 << 8;
var PART_TEAM1 = 1 << 9;
var PART_TEAM2 = 1 << 10;
var PART_TEAM3 = 1 << 11;
var PART_BOT = 1 << 12;

var PART_BOOST2 = 1 << 13;
var PART_SHIELD2 = 1 << 14;
var PART_DEFLECT = 1 << 15;
var PART_BOMB = 1 << 16;
var PART_ARMOR = 1 << 17;
var PART_ANTISHIELD = 1 << 18;
var PART_EMP = 1 << 19;
var PART_CALLBOT = 1 << 20;
var PART_GRABWEAPON = 1 << 21;
var PART_INVISIBLE = 1 << 22;
var PART_TELEPORT = 1 << 23;

var buyMenuMode = false;
var startMenuMode = true;
var startMenu2 = false;
var finMenuMode = false;

var buyItems = [
    {part:PART_BOOST2,  name:"Sprinter", price:15, desc: "Speed Boost works longer."},
    {part:PART_SHIELD2, name:"Ultrashield", price:15, desc: "Shield works longer."},
    
    //{part:PART_DEFLECT, name:"Deflect", price:25, desc: "Press Ctrl to throw rockets and grenades back to enemy."},
    {part:PART_DEFLECT, name:"Deflect", price:25, desc: "Shield throws rockets and grenades back to enemy."},
    {part:PART_BOMB, name:"Bomb", price:25, desc: "You explode before respawn."},
    {part:PART_ARMOR, name:"Armor", price:25, desc: "Resist 50% of damage."},
    {part:PART_ANTISHIELD, name:"Antishield", price:25, desc: "Press Q to disable Shields around you."},
    {part:PART_EMP, name:"EMP grenades", price:25, desc: "Normal grenades also freeze targets for 1.5 seconds."},
    
    {part:PART_GRABWEAPON, name:"Looter", price:35, desc: "Killed robots drop their weapons."},
    
    //{part:PART_INVISIBLE, name:"Invisibility", price:35, desc: "Press T to become invisible for 3 seconds."},
    //{part:PART_TELEPORT, name:"Teleport", price:35, desc: "Press Q to teleport to spawn."},
    
    //{part:PART_CALLBOT, name:"Call a bot", price:50, desc: "Spawn a friendly bot to your team."}
];

function hoverToolTip(element) {
    var attrib = element.getAttribute('data-tip');
    pc.toolTip.innerHTML = attrib;
    pc.toolTip.style.visibility = "visible";

    var tHeight = pc.toolTip.clientHeight;
    if (pc.MOUSEY > document.body.offsetHeight - tHeight) {
        pc.toolTip.style.left = (pc.MOUSEX + 5)+'px';
        pc.toolTip.style.top = (pc.MOUSEY-(tHeight+5))+'px';
    } else {
        pc.toolTip.style.left = (pc.MOUSEX + 5)+'px';
        pc.toolTip.style.top = pc.MOUSEY+'px';
    }
}

function hideToolTip(element) {
    pc.toolTip.style.visibility = "hidden";
}

function doBuyItem(part) {
    var client = pc.GAMECLIENT;
    if (!playerActiveParts[client.id]) return;
    
    var currentParts = playerActiveParts[client.id].body;
    currentParts |= part;

    pendingSendPartsBody = currentParts;
}

var WPN_MGUN = 1;
var WPN_ROCKET = 2;
var WPN_GRENADE = 3;
var WPN_FLAME = 4;
var WPN_SHOTGUN = 5;

var weaponRate = [null,
                  100,
                  400,
                  400,
                  20,//500, // differs client/server!
                  400
];
var weaponAccuracy = [null,
                  0.95,
                  1,
                  1,
                  0.9,
                  0.9
];
var weaponWeight = [0,
                    2,
                    5,
                    5,
                    2,
                    2
];
var weaponAmmo = [0,
                    100,
                    10,
                    10,
                    100,
                    50
];
var shotgunBulletCount = 8;
var weaponScale = 1.5;

var shieldTime = 2;
var shieldRegenTime = 5;

var shieldTime2 = 3;
var shieldRegenTime2 = 5;

var boostTime = 0.25;//2;
var boostRegenTime = 1;//2;//5;
var boostSpeed = 3;//2;
var boostTicks = Math.floor((boostTime * 1000) / CL_SENDRATE);
var boostRegenTicks = Math.floor((boostRegenTime * 1000) / CL_SENDRATE);

var boostTime2 = 0.5;//2;
var boostRegenTime2 = 1;//2;//5;
var boostSpeed2 = 3;//2;
var boostTicks2 = Math.floor((boostTime2 * 1000) / CL_SENDRATE);
var boostRegenTicks2 = Math.floor((boostRegenTime2 * 1000) / CL_SENDRATE);

var stunTime = 1.5;//2;
var stunTicks = Math.floor((stunTime * 1000) / CL_SENDRATE);

var freeCamera = false;

//var deflectRegenTime = 5;
var antishieldRegenTime = 5;
var antishieldRadius = 30;
var antishieldTime = 200;

var antishieldPoints = [new pc.Vec3(), new pc.Vec3(), new pc.Vec3(), new pc.Vec3(),
                        new pc.Vec3(), new pc.Vec3(), new pc.Vec3(), new pc.Vec3(), new pc.Vec3()];
var antishieldEndTime = 0;

var grenadeLife = 2000;

var velocityLookupValues = [
0,
0.809919747592108,
0.5865407082720993,
1,
-0.809919747592108,
-0.5865407082720993,
-1
];

/*var gunRotationX = 0;
var gunRotationY = 180;
var gunRotationZ = -90;*/
var gunRotationDown = (new pc.Quat()).setFromEulerAngles(90, 0, 0);
var gunRotationUp = (new pc.Quat()).setFromEulerAngles(-90, 0, 0);

var FX_MUZZLEL = 1;
var FX_MUZZLER = 2;
var FX_EXPLODE = 3;
var FX_FLAMESL = 4;
var FX_FLAMESR = 5;
var FX_FIREL = 6;
var FX_FIRER = 7;
var FX_FIRET = 8;
var FX_FIREB = 9;
//var FX_DEFLECT = 10;
var FX_ANTISHIELD = 10;
var FX_EMP = 11;

var PROJ_ROCKET = 0;
var PROJ_GRENADE = 1;
var PROJ_GRENADEEMP = 2;

var MAXWEIGHT_LEGS = 7;

function PlayerState() {
    this.x = 0;
    this.z = 0;
    this.ry = 0;
    this.rw = 1;
    this.hpt = SV_MAXHEALTHTOP;
    this.hpb = SV_MAXHEALTHBOTTOM;
    this.hpl = SV_MAXHEALTHWPN;
    this.hpr = SV_MAXHEALTHWPN;
}

function UserCommand() {
    this.ctrl = 0;
    this.ry = 0;
    this.rw = 1;
    this.vx = 0;
    this.vz = 0;
    this.tx = 0;
    this.ty = 0;
    this.tz = 0;
}

function Effect() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.type = 0;
    this.owner = 0;
}

function Projectile() {
    this.x = 0;
    this.y = 0;
    this.z = 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.type = 0;
    //this.id = 0;
}

function RobotStruct() {
    this.legs = null;
    this.tracks = null;
    this.topLight = null;
    this.topHeavy = null;    
    
    this.left = null;
    this.right = null;
    
    this.leftWpn = null;
    this.rightWpn = null;
    this.leftWpnId = 0;
    this.rightWpnId = 0;
    
    this.leftWpnMuzzle = null;
    this.rightWpnMuzzle = null;
    
    //this.hpbar = null;
    this.nickname = null;
    
    this.sphere = new pc.BoundingSphere();
    this.shield = null;
    this.shieldHeight = 0;
    this.disableShield = false;
    this.shieldHit = new pc.Vec3();
    
    this.rUpLeg = null;
    this.lUpLeg = null;
    this.rLoLeg = null;
    this.lLoLeg = null;
    this.rFoot = null;
    this.lFoot = null;
    
    this.phRUpLeg = null;
    this.phRLoLeg = null;
    this.phRFoot = null;
    
    this.phLUpLeg = null;
    this.phLLoLeg = null;
    this.phLFoot = null;
    
    this.phConstraintR0 = null;
    this.phConstraintR1 = null;
    this.phConstraintL0 = null;
    this.phConstraintL1 = null;
    
    this.rUpLegLocalPos = new pc.Vec3();
    this.lUpLegLocalPos = new pc.Vec3();
    
    //this.timeToBalance = 0;
    this.timeToStep = 0;
    this.stepLeg = true;
    
    this.prevPos = new pc.Vec3();
    this.accel = 0;
    this.prevAccel = 0;
    
    this.ammo = 0;
    
    this.prevFlame = -1;
    
    this.timeToStopShootSoundL = 0;
    this.timeToStopShootSoundR = 0;
    
    this.timeForStepSound = 0;
    
    this.leftWpnBarrel = null;
    this.rightWpnBarrel = null;
    this.spinL = false;
    this.spinR = false;
    this.spinLOffTime = 0;
    this.spinROffTime = 0;
    this.spinVelL = 0;
    this.spinVelR = 0;
}

var stateHistory = [];
var historyTimestamp = [];
var renderPlayerStates = {};

var playerModels = {};
var playerStructs = {};
var playerActiveParts = {};
var playerPhId = {};
var playerMoveDir = {};
var playerMoveDist = {};
var playerVelocity = {};
var playerVelocitySmooth = {};
var playerNames = [];
for(var nameCounter=0; nameCounter<16; nameCounter++) {
    playerNames[nameCounter] = "Player";
}
var roboDebris = [];

var gameSounds = [];

var teamScore = null;
var roundEndTime = 0;
var flushLevel = true;
var capturePointStates = null;

var pickupRadius = 2.5;
var pickupSqRadius = pickupRadius * pickupRadius;
var pickupType = null;
var pickupAmmo = null;
var pickupPos = null;

var pendingSendPartsBody = -1;
var pendingSendPartsLeft = -1;
var pendingSendPartsRight = -1;
var predictedState = new PlayerState();
var predictedStatePrev = new PlayerState();
var predictedStatePreCorrect = new PlayerState();
var predictedStateAtLastSend = new PlayerState();
var predictedAtSendHistory = [];
var predictedAtSendHistoryTimestamp = [];

var timeToShootWeaponL = [null,
                  0,
                  0,
                  0,
                  0,
                  0
];
var timeToShootWeaponR = [null,
                  0,
                  0,
                  0,
                  0,
                  0
];

var particleCache = {};
var traceCache = {};

var projStateHistory = [];
var renderProjStates = {};
var projModels = {};
var projPath = {};

var colModels = {};
var hitPhSpheres = {};
var impactPhSpheres = {};
var bulletShells = {};
var bulletShells2 = {};
var fireworks = {};
var expSpheres = {};
var flameSpheres = {};
var staticFlames = {};
var grenadeList = [];
var lightEffects = {};
var muzzleFlashes = {};

Client.prototype.allocParticles = function(p, name, count) {
    particleCache[name] = {iterator:0, list:[], parents:[]};
    var list = particleCache[name].list;
    var list2 = particleCache[name].parents;
    for(var i=0; i<count; i++) {
        list[i] = p.clone();
        list2[i] = null;
    }
};

Client.prototype.playParticle = function(name, parent, x, y, z) {
    var cache = particleCache[name];
    var prt = cache.list[cache.iterator];
    if (prt.parent !== null) {
        prt.parent.removeChild(prt);
    }
    this.app.root.addChild(prt);
    if (parent) {
        prt.setPosition(parent.getPosition());
        prt.setRotation(parent.getRotation());
    } else {
        prt.setPosition(x,y,z);
    }
    prt.enabled = true;
    //prt.particlesystem.reset();
    prt.particlesystem.rebuild();
    prt.particlesystem.play();
    cache.parents[cache.iterator] = parent;
    cache.iterator++;
    if (cache.iterator === cache.list.length) cache.iterator = 0;
};

Client.prototype.updateParticles = function() {
    var cache, l;
    for(var p in particleCache) {
        if (!particleCache.hasOwnProperty(p)) continue;
        cache = particleCache[p];
        for(l=0; l<cache.list.length; l++) {
            if (!cache.parents[l]) continue;
            if (!cache.list[l].particlesystem.isPlaying()) continue;
            cache.list[l].setPosition(cache.parents[l].getPosition());
            cache.list[l].setRotation(cache.parents[l].getRotation());
        }
    }
};

Client.prototype.updateTraces = function() {
    var t = pc.now();
    for(var i=0; i<traceCache.list.length; i++) {
        if (traceCache.list[i].endTime && t > traceCache.list[i].endTime) {
            traceCache.list[i].model.enabled = false;
            traceCache.list[i].endTime = 0;
        }
    }
};

Client.prototype.addTrace = function(startPos, endPos) {
    this.midPoint.add2(startPos, endPos).scale(0.5);
    var len = this.direction.copy(endPos).sub(startPos).length();
    var trace = traceCache.list[traceCache.iterator];
    trace.endTime = pc.now() + 30;
    
    if (trace.model.parent !== null) {
        trace.model.parent.removeChild(trace.model);
    }
    this.app.root.addChild(trace.model);
    trace.model.setPosition(this.midPoint);
    trace.model.lookAt(endPos);

    trace.xform.x = len * 0.1;
    trace.xform.z = Math.random();
    
    //console.log(trace.model.forward.data);
    
    //var fwd = trace.model.forward;
    //if (fwd.x > 0 || fwd.z > 0) {
        //trace.model.lookAt(startPos);
    //}
    
    //trace.model.setLocalScale(0.01, 0.01, len);
    //trace.model.setLocalScale(0.01*4, 0.01*4, len);
    trace.model.setLocalScale(0.01*4*2, 0.01*4*2, len);
    trace.model.enabled = true;
    
    traceCache.iterator++;
    if (traceCache.iterator === traceCache.list.length) traceCache.iterator = 0;
};

Client.prototype.updateHitSpheres = function() {
    var t = pc.now();
    for(var i=0; i<hitPhSpheres.list.length; i++) {
        if (hitPhSpheres.list[i].endTime && t > hitPhSpheres.list[i].endTime) {
            phEngine.setParticlePos(hitPhSpheres.list[i].sph, 0, 100000, 0);
            hitPhSpheres.list[i].endTime = 0;
        }
    }
};

Client.prototype.addHitSphere = function(pos, radius) {
    var sphere = hitPhSpheres.list[hitPhSpheres.iterator];
    sphere.endTime = pc.now() + 300;
    phEngine.setParticlePos(sphere.sph, pos.x, pos.y, pos.z);
    phEngine.setParticleRadius(sphere.sph, radius);
    hitPhSpheres.iterator++;
    if (hitPhSpheres.iterator === hitPhSpheres.list.length) hitPhSpheres.iterator = 0;
};

Client.prototype.updateImpactSpheres = function(dt) {
    var t = pc.now();
    var sphere, pos;
    var s = dt * 10000;
    var s2, len;
    for(var i=0; i<impactPhSpheres.list.length; i++) {
        sphere = impactPhSpheres.list[i];
        phEngine.getParticleVelocity(sphere.sph, this.velocity);
        len = this.velocity.length();
        
        if ((sphere.endTime && t > sphere.endTime) || len > 0.5) {
            phState[sphere.sph] = PHSTATE_KINEMATIC;
            phEngine.setParticlePos(sphere.sph, 0, 100000, 0);
            sphere.endTime = 0;
            sphere.model.enabled = false;
            sphere.bbrd.enabled = false;
            
        } else if (sphere.endTime) {           
            pos = sphere.model.getPosition();
            phEngine.getParticlePos(sphere.sph, pos);
            sphere.model.setPosition(pos);
            //phEngine.getParticleVelocity(sphere.sph, this.velocity);
            
            this.midPoint.copy(pos).sub(this.velocity);
            sphere.meshInstance.lookAt(this.midPoint);
            //var len = this.velocity.length() * 30;
            len *= 30;
            var falloff = ((sphere.endTime - t) / sphere.life) * 10;
            sphere.meshInstance.setLocalScale(sphere.scale*falloff, sphere.scale*falloff, len*sphere.scale*falloff);
            
            s2 = s * sphere.rnd * this.velocity.length();
            this.velocity.y = 0;
            //sphere.model.rotateLocal(s2, s2, s2);
            
            /*if (sphere.prevPos.x !== pos.x || sphere.prevPos.y !== pos.y || sphere.prevPos.z !== pos.z) {
                this.midPoint.copy(pos).sub(sphere.prevPos);
                sphere.model.setLocalS
                sphere.prevPos.copy(pos);
            }*/
            
            sphere.bbrd.setLocalPosition(0,0,0);
            sphere.bbrd.lookAt(this.cam.getPosition());
            sphere.bbrd.rotateLocal(90, 0, 0);
            pos = sphere.bbrd.getPosition();
            this.direction.copy(pos).sub(this.cam.getPosition()).normalize().scale(-1.5);
            pos.add(this.direction);
            sphere.bbrd.setPosition(pos);
            s2 = len*2;// + 1.5;
            s2 *= falloff*0.1;
            sphere.bbrd.setLocalScale(s2,s2,s2);
        }
    }
};

Client.prototype.addImpactSphere = function(pos, normal) {
    var sphere = impactPhSpheres.list[impactPhSpheres.iterator];
    var model = sphere.model;
    sphere.life = 1000 + Math.random() * 2000;
    sphere.endTime = pc.now() + sphere.life;//3000;
    var r = CL_IMPACTPARTICLERADIUS;
    var x = pos.x+normal.x*r;
    var y = pos.y+normal.y*r;
    var z = pos.z+normal.z*r;
    phEngine.setParticlePos(sphere.sph, x, y, z);
    phEngine.setParticleVelocity(sphere.sph, pc.Vec3.ZERO);
    //console.log(sphere.sph);
    //phEngine.setParticleVelocity(sphere.sph, normal.scale(0.003));
    var s = 0.0000;
    //phEngine.addParticleImpulse(sphere.sph, normal.x*s, normal.y*s, normal.z*s);
    phState[sphere.sph] = PHSTATE_ACTIVE;
    
    sphere.bbrd.enabled = true;
    
    if (model.parent !== null) {
        model.parent.removeChild(model);
    }
    this.app.root.addChild(model);
    model.enabled = true;
    model.setPosition(x, y, z);
    sphere.prevPos.set(x - normal.x, y - normal.y, z - normal.z);
    
    impactPhSpheres.iterator++;
    if (impactPhSpheres.iterator === impactPhSpheres.list.length) impactPhSpheres.iterator = 0;
};

Client.prototype.clearBulletShellsOfType = function(type) {
    var shells = type ? bulletShells2 : bulletShells;
    var sphere;
    for(var i=0; i<shells.list.length; i++) {
        sphere = shells.list[i];
        sphere.model.enabled = false;
    }
};

Client.prototype.clearBulletShells = function() {
    this.clearBulletShellsOfType(0);
    this.clearBulletShellsOfType(1);
};

Client.prototype.updateBulletShellsOfType = function(dt, type) {
    var shells = type ? bulletShells2 : bulletShells;
    var t = pc.now();
    var sphere, pos;
    var s = dt * 10000;
    var s2, rot;
    for(var i=0; i<shells.list.length; i++) {
        sphere = shells.list[i];
        if (sphere.endTime && t > sphere.endTime && sphere.grounded) {
            phState[sphere.sph] = PHSTATE_KINEMATIC;
            phEngine.setParticlePos(sphere.sph, 0, 100000, 0);
            sphere.endTime = 0;
        } else if (sphere.endTime) {           
            pos = sphere.model.getPosition();
            phEngine.getParticlePos(sphere.sph, pos);
            /*if (pos.y < 1 && !sphere.grounded) {
                sphere.grounded = true;
                sphere.endTime = t + 1000;
            }*/
            sphere.grounded = pos.y < 1;
            sphere.model.setPosition(pos);
            phEngine.getParticleVelocity(sphere.sph, this.velocity);
            
            s2 = s * sphere.rnd * this.velocity.length();
            this.velocity.y = 0;
            sphere.model.rotateLocal(s2, s2, s2);
            rot = sphere.model.getLocalRotation();
            
            //s2 = pc.math.clamp((pos.y - CL_IMPACTPARTICLERADIUS)/CL_IMPACTPARTICLERADIUS, 0, 1);
            s2 = pc.math.clamp((sphere.endTime - t) / 500, 0, 1);
            rot.x *= s2;
            rot.z *= s2;
            rot.normalize();
            
            pos.y = pc.math.lerp(0, pos.y, s2);
            sphere.model.setPosition(pos);
        }
    }
};

Client.prototype.updateBulletShells = function(dt) {
    this.updateBulletShellsOfType(dt, 0);
    this.updateBulletShellsOfType(dt, 1);
};

Client.prototype.addBulletShell = function(pos, normal, type) {
    var shells = type ? bulletShells2 : bulletShells;
    
    var sphere = shells.list[shells.iterator];
    var model = sphere.model;
    sphere.life = 2000;
    sphere.endTime = pc.now() + sphere.life;//3000;
    sphere.grounded = false;
    
    var r = CL_IMPACTPARTICLERADIUS;
    var x = pos.x+normal.x*r;
    var y = pos.y+normal.y*r;
    var z = pos.z+normal.z*r;
    phEngine.setParticlePos(sphere.sph, x, y, z);
    phEngine.setParticleVelocity(sphere.sph, pc.Vec3.ZERO);
    phState[sphere.sph] = PHSTATE_ACTIVE;
    
    if (model.parent !== null) {
        model.parent.removeChild(model);
    }
    this.app.root.addChild(model);
    model.enabled = true;
    model.setPosition(x, y, z);
    sphere.prevPos.set(x - normal.x, y - normal.y, z - normal.z);
    
    shells.iterator++;
    if (shells.iterator === shells.list.length) shells.iterator = 0;
};

Client.prototype.updateFireworks = function(dt) {
    var t = pc.now();
    var sphere, pos;
    var s = dt * 10000;
    var s2;
    for(var i=0; i<fireworks.list.length; i++) {
        sphere = fireworks.list[i];
        if (sphere.endTime && t > sphere.endTime) {
            sphere.endTime = 0;
        } else if (sphere.endTime) {           
            var ntime = 1.0 - (sphere.endTime - t) / sphere.life;
            ntime = ntime*1.5 - 0.5;
            var time = ntime * 10;
            var endTimeBlob = 0.5;
            var cam = this.cam;
            sphere.meshInstance.setParameter("time", time);
            sphere.meshInstance.setParameter("globalFade", 1.0 - ntime);
            var globalFadeBlob = 1.0 - pc.math.clamp(ntime / endTimeBlob,0,1);
            sphere.meshInstance.setParameter("globalFadeBlob", globalFadeBlob);
            sphere.meshInstance.setParameter("camRight", cam.right.data);
            sphere.meshInstance.setParameter("camUp", cam.up.data);
            sphere.meshInstance.setParameter("fadePow", Math.pow(2, ntime*4));
            sphere.meshInstance.setParameter("globalFlicker", Math.random());
        }
    }
};

Client.prototype.addFirework = function(pos, normal) {
    var sphere = fireworks.list[fireworks.iterator];
    var model = sphere.model;
    sphere.life = 500;// + (Math.random()*2-1) * 500;
    sphere.endTime = pc.now() + sphere.life;//3000;
    
    if (model.parent !== null) {
        model.parent.removeChild(model);
    }
    this.app.root.addChild(model);
    model.enabled = true;
    model.setPosition(pos);
    model.rotate(0, Math.random()*360, 0);
    
    fireworks.iterator++;
    if (fireworks.iterator === fireworks.list.length) fireworks.iterator = 0;
    
    //this.playImpactSoundPos(this.audioMetal, pos.x, pos.y, pos.z);
};

Client.prototype.addBulletHole = function(boxId, pos, normal) {
    this.tmpPos1.copy(this.cam.forward).scale(-1);
    var size;
    if (boxId === -2 && pc.floorMaterials.getMaterial(pos)) {
        size = pc.math.random(0.125, 1.25);
        pc.decals.addDecal(boxId, pos, normal, this.decalGroupBulletHole2, size, this.tmpPos1);
    } else {
        size = pc.math.random(0.5, 1.25);
        pc.decals.addDecal(boxId, pos, normal, this.decalGroupBulletHole, size, this.tmpPos1);
    }
};

Client.prototype.addExplosionDecal = function(boxId, pos, normal) {
    this.tmpPos1.copy(this.cam.forward).scale(-1);
    pc.decals.addDecal(boxId, pos, normal, this.decalGroupExplosion, 8, this.tmpPos1);
};

Client.prototype.updateMuzzleFlashes = function(dt) {
    var t = pc.now();
    var sphere, pos;
    var s = dt * 10000;
    var s2;
    var timeLerp, len;
    for(var i=0; i<muzzleFlashes.list.length; i++) {
        sphere = muzzleFlashes.list[i];
        if (sphere.endTime && t > sphere.endTime) {
            sphere.endTime = 0;
            sphere.model.enabled = false;
        } else if (sphere.endTime) {
            if (!sphere.parent) continue;
            sphere.model.setPosition(sphere.parent.getPosition());
            sphere.model.setRotation(sphere.parent.getRotation());
            
            sphere.bbrd.setLocalPosition(0,0,1);
            sphere.bbrd.lookAt(this.cam.getPosition());
            sphere.bbrd.rotateLocal(90, 0, 0);
            pos = sphere.bbrd.getPosition();
            this.direction.copy(pos).sub(this.cam.getPosition()).normalize().scale(-1.5);
            pos.add(this.direction);
            sphere.bbrd.setPosition(pos);
            //sphere.bbrd.enabled = false;
            
            len = sphere.shaderEndTime - sphere.shaderStartTime;
            timeLerp = (pc.explosionShader.time - sphere.shaderStartTime) / len;
            sphere.meshInstance.setParameter("timeLerp", 0.9);//timeLerp);
            sphere.meshInstance.setParameter("reachUp", 0.0);//timeLerp);
            //sphere.bbrd.model.model.meshInstances[0].setParameter("material_emissiveIntensity", (1.0-Math.abs(timeLerp-1.0))*0.125);
            sphere.direction.set(-sphere.model.forward.x*0.5, -sphere.model.forward.z*0.5);
        }
    }

};

Client.prototype.addMuzzleFlash = function(parent) {
    var sphere = muzzleFlashes.list[muzzleFlashes.iterator];
    var model = sphere.model;
    sphere.endTime = pc.now() + 50;
    sphere.parent = parent;
       
    if (model.parent !== null) {
        model.parent.removeChild(model);
    }
    this.app.root.addChild(model);
    
    model.enabled = true;
    
    sphere.model.setPosition(sphere.parent.getPosition());
    sphere.model.setRotation(sphere.parent.getRotation());
    //sphere.model.setRotation(pc.Quat.IDENTITY);
    //sphere.model.setEulerAngles(-90, 0, 0);
    var s = 0.3 + Math.random() * 0.4;
    sphere.model.setLocalScale(s,s,s);
    
    sphere.shaderStartTime = pc.explosionShader.time;
    sphere.shaderEndTime = pc.explosionShader.time + 0.05;
    sphere.meshInstance.setParameter("objectRandom", Math.random());
    
    muzzleFlashes.iterator++;
    if (muzzleFlashes.iterator === muzzleFlashes.list.length) muzzleFlashes.iterator = 0;
};

Client.prototype.addLightEffect = function(pos, speed, size) {
    var sphere = lightEffects.list[lightEffects.iterator];
    sphere.x = pos.x;
    sphere.z = pos.z;
    sphere.time = 0;    
    sphere.speed = speed;
    sphere.size = size;
    lightEffects.iterator++;
    if (lightEffects.iterator === lightEffects.list.length) lightEffects.iterator = 0;
};

Client.prototype.updateFlameSpheres = function(dt) {
    var t = pc.now();
    
    var uid, i;
    /*if (this.debugFlameSpheres) {
        var fs, mtx, s;
        for(uid in this.debugFlameSpheres) {
            if (!this.debugFlameSpheres.hasOwnProperty(uid)) continue;
            fs = this.debugFlameSpheres[uid];
            mtx = new pc.Mat4();
            s = fs.sph.radius * 2;
            mtx.setTRS(new pc.Vec3(fs.sph.center.data[0], fs.sph.center.data[1], fs.sph.center.data[2]),
                      pc.Quat.IDENTITY,
                      new pc.Vec3(s,s,s));
            this.app.renderMesh(this.debugFlameSphereMesh, this.debugFlameSphereMat, mtx);
        }
        pc.debugFlameSpheres = this.debugFlameSpheres;
    }*/
    
    var mzlParent;
    for(uid in playerStructs) {
        if (!playerStructs.hasOwnProperty(uid)) continue;
        mzlParent = null;
        if (playerStructs[uid].emitFlameEndTimeL && playerStructs[uid].emitFlameEndTimeL > t) {
            mzlParent = playerStructs[uid].leftWpnMuzzle;
            this.playWeaponSoundLeft(uid);
        } else if (playerStructs[uid].emitFlameEndTimeR && playerStructs[uid].emitFlameEndTimeR > t) {
            mzlParent = playerStructs[uid].rightWpnMuzzle;
            this.playWeaponSoundRight(uid);
        }
        
        //if (uid != this.id) {
            if (!playerStructs[uid].emitFlameEndTimeR || playerStructs[uid].emitFlameEndTimeR <= t) {
                playerStructs[uid].prevFlame = -1;
            }
        //}
        
        if (mzlParent) {
            if (t > playerStructs[uid].emitFlameTickEndTimeR) {
                this.direction3.copy(playerModels[uid].forward);//.scale(weaponAccuracy[WPN_FLAME]);
                this.direction3.y -= 0.2;
                //for(var i=0; i<1; i++) {
                    //this.direction2.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
                    //this.direction2.normalize().scale(1 - weaponAccuracy[WPN_FLAME]).add(this.direction3).normalize();
                    //this.direction3.copy(playerMoveDir[uid]).scale(playerMoveDist[uid]);
                    //console.log(playerVelocity[uid].data);
                    playerStructs[uid].prevFlame = this.addFlameSphere(mzlParent.getPosition(), this.direction3, 0, playerStructs[uid].prevFlame, playerVelocitySmooth[uid]);
                //}
                playerStructs[uid].emitFlameTickEndTimeR = t + weaponRate[WPN_FLAME];
            }
        }
    }
    
    var color = new pc.Color(1,1,0);
    var path = flameSpheres.list;
    var nodeA, nodeB;
    var buffCnt = 0;
    var objs;// = playerStructs[this.id];
    var life, alpha;
    var alphaNextPoint = false;
    var segLen;
    var anyFlameSphere = false;
    //for(uid in playerStructs) {
        //if (!playerStructs.hasOwnProperty(uid)) continue;
        objs = this;//playerStructs[uid];
        for(i=0; i<this.flameTrailPoints; i++) {
            objs.flameTrailPos[i*4+3] = 0;
        }
    //}
    for(i=0; i<path.length - 1; i++) {
        if (!path[i].head) continue;
        if (!path[i].endTime) continue;
        if (path[i].endTime && t > path[i].endTime) continue;
        
        nodeA = i;
        var added = false;
        anyFlameSphere = true;
        
        phEngine.getParticlePos(path[nodeA].sph, this.direction);
        objs.flameTrailPos[buffCnt*4] = this.direction.x;
        objs.flameTrailPos[buffCnt*4+1] = this.direction.y;
        objs.flameTrailPos[buffCnt*4+2] = this.direction.z;
        objs.flameTrailPos[buffCnt*4+3] = 0;
        buffCnt++;
        
        alphaNextPoint = false;
        while(true) {
            nodeB = path[nodeA].prevNode;
            if (nodeB < 0 || path[nodeB].head) break;
            if (!path[nodeB].endTime) break;
            if (path[nodeB].endTime && t > path[nodeB].endTime) break;
            
            phEngine.getParticlePos(path[nodeA].sph, this.direction);
            phEngine.getParticlePos(path[nodeB].sph, this.direction2);
            //this.app.renderLine(this.direction, this.direction2, color);
            
            life = 1.0 - (path[nodeA].endTime - t) / 1000;
            life = Math.floor(life * 1000);
            
            alpha = 0.999;
            if (alphaNextPoint) {
                alpha = 0;
            }
            alphaNextPoint = false;
            phEngine.getParticleVelocity(path[nodeA].sph, this.direction3);
            if (Math.abs(this.direction3.x) < 0.001 && Math.abs(this.direction3.z) < 0.001) {
                alpha = 0;
                alphaNextPoint = true;
            }
            phEngine.getParticleVelocity(path[nodeB].sph, this.direction3);
            if (Math.abs(this.direction3.x) < 0.001 && Math.abs(this.direction3.z) < 0.001) {
                alpha = 0;
                alphaNextPoint = true;
            }
            
            if (alpha && nodeA !== nodeB) {
                segLen = this.midPoint.copy(this.direction).sub(this.direction2).length();
            } else {
                segLen = 1;
            }
            //alpha /= Math.max(segLen - 3, 0)*2 + 1;
            
            objs.flameTrailPos[buffCnt*4] = this.direction.x;
            objs.flameTrailPos[buffCnt*4+1] = this.direction.y;
            objs.flameTrailPos[buffCnt*4+2] = this.direction.z;
            objs.flameTrailPos[buffCnt*4+3] = alpha + life;
            objs.flameTrailRandoms[buffCnt] = path[nodeA].rnd;
            buffCnt++;
            
            life = 1.0 - (path[nodeB].endTime - t) / 1000;
            life = Math.floor(life * 1000);
            
            objs.flameTrailPos[buffCnt*4] = this.direction2.x;
            objs.flameTrailPos[buffCnt*4+1] = this.direction2.y;
            objs.flameTrailPos[buffCnt*4+2] = this.direction2.z;
            objs.flameTrailPos[buffCnt*4+3] = life;
            objs.flameTrailRandoms[buffCnt] = path[nodeB].rnd;
            added = true;
            
            
            //path[nodeA].model2.setPosition(this.midPoint.copy(this.direction).add(this.direction2).scale(0.5));
            path[nodeA].model2.setPosition(this.midPoint.lerp(this.direction, this.direction2, 0.25));
            path[nodeA].model2.lookAt(this.direction2);
            //if (alpha && nodeA !== nodeB) {
                //var lenn = this.direction.sub(this.direction2).length();
                //var maxLen = 3;
                //path[nodeA].model2.setLocalScale(1, 1, lenn > maxLen ? maxLen : lenn);
                path[nodeA].model2.setLocalScale(1, 1, segLen);
            //} else {
              //  path[nodeA].model2.setLocalScale(1, 1, 1);
            //}
            
            
            path[nodeA].model3.setPosition(this.midPoint.lerp(this.direction, this.direction2, 0.75));
            path[nodeA].model3.lookAt(this.direction2);
            path[nodeA].model3.setLocalScale(1, 1, segLen);
            
            nodeA = nodeB;
        }
        if (added) {
            buffCnt++;
            objs.flameTrailPos[buffCnt*4] = objs.flameTrailPos[(buffCnt-1)*4];
            objs.flameTrailPos[buffCnt*4+1] = objs.flameTrailPos[(buffCnt-1)*4+1];
            objs.flameTrailPos[buffCnt*4+2] = objs.flameTrailPos[(buffCnt-1)*4+3];
            objs.flameTrailPos[buffCnt*4+3] = life;
            buffCnt++;
        }
    }
    
    if (t < antishieldEndTime) {
        
        alpha = 0.999;
        life = 0.025 * 1000;
        var rnd = Math.random()*2-1;
        rnd *= 0.0001; // WHY??! WHAT THE FUCK
        
        for(i=1; i<9; i++) {
            alpha = 0.999 * ((antishieldEndTime - t) / antishieldTime);
            life = 0.025 * 1000 * 4; // defines scale/color
            
            objs.flameTrailPos[buffCnt*4] = antishieldPoints[0].x + rnd;
            objs.flameTrailPos[buffCnt*4+1] = antishieldPoints[0].y + rnd;
            objs.flameTrailPos[buffCnt*4+2] = antishieldPoints[0].z + rnd;
            objs.flameTrailPos[buffCnt*4+3] = alpha + life;
            objs.flameTrailRandoms[buffCnt] = Math.random();
            buffCnt++;
            
            alpha = 0;
            /*if (pc.motherfucker) {
                objs.flameTrailPos[buffCnt*4] = 0;
                objs.flameTrailPos[buffCnt*4+1] = 0;
                objs.flameTrailPos[buffCnt*4+2] = 0;
            } else {*/
                objs.flameTrailPos[buffCnt*4] = antishieldPoints[i].x + rnd;
                objs.flameTrailPos[buffCnt*4+1] = antishieldPoints[i].y + rnd;
                objs.flameTrailPos[buffCnt*4+2] = antishieldPoints[i].z + rnd;
            //}
            objs.flameTrailPos[buffCnt*4+3] = alpha + life;
            objs.flameTrailRandoms[buffCnt] = Math.random();
            buffCnt++;
            
            this.direction.copy(antishieldPoints[i]).sub(antishieldPoints[0]).normalize().scale(dt * 50);
            antishieldPoints[i].add(this.direction);
            //antishieldPoints[i].scale(0);

            //if (!pc.motherfucker) pc.motherfucker = true;
            
            /*objs.flameTrailPos[buffCnt*4] = antishieldPoints[0].x;
            objs.flameTrailPos[buffCnt*4+1] = antishieldPoints[0].y;
            objs.flameTrailPos[buffCnt*4+2] = antishieldPoints[0].z;
            objs.flameTrailPos[buffCnt*4+3] = alpha + life;
            objs.flameTrailRandoms[buffCnt] = Math.random();
            buffCnt++;*/
            

        }
        anyFlameSphere = true;
    }
    
    this.flameTrailInstance.visible = anyFlameSphere;
    
    this.flameTrailMat.setParameter("time", t/100.0);
    
    var sphere, pos;
    var s = dt * 10000;
    var flameFriction = 0.5;
    var s2, prevPos, dist, distToPicked, underDelta, p1, p1x, p1y, p1z;
    var timeFade;
    var scale;
    var k;
    var len;
    var s3 = dt * 50;
    var timeLerp, scl;
    for(i=0; i<flameSpheres.list.length; i++) {
        sphere = flameSpheres.list[i];
        
        if (sphere.endTimeFlame && t > sphere.endTimeFlame) {
            phEngine.getParticlePos(sphere.sph, this.pickedPoint);
            phEngine.getParticleVelocity(sphere.sph, this.direction);
            this.pickedPoint.y = 0;
            this.addStaticFlame(this.pickedPoint, null, this.direction.normalize());
            sphere.endTimeFlame = 0;
            if (t > this.flameDecalNextTime) {
                this.addExplosionDecal(-2, this.pickedPoint, pc.Vec3.UP);
                this.flameDecalNextTime = t + 1000;
            }
        }
        
        if (sphere.endTime && t > sphere.endTime2) {
            phEngine.setParticlePos(sphere.sph, 0, 100000, 0);
            phState[sphere.sph] = PHSTATE_KINEMATIC;
            sphere.model.enabled = false;
            sphere.model2.enabled = false;
            sphere.model2.setLocalScale(1,1,1);
            
            sphere.model3.enabled = false;
            sphere.model3.setLocalScale(1,1,1);
            
            sphere.endTime = 0;
            sphere.fired = false;
        } else if (sphere.endTime) {
            
            
                //sphere.model2.enabled = false;
            
            
            
            sphere.model.enabled = false;
            
            
            
            pos = sphere.model.getPosition();
            phEngine.getParticlePos(sphere.sph, pos);
            
            phEngine.getParticleVelocity(sphere.sph, this.direction2);
            this.direction2.lerp(this.direction2, sphere.velocity2, dt*dt*100);
            phEngine.setParticleVelocity(sphere.sph, this.direction2);
            
            this.shootRay.origin.copy(sphere.prevPos);
            this.shootRay.direction.copy(pos);
            this.shootRay.direction.sub(this.shootRay.origin);
            dist = this.shootRay.direction.length() + CL_FIREPARTICLERADIUS;
            this.shootRay.direction.normalize();
            
            if (colModels.level.intersectsRay(this.shootRay, this.pickedPoint, this.pickedNormal, dist)) {
                distToPicked = this.direction2.copy(this.shootRay.origin).sub(this.pickedPoint).lengthSq();
                if (distToPicked < dist*dist) {
                    pos.copy(this.pickedNormal).scale(CL_FIREPARTICLERADIUS).add(this.pickedPoint);
                    phEngine.moveParticleTo(sphere.sph, pos.x, pos.y, pos.z);
                    
                    /*p1 = sphere.sph;
                    p1x = p1 * 3;
                    p1y = p1 * 3 + 1;
                    p1z = p1 * 3 + 2;
                    underDelta = dist - Math.sqrt(distToPicked);
                    if (phDeltaPos[p1x] > 0) {
                        phDeltaPos[p1x] -= underDelta * flameFriction;
                        if (phDeltaPos[p1x] < 0) phDeltaPos[p1x] = 0;
                    } else {
                        phDeltaPos[p1x] += underDelta * flameFriction;
                        if (phDeltaPos[p1x] > 0) phDeltaPos[p1x] = 0;
                    }

                    if (phDeltaPos[p1z] > 0) {
                        phDeltaPos[p1z] -= underDelta * flameFriction;
                        if (phDeltaPos[p1z] < 0) phDeltaPos[p1z] = 0;
                    } else {
                        phDeltaPos[p1z] += underDelta * flameFriction;
                        if (phDeltaPos[p1z] > 0) phDeltaPos[p1z] = 0;
                    }*/
                    
                    phEngine.getParticleVelocity(sphere.sph, this.direction2);
                    this.direction.copy(this.direction2)
                    this.direction2.scale(0);//.5);
                    phEngine.setParticleVelocity(sphere.sph, this.direction2);
                    sphere.velocity2.scale(0);
                    
                    sphere.stopped = true;
                    
                    this.addStaticFlame(this.pickedPoint, this.pickedNormal, this.direction.normalize());
                    if (t > this.flameDecalNextTime) {
                        this.addExplosionDecal(ColUtils.hitBoxId, this.pickedPoint, this.pickedNormal);
                        this.flameDecalNextTime = t + 1000;
                    }
                }
            }
            
            sphere.model.setPosition(pos);
            
            sphere.model.lookAt(this.cam.getPosition());
            sphere.model.rotateLocal(90, 0, 0);
            
            //sphere.quad.model.model.meshInstances[0].setParameter("material_emissiveIntensity", (sphere.endTime - t) / 1000);
            timeFade = (sphere.endTime - t) / 1000;
            sphere.color.lerp(this.flameColorStart, this.flameColorEnd, pc.math.clamp(1.0-timeFade,0,1)).scale(timeFade);
            sphere.color.scale(0.25);
            sphere.quad.model.model.meshInstances[0].setParameter("material_emissive", sphere.color.data);
            
            life = 1.0 - (sphere.endTime - t) / 1000;
            scale = life*3.0*4.0 + 0.5;
            sphere.model.setLocalScale(scale, scale, scale);
            
            
            //sphere.model2.setPosition(pos);
            
            //sphere.model2.rotateLocal(s3, s3, s3);
            sphere.meshInstance.node.rotateLocal(s3, s3, s3);
            sphere.meshInstance3.node.rotateLocal(s3, s3, s3);

            sphere.bbrd.setLocalPosition(0,0,0);
            sphere.bbrd.lookAt(this.cam.getPosition());
            sphere.bbrd.rotateLocal(90, 0, 0);
            pos = sphere.bbrd.getPosition();
            this.direction.copy(pos).sub(this.cam.getPosition()).normalize().scale(-1.5);
            pos.add(this.direction);
            sphere.bbrd.setPosition(pos);
            
            sphere.bbrd3.setLocalPosition(0,0,0);
            sphere.bbrd3.lookAt(this.cam.getPosition());
            sphere.bbrd3.rotateLocal(90, 0, 0);
            pos = sphere.bbrd3.getPosition();
            this.direction.copy(pos).sub(this.cam.getPosition()).normalize().scale(-1.5);
            pos.add(this.direction);
            sphere.bbrd3.setPosition(pos);
            
            scale *= 0.25;
            scale *= pc.math.clamp(life * 10, 0.01, 1);
            scl = sphere.model2.getLocalScale();
            
            len = sphere.shaderEndTime - sphere.shaderStartTime;
            timeLerp = (pc.explosionShader.time - sphere.shaderStartTime) / len;
            //timeLerp += pc.math.clamp(scl.z - 3, 0, 1);// * 5;
            //timeLerp += pc.math.clamp(scl.z - 2, 0, 1);// * 5;
            //timeLerp += sphere.timeSinceStop;
            //if (sphere.stopped) sphere.timeSinceStop += dt * 4;
            sphere.meshInstance.setParameter("timeLerp", timeLerp);
            sphere.meshInstance3.setParameter("timeLerp", timeLerp);
            
            if (scl.x === 1) {
                scl.x = scl.y = pc.math.lerp(1, scl.z, 0.5);
                if (scl.z*scale > 4) scale = 4 / scl.z;
                //scl.z += pc.math.clamp(scl.z - 2, 0, 1)*3;
                scl.scale(scale);//Math.min(scale,4));
                //scl.set(scale, scale, scale);
            }
            sphere.model2.setLocalScale(scl);
            sphere.model3.setLocalScale(scl);
            //sphere.model2.setLocalScale(scale, scale, scale);
            //sphere.model2.setLocalScale(scale, scale, scale*2);
            
            
            timeLerp = 1.0 - timeLerp;
            timeLerp = Math.pow(timeLerp, 1.5);
            sphere.bbrd.model.model.meshInstances[0].setParameter("material_emissiveIntensity", timeLerp);
            sphere.bbrd3.model.model.meshInstances[0].setParameter("material_emissiveIntensity", timeLerp);
        }
    }
};

Client.prototype.addFlameSphere = function(pos, dir, offset, prevFlame, parentVel) {
    var sphere = flameSpheres.list[flameSpheres.iterator];
    //sphere.hierDepth = 0;
    if (prevFlame >= 0) {
        flameSpheres.list[prevFlame].head = false;
        //sphere.hierDepth = flameSpheres.list[prevFlame].hierDepth + 1;
    }
    sphere.prevNode = prevFlame;
    sphere.head = true;
    var model = sphere.model;
    sphere.endTime = pc.now() + 1000;
    sphere.endTime2 = pc.now() + 1500;
    sphere.endTimeFlame = pc.now() + 1000 - Math.random() * 500;
    sphere.stopped = false;
    sphere.timeSinceStop = 0;
    
    var x = pos.x + dir.x*CL_FIREPARTICLERADIUS*offset*1.5;
    var y = pos.y + dir.y*CL_FIREPARTICLERADIUS*offset*1.5;
    var z = pos.z + dir.z*CL_FIREPARTICLERADIUS*offset*1.5;
    
    phEngine.setParticlePos(sphere.sph, x, y, z);
    var flgrav = -1.81 * phDelta * phDelta;
    phState[sphere.sph] = PHSTATE_ACTIVE;
    //phAccel[sphere.sph * 3] = flgrav;
    //phAccel[sphere.sph * 3 + 1] = flgrav;
    //phAccel[sphere.sph * 3 + 2] = flgrav;
    var pow = -0.2;
    phEngine.addParticleImpulse(sphere.sph, dir.x*pow*2, dir.y*pow*0.7, dir.z*pow*2);
    phEngine.getParticleVelocity(sphere.sph, sphere.velocity2);
    
    phEngine.addParticleImpulse(sphere.sph, -parentVel.x, -parentVel.y, -parentVel.z);
    
    if (model.parent !== null) {
        model.parent.removeChild(model);
    }
    this.app.root.addChild(model);
    model.enabled = true;
    model.setPosition(x, y, z);
    sphere.prevPos.set(x, y, z);
    
    var model2 = sphere.model2;
    var timeOffset = 1000.0;
    if (model2.parent !== null) {
        model2.parent.removeChild(model2);
    }
    this.app.root.addChild(model2);
    model2.enabled = true;
    model2.setPosition(x, y, z);
    //model2.setEulerAngles(Math.random()*360, Math.random()*360, Math.random()*360);
    sphere.meshInstance.node.setEulerAngles(Math.random()*360, Math.random()*360, Math.random()*360);
    sphere.shaderStartTime = pc.explosionShader.time;
    sphere.shaderEndTime = pc.explosionShader.time + timeOffset / 1000.0;
    
        
    
    //model.particlesystem.rebuild();
    //model.particlesystem.play();
    
    prevFlame = flameSpheres.iterator;
    
    flameSpheres.iterator++;
    if (flameSpheres.iterator === flameSpheres.list.length) flameSpheres.iterator = 0;
    
    return prevFlame;
};

Client.prototype.updateExpSpheres = function(dt) {
    var t = pc.now();
    var sphere, pos;
    var s = dt * 50;
    var len, timeLerp;
    for(var i=0; i<expSpheres.list.length; i++) {
        sphere = expSpheres.list[i];
        if (sphere.endTime && t > sphere.endTime) {
            phState[sphere.sph] = PHSTATE_KINEMATIC;
            phEngine.setParticlePos(expSpheres.list[i].sph, 0, 100000, 0);
            sphere.model.setPosition(0, 1000000, 0);
            sphere.endTime = 0;
        } else if (sphere.endTime) {
            
            pos = sphere.model.getPosition();
            phEngine.getParticlePos(sphere.sph, this.direction2);
            pos.lerp(pos, this.direction2, dt * 4);
            pos.y += sphere.rnd * dt * 5;
            sphere.model.setPosition(pos);
            
            len = sphere.shaderEndTime - sphere.shaderStartTime;
            timeLerp = (pc.explosionShader.time - sphere.shaderStartTime) / len;
            sphere.meshInstance.setParameter("timeLerp", timeLerp);
            
            sphere.model.rotateLocal(s, s, s);
            sphere.bbrd.setLocalPosition(0,0,0);
            sphere.bbrd.lookAt(this.cam.getPosition());
            sphere.bbrd.rotateLocal(90, 0, 0);
            pos = sphere.bbrd.getPosition();
            this.direction.copy(pos).sub(this.cam.getPosition()).normalize().scale(-1.5);
            pos.add(this.direction);
            sphere.bbrd.setPosition(pos);
            
            timeLerp = 1.0 - timeLerp;
            timeLerp = Math.pow(timeLerp, 1.5);
            sphere.bbrd.model.model.meshInstances[0].setParameter("material_emissiveIntensity", timeLerp);
        }
    }
};

Client.prototype.addExpSphere = function(pos, normal, noPhysics) {
    var sphere = expSpheres.list[expSpheres.iterator];
    var model = sphere.model;
    var timeRandomness = 200;
    var timeOffset = 1000 + (Math.random()*2-1) * timeRandomness;
    sphere.endTime = pc.now() + timeOffset * 2;
    var r = CL_EXPLOSIONSPHERERADIUS;
    var x = pos.x+normal.x*r;
    var y = pos.y+normal.y*r;
    var z = pos.z+normal.z*r;
    phEngine.setParticlePos(sphere.sph, x, y, z);
    /*if (noPhysics) {
        phRbIndex[sphere.sph] = -1;
    } else {
        phRbIndex[sphere.sph] = sphere.rbIndex;
    }*/
    //phState[sphere.sph] = PHSTATE_ACTIVE;
    
    if (model.parent !== null) {
        model.parent.removeChild(model);
    }
    this.app.root.addChild(model);
    model.enabled = true;
    model.setPosition(pos.x, pos.y, pos.z);
    model.setEulerAngles(Math.random()*360, Math.random()*360, Math.random()*360);
    
    sphere.shaderStartTime = pc.explosionShader.time;
    sphere.shaderEndTime = pc.explosionShader.time + timeOffset / 1000.0;
    
    expSpheres.iterator++;
    if (expSpheres.iterator === expSpheres.list.length) expSpheres.iterator = 0;
};

Client.prototype.updateStaticFlames = function(dt) {
    var t = pc.now();
    var pos;
    var sphere;
    var timeLerp, len;
    
    this.staticFlameMat.setParameter("time", t/5000.0);
    
    for(var i=0; i<staticFlames.list.length; i++) {
        sphere = staticFlames.list[i];
        if (sphere.endTime && t > sphere.endTime) {
            sphere.model.enabled = false;
            sphere.endTime = 0;
        } else if (sphere.endTime) {
            
            sphere.bbrd.setLocalPosition(0,0,0);
            sphere.bbrd.lookAt(this.cam.getPosition());
            sphere.bbrd.rotateLocal(90, 0, 0);
            pos = sphere.bbrd.getPosition();
            this.direction.copy(pos).sub(this.cam.getPosition()).normalize().scale(-1.5);
            pos.add(this.direction);
            sphere.bbrd.setPosition(pos);
            
            if (sphere.velocityFromPlayer >= 0 && renderPlayerStates[sphere.velocityFromPlayer]) {
                if (sphere.linkParent) {
                    sphere.model.setPosition(sphere.linkParent.getPosition());
                    this.direction3.copy(playerVelocitySmooth[sphere.velocityFromPlayer]).normalize();
                    sphere.direction.lerp(sphere.direction, this.direction3, dt);//*0.25);
                    //console.log(sphere.model.getWorldTransform().getScale().data);
                    sphere.meshInstance.setParameter("reachUp", 1.0);
                }
            } else if (sphere.velocityFromProj >= 0 && renderProjStates[sphere.velocityFromProj]) {
                if (sphere.linkParent) {
                    sphere.model.setPosition(sphere.linkParent.getPosition());
                    sphere.direction.set(-renderProjStates[sphere.velocityFromProj].vx, -renderProjStates[sphere.velocityFromProj].vz);
                    sphere.meshInstance.setParameter("reachUp", 0.0);
                }
            } else {
                sphere.direction.lerp(sphere.direction, pc.Vec2.ZERO, dt*0.25);
                sphere.meshInstance.setParameter("reachUp", 1.0);
            }
            
            len = sphere.shaderEndTime - sphere.shaderStartTime;
            timeLerp = (pc.explosionShader.time - sphere.shaderStartTime) / len;
            sphere.meshInstance.setParameter("timeLerp", timeLerp);
            
            if (sphere.velocityFromProj >= 0) {
                if (renderProjStates[sphere.velocityFromProj]) {
                    sphere.meshInstance.setParameter("timeLerp", timeLerp * 2);
                    sphere.model.setLocalScale(0.5, 0.5, 0.5);
                    this.direction.set(renderProjStates[sphere.velocityFromProj].vx, 
                                       renderProjStates[sphere.velocityFromProj].vy, 
                                       renderProjStates[sphere.velocityFromProj].vz).add(sphere.model.getLocalPosition());
                    sphere.model.lookAt(this.direction);
                } else {
                    sphere.endTime = t;
                }
            }
            
            //if (sphere.velocityFromPlayer >= 0) console.log(timeLerp);
            
            sphere.bbrd.model.model.meshInstances[0].setParameter("material_emissiveIntensity", (1.0-Math.abs(timeLerp-1.0))*0.125);
        }
    }
};

Client.prototype.addStaticFlame = function(pos, normal, wind) {
    var sphere = staticFlames.list[staticFlames.iterator];
    var model = sphere.model;
    var timeRandomness = 200;
    var timeOffset = 1000 + (Math.random()*2-1) * timeRandomness;
    sphere.endTime = pc.now() + timeOffset * 2;
    
    if (model.parent !== null) {
        model.parent.removeChild(model);
    }
    this.app.root.addChild(model);
    model.enabled = true;
    model.setPosition(pos.x, pos.y, pos.z);
    
    if (normal) {
        this.midPoint.copy(pos).sub(normal);
        model.lookAt(this.midPoint);
        model.setLocalScale(1,1,1);
    } else {
        model.setEulerAngles(-90, 0, 0);
        model.setLocalScale(1,1,1);
    }
    
    sphere.direction.set(wind.x, wind.z);
    
    sphere.shaderStartTime = pc.explosionShader.time;
    sphere.shaderEndTime = pc.explosionShader.time + timeOffset / 1000.0;
    
    sphere.meshInstance.setParameter("objectRandom", Math.random());
    
    sphere.velocityFromPlayer = -1;
    sphere.linkParent = null;
    
    staticFlames.iterator++;
    if (staticFlames.iterator === staticFlames.list.length) staticFlames.iterator = 0;
    
    return sphere;
};

Client.prototype.addStaticFlameLinked = function(parent, player, proj) {
    var pos = parent.getPosition();
    var x = pos.x;
    var y = pos.y;
    var z = pos.z;
    var sphere = this.addStaticFlame(pos, null, pc.Vec3.ZERO);//playerVelocitySmooth[player]);
    sphere.velocityFromPlayer = player;
    sphere.velocityFromProj = proj;
    sphere.linkParent = parent;
    sphere.endTime += 2000;
    sphere.shaderEndTime += 1;
};

Client.prototype.addAntishield = function(id) {
    var pbody = playerActiveParts[id] & PART_TOPHEAVY ? playerStructs[id].topHeavy : playerStructs[id].topLight;
    if (!pbody) return;
    var pos = pbody.getPosition();
    
    var i;
    antishieldPoints[0].copy(pos);
    var fwd = playerModels[id].forward;
    for(i=1; i<9; i++) {
        this.direction.set(Math.random()*2-1, (Math.random()*2-1)*0.5, Math.random()*2-1).scale(0.5);
        this.direction.scale(2).sub(fwd).normalize();
        antishieldPoints[i].copy(antishieldPoints[0]).add(this.direction);
    }
    
    if (renderPlayerStates && renderPlayerStates[id]) {
        i = 1;
        var playa = renderPlayerStates[id];
        var dx, dz;
        var playaB;
        var len;
        for(var uid in renderPlayerStates) {
            if (!renderPlayerStates.hasOwnProperty(uid)) continue;
            if (uid == id) continue;
            playaB = renderPlayerStates[uid];
            if (!playaB) continue;
            dx = playaB.x - playa.x;
            dz = playaB.z - playa.z;
            if (dx*dx + dz*dz < antishieldRadius * antishieldRadius) {
                
                len = Math.sqrt(dx*dx + dz*dz);
                dx /= len;
                dz /= len;
                if (dx * -fwd.x + dz * -fwd.z < 0) continue;
                
                this.shootRay.origin.set(playa.x, 2, playa.z);
                this.shootRay.direction.set(dx, 0, dz);
                if (colModels.level.intersectsRay(this.shootRay, this.pickedPoint, this.pickedNormal, len)) {
                    console.log(this.pickedPoint.data);
                    console.log(this.direction2.copy(this.shootRay.origin).sub(this.pickedPoint).lengthSq());
                    console.log(len);
                    if (this.direction2.copy(this.shootRay.origin).sub(this.pickedPoint).lengthSq() < len*len) continue;
                }
                
                antishieldPoints[i].set(playaB.x, PLAYER_Y, playaB.z);
                i++;
                if (i > 8) break;
            }
        }
    }
    
    antishieldEndTime = pc.now() + antishieldTime;
};

Client.prototype.createColModelFromEntity = function(e, mulScale, xscale, zscale) {
    var pp = e.getPosition().clone();
    var pr = e.getRotation().clone();
    e.setPosition(0,0,0);
    e.setRotation(pc.Quat.IDENTITY);
    var children = e.children;
    var boxes = [];
    var dynamicBoxes = {};
    var phSpheres = [];
    var sphere, pos;
    var name;
    var i;
    for(i=0; i<children.length; i++) {
        name = children[i].name;
        if (name === "COL") {
            boxes.push(children[i]);
        } else if (name === "PCOL") {
            sphere = children[i];
            pos = sphere.getPosition();
            phSpheres.push(pos.x);
            phSpheres.push(pos.y);
            phSpheres.push(pos.z);
            phSpheres.push(sphere.getLocalScale().x * xscale * 0.5);
        } else if (name.substr(0,4) === "DCOL") {
            name = name.substr(4,name.length-4);
            dynamicBoxes[name] = boxes.length;
            boxes.push(children[i]);
        }
    }
    var c = new ColModel(boxes.length);
    c.boxNameToId = dynamicBoxes;
    for(i=0; i<boxes.length; i++) {
        
        if (mulScale) {
            var scl = boxes[i].getLocalScale();
            scl.scale(mulScale);
            boxes[i].setLocalScale(scl);
        }
        
        var ss = boxes[i].getWorldTransform().getScale();//getLocalScale();
        //var sx = ss.x;
        //var sz = ss.z;
        //if (xscale) ss.x *= xscale;
        //if (zscale) ss.x *= zscale;
        //boxes[i].setLocalScale(ss);
        c.setBoxMatrix(i, boxes[i].getWorldTransform(), boxes[i].getPosition(), boxes[i].getRotation(), ss);
        //ss.x = sx;
        //ss.z = sz;
        //boxes[i].setLocalScale(ss);
    }
    e.setPosition(pp);
    e.setRotation(pr);
    
    if (phSpheres.length > 0) {
        phEngine.createStaticObstacles(phSpheres);
    }
    
    return c;
};

Client.prototype.hidePhSpheres = function(e) {
    var meshes = e.model.model.meshInstances;
    var meshes2 = [];
    for(var i=0; i<meshes.length; i++) {
        if (meshes[i].node.name.substr(0,3) !== "SPH" && meshes[i].node.name.substr(0,1) !== "#") {
            meshes2.push(meshes[i]);
        }
    }
    e.model.model.meshInstances = meshes2;
};

Client.prototype.initFlameTrail = function() {
    var pos = [];
    var indices = [];

    //var point2key = 1;//4;
    var subDivs = 1;// 12;
    var numQuads = 32 * 8;// * point2key;
    //var numKeyPoints = 32;
    var quadWidth = 0.5;
    var quadLength = 0.5;
    
    var numPoints = numQuads + 1;
    this.flameTrailPoints = numPoints;//numKeyPoints;//numPoints;

    var j, k;
    var w = quadWidth;
    var l = quadLength;
    var index;
    var offset = 0;
    var rnd;
    
    for(k=0; k<2; k++) { // 2 bands
        for(j=0; j<numQuads * subDivs + 1; j++) {
            index = j;
            //pos.push(k); pos.push(0.5); pos.push(index / subDivs);
            //pos.push(k); pos.push(-0.5); pos.push(index / subDivs);
            pos.push(k); pos.push(0.5); pos.push(index / subDivs);
            pos.push(k); pos.push(-0.5); pos.push(index / subDivs);
        }

        for(j=0; j<numQuads * subDivs; j++) {
            indices.push(offset); indices.push(offset + 1); indices.push(offset + 3);
            indices.push(offset + 3); indices.push(offset + 2); indices.push(offset);
            offset += 2;
        }
    }
    
    var device = this.app.graphicsDevice;
    var mesh = pc.scene.procedural.createMesh(device, pos, {indices:indices});
    
    var material = new pc.Material();
    material.cullMode = pc.CULLFACE_NONE;
    material.alphaWrite = false;
    material.blend = true;
    material.blendType = pc.BLEND_ADDITIVEALPHA;// pc.BLEND_NORMAL;
    material.depthWrite = false;

    material.setShader( pc.shaderChunks.createShaderFromCode(device, 
                                                             "#define KEYS " + this.flameTrailPoints + "\n" +
                                                             //"#define POINT2KEY " + (1.0/point2key) + "\n" +
                                                             this.app.assets.find("flameTrailVS").resource, 
                                                             this.app.assets.find("flameTrailPS").resource, "flameTrail") );
    material.setParameter("width", quadWidth);
    material.setParameter("flameTex", this.app.assets.find("flamesSlice.png").resource);
    material.setParameter("curlTex", this.app.assets.find("curl.png").resource);
    //material.blendType = pc.BLEND_ADDITIVE;
    
    this.flameTrailMesh = mesh;
    this.flameTrailMat = material;
    
    
    
    this.flameTrailInstance = this.app.root.findByName("flameTrail").model.meshInstances[0];
    this.flameTrailInstance.mesh = this.flameTrailMesh;
    this.flameTrailInstance.material = this.flameTrailMat;
    this.flameTrailInstance.cull = false;
    this.flameTrailInstance.layer--;
    
    this.flameTrailPos = new Float32Array(this.flameTrailPoints * 4);
    this.flameTrailInstance.setParameter("positions[0]", this.flameTrailPos);
    
    this.flameTrailRandoms = new Float32Array(this.flameTrailPoints);
    this.flameTrailInstance.setParameter("randoms[0]", this.flameTrailRandoms);
};

Client.prototype.initStaticFlame = function(mat) {
    var device = this.app.graphicsDevice;
    var material = mat;
    material.cullMode = pc.CULLFACE_NONE;
    material.alphaWrite = false;
    material.blend = true;
    material.blendType = pc.BLEND_ADDITIVEALPHA;// pc.BLEND_NORMAL;
    material.depthWrite = false;

    var self = this;
    material.updateShader = function() {
        material.setShader( pc.shaderChunks.createShaderFromCode(device, 
                                                             self.app.assets.find("staticFlameVS").resource, 
                                                             self.app.assets.find("staticFlamePS").resource, "staticFlame") );
    };
    material.updateShader();
    material.setParameter("curlTex", this.app.assets.find("curl.png").resource);
    
    this.staticFlameMat = material;
    
    return material;
};

Client.prototype.extractAnimFrames = function(animRes, boneName, numFrames) {
    var nodes = animRes._nodes;
    var node;
    var i;
    for(i=0; i<nodes.length; i++) {
        if (nodes[i]._name === boneName) {
            node = nodes[i];
            break;
        }
    }
    var keys = node._keys;
    var quats = [];
    for(i=0; i<numFrames; i++) {
        quats.push(keys[i].rotation);
    }
    return quats;
};

Client.prototype.extractAnimFramesPosition = function(animRes, boneName, numFrames) {
    var nodes = animRes._nodes;
    var node;
    var i;
    for(i=0; i<nodes.length; i++) {
        if (nodes[i]._name === boneName) {
            node = nodes[i];
            break;
        }
    }
    var keys = node._keys;
    var pos = [];
    for(i=0; i<numFrames; i++) {
        pos.push(keys[i].position);
    }
    return pos;
};

Client.prototype.loadSound = function(name) {
    var sound = this.app.root.findByName(name);
    if (this.supportsAudio) sound.sound.slot("fire echo").setExternalNodes(this.convolver);
    return sound;
};

Client.prototype.setFontEffect = function(font, effect) {
    //font.element._text._meshInstance.setParameter("font_effect", effect);
    font.element._text._model.meshInstances[0].setParameter("font_effect", effect);
};

Client.prototype.setupUiAbility = function(name) {
    this[name] = this.app.root.findByName(name);
    this[name+"Glow"] = this.app.root.findByName(name+"Glow");
    this[name].element.material.chunks.emissiveConstPS = this.uiEmissive;
    this[name].element.material.update();
    this[name].element.material.setParameter("progress", 1);
};

Client.prototype.createBatch = function(model) {
    // Collect original meshInstances
    var meshInstances = [];
    for(var i=0; i<model.meshInstances.length; i++) {
        if (model.meshInstances[i].node.name.substr(0,1) === "#") continue;
        if (model.meshInstances[i].node.name.substr(0,3) === "SPH") continue;
        if (!model.meshInstances[i].visible) continue;
        meshInstances.push(model.meshInstances[i]);
    }
    
    model.enabled = false;
    
    // Create new combined mesh instance
    return pc.batching.generateBatch(meshInstances);
};

/*Client.prototype.allocateBatches = function(entity, maxCount) {
    var i, j;
    
    var model = entity.model;
    
    // Collect original meshInstances
    var meshInstances = [];
    for(i=0; i<model.meshInstances.length; i++) {
        if (model.meshInstances[i].node.name.substr(0,3) !== "SPH") {
            meshInstances.push(model.meshInstances[i]);
        }
    }
    
    // Create new combined mesh instance
    var batch = pc.batching.generateBatch(meshInstances);
    
    var batches = [];
    for(i=0; i<maxCount; i++) {
        // Clone batched model
        var modelClone = entity.clone();
        meshInstances = [];
        for(j=0; j<modelClone.model.meshInstances.length; j++) {
            if (modelClone.model.meshInstances[j].node.name.substr(0,3) !== "SPH") {
                meshInstances.push(modelClone.model.meshInstances[j]);
            }
        }
        batches[i] = pc.batching.cloneBatch(batch, meshInstances);
        batches[i].meshInstance.castShadow = true;
        batches[i].entity = modelClone;
        
        var newModel = new pc.Model();
        newModel.meshInstances = [batches[i].meshInstance];
        newModel.castShadows = true;
        batches[i].model = newModel;
    }
    
    entity.model.enabled = false;
    
    return {iterator:0, batches:batches};
};*/

Client.prototype.createCheckbox = function(parent, disabled) {
    
    //var c = document.createElement("input");
    //c.type = "checkbox";
    //c.className = "checkbox";
    
    var c = document.createElement("div");
    c.className = "checkbox";
    
    var checkmark = document.createElement("div");
    checkmark.innerHTML = "⨉";// "🞩";
    checkmark.style.display = "none";
    c.appendChild(checkmark);
    
    c._checked = false;
    
    if (disabled) {
        c.className = "checkboxDisabled";
    } else {    
        Object.defineProperty(c, "checked", {
            get: function () {
                return this._checked;
            },
            set: function (val) {
                if (this._checked === val) return;
                this._checked = val;
                checkmark.style.display = val ? "block" : "none";
            }
        });
        c.onclick = function() {
            this.checked = !this._checked;
            this.onchange();
        };
    }
    
    /*var label = document.createElement("label");
    label.className = "checkboxLabel";
    label.appendChild(c);
    
    var span = document.createElement("span");
    span.className = "checkboxSpan";
    label.appendChild(span);
    
    parent.appendChild(label);*/
    parent.appendChild(c);
    return c;
};

function compareHighScore(a, b) {
    return b.score - a.score;
}

Client.prototype.preallocTraces = function() {
    traceCache.iterator = 0;
    traceCache.list = [];
    for(var i=0; i<32; i++) {
        traceCache.list[i] = {endTime:0, model:this.trace.clone(), xform:new pc.Vec4(3,1,0,0)};
        traceCache.list[i].model.model.meshInstances[0].setParameter("texture_opacityMapTransform", traceCache.list[i].xform.data);
    }
};

Client.prototype.preallocImpactParticles = function() {
    impactPhSpheres.iterator = 0;
    impactPhSpheres.list = [];
    var rnd2;
    var impactParticle = this.app.root.findByName("impactParticle");
    for(var i=0; i<128; i++) {
        impactPhSpheres.list[i] = {endTime:0, sph:phEngine.addParticle(0, 100000, 0, CL_IMPACTPARTICLERADIUS, PHSTATE_KINEMATIC, true, "I"),
                                  model:impactParticle.clone(), rnd:Math.random(),
                                  prevPos: new pc.Vec3()};
        rnd2 = Math.random() * 0.07 + 0.03;
        impactPhSpheres.list[i].model.setLocalScale(rnd2, rnd2, rnd2);
        impactPhSpheres.list[i].scale = rnd2;
        impactPhSpheres.list[i].bbrd = impactPhSpheres.list[i].model.findByName("bbrd");
        impactPhSpheres.list[i].meshInstance = impactPhSpheres.list[i].model.findByName("object");
        impactPhSpheres.list[i].bbrd.model.model.meshInstances[0].setParameter("material_emissiveIntensity", 0.125);
        phLevelCollision[impactPhSpheres.list[i].sph] = false;//true;
    }
};

Client.prototype.preallocBulletShells = function() {
    var i;
    bulletShells.iterator = 0;
    bulletShells.list = [];
    var bulletShell = this.app.root.findByName("bulletShell");
    for(i=0; i<128; i++) {
        bulletShells.list[i] = {endTime:0, sph:phEngine.addParticle(0, 100000, 0, CL_IMPACTPARTICLERADIUS, PHSTATE_KINEMATIC, true, "B"),
                                  model:bulletShell.clone(), rnd:Math.random(),
                                  prevPos: new pc.Vec3()};
        bulletShells.list[i].meshInstance = bulletShells.list[i].model.findByName("object");
        phLevelCollision[bulletShells.list[i].sph] = false;//true;
    }
    
    bulletShells2.iterator = 0;
    bulletShells2.list = [];
    var bulletShell2 = this.app.root.findByName("bulletShellShotgun");
    for(i=0; i<64; i++) {
        bulletShells2.list[i] = {endTime:0, sph:phEngine.addParticle(0, 100000, 0, CL_IMPACTPARTICLERADIUS, PHSTATE_KINEMATIC, true, "B"),
                                  model:bulletShell2.clone(), rnd:Math.random(),
                                  prevPos: new pc.Vec3()};
        bulletShells2.list[i].meshInstance = bulletShells2.list[i].model.findByName("object");
        phLevelCollision[bulletShells2.list[i].sph] = false;//true;
    }
};

Client.prototype.preallocFireworks = function() {
    fireworks.iterator = 0;
    fireworks.list = [];
    var firework = pc.fireworkParticles.firework;
    for(var i=0; i<64; i++) {
        fireworks.list[i] = {endTime:0,
                                  model:firework.clone(), rnd:Math.random()};
        fireworks.list[i].meshInstance = fireworks.list[i].model.model.meshInstances[0];
        fireworks.list[i].meshInstance.mesh = pc.fireworkParticles.mesh;
        fireworks.list[i].meshInstance.material = pc.fireworkParticles.material;
    }
};

Client.prototype.preallocExpSpheres = function() {
    expSpheres.iterator = 0;
    expSpheres.list = [];
    var expSphere = this.app.root.findByName("explosionSphere");
    this.expSphere = expSphere;
    for(var i=0; i<32; i++) {
        expSpheres.list[i] = {endTime:0, sph:phEngine.addParticle(0, 100000, 0, CL_EXPLOSIONSPHERERADIUS, PHSTATE_KINEMATIC, true, "E"),
                                  model:expSphere.clone(), rnd:Math.random(), bbrd:null, meshInstance:null};
        expSpheres.list[i].bbrd = expSpheres.list[i].model.findByName("bbrd");
        expSpheres.list[i].meshInstance = expSpheres.list[i].model.findByName("explosionSph").model.model.meshInstances[0];
        //expSpheres.list[i].rbIndex = phRbIndex[expSpheres.list[i].sph];
    }
};

Client.prototype.preallocFlames = function() {
    flameSpheres.iterator = 0;
    flameSpheres.list = [];
    var flameSphere = this.app.root.findByName("flameSphere");
    var scl;
    var rnd = 0;
    for(var i=0; i<128; i++) {
        //rnd = pc.math.lerp(rnd, Math.random(), 0.25);
        //rnd = Math.sin(i/300.0)*0.5+0.5;
        rnd = Math.random();
        flameSpheres.list[i] = {model: flameSphere.clone(), endTime: 0,
                               sph:phEngine.addParticle(0, 100000, 0, CL_FIREPARTICLERADIUS, PHSTATE_KINEMATIC, true, "F"),
                               prevPos: new pc.Vec3(),
                               color: new pc.Vec3(),
                               prevNode: -1,
                               head: false,
                               rnd: rnd,
                               //hierDepth: 0,
                               velocity2: new pc.Vec3()};
        flameSpheres.list[i].quad = flameSpheres.list[i].model.findByName("quad");
        flameSpheres.list[i].quad.rotate(0, Math.random() * 360, 0);
        scl = Math.random() + 0.5;
        flameSpheres.list[i].quad.setLocalScale(scl, scl, scl);
        phRbIndex[flameSpheres.list[i]] = -1;
        
        flameSpheres.list[i].model2 = this.expSphere.clone();
        flameSpheres.list[i].model2.setLocalScale(1,1,1);
        flameSpheres.list[i].bbrd = flameSpheres.list[i].model2.findByName("bbrd");
        flameSpheres.list[i].meshInstance = flameSpheres.list[i].model2.findByName("explosionSph").model.model.meshInstances[0];
        
        flameSpheres.list[i].model3 = this.expSphere.clone();
        flameSpheres.list[i].model3.setLocalScale(1,1,1);
        flameSpheres.list[i].bbrd3 = flameSpheres.list[i].model3.findByName("bbrd");
        flameSpheres.list[i].meshInstance3 = flameSpheres.list[i].model3.findByName("explosionSph").model.model.meshInstances[0];
    }
};

Client.prototype.preallocStaticFlames = function() {
    staticFlames.iterator = 0;
    staticFlames.list = [];
    var staticFlame = this.app.root.findByName("staticFlame");
    this.staticFlame = staticFlame;
    this.initStaticFlame(staticFlame.findByName("flame").model.meshInstances[0].material);
    for(var i=0; i<256; i++) {
        staticFlames.list[i] = {endTime:0, model:staticFlame.clone()};
        staticFlames.list[i].bbrd = staticFlames.list[i].model.findByName("bbrd");
        staticFlames.list[i].meshInstance = staticFlames.list[i].model.findByName("flame").model.model.meshInstances[0];
        staticFlames.list[i].direction = new pc.Vec2();
        staticFlames.list[i].meshInstance.setParameter("direction", staticFlames.list[i].direction.data);
    }
};

Client.prototype.preallocMuzzleFlashes = function() {
    muzzleFlashes.iterator = 0;
    muzzleFlashes.list = [];
    //var muzzleFlash = this.app.root.findByName("muzzleFlash");
    for(var i=0; i<32; i++) {
        /*muzzleFlashes.list[i] = {endTime:0,
                                 model:muzzleFlash.clone(),
                                 rnd:0};*/
        muzzleFlashes.list[i] = {endTime:0, model:this.staticFlame.clone()};
        muzzleFlashes.list[i].bbrd = muzzleFlashes.list[i].model.findByName("bbrd");
        muzzleFlashes.list[i].meshInstance = muzzleFlashes.list[i].model.findByName("flame").model.model.meshInstances[0];
        muzzleFlashes.list[i].direction = new pc.Vec2(0,0);
        muzzleFlashes.list[i].meshInstance.setParameter("direction", muzzleFlashes.list[i].direction.data);
    }
};

// initialize code called once per entity
Client.prototype.postInitialize = function() {
    pc.GAMECLIENT = this;
    this.id = 0;
    this.player = null;
    this.command = new UserCommand();
    
    // type: 1 byte
    // ctrl: 2 bytes
    // angle: 1 byte
    // vx: 1 byte
    // vz: 1 byte
    // tx: 2 bytes
    // ty: 1 byte
    // tz: 2 bytes
    // 11 bytes total
    //this.commandBin = new DataView(new ArrayBuffer(11));
    // float3 target
    
    //this.commandBin = new DataView(new ArrayBuffer(24));//4 + 4 + 3*4));
    this.commandBin = new DataView(new ArrayBuffer(19));//18));
    this.commandBinReqParts = new DataView(new ArrayBuffer(5));
    
    //this.framesToSend = 0;

    this.playerPrefab = this.app.root.findByName("Player");
    //var maxPlayers = 4*4;
    //this.batchesTopLight = this.allocateBatches(this.playerPrefab.findByName("top_light"), maxPlayers);
    //this.batchesLegs = this.allocateBatches(this.playerPrefab.findByName("legs"), maxPlayers);
    this.batchTopLight = this.createBatch(this.playerPrefab.findByName("top_light").model);
    this.batchLegs = this.createBatch(this.playerPrefab.findByName("legs").model);
    
    var psphere = this.app.root.findByName("PlayerSphere");
    this.playerSphereLocal = new pc.BoundingSphere(psphere.getPosition(), psphere.getLocalScale().x);
    this.playerSphereWorld = new pc.BoundingSphere();
    this.playerSphereWorld.radius = this.playerSphereLocal.radius;
    //console.log(this.playerSphereLocal.radius);
    this.cam = this.app.root.findByName("Camera");
    this.camTarget = this.app.root.findByName("CameraTarget");
    this.cursor = this.app.root.findByName("cursor");
    this.wpnModels = [null,
                      this.app.root.findByName("mgun"),
                      this.app.root.findByName("rocketl"),
                      this.app.root.findByName("grenadel"),
                      this.app.root.findByName("flamet"),
                      this.app.root.findByName("shotgun")];
    //this.muzzle = this.app.root.findByName("p_muzzle");
    //this.metalimpact = this.app.root.findByName("p_metalimpact");
    //this.metalimpact2 = this.app.root.findByName("p_metalimpact2");
    //this.explode = this.app.root.findByName("p_explode");
    //this.flames = this.app.root.findByName("p_flamet");
    //this.fire = this.app.root.findByName("p_fire");
    this.trace = this.app.root.findByName("trace");
    this.rocket = this.app.root.findByName("proj_rocket");
    this.grenade = this.app.root.findByName("grenade");
    
    this.shieldRotation = this.app.root.findByName("shield").getRotation().clone();
    this.playerHit = 0;
    
    this.ammoIndicator = this.app.root.findByName("ammoIndicator");
    this.ammoIndicator.model.meshInstances[0].material.customFragmentShader = this.app.assets.find("ammoIndicatorPS").resource;
    
    var debrTint = 0.125;
    this.debrisTint = new pc.Vec3(debrTint, debrTint, debrTint);
    
    this.regenList = [];
    
    this.app.graphicsDevice.canvas.onmousedown = function() {
        if (buyMenuMode) {
            self.toggleBuyMenu();
        }
    };
    
    var animRunResource = this.app.assets.find("robot_run.json").resource;
    console.log(animRunResource);
    this.animRun = {};
    this.animRun.numFrames = animRunResource._nodes[0]._keys.length - 1;
    
    this.animRun.root = this.extractAnimFrames(animRunResource, "Robot", this.animRun.numFrames);
    this.animRun.rootPos = this.extractAnimFramesPosition(animRunResource, "Robot", this.animRun.numFrames);
    this.animRun.center = this.extractAnimFrames(animRunResource, "Robot Pelvis", this.animRun.numFrames);
    
    this.animRun.lUpLeg = this.extractAnimFrames(animRunResource, "Robot L Thigh", this.animRun.numFrames);
    this.animRun.lLoLeg = this.extractAnimFrames(animRunResource, "Robot L Calf", this.animRun.numFrames);
    this.animRun.lLo2Leg = this.extractAnimFrames(animRunResource, "Robot L HorseLink", this.animRun.numFrames);
    this.animRun.lFoot = this.extractAnimFrames(animRunResource, "Robot L Foot", this.animRun.numFrames);
    
    this.animRun.rUpLeg = this.extractAnimFrames(animRunResource, "Robot R Thigh", this.animRun.numFrames);
    this.animRun.rLoLeg = this.extractAnimFrames(animRunResource, "Robot R Calf", this.animRun.numFrames);
    this.animRun.rLo2Leg = this.extractAnimFrames(animRunResource, "Robot R HorseLink", this.animRun.numFrames);
    this.animRun.rFoot = this.extractAnimFrames(animRunResource, "Robot R Foot", this.animRun.numFrames);
    
    this.flameDecalNextTime = 0;
    
    this.supportsAudio = this.app.systems.sound.context && this.app.systems.sound.context.createConvolver;
    if (this.supportsAudio) {
        this.convolver = this.app.systems.sound.context.createConvolver();
        this.convolver.buffer = this.app.assets.find("InsidePiano.m4a").resource.buffer;
    }
    
    this.audioExplosion = this.loadSound("audio_explosion");
    this.audioImpact = [this.loadSound("audio_impact1"),
                        this.loadSound("audio_impact2"),
                        this.loadSound("audio_impact3")];
    this.audioCrash = this.loadSound("audio_crash");
    /*this.audioMetal = [this.loadSound("audio_metal1"),
                        this.loadSound("audio_metal2"),
                        this.loadSound("audio_metal3")];*/
    
    this.screen2d = this.app.root.findByName("2D Screen").screen;
    this.textNickname = this.app.root.findByName("textNickname");
    this.imgRank = this.app.root.findByName("imgRank");
    this.textRespawn = this.app.root.findByName("textRespawn");
    
    //this.allocParticles(this.muzzle, "muzzle", 128);
    //this.allocParticles(this.metalimpact, "metalimpact", 32);
    //this.allocParticles(this.metalimpact2, "metalimpact2", 32);
    //this.allocParticles(this.explode, "explode", 8);
    //this.allocParticles(this.flames, "flames", 32);
    //this.allocParticles(this.fire, "fire", 32);
    
    var i;
    colModels.weapons = [];
    colModels.weaponsThick = [];
    for(i=1; i<this.wpnModels.length; i++) {
        this.wpnModels[i].setPosition(0,0,0);
        this.wpnModels[i].setRotation(pc.Quat.IDENTITY);
        colModels.weapons[i] = this.createColModelFromEntity(this.wpnModels[i], weaponScale);
        colModels.weaponsThick[i] = this.createColModelFromEntity(this.wpnModels[i], 2);
    }
    
    
    colModels.legs = this.createColModelFromEntity(this.app.root.findByName("legs"));
    colModels.tracks = this.createColModelFromEntity(this.app.root.findByName("tracks"));
    colModels.topLight = this.createColModelFromEntity(this.app.root.findByName("top_light"));
    colModels.topHeavy = this.createColModelFromEntity(this.app.root.findByName("top_heavy"));
    
    colModels.legsThick = this.createColModelFromEntity(this.app.root.findByName("legs"), 2);
    colModels.tracksThick = this.createColModelFromEntity(this.app.root.findByName("tracks"), 2);
    colModels.topLightThick = this.createColModelFromEntity(this.app.root.findByName("top_light"), 2);
    colModels.topHeavyThick = this.createColModelFromEntity(this.app.root.findByName("top_heavy"), 2);
    
    var level = this.app.root.findByName("Level");
    var levelScale = level.getLocalScale().x;
    colModels.level = this.createColModelFromEntity(level, undefined, levelScale, levelScale);
    colModels.level.constructGrid(10, 5);
    pc.decals.initializeDecals(colModels.level);
    
    this.bulletHoleMaterial.resource.chunks.tangentBinormalVS = this.app.assets.find("tangentBinormalDecalVS").resource;
    this.bulletHoleMaterial2.resource.chunks.tangentBinormalVS = this.bulletHoleMaterial.resource.chunks.tangentBinormalVS;
    
    this.explosionDecalMaterial.resource.chunks.emissiveTexPS = this.app.assets.find("emissiveTexExplosionDecalPS").resource;
    
    var camOffset1 = this.cam.forward.clone().scale(-0.01);
    var camOffset2 = this.cam.forward.clone().scale(-0.02);
    this.decalGroupBulletHole = pc.decals.createGroup(this.bulletHoleMaterial.resource, 24, 128, true, camOffset1);
    this.decalGroupBulletHole2 = pc.decals.createGroup(this.bulletHoleMaterial2.resource, 24, 128, true, camOffset1);
    this.decalGroupExplosion = pc.decals.createGroup(this.explosionDecalMaterial.resource, 255, 64, false, camOffset2);
    
    this.preallocTraces();
    
    hitPhSpheres.iterator = 0;
    hitPhSpheres.list = [];
    for(i=0; i<32; i++) {
        hitPhSpheres.list[i] = {endTime:0, sph:phEngine.addParticle(0, 100000, 0, 0.5, PHSTATE_KINEMATIC, true, "H")};
    }

    this.preallocImpactParticles();
    this.preallocBulletShells();
    this.preallocFireworks();
    this.preallocExpSpheres();
    
    lightEffects.iterator = 0;
    lightEffects.list = [];
    for(i=0; i<32; i++) {
        lightEffects.list[i] = {x:0, z:0, time:0};
    }
    
    this.preallocFlames();
    
    this.flameColorStart = new pc.Vec3(1,1,1);
    this.flameColorEnd = new pc.Vec3(1,0,0);
    
    this.initFlameTrail();
    
    this.preallocStaticFlames();
    
    this.preallocMuzzleFlashes();
    
    
    /*this.stats = document.createElement("div");
    this.stats.innerHTML = "";
    this.stats.style.position = "absolute";
    this.stats.style.left = "0px";
    this.stats.style.top = "0px";
    this.stats.style.color = "white";
    this.stats.style.textShadow = "1px 1px 0px rgba(0, 0, 0, 1)";
    
        this.statsShield = document.createElement("div");
        this.stats.appendChild(this.statsShield);
    
        this.statsBoost = document.createElement("div");
        this.stats.appendChild(this.statsBoost);
    
        this.statsAntishield = document.createElement("div");
        this.stats.appendChild(this.statsAntishield);
    
        this.statsBuymenu = document.createElement("div");
        this.statsBuymenu.innerHTML = "Buy menu [B]";
        this.stats.appendChild(this.statsBuymenu);
    
        this.statsAmmo = document.createElement("div");
        this.stats.appendChild(this.statsAmmo);
    
    document.body.appendChild(this.stats);*/
    
    this.textXp = this.app.root.findByName("textXp");
    this.textXpBg = this.app.root.findByName("textXpBg");
    //this.textXpBonus = this.app.root.findByName("textXpBonus");
    this.textTimeLeft = this.app.root.findByName("textTime");
    this.textScore = [this.app.root.findByName("textRed"),
                      this.app.root.findByName("textGreen"),
                      this.app.root.findByName("textBlue"),
                      this.app.root.findByName("textYellow")];
    this.textWaiting = this.app.root.findByName("textWaiting");

    this.uiGroupAntishield = this.app.root.findByName("uiGroupAntishield");
    
    this.uiEmissive = this.app.assets.find("emissiveConstAbilityPS").resource;
    this.setupUiAbility("uiAbilityShield");
    this.setupUiAbility("uiAbilityBoost");
    this.setupUiAbility("uiAbilityAntishield");
    
    
    this.setFontEffect(this.textXp, 1);
    this.setFontEffect(this.textTimeLeft, 1);
    this.setFontEffect(this.textScore[0], 1);
    this.setFontEffect(this.textScore[1], 1);
    this.setFontEffect(this.textScore[2], 1);
    this.setFontEffect(this.textScore[3], 1);
    
    this.setFontEffect(this.textWaiting, 0);
    
    this.colorRed = new pc.Color(1,0,85/255.0);
    this.colorLime = new pc.Color(5/255.0, 228/255.0, 172/255.0);
    
    this.colorAbilityActive = this.uiAbilityShield.element.material.emissive.clone();
    this.colorAbilityInactive = new pc.Color(42/255.0, 42/255.0, 42/255.0);
    
    var self = this;
    
    /*this.scores = document.createElement("div");
    this.scores.style.position = "absolute";
    this.scores.style.right = "0px";
    this.scores.style.top = "0px";
    this.scores.style.width = "80px";
    this.scores.style.color = "white";
    this.scores.style.backgroundColor = "rgba(0,0,0, 0.8)";
    //this.scores.innerHTML = "Time left: ";
    this.scores.style.padding = "3px";
    this.scores.style.lineHeight = "20px";
    this.scores.style.fontSize = "12px";
    
    this.textTimeLeft = document.createElement("div");
    this.textTimeLeft.color = "white";
    
    this.textXp = document.createElement("div");
    this.textXp.style.color = "white";
    this.textXp.style.float = "left";
    //this.textXp.style.paddingBottom = "5px";
    
    this.textXpDiff = document.createElement("div");
    this.textXpDiff.style.float = "right";
    
    this.score = [];
    this.score[0] = document.createElement("div");
    this.score[0].style.color = "#ff429e"; // "#ed117d";
    
    this.score[1] = document.createElement("div");
    this.score[1].style.color = "#30c8a3";
    
    this.score[2] = document.createElement("div");
    this.score[2].style.color = "#75baed";
    
    this.score[3] = document.createElement("div");
    this.score[3].style.color = "#efcc06";

    //for(var i=0; i<4; i++) {
        //this.score[i].style.opacity = 0.8;
        //this.score[i].style.left = "0px";
    this.scores.appendChild(this.textXp);
    this.scores.appendChild(this.textXpDiff);
    this.scores.appendChild(document.createElement("br"));
    this.scores.appendChild(this.textTimeLeft);
    this.scores.appendChild(this.score[0]);
    this.scores.appendChild(this.score[3]);
    this.scores.appendChild(this.score[1]);
    this.scores.appendChild(this.score[2]);
    //}
    
    document.body.appendChild(this.scores);*/
    
    /*this.textRespawn = document.createElement("div");
    this.textRespawn.innerHTML = "";
    this.textRespawn.style.position = "absolute";
    this.textRespawn.style.left = "50%";
    this.textRespawn.style.top = "50%";
    this.textRespawn.style.transform = "translate(-50%, -50%)";
    this.textRespawn.style.color = "white";
    this.textRespawn.style.fontSize = "20px";
    this.textRespawn.style.textShadow = "1px 1px 0px rgba(0, 0, 0, 1)";
    document.body.appendChild(this.textRespawn);*/
    
    /*this.textChange = document.createElement("div");
    this.textChange.innerHTML = "";
    this.textChange.style.position = "absolute";
    this.textChange.style.left = "50%";
    this.textChange.style.bottom = "10%";
    this.textChange.style.transform = "translate(-50%, -50%)";
    this.textChange.style.color = "white";
    this.textChange.style.fontSize = "20px";
    this.textChange.style.textShadow = "1px 1px 0px rgba(0, 0, 0, 1)";
    document.body.appendChild(this.textChange);*/
    this.textChange = this.app.root.findByName("textChange");
    
    /*this.textWon = document.createElement("div");
    this.textWon.innerHTML = "";
    this.textWon.style.position = "absolute";
    this.textWon.style.left = "50%";
    this.textWon.style.top = "50%";
    this.textWon.style.transform = "translate(-50%, -150%)";
    this.textWon.style.color = "white";
    this.textWon.style.fontSize = "24px";
    this.textWon.style.textShadow = "1px 1px 0px rgba(0, 0, 0, 1)";
    document.body.appendChild(this.textWon);*/
    this.textNoWinners = this.app.root.findByName("textNoWinners");
    this.textRedWon = this.app.root.findByName("textRedWon");
    this.textGreenWon = this.app.root.findByName("textGreenWon");
    this.textBlueWon = this.app.root.findByName("textBlueWon");
    this.textYellowWon = this.app.root.findByName("textYellowWon");
    
    this.buyMenu = document.createElement("div");
    this.buyMenu.style.position = "absolute";
    this.buyMenu.style.width = "320px";
    this.buyMenu.style.height = "300px";// "320px";
    this.buyMenu.style.left = "50%";
    this.buyMenu.style.top = "50%";
    this.buyMenu.style.transform = "translate(-50%, -50%)";
    this.buyMenu.style.backgroundColor = "rgba(0,0,0,0.8)";
    this.buyMenu.style.padding = "10px";
    this.buyMenu.style.color = "white";
    //this.buyMenu.style.visibility = "hidden";
    this.buyMenu.style.display = "none";
    this.buyMenu.style.lineHeight = "10px";
    //this.buyMenu.innerHTML = "Hello";
    document.body.appendChild(this.buyMenu);
    
    this.toolTip = document.createElement("div");
    this.toolTip.id = "toolTip";
    pc.toolTip = this.toolTip;
    document.body.appendChild(this.toolTip);
    
    this.finMenu = document.createElement("div");
    this.finMenu.style.position = "absolute";
    this.finMenu.style.width = "320px";
    this.finMenu.style.height = "500px";// "320px";
    this.finMenu.style.left = "50%";
    this.finMenu.style.top = "50%";
    this.finMenu.style.transform = "translate(-50%, -50%)";
    this.finMenu.style.backgroundColor = "rgba(0,0,0,0.8)";
    this.finMenu.style.padding = "10px";
    this.finMenu.style.color = "white";
    this.finMenu.style.display = "none";
    document.body.appendChild(this.finMenu);
    
    this.scoreHeader = document.createElement("div");
    this.scoreHeader.innerHTML = "Round finished";
    this.scoreHeader.className = "header";
    this.finMenu.appendChild(this.scoreHeader);
    this.finMenu.appendChild(document.createElement("hr"));
    
    this.scoreWon = document.createElement("div");
    this.scoreWon.className = "won";
                this.scoreWon.innerHTML = "Red won!";
                this.scoreWon.style.color = "#FF002B";
    this.finMenu.appendChild(this.scoreWon);
    this.finMenu.appendChild(document.createElement("hr"));

    this.scoreTime = document.createElement("div");
    this.scoreTime.innerHTML = "Next round in:";
    this.scoreTime.className = "header";
    this.finMenu.appendChild(this.scoreTime);
    this.finMenu.appendChild(document.createElement("hr"));
    
    this.scoreHeader2 = document.createElement("div");
    this.scoreHeader2.innerHTML = "High scores:";
    this.scoreHeader2.className = "header";
    this.finMenu.appendChild(this.scoreHeader2);
    this.finMenu.appendChild(document.createElement("br"));
    
    this.scoreHi = document.createElement("table");
    this.scoreHi.className = "highscores";
    this.finMenu.appendChild(this.scoreHi);
    
    startMenuPlayText.innerHTML = "<div class='ml'>G</div>o";
    startMenuProgressBar.style.display = "none";
    startMenuPlayText.id = "";
    
    if (!this.supportsAudio) {
        soundCheckbox.checked = false;
        soundCheckbox.disabled = true;
    }
    this.enableAudio = soundCheckbox.checked;
    soundCheckbox.onchange = function(evt) {
        if (this.checked) {
            self.enableAudio = true;
        } else {
            self.enableAudio = false;
        }
    };
    
    if (!qualityCheckbox.checked) pc.gameSettings.setLow();
    qualityCheckbox.onchange = function(evt) {
        if (!this.checked) {
            localStorage.setItem("quality", false);
            console.log("Setting low quality");
            pc.gameSettings.setLow();
        } else {
            localStorage.setItem("quality", true);
            console.log("Setting high quality");
            pc.gameSettings.setHigh();
        }
    };
    
    /*
    extremeDebris = qualityCheckbox2.checked;
    qualityCheckbox2.onchange = function(evt) {
        localStorage.setItem("quality2", this.checked);
        extremeDebris = qualityCheckbox2.checked;
    };
    */
    
    this.splash = document.getElementById("application-splash-wrapper");
    this.splashOpacity = 1.0;
    
    /*
    this.startMenu = document.createElement("div");
    this.startMenu.style.position = "absolute";
    this.startMenu.style.width = "320px";
    //this.startMenu.style.height = "300px";// "320px";
    this.startMenu.style.height = "500px";// "320px";
    this.startMenu.style.left = "50%";
    this.startMenu.style.top = "50%";
    this.startMenu.style.transform = "translate(-50%, -50%)";
    this.startMenu.style.backgroundColor = "rgba(0,0,0,0.8)";
    this.startMenu.style.padding = "10px";
    this.startMenu.style.color = "white";
    //this.startMenu.style.display = "none";
    //this.startMenu.style.lineHeight = "10px";
    document.body.appendChild(this.startMenu);
    
    this.logo = document.createElement("div");
    this.logo.innerHTML = "MECHANISM";
    this.logo.id = "logo";
    this.logo.className= "header";
    this.startMenu.appendChild(this.logo);
    this.startMenu.appendChild(document.createElement("hr"));
    
    this.userNameDiv = document.createElement("div");
    
    this.userNameTip = document.createElement("div");
    this.userNameTip.innerHTML = "Your name:";
    this.userNameTip.className = "setting";
    this.userNameDiv.appendChild(this.userNameTip);
    
    this.userNameInput = document.createElement("input");
    this.userNameInput.value = localStorage.getItem("username") || "Player";
    this.userNameInput.maxLength = 32;
    var nameInput = this.userNameInput;
    this.userNameDiv.appendChild(this.userNameInput);
    
    this.userNameDiv.appendChild(document.createElement("br"));
    this.userNameDiv.appendChild(document.createElement("br"));
    this.userNameDiv.appendChild(document.createElement("hr"));
    
    this.startMenu.appendChild(this.userNameDiv);
    
    this.soundTip = document.createElement("div");
    this.soundTip.className = "setting";
    this.soundTip.innerHTML = "Sound";
    this.startMenu.appendChild(this.soundTip);
    
    this.enableAudio = false;
    this.soundCheckbox = this.createCheckbox(this.startMenu, !self.supportsAudio);
    this.soundCheckbox.checked = self.supportsAudio && this.enableAudio;
    this.soundCheckbox.onchange = function(evt) {
        if (this.checked) {
            self.enableAudio = true;
        } else {
            self.enableAudio = false;
        }
    };
    
    this.startMenu.appendChild(document.createElement("br"));
    this.startMenu.appendChild(document.createElement("hr"));
    
    this.qualityTip = document.createElement("div");
    this.qualityTip.className = "setting";
    this.qualityTip.innerHTML = "High quality";
    this.startMenu.appendChild(this.qualityTip);
    
    this.qualityCheckbox = this.createCheckbox(this.startMenu);
    this.qualityCheckbox.checked = true;
    this.qualityCheckbox.onchange = function(evt) {
        if (!this.checked) {
            console.log("Setting low quality");
            pc.gameSettings.setLow();
        } else {
            console.log("Setting high quality");
            pc.gameSettings.setHigh();
        }
    };
    this.startMenu.appendChild(this.qualityCheckbox);
    
    this.startMenu.appendChild(document.createElement("br"));
    this.startMenu.appendChild(document.createElement("hr"));
    
    this.fullscreenTip = document.createElement("div");
    this.fullscreenTip.className = "setting";
    this.fullscreenTip.innerHTML = "Fullscreen";
    this.startMenu.appendChild(this.fullscreenTip);
    
    this.fullscreenCheckbox = this.createCheckbox(this.startMenu);
    this.fullscreenCheckbox.onchange = function(evt) {
        if (this.checked) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };
    document.addEventListener("fullscreenchange", function( event ) {
        var isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
        self.fullscreenCheckbox.checked = isFs;
    });
    this.startMenu.appendChild(this.fullscreenCheckbox);
    
    this.startMenu.appendChild(document.createElement("br"));
    this.startMenu.appendChild(document.createElement("hr"));
    
    this.startMenuPlay = document.createElement("div");
    this.startMenuPlay.innerHTML = "Go";
    var playButton = this.startMenuPlay;
    this.startMenuPlay.id = "startButton";
    this.startMenu.appendChild(this.startMenuPlay);
    var menu = this.startMenu;
    
    this.menuRules = document.createElement("div");
    this.menuRules.className = "menuTips";
    this.menuRules.innerHTML = "<div class='mh'>Rules:</div> <div class='mu'>kill robots</div> from other teams and capture big <div class='mu'>H circles</div> to get points (XP) for you and your team. Spend points to improve your robot.";
    this.startMenu.appendChild(this.menuRules);
    
    this.menuControls = document.createElement("div");
    this.menuControls.className = "menuTips";
    this.menuControls.innerHTML = "<br><div class='mh'>Controls:</div> <div class='mu'>W, A, S, D</div> to move. <div class='mu'>Left</div> and <div class='mu'>Right</div> mouse buttons to shoot left/right weapons. <div class='mu'>B</div> to buy upgrades. <div class='mu'>Space</div> to accelerate. <div class='mu'>Shift</div> for shield.";
    this.startMenu.appendChild(this.menuControls);
    */
    
    this.mx = 0;
    this.my = 0;
    this.mouseMoved = false;
    this.rotationChanged = false;
    this.sentNonEmptyInputOnPrevTick = false;
    this.floor = new pc.Plane(null, new pc.Vec3(0,1,0));
    this.camRay = new pc.Ray();
    this.shootRay = new pc.Ray();
    this.localRay = new pc.Ray();
    this.bulletRay = new pc.Ray();
    this.pickedPoint = new pc.Vec3();
    this.pickedPoint2 = new pc.Vec3();
    this.pickedPoint3 = new pc.Vec3();
    this.pickedNormal = new pc.Vec3();
    this.lastUpdateServerTime = 0;
    this.lastUpdateClientTime = 0;
    this.rotationA = new pc.Quat();
    this.rotationB = new pc.Quat();
    this.rotationR = new pc.Quat();
    this.rotation = new pc.Quat();
    this.sphere = new pc.BoundingSphere();
    this.tmpQuat = new pc.Quat();
    this.tmpQuat2 = new pc.Quat();
    this.tmpQuat3 = new pc.Quat();
    this.velocity = new pc.Vec3();
    this.direction = new pc.Vec3();
    this.direction2 = new pc.Vec3();
    this.direction3 = new pc.Vec3();
    this.midPoint = new pc.Vec3();
    this.worldPos = new pc.Vec3();
    this.localPos = new pc.Vec3();
    this.localPos2 = new pc.Vec3();
    this.tmpPos1 = new pc.Vec3();
    this.tmpPos2 = new pc.Vec3();
    this.tmpMatrix = new pc.Mat4();
    this.timeToEndCorrectPrediction = false;
    this.timeToNextWorldUpdate = 0;
    this.timeToGetResults = 0;
    this.timesPredictionWasIncorrect = 0;
    this.triA = new pc.Vec3();
    this.triB = new pc.Vec3();
    this.triC = new pc.Vec3();
    this.vx = 0;
    this.vz = 0;
    this.mouseHold = [];
    this.playerWeight = 0;
    this.lastShieldStart = 0;
    this.lastBoostStart = 0;
    //this.lastDeflectStart = 0;
    this.lastAntishieldStart = 0;
    this.boostTicksLeft = 0;
    this.stunTicksLeft = 0;
    this.timeToRespawn = SV_RESPAWNTIME;
    this.gametime = 0;
    this.gametimePrevUpdate = 0;
    this.gametimeSinceLastTick = 0;
    this.temporaryPhysics = [];
    this.debris = [];
    this.wasPressed = {};
    
    //this.createPhysEnv();

    //var socket = new WebSocket("ws://localhost:3105/");"ws://mrf-io.moka.co/"
    
    this.connectToServer();
    var socket = this.socket;
    
    window.addEventListener("mousemove", this.onMouseMove.bind(this));
    window.addEventListener("mousedown", this.onMouseDown.bind(this));
    window.addEventListener("mouseup", this.onMouseUp.bind(this));
    document.addEventListener("contextmenu", function(e){
        e.preventDefault();
    }, false);
    document.addEventListener("keydown", function(e){
        if (e.keyCode == 27) { // escape
            if (buyMenuMode) {
                self.toggleBuyMenu();
                return;
            }
            if (!startMenuMode) {
                startMenu.style.display = "block";
                changelog.style.display = "block";
                adDiv.style.display = "block";
                if (adDiv2) adDiv2.style.display = "block";
                startMenuMode = true;
            } else if (startMenu2) {
                startMenu.style.display = "none";
                changelog.style.display = "none";
                adDiv.style.display = "none";
                if (adDiv2) adDiv2.style.display = "none";
                startMenuMode = false;
            }
        }
        if (startMenuMode) return;
        if (e.keyCode == 9 || e.keyCode == 32) { // disable browser tab and space
            e.preventDefault();
        }
    }, false);

    //setInterval(function(){self.clientSend();}, CL_SENDRATE);
};

function socketClosed(evt) {
    disconnectMenuParent.style.display = "block";
    console.log("disconnect code: " + evt.code);
    console.log(evt);
    disconnectReason.innerHTML = evt.reason ? evt.reason : "";
}

Client.prototype.connectToServer = function () {
    var self = this;
    var socket = new WebSocket(SV_URL);
    socket.binaryType = "arraybuffer";
    this.socket = socket;
    
    serverInput.onchange = function() {
        if (SV_URLID === serverInput.selectedIndex) return;
        SV_URLID = serverInput.selectedIndex;
        localStorage.setItem("server", SV_URLID);
        SV_URL = urlList[SV_URLID][SV_PORT];// + SV_PORT;
        console.log("Switching server to " + SV_URLID);
        self.flushLevel();
        socket.removeEventListener("close", socketClosed);
        socket.close();
        if (this.masterPort) {
            this.masterPort.close(); // SHOULD BE SELF BUT WORKS ANYWAY?
        }
        self.connectToServer();
    };
    
    var data;
    var dataDecoded = {
        state: {},
        fx: [],
        parts : {},
        pts: [{teamA:-1, teamB:-1}, {teamA:-1, teamB:-1}, {teamA:-1, teamB:-1}, {teamA:-1, teamB:-1}, {teamA:-1, teamB:-1}]
    };
    var dataPlayerCount, dataPlayerId, dataOffset, dataX, dataZ, dataAngle, dataHp1, dataHp2, dataPlayerState, dataHasFx, dataHasProj, dataHasPc, dataHasRp, dataHasAmmo, dataHasNav;
    var dataFlags1, dataFxCount, dataFx, dataProjCount, dataProj, dataTeam;
    dataOffset = 0;
    
    var msgJoined = new Uint8Array(1);
    msgJoined[0] = MSG_CLIENTJOINED;
    
    socket.addEventListener("close", socketClosed);
    
    socket.addEventListener("open", function() {
        //socket.send(JSON.stringify({n:MSG_CLIENTJOINED, i:0}));
        socket.send(msgJoined);
        
        startMenuPlay.onclick = function () {
            if (!startMenu2) {
                userNameDiv.style.display = "none";
                serverInput.parentElement.style.display = "none";
                
                var pad = "150px";//72px";
                soundCheckbox.parentElement.style.paddingRight = pad;
                qualityCheckbox.parentElement.style.paddingRight = pad;
                fullscreenCheckbox.parentElement.style.paddingRight = pad;
                //qualityCheckbox2.parentElement.style.paddingRight = pad;
                
                startMenuPlayText.innerHTML = "Resume";
                //socket.send(JSON.stringify({n:MSG_SETNAME, v:nameInput.value}));
                var nameMsg = new Uint8Array(2 + nameInput.value.length);
                nameMsg[0] = MSG_SETNAME;
                nameMsg[1] = nameInput.value.length;
                for(var i=0; i<nameInput.value.length; i++) {
                    nameMsg[i+2] = nameInput.value.charCodeAt(i);
                }
                socket.send(nameMsg.buffer);
                localStorage.setItem("username", nameInput.value);
            }
            startMenu.style.display = "none";
            changelog.style.display = "none";
            adDiv.style.display = "none";
            if (adDiv2) adDiv2.style.display = "none";
            startMenuMode = false;
            startMenu2 = true;
        };
        
        socket.addEventListener("message", function(msg) {
            
            if (msg.data instanceof ArrayBuffer) {
                data = new DataView(msg.data);

                dataFlags1 = data.getUint8(0);
                dataDecoded.n =  dataFlags1 & 0x0F;
            
                if (dataDecoded.n === MSG_SETPARTS) {
                    dataDecoded.id = data.getUint8(1);
                    dataDecoded.parts.body = data.getInt32(2, true);
                    dataDecoded.parts.left = data.getUint8(6);
                    dataDecoded.parts.right = data.getUint8(7);
                    dataDecoded.parts.ammo = data.getUint16(8, true);
                    
                } else if (dataDecoded.n === MSG_CAPTURE) {
                    dataOffset = 1;
                    for(var i=0; i<5; i++) {
                        dataTeam = data.getInt8(dataOffset);
                        //console.log(dataTeam);
                        dataDecoded.pts[i].ignore = false;
                        if (dataTeam === 0) {
                            dataDecoded.pts[i].ignore = true;
                            //console.log("IGNORE " + i);
                        } else if (dataTeam > 0) {
                            if (dataTeam < 10) {
                                // capture
                                dataDecoded.pts[i].teamA = -1;
                                dataDecoded.pts[i].teamB = dataTeam - 2;
                                //if (i===0) console.log("CAPTURE " + (dataTeam-2));
                            } else {
                                // captured
                                dataDecoded.pts[i].teamA = dataDecoded.pts[i].teamB = dataTeam - 12;
                                //if (i===0) console.log("CAPTURED " + (dataTeam - 12));
                            }
                        } else {
                            // uncapture
                            dataDecoded.pts[i].teamA = dataTeam + 2;
                            dataDecoded.pts[i].teamB = -1;
                            //if (i===0) console.log("UNCAPTURE " + (dataTeam-2));
                        }
                        if (dataTeam !== 0) dataDecoded.pts[i].endTime = data.getFloat64(dataOffset + 1, true);
                        dataOffset += 9;
                    }
                    
                } else if (dataDecoded.n === MSG_SETHIGHSCORES) {
                    timeToNextRound = pc.now() + SV_AFTERROUNDTIME;
                    var objs;
                    var scores = [];
                    for (var uid in playerStructs) {
                        if (!playerStructs.hasOwnProperty(uid)) continue;
                        objs = playerStructs[uid];
                        scores.push({
                            name: objs.nickname.element.text,
                            score: data.getUint16(1 + 4 * uid, true),
                            frags: data.getUint16(1 + 4 * uid + 2, true),
                        });
                    }
                    scores.sort(compareHighScore);
                    var str = "<tr><th>Name</th><th>Kills</th><th>Score<th></tr>";
                    for(var i=0; i<scores.length; i++) {
                        str += "<tr><th>" + scores[i].name + "</th><th>" + scores[i].frags + "</th><th>" + scores[i].score +  "<th></tr>";
                    }
                    self.scoreHi.innerHTML = str;
                        
                } else if (dataDecoded.n === MSG_SERVERUPDATE) {
                    dataFlags1 = dataFlags1 >> 4;
                    dataHasFx = dataFlags1 & 1;
                    dataHasProj = dataFlags1 & 2;
                    dataHasPc = dataFlags1 & 4;
                    dataHasRp = dataFlags1 & 8;

                    dataDecoded.t = data.getFloat64(1, true);
                    dataHasAmmo = dataDecoded.t < 0;
                    if (dataHasAmmo) dataDecoded.t = -dataDecoded.t;

                    dataPlayerCount = data.getInt8(9);
                    dataHasNav = dataPlayerCount < 0;
                    if (dataHasNav) dataPlayerCount = -dataPlayerCount;

                    dataDecoded.state = {};
                    dataDecoded.pr = {};
                    dataDecoded.pt = {};
                    dataDecoded.a = 0;

                    dataOffset = 10;
                    for(var i=0; i<dataPlayerCount; i++) {
                        dataPlayerId = data.getUint8(dataOffset); dataOffset++;
                        dataDecoded.state[dataPlayerId] = dataPlayerState = new PlayerState();
                        dataX = data.getFloat32(dataOffset, true); dataOffset += 4;
                        dataZ = data.getFloat32(dataOffset, true); dataOffset += 4;
                        dataAngle = data.getUint8(dataOffset) / 0xFF; dataOffset++;
                        dataHp1 = data.getUint8(dataOffset); dataOffset++;
                        dataHp2 = data.getUint8(dataOffset); dataOffset++;
                        dataPlayerState.x = Math.abs(dataX) - 100;
                        dataPlayerState.z = Math.abs(dataZ) - 100;
                        self.tmpQuat.setFromAxisAngle(pc.Vec3.UP, Math.acos(dataAngle) * ((dataZ < 0) ? -1 : 1) / (0.5 * pc.math.DEG_TO_RAD));
                        dataPlayerState.ry = self.tmpQuat.y * ((dataX < 0) ? -1 : 1);
                        dataPlayerState.rw = self.tmpQuat.w;
                        dataPlayerState.hpt = dataHp1 & 0x0F;
                        dataPlayerState.hpb = dataHp1 >> 4;
                        dataPlayerState.hpl = dataHp2 & 0x0F;
                        dataPlayerState.hpr = dataHp2 >> 4;
                    }

                    if (dataHasAmmo) {
                        dataDecoded.a = data.getUint16(dataOffset, true); dataOffset += 2;
                    } else {
                        dataDecoded.a = undefined;
                    }

                    if (dataHasPc) {
                        dataDecoded.pc = data.getUint16(dataOffset, true); dataOffset += 2;
                    } else {
                        dataDecoded.pc = undefined;
                    }

                    if (dataHasRp) {
                        dataDecoded.rp = data.getUint8(dataOffset); dataOffset++;
                    } else {
                        dataDecoded.rp = undefined;
                    }

                    if (dataHasNav) {
                        dataDecoded.nav = [];
                        dataDecoded.nav[0] = data.getFloat32(dataOffset, true); dataOffset += 4;
                        dataDecoded.nav[1] = data.getFloat32(dataOffset, true); dataOffset += 4;
                    } else {
                        dataDecoded.nav = null;
                    }

                    dataDecoded.fx.length = 0;
                    if (dataHasFx) {
                        dataFxCount = data.getUint8(dataOffset); dataOffset++;
                        for(var i=0; i<dataFxCount; i++) {
                            dataFx = new Effect();
                            dataFx.x = data.getFloat32(dataOffset, true); dataOffset += 4;
                            dataFx.y = data.getFloat32(dataOffset, true); dataOffset += 4;
                            dataFx.z = data.getFloat32(dataOffset, true); dataOffset += 4;
                            dataFx.type = data.getUint8(dataOffset); dataOffset++;
                            dataFx.owner = data.getUint8(dataOffset); dataOffset++;
                            if (dataFx.owner === 0xFF) dataFx.owner = -1;
                            dataDecoded.fx.push(dataFx);
                        }
                    }

                    if (dataHasProj) {
                        dataProjCount = data.getUint8(dataOffset); dataOffset++;
                        for(var i=0; i<dataProjCount; i++) {
                            dataPlayerId = data.getUint8(dataOffset); dataOffset++;
                            dataDecoded.pr[dataPlayerId] = dataProj = new Projectile();
                            dataProj.x = data.getFloat32(dataOffset, true); dataOffset += 4;
                            dataProj.y = data.getFloat32(dataOffset, true); dataOffset += 4;
                            dataProj.z = data.getFloat32(dataOffset, true); dataOffset += 4;
                            dataAngle = (data.getInt8(dataOffset) / 127.0) * Math.PI; dataOffset++;
                            dataProj.vx = Math.cos(dataAngle);
                            dataProj.vy = 0;
                            dataProj.vz = Math.sin(dataAngle);
                            dataProj.type = data.getUint8(dataOffset); dataOffset++;
                            //dataProj.id = data.getUint8(dataOffset); dataOffset++;
                            if (dataProj.type >= 10) {
                                dataProj.type -= 10;
                                dataDecoded.pt[dataPlayerId] = {start:null, path:new Float32Array(40*3)};
                                dataDecoded.pt[dataPlayerId].start = data.getFloat64(dataOffset, true); dataOffset += 8;
                                var arr = dataDecoded.pt[dataPlayerId].path;
                                for(var j=0; j<40*3; j++) {
                                    arr[j] = data.getFloat32(dataOffset, true); dataOffset += 4;
                                }
                            }
                        }
                    }
                }
                
                data = dataDecoded;
            } else {
                data = JSON.parse(msg.data);
            }
            
            if (data.n == MSG_ROOM) {
                console.log("Joined to room " + data.i);

            } else if (data.n == MSG_PORT) {
                //var port = SV_PORT + parseInt(data.i);
                var port = parseInt(data.i);
                console.log("Asked to join port " + port);
                SV_URL = urlList[SV_URLID][port];// + port;
                socket.removeEventListener("close", socketClosed);
                socket.close();
                this.masterPort = socket;
                self.connectToServer();
                
            } else if (data.n == MSG_SETNAME) {
                playerNames[data.i] = data.v;
                if (playerStructs[data.i]) {
                    playerStructs[data.i].nickname.element.text = data.v;
                }
                console.log("set name " + data.i + " " + data.v);

            } else if (data.n == MSG_RECEIVEGAMEDATA) {
                self.initializePlayers(data);

            } else if (data.n == MSG_SERVERUPDATE) {
                self.updateWorld(data);

            } else if (data.n == MSG_SETPARTS) {
                console.log("set parts " + data.id);
                //playerActiveParts[data.id] = data.parts;
                if (!playerActiveParts[data.id]) {
                    playerActiveParts[data.id] = {};
                }
                playerActiveParts[data.id].body = data.parts.body;
                playerActiveParts[data.id].left = data.parts.left;
                playerActiveParts[data.id].right = data.parts.right;
                playerActiveParts[data.id].ammo = data.parts.ammo;
                if (playerModels[data.id]) self.setPlayerParts(data.id, playerActiveParts[data.id]);
                if (data.id == self.id) {
                    self.calculateWeight();
                }
            } else if (data.n == MSG_SERVERSCORE) {
                teamScore = data.score;
                
            } else if (data.n == MSG_SERVERTIME) {
                // not including ping yet
                console.log("get time");
                roundEndTime = parseInt(data.t);
                flushLevel = true;
                
            } else if (data.n == MSG_CAPTURE) {
                console.log("capture");
                capturePointStates = data.pts;
                //console.log(capturePointStates);
                var timeLeft;
                var t = pc.now();
                for(var i=0; i<capturePointStates.length; i++) {
                    if (capturePointStates[i].ignore) continue;
                    if (self.lastUpdateServerTime) {
                        timeLeft = capturePointStates[i].endTime - self.lastUpdateServerTime;
                    } else {
                        timeLeft = 0;// + 1000;
                    }
                    console.log(capturePointStates[i].teamA+" "+capturePointStates[i].teamB+" "+timeLeft);
                    pc.captureTowers[i].setState(capturePointStates[i].teamA, capturePointStates[i].teamB, t + timeLeft);
                }
                
            } else if (data.n == MSG_SETPICKUPS) {
                console.log("set pickups");
                console.log(data);
                var pickupId;
                for(pickupId in data.t) {
                    pickupType[pickupId] = data.t[pickupId];
                    self.setPickup(pickupId, pickupType[pickupId]);
                }
                for(pickupId in data.a) {
                    pickupAmmo[pickupId] = data.a[pickupId];
                }
                for(pickupId in data.p) {
                    pickupPos[pickupId] = data.p[pickupId];
                    self.setPickupPos(pickupId, data.p[pickupId]);
                }
                
            } else if (data.n == MSG_PLAYERSCORE) {
                console.log("set xp");
                var diff = data.s - playerScore;
                playerScoreDiff = diff;
                playerScoreDiffShowEndTime = pc.now() + 5000;
                playerScore = data.s;
                self.textXp.enabled = false;
                if (buyMenuMode) {
                    self.refreshBuyMenu();
                }
            }
        });
    });
};

Client.prototype.createPhysEnv = function() {
    var box = this.app.root.findByName("BOXTEST");
    var i, clone;
    for(i=1; i<32; i++) {
        clone = box.clone();
        clone.setLocalPosition((Math.random()*2-1)*60, 4, (Math.random()*2-1)*60);
        clone.setEulerAngles(Math.random()*360, Math.random()*360, Math.random()*360);
        this.makePhys(clone);
    }
    this.makePhys(box);
    
    /*box = this.app.root.findByName("barrel");
    for(i=1; i<32; i++) {
        clone = box.clone();
        clone.setLocalPosition((Math.random()*2-1)*20, 4, (Math.random()*2-1)*20);
        clone.setEulerAngles(Math.random()*360, Math.random()*360, Math.random()*360);
        this.makePhys(clone);
    }
    this.makePhys(box);*/
};

Client.prototype.setPickup = function(i, wpnId) {
    var asset = this.wpnModels[wpnId].model.asset;
    pc.pickups[i].entity.model.asset = asset;
};

Client.prototype.setPickupPos = function(i, pos2D) {
    var pos = pc.pickups[i].entity.getPosition();
    pc.pickups[i].entity.setPosition(pos2D[0], pos.y, pos2D[1]);
};

Client.prototype.initializePlayers = function(data) {
    var i;
    this.id = data.id;
    playerActiveParts = data.parts;
    teamScore = data.score;
    roundEndTime = parseInt(data.t);
    
    var pickupState = data.pickups.state;
    for(i=0; i<pc.pickups.length; i++) {
        pc.pickups[i].entity.model.enabled = !!(pickupState & (1 << i));
    }
    
    pickupType = data.pickups.type;
    pickupPos = data.pickups.pos;
    for(i=0; i<pc.pickups.length; i++) {
        this.setPickup(i, pickupType[i]);
        this.setPickupPos(i, data.pickups.pos[i]);
    }
    pickupAmmo = data.pickups.ammo;
    
    var repairState = data.rep;
    var enabled;
    for(i=0; i<pc.repairs.length; i++) {
        enabled = !!(repairState & (1 << i));
        pc.repairs[i].entity.enabled = enabled;
        if (enabled) {
            pc.doors.open(i);
        } else {
            pc.doors.close(i);
        }
        enabled = !!((repairState >> 4) & (1 << i));
        pc.doors.setNotification(i, enabled);
    }
    
    var names = data.nm;
    for(i=0; i<names.length; i++) {
        playerNames[i] = names[i];
    }
};

Client.prototype.onMouseMove = function(evt) {
    this.mx = evt.clientX;
    this.my = evt.clientY;
    pc.MOUSEX = this.mx;
    pc.MOUSEY = this.my;
    this.mouseMoved = true;
};

Client.prototype.onMouseDown = function(evt) {
    this.mouseHold[evt.button] = true;
    if (!startMenuMode) evt.preventDefault();
};

Client.prototype.onMouseUp = function(evt) {
    this.mouseHold[evt.button] = false;
};

Client.prototype.calculateWeight = function() {
    return;
    
    var id = this.id;
    var weight = 0;
    if (playerActiveParts[id].body & PART_TOPHEAVY) {
        weight += 5;
    } else {
        weight += 1;
    }
    weight += weaponWeight[playerActiveParts[id].left];
    weight += weaponWeight[playerActiveParts[id].right];
    this.playerWeight = weight;
};

Client.prototype.renderPlayerHit = function(fromPos) {
    var id = this.playerHit;
    var objs = playerStructs[id];
    if (!objs.shield.enabled) return;
    
    var pos = playerModels[id].getPosition();
    var x = fromPos.x - pos.x;
    var z = fromPos.z - pos.z;
    var invLen = 1.0 / Math.sqrt(x*x + z*z);
    x *= invLen;
    z *= invLen;
    
    objs.shieldHit.x = x;
    objs.shieldHit.y = z;
    objs.shieldHit.z = 1.0;
};

Client.prototype.drawWeaponTraces = function(wpn, startPos, endPos, owner) {
    var len;
    var hitSphereRadius = 0.5;
    var hitSphereRadiusGround = 0.1;
    var impactStraightness = 0.7;
    if (wpn == WPN_MGUN) {
        if (owner == this.id) {
            this.direction3.copy(endPos).sub(startPos);
            len = this.direction3.length();
            this.direction3.normalize().scale(weaponAccuracy[wpn]);
            this.direction2.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
            this.direction2.normalize().scale(1 - weaponAccuracy[wpn]).add(this.direction3).normalize();
            this.direction2.scale(len).add(startPos);
        } else {
            this.direction2.copy(endPos);
        }
        
        this.bulletRay.origin.copy(startPos);
        var vecLen = this.bulletRay.direction.copy(this.direction2).sub(startPos).length();
        //this.bulletRay.direction.copy(this.direction2).sub(startPos).normalize();
        this.bulletRay.direction.normalize();
        if (this.intersectRayScene(this.bulletRay, this.pickedPoint, owner, this.pickedNormal, vecLen + 2)) {
            //this.playParticle("metalimpact2", null, this.pickedPoint.x, this.pickedPoint.y, this.pickedPoint.z);
                this.direction2.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
                this.direction2.normalize().scale(1 - impactStraightness).add(this.pickedNormal).normalize();
            this.addFirework(this.pickedPoint, this.direction2);
            this.addBulletHole(ColUtils.hitBoxId, this.pickedPoint, this.pickedNormal);
            for(var j=0; j<3; j++) {
                this.pickedPoint.x += (Math.random()*2-1) * 0.1;
                this.pickedPoint.y += (Math.random()*2-1) * 0.1;
                this.pickedPoint.z += (Math.random()*2-1) * 0.1;
                this.addImpactSphere(this.pickedPoint, this.direction2);
            }
            if (ColUtils.hitBoxId === -1) this.renderPlayerHit(this.bulletRay.origin);
        } else {
            this.pickedPoint.copy(this.bulletRay.direction).scale(100).add(this.bulletRay.origin);
        }
        
        this.addTrace(startPos, this.pickedPoint);
        this.addHitSphere(this.pickedPoint, this.pickedNormal.y > 0.5 ? hitSphereRadiusGround : hitSphereRadius);
        if (owner == this.id) pc.shake.shake(0.4, 0.4);
        
        
        
    } else if (wpn == WPN_SHOTGUN) {
        this.direction3.copy(endPos).sub(startPos);
        len = this.direction3.length();
        this.direction3.normalize().scale(weaponAccuracy[wpn]);
        
        for(var i=0; i<shotgunBulletCount; i++) {
            this.direction2.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
            this.direction2.normalize().scale(1 - weaponAccuracy[wpn]).add(this.direction3).normalize();
            this.direction2.scale(len).add(startPos);
            
            this.bulletRay.origin.copy(startPos);
            var vecLen = this.bulletRay.direction.copy(this.direction2).sub(startPos).length();
            //this.bulletRay.direction.copy(this.direction2).sub(startPos).normalize();
            this.bulletRay.direction.normalize();
            if (this.intersectRayScene(this.bulletRay, this.pickedPoint, owner, this.pickedNormal, vecLen + 1)) {
                //this.playParticle("metalimpact2", null, this.pickedPoint.x, this.pickedPoint.y, this.pickedPoint.z);
                    this.direction2.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
                    this.direction2.normalize().scale(1 - impactStraightness).add(this.pickedNormal).normalize();
                this.addFirework(this.pickedPoint, this.direction2);
                this.addBulletHole(ColUtils.hitBoxId, this.pickedPoint, this.pickedNormal);
                this.addImpactSphere(this.pickedPoint, this.direction2);
                if (ColUtils.hitBoxId === -1) this.renderPlayerHit(this.bulletRay.origin);
            } else {
                this.pickedPoint.copy(this.bulletRay.direction).scale(100).add(this.bulletRay.origin);
            }
            
            this.addTrace(startPos, this.pickedPoint);
            this.addHitSphere(this.pickedPoint, this.pickedNormal.y > 0.5 ? hitSphereRadiusGround : hitSphereRadius);
        }
        
        if (owner == this.id) pc.shake.shake(0.6, 0.6);
        
    }
    
    this.addLightEffect(startPos, 5, 1);
};

Client.prototype.spinBarrel = function(id, side) {
    var objs = playerStructs[id];
    if (side) {
        objs.spinR = true;
    } else {
        objs.spinL = true;
    }
};

Client.prototype.updateSpinningBarrels = function(id, side, dt) {
    var objs = playerStructs[id];
    var barrel = side ? objs.rightWpnBarrel : objs.leftWpnBarrel;
    if (!barrel) return;
    
    var spinAccel = 20;
    var spinDeccel = -10;
    var spinMaxSpeed = 20;
    if (side) {
        objs.spinVelR += (objs.spinR ? spinAccel : spinDeccel) * dt;
        objs.spinVelR = pc.math.clamp(objs.spinVelR, 0, spinMaxSpeed);
        this.tmpQuat.setFromAxisAngle(pc.Vec3.UP, -objs.spinVelR);
    } else {
        objs.spinVelL += (objs.spinL ? spinAccel : spinDeccel) * dt;
        objs.spinVelL = pc.math.clamp(objs.spinVelL, 0, spinMaxSpeed);
        //if (id == this.id) console.log(objs.spinVelL+" "+objs.spinL);
        this.tmpQuat.setFromAxisAngle(pc.Vec3.UP, -objs.spinVelL);
    }
    var rot = barrel.getLocalRotation();
    rot.mul(this.tmpQuat);
    barrel.setLocalRotation(rot);
};

Client.prototype.updateMouse = function(button) {
    if (!this.player || (!renderPlayerStates[this.id]) || renderPlayerStates[this.id].hpt <= 0) return;
    
    var wpnl = playerActiveParts[this.id].left;
    var wpnr = playerActiveParts[this.id].right;
    var t = pc.now();
    var activeWpn;
    
    if (button === 0) {
        if (playerStructs[this.id].leftWpnBarrel) {
            this.spinBarrel(this.id, 0);
        }
    } else if (button === 2 && playerStructs[this.id].ammo) {
        if (playerStructs[this.id].rightWpnBarrel) {
            this.spinBarrel(this.id, 1);
        }
    }
    
    var mzlParent, shell;
    if (button === 0 && wpnl && t > timeToShootWeaponL[wpnl]) {
        timeToShootWeaponL[wpnl] = t + weaponRate[wpnl];
        this.command.ctrl |= CTRL_FIREL;
        mzlParent = playerStructs[this.id].leftWpnMuzzle;
        shell = playerStructs[this.id].leftWpnShell;
        activeWpn = wpnl;
        this.playWeaponSoundLeft(this.id);
        
    } else if (button === 2 && wpnr && t > timeToShootWeaponR[wpnr] && playerStructs[this.id].ammo) {
        timeToShootWeaponR[wpnr] = t + weaponRate[wpnr];
        this.command.ctrl |= CTRL_FIRER;
        mzlParent = playerStructs[this.id].rightWpnMuzzle;
        shell = playerStructs[this.id].rightWpnShell;
        activeWpn = wpnr;
        this.playWeaponSoundRight(this.id);
        
    }
    if (mzlParent) {
        if (activeWpn == WPN_FLAME) {
            /*this.direction3.copy(playerModels[this.id].forward).scale(weaponAccuracy[WPN_FLAME]);
            for(var i=0; i<1; i++) {
                this.direction2.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
                this.direction2.normalize().scale(1 - weaponAccuracy[WPN_FLAME]).add(this.direction3).normalize();
                playerStructs[this.id].prevFlame = this.addFlameSphere(mzlParent.getPosition(), this.direction2, i, playerStructs[this.id].prevFlame, playerVelocity[this.id]); // active player flame
            }*/
            playerStructs[this.id].emitFlameEndTimeR = t + 100;
            playerStructs[this.id].emitFlameTickEndTimeR = t + weaponRate[WPN_FLAME];
            pc.shake.shake(0.4, 0.4);
        } else {
            //this.playParticle("muzzle", mzlParent);
            this.addMuzzleFlash(mzlParent);
            if (shell) this.addBulletShell(shell.getPosition(), pc.Vec3.UP, activeWpn == WPN_SHOTGUN ? 1 : 0);
        }
    }
    
    var pos = this.cursor.getPosition();
    this.command.tx = pos.x;
    this.command.ty = pos.y;
    this.command.tz = pos.z;
    
    if (CL_PREDICT && mzlParent) {
        // Raycast
        /*var shortestDist = Number.MAX_VALUE;
        var dist;
        var closestTarget = -1;
        var playa = predictedState;
        var playaB;
        this.shootRay.origin.set(playa.x, PLAYER_Y, playa.z);
        this.rotation.y = playa.ry;
        this.rotation.w = playa.rw;
        this.rotation.transformVector(new pc.Vec3(0,0,1), this.shootRay.direction); // this is unnecessary
        for(var uid in renderPlayerStates) {
            if (!renderPlayerStates.hasOwnProperty(uid)) continue;
            if (uid == this.id) continue;
            playaB = renderPlayerStates[uid];
            if (!playaB) continue;
            this.sphere.center.set(playaB.x, PLAYER_Y, playaB.z);
            this.sphere.radius = PLAYER_RADIUS;
            if (this.sphere.intersectsRay(this.shootRay, this.pickedPoint)) { // could be easily 2D
                dist = this.pickedPoint.sub(this.shootRay.origin).lengthSq(); // could easily use t directly
                if (dist < shortestDist) {
                    shortestDist = dist;
                    closestTarget = uid;
                }
            }
        }
        if (closestTarget < 0) {
            this.pickedPoint.x = this.shootRay.origin.x + this.shootRay.direction.x * 100;
            this.pickedPoint.z = this.shootRay.origin.z + this.shootRay.direction.z * 100;
        }*/

        // -- //this.playParticle("metalimpact2", null, pos.x, pos.y, pos.z);
        this.drawWeaponTraces(activeWpn, mzlParent.getPosition(), pos, this.id);//this.pickedPoint);

    }
};

Client.prototype.lerpState = function(r, a, b, c) {
    r.x = a.x + c * (b.x - a.x);
    r.z = a.z + c * (b.z - a.z);
    
    if (isNaN(r.x)) {
        console.log("!");
    }
    
    this.rotationA.y = a.ry;
    this.rotationA.w = a.rw;
    this.rotationB.y = b.ry;
    this.rotationB.w = b.rw;
    this.rotationR.slerp(this.rotationA, this.rotationB, c);
    r.ry = this.rotationR.y;
    r.rw = this.rotationR.w;

    r.hpt = b.hpt; // don't lerp health?
    r.hpb = b.hpb;
    r.hpl = b.hpl;
    r.hpr = b.hpr;
};

Client.prototype.statesMatch = function(src, dest) {
    return Math.abs(src.x - dest.x) < CL_CORRECTEPSILON && Math.abs(src.z - dest.z) < CL_CORRECTEPSILON;/* &&
           Math.abs(src.ry - dest.ry) < CL_CORRECTEPSILON && Math.abs(src.rw - dest.rw) < CL_CORRECTEPSILON;*/
};

Client.prototype.lerpProjState = function(r, a, b, c) {
    r.x = a.x + c * (b.x - a.x);
    r.y = a.y + c * (b.y - a.y);
    r.z = a.z + c * (b.z - a.z);
    
    r.vx = a.vx + c * (b.vx - a.vx);
    r.vy = a.vy + c * (b.vy - a.vy);
    r.vz = a.vz + c * (b.vz - a.vz);

    r.type = b.type;
};

Client.prototype.replaceModelWithBatch = function(model, batch) {
    var i, j;
    var meshInstances = [];
    for(j=0; j<model.meshInstances.length; j++) {
        if (!model.meshInstances[j].visible) continue;
        if (model.meshInstances[j].node.name.substr(0,1) === "#") continue;
        if (model.meshInstances[j].node.name.substr(0,3) === "SPH") continue;
        meshInstances.push(model.meshInstances[j]);
    }
    var batch2 = pc.batching.cloneBatch(batch, meshInstances);
    batch2.meshInstance.castShadow = true;

    var newModel = new pc.Model();
    newModel.meshInstances = [batch2.meshInstance];
    newModel.castShadows = true;
    newModel.batch = batch2;
    
    pc.batching.updateBatch(batch2);
    batch2.meshInstance.material.updateShader(this.app.graphicsDevice, this.app.scene); // fix shitty huge shadow
    
    this.app.scene.addModel(newModel);
    
    // fix: cleanup batches
    /*var casters = this.app.scene.shadowCasters;
    var casters2 = [];
    for(i=0; i<casters.length; i++) {
        if (casters[i].node.getParent()) {
            casters2.push(casters[i]); // fix to not cast shadows from batches
        }
    }
    this.app.scene.shadowCasters = casters2;*/
    
    return newModel;
};

Client.prototype.createPlayerEntity = function(id) {
    var newPlayer = this.playerPrefab.clone();
    
    /*this.hidePhSpheres(newPlayer.findByName("top_light"));
    this.hidePhSpheres(newPlayer.findByName("top_heavy"));
    this.hidePhSpheres(newPlayer.findByName("legs"));*/
    
    this.playerPrefab.getParent().addChild(newPlayer); // Add the entity to the entity hierarchy.
    newPlayer.enabled = true; // Enable the newly created player.
    return newPlayer;
};

Client.prototype.setPlayerArm = function(id, parent, wpnId) {
    var wpn;
    if (wpnId) {
        wpn = this.wpnModels[wpnId].clone();
    }
    if (wpn) {
        //wpn.setLocalScale(1,1,1);
        wpn.setLocalScale(25,25,25);
        parent.addChild(wpn);
        wpn.enabled = true;
    }
    return wpn;
};

Client.prototype.makePhys = function(obj, isTemporary) {
    var pos = obj.getPosition();
    var rot = obj.getRotation();
    var scl = obj.getWorldTransform().getScale();
    if (obj.parent) {
        obj.parent.removeChild(obj);
    }
    this.app.root.addChild(obj);
    obj.setPosition(pos);
    obj.setRotation(rot);
    obj.setLocalScale(scl);
    
    var i;  
    this.setDiffuseForNode(obj, this.debrisTint);
    //for(i=0; i<obj.children.length; i++) {
        //this.setDiffuseForNode(obj.children[i], this.debrisTint);
    //}
    
    this.velocity.set(0,0,0);    
    var len;
    var falloff = 10;
    var strength = 0.02;
    for(i=0; i<hitPhSpheres.list.length; i++) {
        if (hitPhSpheres.list[i].endTime) {
            phEngine.getParticlePos(hitPhSpheres.list[i].sph, this.midPoint);
            this.midPoint.sub(pos);
            len = 1.0 - (this.midPoint.length() / falloff);
            if (len < 0) len = 0;
            this.midPoint.scale(-len * strength * phEngine.getParticleRadius(hitPhSpheres.list[i].sph));
            this.velocity.add(this.midPoint);
        }
    }
    
    var children = obj.children;
    var sphs = [];
    var startP, endP;
    for(i=0; i<children.length; i++) {
        if (children[i].name.substr(0,3) === "SPH") {
            if (children[i].name === "SPH0") {
                startP = sphs.length;
            } else if (children[i].name === "SPH1") {
                endP = sphs.length;
            }
            sphs.push(children[i]);
        }
    }
    var startP2, endP2, phid;
    var phIndices = [];
    for(i=0; i<sphs.length; i++) {
        var scl2 = sphs[i].getLocalScale();
        scl2.mul(scl);
        var pos2 = sphs[i].getPosition();
        phid = phEngine.addParticle(pos2.x, pos2.y, pos2.z, scl2.x*0.5, 0, true, "M");
        phLevelCollision[phid] = true;
        phIndices.push(phid);
        phEngine.addParticleImpulse(phid, this.velocity.x, this.velocity.y, this.velocity.z);
        if (i === startP) {
            startP2 = phid;
        } else if (i === endP) {
            endP2 = phid;
        }
        //sphs[i].enabled = false;//setLocalScale(new pc.Vec3(0.01));
    }
    
    var rb;
    var attachT, attachL;
    if (!isTemporary) {
        rb = phEngine.defineRigidBody(sphs.length);
    } else {
        rb = phEngine.defineRigidBodyIndexed(phIndices);
        //console.log("add " + phIndices.length);
    }
    if (startP2 === undefined) {
        if (sphs.length > 2) {
            attachT = phEngine.attachEntityToTri(obj, rb);//phid - 2, rb);
        } else {
            attachL = phEngine.attachEntityToLine(obj, phIndices[phIndices.length-2], phIndices[phIndices.length-1]);
        }
    } else {
        attachL = phEngine.attachEntityToLine(obj, startP2, endP2);
    }
    
    if (isTemporary) {
        this.temporaryPhysics.push({rb:rb, attachT:attachT, attachL:attachL, endTime:(pc.now() + 5000)});
        this.debris.push(obj);
    }
};

Client.prototype.setPlayerParts = function(id, parts) {
    var objs = playerStructs[id];
    var hasLegs = false;
    
    var pbodyBottom, pbodyTop;
    
    if (parts.body & PART_LEGS) {
        if (objs.legs) objs.legs.enabled = true;
        if (objs.tracks) objs.tracks.enabled = false;
        hasLegs = true;
        if (id == this.id) playerSpeed = PLAYER_SPEEDLEGS;
        pbodyBottom = objs.legs;
    } else {
        if (objs.legs) objs.legs.enabled = false;
        if (objs.tracks) objs.tracks.enabled = true;
        if (id == this.id) playerSpeed = PLAYER_SPEEDTRACKS;
        pbodyBottom = objs.tracks;
    }
    if (stateHistory.length > 0 && stateHistory[stateHistory.length-1][this.id]) {
        if (stateHistory[stateHistory.length-1][this.id].hpb <= 0) playerSpeed *= PLAYER_SPEEDSLOWFACTOR;
    }
    
    if (parts.body & PART_TOPHEAVY) {
        if (objs.topHeavy) objs.topHeavy.enabled = true;
        if (objs.topLight) objs.topLight.enabled = false;
        if (objs.topHeavy) objs.topHeavy.setLocalPosition(0, hasLegs ? PLAYER_TOPHEIGHT : 0, 0);
        if (objs.topHeavy) objs.left = objs.topHeavy.findByName("left");
        if (objs.topHeavy) objs.right = objs.topHeavy.findByName("right");
        pbodyTop = objs.topHeavy;
    } else {
        if (objs.topHeavy) objs.topHeavy.enabled = false;
        if (objs.topLight) objs.topLight.enabled = true;
        if (objs.topLight) objs.topLight.setLocalPosition(0, hasLegs ? PLAYER_TOPHEIGHT : 0, 0);
        if (objs.topLight) objs.left = objs.topLight.findByName("left");
        if (objs.topLight) objs.right = objs.topLight.findByName("right");
        pbodyTop = objs.topLight;
    }
    
    //objs.leftWpnShell = null;
    //objs.rightWpnShell = null;
    
    if (objs.leftWpn && parts.left == 0) {
        // break
        if (playerStructs[id].leftWpnMuzzle) this.stopSound(playerStructs[id].leftWpnMuzzle);
        this.makePhys(objs.leftWpn, true);
        this.playImpactSound(id);
        objs.leftWpn = null;
        objs.leftWpnId = 0;
    } else if (objs.leftWpnId != parts.left) {
        if (objs.leftWpn) {
            if (playerStructs[id].leftWpnMuzzle) this.stopSound(playerStructs[id].leftWpnMuzzle);
            objs.leftWpn.destroy();
        }
        objs.leftWpn = this.setPlayerArm(id, objs.left, parts.left);
        objs.leftWpnId = parts.left;
        if (objs.leftWpn) {
            objs.leftWpnMuzzle = objs.leftWpn.findByName("muzzle");
            objs.leftWpnShell = objs.leftWpn.findByName("shell");
            if (this.supportsAudio) objs.leftWpnMuzzle.sound.slot("fire echo").setExternalNodes(this.convolver);
            objs.leftWpnBarrel = objs.leftWpn.findByName("barrel");
        }
    }
    if (objs.rightWpn && parts.right == 0) {
        // break
        if (playerStructs[id].rightWpnMuzzle) this.stopSound(playerStructs[id].rightWpnMuzzle);
        this.makePhys(objs.rightWpn, true);
        this.playImpactSound(id);
        objs.rightWpn = null;
        objs.rightWpnId = 0;
    } else if (objs.rightWpnId != parts.right) {
        if (objs.rightWpn) {
            if (playerStructs[id].rightWpnMuzzle) this.stopSound(playerStructs[id].rightWpnMuzzle);
            objs.rightWpn.destroy();
        }
        objs.rightWpn =  this.setPlayerArm(id, objs.right, parts.right);
        objs.rightWpnId = parts.right;
        objs.ammo = parts.ammo;//weaponAmmo[parts.right];
        if (objs.rightWpn) {
            objs.rightWpnMuzzle = objs.rightWpn.findByName("muzzle");
            objs.rightWpnShell = objs.rightWpn.findByName("shell");
            if (this.supportsAudio) objs.rightWpnMuzzle.sound.slot("fire echo").setExternalNodes(this.convolver);
            objs.rightWpnBarrel = objs.rightWpn.findByName("barrel");
        }
    }
    
    if (parts.body & PART_SHIELDON) {
        if (!objs.shield.enabled) {
            objs.shield.enabled = true;
            objs.shieldHeight = 0;
            objs.shieldHit.z = 0;
            objs.disableShield = false;
            objs.shield.model.meshInstances[0].setParameter("height", objs.shieldHeight);
            objs.shield.model.meshInstances[0].setParameter("hit", objs.shieldHit.data);
            phEngine.setParticleRadius(playerPhId[id], 2);
            if (id == this.id) this.lastShieldStart = pc.now();
        }
    } else {
        //objs.shield.enabled = false;
        objs.disableShield = true;
        phEngine.setParticleRadius(playerPhId[id], PLAYER_RADIUS);
    }
    
    if (parts.body & PART_BOOSTON && id == this.id) {
        playerSpeed *= (parts.body & PART_BOOST2) ? boostSpeed2 : boostSpeed;
    }
    //console.log("boost change - parts");
        
    /*if (pbodyBottom) this.setDiffuse(pbodyBottom, objs.dynDiffuse[0]);
    if (pbodyTop) this.setDiffuse(pbodyTop, objs.dynDiffuse[1]);
    if (objs.leftWpn) this.setDiffuse(objs.leftWpn, objs.dynDiffuse[2]);
    if (objs.rightWpn) this.setDiffuse(objs.rightWpn, objs.dynDiffuse[3]);*/
    
    if (parts.body & PART_TEAM0) {
        //objs.hpbar.style.color = "#FF002B";
        //objs.hpbar.style.opacity = 0.7;
        objs.nickname.element.color = objs.imgRank.element.color = new pc.Color(1, 0, 85/255.0);
    } else if (parts.body & PART_TEAM1) {
        //objs.hpbar.style.color = "#00FFBF";
        //objs.hpbar.style.opacity = 0.7;
        objs.nickname.element.color = objs.imgRank.element.color = new pc.Color(0, 1, 191/255.0);
    } else if (parts.body & PART_TEAM2) {
        //objs.hpbar.style.color = "#77c6ff";
        //objs.hpbar.style.opacity = 0.7;
        objs.nickname.element.color = objs.imgRank.element.color = new pc.Color(119/255.0, 198/255.0, 1);
    } else if (parts.body & PART_TEAM3) {
        //objs.hpbar.style.color = "#FF9F00";
        //objs.hpbar.style.opacity = 0.7;
        objs.nickname.element.color = objs.imgRank.element.color = new pc.Color(1, 159/255.0, 0);
    }
    //objs.nickname.element.text = (playerActiveParts[id].body & PART_BOT) ? "Bot" : playerNames[id];//"Player";
    objs.nickname.element.text = playerNames[id];
    this.setFontEffect(objs.nickname, 0);
    
    var rank = -1;
    if (parts.body & PART_BOOST2) rank++;
    if (parts.body & PART_SHIELD2) rank++;
    if (parts.body & PART_DEFLECT) rank++;
    if (parts.body & PART_BOMB) rank++;
    if (parts.body & PART_ARMOR) rank++;
    if (parts.body & PART_ANTISHIELD) rank++;
    if (parts.body & PART_EMP) rank++;
    if (parts.body & PART_GRABWEAPON) rank++;
    if (rank >= 0) {
        objs.imgRankCoords.z = (rank % 4) * 0.25;
        objs.imgRankCoords.w = (1.0 - Math.floor(rank / 4)) * 0.5;
        objs.imgRank.enabled = true;
    } else {
        objs.imgRank.enabled = false;
    }
    objs.imgRank.element._image._model.meshInstances[0].setParameter("texture_emissiveMapTransform", objs.imgRankCoords.data);

    if (buyMenuMode && id == this.id) {
        this.refreshBuyMenu();
    }
    
};

Client.prototype.unlink = function(obj) {
    var pos = obj.getPosition();
    var rot = obj.getRotation();
    var scl = obj.getWorldTransform().getScale();
    obj.parent.removeChild(obj);
    this.app.root.addChild(obj);
    obj.setPosition(pos);
    obj.setRotation(rot);
    obj.setLocalScale(scl);
};

Client.prototype.addPlayer = function(id) {
    playerModels[id] = this.createPlayerEntity(id);
    var pstate = stateHistory[stateHistory.length - 1][id];
    playerModels[id].setLocalPosition(pstate.x, PLAYER_Y, pstate.z);
    playerMoveDir[id] = new pc.Vec3(0, 0, 0);
    playerMoveDist[id] = 0;
    playerVelocity[id] = new pc.Vec3();
    playerVelocitySmooth[id] = new pc.Vec3();
    
    playerStructs[id] = new RobotStruct();
    var objs = playerStructs[id];
    objs.legs = playerModels[id].findByName("legs");
    if (this.supportsAudio) objs.legs.sound.slot("fire echo").setExternalNodes(this.convolver);
    
    objs.tracks = playerModels[id].findByName("tracks");
    objs.topLight = playerModels[id].findByName("top_light");
        objs.topLightL = objs.topLight.findByName("left");
        objs.topLightR = objs.topLight.findByName("right");
    objs.topHeavy = playerModels[id].findByName("top_heavy");
        objs.topHeavyL = objs.topHeavy.findByName("left");
        objs.topHeavyR = objs.topHeavy.findByName("right");
    objs.shield = playerModels[id].findByName("shield");
    //objs.shieldHeight = 0;
    //objs.disableShield = false;
    
    objs.batchModelTopLight = this.replaceModelWithBatch(objs.topLight.model, this.batchTopLight);
    objs.batchModelLegs = this.replaceModelWithBatch(objs.legs.model, this.batchLegs);
    
    objs.dynDiffuse = [new pc.Vec3(1,1,1), new pc.Vec3(1,1,1), new pc.Vec3(1,1,1), new pc.Vec3(1,1,1)];
    
    /*var hpbar = document.createElement("div");
    hpbar.innerHTML = stateHistory[stateHistory.length - 1][id].hpt;
    hpbar.style.position = "absolute";
    hpbar.style.textShadow = "1px 1px 0px rgba(0, 0, 0, 1)";
    hpbar.style.fontWeight = "bold";
    hpbar.style.transform = "translate(-50%, -50%)";
    document.body.appendChild(hpbar);
    objs.hpbar = hpbar;*/
    objs.nickname = this.textNickname.clone();
    this.textNickname.parent.addChild(objs.nickname);
    objs.nickname.enabled = true;
    
    objs.imgRank = this.imgRank.clone();
    this.imgRank.parent.addChild(objs.imgRank);
    objs.imgRank.enabled = true;
    objs.imgRankCoords = new pc.Vec4(0.25,0.5,0,0);
    
    objs.prevPos = playerModels[id].getPosition();
    
    if (!playerActiveParts[id]) {
        console.log("Couldn't find parts for " + id);
    } else {
        this.setPlayerParts(id, playerActiveParts[id]);
        if (id == this.id) this.calculateWeight();
    }
    
    console.log("Player " + id + " joined");

    if (id == this.id) {
        this.player = playerModels[id];
        
        pendingSendPartsBody = -1;
        pendingSendPartsLeft = -1;
        pendingSendPartsRight = -1;
        predictedState = new PlayerState();
        predictedStatePrev = new PlayerState();
        predictedStatePreCorrect = new PlayerState();
        predictedStateAtLastSend = new PlayerState();
        predictedAtSendHistory.length = 0;
        predictedAtSendHistoryTimestamp.length = 0;
        this.timeToEndCorrectPrediction = false;
        this.timesPredictionWasIncorrect = 0;
    }
    
    var pos = objs.topLight.getPosition();
    var radius = PLAYER_WEIGHTRADIUS;
    objs.phCenterOfMass = phEngine.addParticle(pos.x, pos.y, pos.z, radius*3, PHSTATE_KINEMATIC, true, "C");
    objs.phAttached0 = phEngine.addParticle(pos.x, pos.y - radius*2, pos.z, radius, PHSTATE_ACTIVE, true, "C");
    objs.phRb = phEngine.defineRigidBodyIndexed([objs.phCenterOfMass, objs.phAttached0]);//defineRigidBody(2);
    objs.phAttached0Damp = phEngine.addDamping();
    objs.phAttached0Damp.id = objs.phAttached0;
    objs.phAttached0Damp.damp = 0.1;
    objs.phAttached0Damp.targetPos.set(pos.x, pos.y - radius*2, pos.z);
    
    playerPhId[id] = phEngine.addParticle(0, 0, 0, PLAYER_RADIUS, PHSTATE_KINEMATIC, true, "C");
    phRbIndex[playerPhId[id]] = phRbIndex[objs.phCenterOfMass];
    
    objs.rUpLeg = objs.legs.findByName("R_UP_LEG");
    objs.lUpLeg = objs.legs.findByName("L_UP_LEG");
    objs.rLoLeg = objs.legs.findByName("R_LO_LEG");
    objs.lLoLeg = objs.legs.findByName("L_LO_LEG");
        objs.rLoLeg2 = objs.legs.findByName("R_LO2_LEG");
        objs.lLoLeg2 = objs.legs.findByName("L_LO2_LEG");
    objs.rFoot = objs.legs.findByName("R_FOOT");
    objs.lFoot = objs.legs.findByName("L_FOOT");
    
    objs.rootBone = objs.legs.findByName("Robot");
    objs.rootBoneOrigPos = objs.rootBone.getLocalPosition().clone();
    objs.centerBone = objs.legs.findByName("Robot Pelvis");
    objs.rUpLegBone = objs.legs.findByName("Robot R Thigh");
    objs.lUpLegBone = objs.legs.findByName("Robot L Thigh");
    objs.rLoLegBone = objs.legs.findByName("Robot R Calf");
    objs.lLoLegBone = objs.legs.findByName("Robot L Calf");
        objs.rLoLeg2Bone = objs.legs.findByName("Robot R HorseLink");
        objs.lLoLeg2Bone = objs.legs.findByName("Robot L HorseLink");
    objs.rFootBone = objs.legs.findByName("Robot R Foot");
    objs.lFootBone = objs.legs.findByName("Robot L Foot");
    
    objs.rootBoneDefault = objs.rootBone.getLocalRotation().clone();
    objs.rootBoneDefaultPos = objs.rootBone.getLocalPosition().clone();
    objs.centerBoneDefault = objs.centerBone.getLocalRotation().clone();
    objs.rUpLegBoneDefault = objs.rUpLegBone.getLocalRotation().clone();
    objs.lUpLegBoneDefault = objs.lUpLegBone.getLocalRotation().clone();
    objs.rLoLegBoneDefault = objs.rLoLegBone.getLocalRotation().clone();
    objs.lLoLegBoneDefault = objs.lLoLegBone.getLocalRotation().clone();
    objs.rLoLeg2BoneDefault = objs.rLoLeg2Bone.getLocalRotation().clone();
    objs.lLoLeg2BoneDefault = objs.lLoLeg2Bone.getLocalRotation().clone();
    objs.rFootBoneDefault = objs.rFootBone.getLocalRotation().clone();
    objs.lFootBoneDefault = objs.lFootBone.getLocalRotation().clone();
    
    /*if (objs.rLoLeg2) {
        // Roma mode
        objs.rUpLegAnim = [objs.rUpLeg.getLocalRotation().clone(),
                          objs.legs.findByName("#R_UP_LEG001").getLocalRotation(),
                          objs.legs.findByName("#L_UP_LEG001").getLocalRotation()
                          ];
        objs.lUpLegAnim = [objs.lUpLeg.getLocalRotation().clone(),
                          objs.legs.findByName("#L_UP_LEG001").getLocalRotation(),
                          objs.legs.findByName("#R_UP_LEG001").getLocalRotation()
                          ];

        objs.rLoLegAnim = [objs.rLoLeg.getLocalRotation().clone(),
                          objs.legs.findByName("#R_LO_LEG001").getLocalRotation(),
                          objs.legs.findByName("#L_LO_LEG001").getLocalRotation()
                          ];

        objs.lLoLegAnim = [objs.lLoLeg.getLocalRotation().clone(),
                          objs.legs.findByName("#L_LO_LEG001").getLocalRotation(),
                          objs.legs.findByName("#R_LO_LEG001").getLocalRotation()
                          ];
        
            objs.rLoLegAnim2 = [objs.rLoLeg2.getLocalRotation().clone(),
                              objs.legs.findByName("#R_LO2_LEG001").getLocalRotation(),
                              objs.legs.findByName("#L_LO2_LEG001").getLocalRotation()
                              ];

            objs.lLoLegAnim2 = [objs.lLoLeg2.getLocalRotation().clone(),
                              objs.legs.findByName("#L_LO2_LEG001").getLocalRotation(),
                              objs.legs.findByName("#R_LO2_LEG001").getLocalRotation()
                              ];

        objs.rFootAnim = [objs.rFoot.getLocalRotation().clone(),
                          objs.legs.findByName("#R_FOOT001").getLocalRotation(),
                          objs.legs.findByName("#L_FOOT001").getLocalRotation()
                         ];

        objs.lFootAnim = [objs.lFoot.getLocalRotation().clone(),
                          objs.legs.findByName("#L_FOOT001").getLocalRotation(),
                          objs.legs.findByName("#R_FOOT001").getLocalRotation()
                         ];

        objs.center = objs.legs.findByName("CENTER");
        objs.centerAnim = [objs.center.getLocalRotation().clone(),
                          objs.legs.findByName("#CENTER001").getLocalRotation()
                          ];
    } else {*/
        objs.rUpLegAnim = [objs.rUpLeg.getLocalRotation().clone(),
                          objs.legs.findByName("#R_UP_LEG001").getLocalRotation(),
                          objs.legs.findByName("#R_UP_LEG002").getLocalRotation(),
                          //objs.legs.findByName("#L_UP_LEG001").getLocalRotation(),
                          //objs.legs.findByName("#L_UP_LEG002").getLocalRotation(),
                          objs.legs.findByName("#L_UP_LEG005").getLocalRotation(),
                          objs.legs.findByName("#L_UP_LEG006").getLocalRotation(),
                              objs.legs.findByName("#R_UP_LEG003").getLocalRotation(),
                              objs.legs.findByName("#R_UP_LEG004").getLocalRotation(),
                              objs.legs.findByName("#L_UP_LEG003").getLocalRotation(),
                              objs.legs.findByName("#L_UP_LEG004").getLocalRotation()
                          ];

        objs.lUpLegAnim = [objs.lUpLeg.getLocalRotation().clone(),
                          objs.legs.findByName("#L_UP_LEG001").getLocalRotation(),
                          objs.legs.findByName("#L_UP_LEG002").getLocalRotation(),
                          //objs.legs.findByName("#R_UP_LEG001").getLocalRotation(),
                          //objs.legs.findByName("#R_UP_LEG002").getLocalRotation(),
                          objs.legs.findByName("#R_UP_LEG005").getLocalRotation(),
                          objs.legs.findByName("#R_UP_LEG006").getLocalRotation(),
                              objs.legs.findByName("#L_UP_LEG003").getLocalRotation(),
                              objs.legs.findByName("#L_UP_LEG004").getLocalRotation(),
                              objs.legs.findByName("#R_UP_LEG003").getLocalRotation(),
                              objs.legs.findByName("#R_UP_LEG004").getLocalRotation()
                          ];

        objs.rLoLegAnim = [objs.rLoLeg.getLocalRotation().clone(),
                          objs.legs.findByName("#R_LO_LEG001").getLocalRotation(),
                          objs.legs.findByName("#R_LO_LEG002").getLocalRotation(),
                          objs.legs.findByName("#L_LO_LEG001").getLocalRotation(),
                          objs.legs.findByName("#L_LO_LEG002").getLocalRotation(),
                              objs.legs.findByName("#R_LO_LEG003").getLocalRotation(),
                              objs.legs.findByName("#R_LO_LEG004").getLocalRotation(),
                              objs.legs.findByName("#L_LO_LEG003").getLocalRotation(),
                              objs.legs.findByName("#L_LO_LEG004").getLocalRotation()
                          ];

        objs.lLoLegAnim = [objs.lLoLeg.getLocalRotation().clone(),
                          objs.legs.findByName("#L_LO_LEG001").getLocalRotation(),
                          objs.legs.findByName("#L_LO_LEG002").getLocalRotation(),
                          objs.legs.findByName("#R_LO_LEG001").getLocalRotation(),
                          objs.legs.findByName("#R_LO_LEG002").getLocalRotation(),
                              objs.legs.findByName("#L_LO_LEG003").getLocalRotation(),
                              objs.legs.findByName("#L_LO_LEG004").getLocalRotation(),
                              objs.legs.findByName("#R_LO_LEG003").getLocalRotation(),
                              objs.legs.findByName("#R_LO_LEG004").getLocalRotation()
                          ];
    
        if (objs.rLoLeg2) {
            objs.rLoLegAnim2 = [objs.rLoLeg.getLocalRotation().clone(),
                              objs.legs.findByName("#R_LO2_LEG001").getLocalRotation(),
                              objs.legs.findByName("#R_LO2_LEG002").getLocalRotation(),
                              objs.legs.findByName("#L_LO2_LEG001").getLocalRotation(),
                              objs.legs.findByName("#L_LO2_LEG002").getLocalRotation(),
                                  objs.legs.findByName("#R_LO2_LEG003").getLocalRotation(),
                                  objs.legs.findByName("#R_LO2_LEG004").getLocalRotation(),
                                  objs.legs.findByName("#L_LO2_LEG003").getLocalRotation(),
                                  objs.legs.findByName("#L_LO2_LEG004").getLocalRotation()
                              ];

            objs.lLoLegAnim2 = [objs.lLoLeg.getLocalRotation().clone(),
                              objs.legs.findByName("#L_LO2_LEG001").getLocalRotation(),
                              objs.legs.findByName("#L_LO2_LEG002").getLocalRotation(),
                              objs.legs.findByName("#R_LO2_LEG001").getLocalRotation(),
                              objs.legs.findByName("#R_LO2_LEG002").getLocalRotation(),
                                  objs.legs.findByName("#L_LO2_LEG003").getLocalRotation(),
                                  objs.legs.findByName("#L_LO2_LEG004").getLocalRotation(),
                                  objs.legs.findByName("#R_LO2_LEG003").getLocalRotation(),
                                  objs.legs.findByName("#R_LO2_LEG004").getLocalRotation()
                              ];
        }
    

        objs.rFootAnim = [objs.rFoot.getLocalRotation().clone(),
                          objs.legs.findByName("#R_FOOT001").getLocalRotation(),
                          objs.legs.findByName("#R_FOOT002").getLocalRotation(),
                          objs.legs.findByName("#L_FOOT001").getLocalRotation(),
                          objs.legs.findByName("#L_FOOT002").getLocalRotation(),
                              objs.legs.findByName("#R_FOOT003").getLocalRotation(),
                              objs.legs.findByName("#R_FOOT004").getLocalRotation(),
                              objs.legs.findByName("#L_FOOT003").getLocalRotation(),
                              objs.legs.findByName("#L_FOOT004").getLocalRotation()
                         ];

        objs.lFootAnim = [objs.lFoot.getLocalRotation().clone(),
                          objs.legs.findByName("#L_FOOT001").getLocalRotation(),
                          objs.legs.findByName("#L_FOOT002").getLocalRotation(),
                          objs.legs.findByName("#R_FOOT001").getLocalRotation(),
                          objs.legs.findByName("#R_FOOT002").getLocalRotation(),
                              objs.legs.findByName("#L_FOOT003").getLocalRotation(),
                              objs.legs.findByName("#L_FOOT004").getLocalRotation(),
                              objs.legs.findByName("#R_FOOT003").getLocalRotation(),
                              objs.legs.findByName("#R_FOOT004").getLocalRotation()
                         ];

        objs.center = objs.legs.findByName("CENTER");
        objs.centerAnim = [objs.center.getLocalRotation().clone(),
                          objs.legs.findByName("#CENTER001").getLocalRotation(),
                          objs.legs.findByName("#CENTER002").getLocalRotation(),
                          objs.legs.findByName("#CENTER003").getLocalRotation(),
                          objs.legs.findByName("#CENTER004").getLocalRotation(),
                            objs.legs.findByName("#CENTER005").getLocalRotation(),
                            objs.legs.findByName("#CENTER006").getLocalRotation(),
                            objs.legs.findByName("#CENTER005").getLocalRotation(),
                            objs.legs.findByName("#CENTER006").getLocalRotation()
                          ];
    //}
        
    objs.lFootLocalPos = objs.lFoot.getLocalPosition().clone();
    objs.rFootLocalPos = objs.rFoot.getLocalPosition().clone();

    
    /*var flameTrailInstance = playerModels[id].findByName("flameTrail").model.meshInstances[0];
    flameTrailInstance.mesh = this.flameTrailMesh;
    flameTrailInstance.material = this.flameTrailMat;
    flameTrailInstance.cull = false;
    flameTrailInstance.layer--;
    
    objs.flameTrailPos = new Float32Array(this.flameTrailPoints * 4);
    flameTrailInstance.setParameter("positions[0]", objs.flameTrailPos);
    
    objs.flameTrailRandoms = new Float32Array(this.flameTrailPoints);
    flameTrailInstance.setParameter("randoms[0]", objs.flameTrailRandoms);*/
    
    return;
    
       
    // Body
    //var pos = objs.topLight.getPosition();
    //objs.phBody0 = phEngine.addParticle(pos.x - 0.4, pos.y + 0.4, pos.z, PLAYER_BODYBONERADIUS);
    //objs.phBody1 = phEngine.addParticle(pos.x + 0.4, pos.y + 0.4, pos.z, PLAYER_BODYBONERADIUS);
    
    // Right
    pos = objs.rUpLeg.getPosition();
    objs.rUpLegLocalPos.copy(pos);
    objs.phRUpLeg = phEngine.addParticle(pos.x, pos.y, pos.z, PLAYER_LEGBONERADIUS, PHSTATE_KINEMATIC);
    pos = objs.rLoLeg.getPosition();
    objs.phRLoLeg = phEngine.addParticle(pos.x, pos.y, pos.z, PLAYER_LEGBONERADIUS);
    phEngine.defineRigidBody(2);
    var mat = (new pc.Mat4()).setTRS(objs.rUpLeg.getPosition(), objs.legs.getRotation(), pc.Vec3.ONE);
    objs.phConstraintR0 = phEngine.addAngleConstraint(objs.phRLoLeg, mat, 0, 0);
    objs.phConstraintR0.lock = true;
    /*var l = phEngine.attachEntityToLine(objs.rUpLeg, objs.phRUpLeg, objs.phRLoLeg);
    l.onlyDirection = true;
    l.up = objs.legs.right;
    l.right = new pc.Vec3();
    l.scale = objs.rUpLeg.getWorldTransform().getScale();
    objs.rUpLegLine = l;*/
    
    pos = objs.rFoot.getPosition();
    objs.phRFoot = phEngine.addParticle(pos.x, pos.y, pos.z, PLAYER_LEGBONERADIUS);//, PHSTATE_KINEMATIC);
    phEngine.defineRigidBody(2);
    mat = (new pc.Mat4()).setTRS(objs.rLoLeg.getPosition(), objs.legs.getRotation(), pc.Vec3.ONE);
    objs.phConstraintR1 = phEngine.addAngleConstraint(objs.phRFoot, mat, 0, 0);
    objs.phConstraintR1.lock = true;
    /*l = phEngine.attachEntityToLine(objs.rLoLeg, objs.phRLoLeg, objs.phRFoot);
    l.onlyDirection = true;
    l.up = objs.legs.right;
    l.right = new pc.Vec3();
    l.scale = objs.rLoLeg.getWorldTransform().getScale();
    objs.rLoLegLine = l;*/
    
    // Left
    pos = objs.lUpLeg.getPosition();
    objs.lUpLegLocalPos.copy(pos);
    objs.phLUpLeg = phEngine.addParticle(pos.x, pos.y, pos.z, PLAYER_LEGBONERADIUS, PHSTATE_KINEMATIC);
    pos = objs.lLoLeg.getPosition();
    objs.phLLoLeg = phEngine.addParticle(pos.x, pos.y, pos.z, PLAYER_LEGBONERADIUS);
    phEngine.defineRigidBody(2);
    mat = (new pc.Mat4()).setTRS(objs.lUpLeg.getPosition(), objs.legs.getRotation(), pc.Vec3.ONE);
    objs.phConstraintL0 = phEngine.addAngleConstraint(objs.phLLoLeg, mat, 0, 0);
    objs.phConstraintL0.lock = true;
    /*l = phEngine.attachEntityToLine(objs.lUpLeg, objs.phLUpLeg, objs.phLLoLeg);
    l.onlyDirection = true;
    l.up = objs.legs.right;
    l.right = new pc.Vec3();
    l.scale = objs.lUpLeg.getWorldTransform().getScale();
    objs.lUpLegLine = l;*/
    
    pos = objs.lFoot.getPosition();
    objs.phLFoot = phEngine.addParticle(pos.x, pos.y, pos.z, PLAYER_LEGBONERADIUS);//, PHSTATE_KINEMATIC);
    phEngine.defineRigidBody(2);
    mat = (new pc.Mat4()).setTRS(objs.lLoLeg.getPosition(), objs.legs.getRotation(), pc.Vec3.ONE);
    objs.phConstraintL1 = phEngine.addAngleConstraint(objs.phLFoot, mat, 0, 0);
    objs.phConstraintL1.lock = true;
    /*l = phEngine.attachEntityToLine(objs.lLoLeg, objs.phLLoLeg, objs.phLFoot);
    l.onlyDirection = true;
    l.up = objs.legs.right;
    l.right = new pc.Vec3();
    l.scale = objs.lLoLeg.getWorldTransform().getScale();
    objs.lLoLegLine = l;*/
    
    //phEngine.defineRigidBodyIndexed([objs.phBody0, objs.phBody1, objs.phRUpLeg, objs.phLUpLeg]);
    //phEngine.defineRigidBodyIndexed([objs.phBody0, objs.phRUpLeg, objs.phLUpLeg]);
    
    //this.unlink(objs.rUpLeg);
    //this.unlink(objs.rLoLeg);
    //this.unlink(objs.rFoot);
    
    //this.unlink(objs.lUpLeg);
    //this.unlink(objs.lLoLeg);
    //this.unlink(objs.lFoot);
    //
    phRbIndex[objs.phRUpLeg] = phRbIndex[objs.phAttached0];
    phRbIndex[objs.phRLoLeg] = phRbIndex[objs.phAttached0];
    phRbIndex[objs.phRFoot] = phRbIndex[objs.phAttached0];
    
    phRbIndex[objs.phLUpLeg] = phRbIndex[objs.phAttached0];
    phRbIndex[objs.phLLoLeg] = phRbIndex[objs.phAttached0];
    phRbIndex[objs.phLFoot] = phRbIndex[objs.phAttached0];
};

Client.prototype.removePlayer = function(id) {
    var i;
    // leave debris
     
    /*var meshes = playerModels[id].model.model.meshInstances;
    var node;
    var modelNode = playerModels[id];
    var partsToDetach = [];
    for(i=0; i<meshes.length; i++) {
        node = meshes[i].node;
        while(node !== modelNode && node) {
            node = node.parent;
        }
        console.log(node);
        if (node === modelNode) continue;
        partsToDetach.push(i);
    }
    console.log(partsToDetach);
    ctr = 0;
    for(i=0; i<partsToDetach.length; i++) {
        meshes.splice(i+ctr, 1);
        ctr--;
    }*/
    
    /*var pstate = renderPlayerStates[id];
    var objs = playerStructs[id];
    var pbody;
    if (pstate.hpt <= 0) {
        pbody = (playerActiveParts[id] & PART_TOPHEAVY) ? objs.topHeavy : objs.topLight;
        if (pbody.parent) {
            pbody.parent.removeChild(pbody);
        }
        this.app.root.addChild(pbody);
    }
    if (pstate.hpb <= 0) {
        pbody = (playerActiveParts[id] & PART_LEGS) ? objs.legs : objs.tracks;
        if (pbody.parent) {
            pbody.parent.removeChild(pbody);
        }
        this.app.root.addChild(pbody);
    }*/
    
    if (playerStructs[id].leftWpnMuzzle) this.stopSound(playerStructs[id].leftWpnMuzzle);
    if (playerStructs[id].rightWpnMuzzle) this.stopSound(playerStructs[id].rightWpnMuzzle);
    
    phEngine.removeDamping(playerStructs[id].phAttached0Damp);
    phEngine.removeRigidBody(playerStructs[id].phRb);
    phEngine.removeParticle(playerStructs[id].phAttached0);
    phEngine.removeParticle(playerStructs[id].phCenterOfMass);
    phEngine.removeParticle(playerPhId[id]);
    
    if (!extremeDebris || (renderPlayerStates && renderPlayerStates[id] && renderPlayerStates[id].hpt > 0)) {
        this.app.scene.removeModel(playerStructs[id].batchModelTopLight);
        this.app.scene.removeModel(playerStructs[id].batchModelLegs);
    } else {
        roboDebris.push(playerStructs[id].batchModelTopLight);
        roboDebris.push(playerStructs[id].batchModelLegs);
    }
    
    playerModels[id].destroy();
    
    //document.body.removeChild(playerStructs[id].hpbar);
    playerStructs[id].nickname.destroy();
    playerStructs[id].imgRank.destroy();
    delete playerModels[id];
    delete playerActiveParts[id];
    delete playerPhId[id];
    delete playerStructs[id];
    delete playerMoveDir[id];
    delete playerMoveDist[id];
    delete playerVelocity[id];
    delete playerVelocitySmooth[id];
    if (renderPlayerStates) {
        if (renderPlayerStates[id]) delete renderPlayerStates[id];
    }
    for(i=0; i<stateHistory.length; i++) {
        delete stateHistory[i][id];
    }
    console.log("Player " + id + " disconnected");
};

Client.prototype.createProjectileEntity = function(id) {
    var proj;
    if (renderProjStates[id].type == PROJ_ROCKET) {
        proj = this.rocket.clone();
        this.addStaticFlameLinked(proj, -1, id);
        
    } else if (renderProjStates[id].type == PROJ_GRENADE || renderProjStates[id].type == PROJ_GRENADEEMP) {
        proj = this.grenade.clone();
    }
    if (proj.parent) {
        proj.parent.removeChild(proj);
    }
    this.app.root.addChild(proj);
    proj.enabled = true;
    return proj;
};

Client.prototype.addProjectile = function(id) {
    projModels[id] = this.createProjectileEntity(id);
};

Client.prototype.removeProjectile = function(id) {
    if (projModels[id]) {
        projModels[id].destroy();
        delete projModels[id];
    }
};

function blendTo3(curVal, nextVal, slowdown) {
    curVal.scale(slowdown - 1).add(nextVal).scale(1.0 / slowdown);
}

function blendTo(curVal, nextVal, slowdown) {
    return ((curVal * (slowdown - 1)) + nextVal) / slowdown;
}

Client.prototype.smoothCorrectState = function(src, dest) {
    if (Math.abs(src.x - dest.x) > CL_CORRECTEPSILON) {
        src.x = blendTo(src.x, dest.x, CL_CORRECTSMOOTH);
    }
    if (Math.abs(src.z - dest.z) > CL_CORRECTEPSILON) {
        src.z = blendTo(src.z, dest.z, CL_CORRECTSMOOTH);
    }
    if (Math.abs(src.ry - dest.ry) > CL_CORRECTEPSILON) {
        src.ry = blendTo(src.ry, dest.ry, CL_CORRECTSMOOTH);
    }
    if (Math.abs(src.rw - dest.rw) > CL_CORRECTEPSILON) {
        src.rw = blendTo(src.rw, dest.rw, CL_CORRECTSMOOTH);
    }
    /*if (src.hp > dest.hp) {
        console.log("Player health: " + dest.hp);
    }*/
    src.hpt = dest.hpt;
    src.hpb = dest.hpb;
    src.hpl = dest.hpl;
    src.hpr = dest.hpr;
};

Client.prototype.killPlayer = function(id) {
    //playerModels[id].setLocalScale(1, 0.1, 1);
    this.destroyTop(id);
    this.destroyBottom(id);
};

Client.prototype.fixMinTextLength = function(s, lim) {
    while(s.length < lim) s += " ";
    return s;
};

Client.prototype.updateTexts = function(dt) {
    
    this.textTime = pc.now();
    
    /*if (this.debugNavPath) {
        var color = new pc.Color(1,0,0);
        var path = this.debugNavPath;
        var points = path.length / 2;
        for(var i=0; i<points - 1; i++) {
            this.direction.set(path[i * 2], 0.1, path[i * 2 + 1]);
            this.direction2.set(path[(i+1) * 2], 0.1, path[(i+1) * 2 + 1]);
            this.app.renderLine(this.direction, this.direction2, color);
        }
    }*/
    
    if (renderPlayerStates[this.id] && renderPlayerStates[this.id].hpt <= 0) {
        //this.textRespawn.innerHTML = "Respawning in " + Math.floor(this.timeToRespawn / 1000) + "...";
        this.textRespawn.enabled = true;
        this.textRespawn.element.text = "Respawning in " + Math.floor(this.timeToRespawn / 1000) + "...";
        adDiv.style.display = "block";
        if (adDiv2) adDiv2.style.display = "block";
        this.timeToRespawn -= dt * 1000;
        if (this.timeToRespawn < 0) this.timeToRespawn = 0;
    }
    
    var screenMul = 1.0 / this.screen2d.scale;
    
    for (var uid in playerModels) {
        if (!playerModels.hasOwnProperty(uid)) continue;
        if (!playerActiveParts.hasOwnProperty(uid)) continue;
        this.direction.set(0, 5, 0);
        this.direction.add(playerModels[uid].getLocalPosition());
        this.cam.camera.worldToScreen(this.direction, this.direction2);
        /*playerStructs[uid].hpbar.innerHTML =  ((playerActiveParts[uid].body & PART_BOT)?"[BOT] ":"Player ");// + Math.floor(stateHistory[stateHistory.length-1][uid].hpt);
        playerStructs[uid].hpbar.style.left = this.direction2.x + "px";
        playerStructs[uid].hpbar.style.top = this.direction2.y + "px";*/
        
        playerStructs[uid].nickname.setLocalPosition(this.direction2.x * screenMul, (this.app.graphicsDevice.height - this.direction2.y) * screenMul + 20, 0);
        playerStructs[uid].imgRank.setLocalPosition(this.direction2.x * screenMul, (this.app.graphicsDevice.height - this.direction2.y) * screenMul - 10, 0);
        //playerStructs[uid].nickname.setLocalPosition(this.direction.x, this.direction.y, this.direction.z);
    }
    
    /*this.score[0].innerHTML = "Red: " + teamScore[0];
    this.score[1].innerHTML = "Green: " + teamScore[1];
    this.score[2].innerHTML = "Blue: " + teamScore[2];
    this.score[3].innerHTML = "Yellow: " + teamScore[3];*/
    
    var i;
    var str;
    
    for(i=0; i<4; i++) {
        //teamScore[i] = Math.floor(Math.random() * 100 + 100);
        str = this.fixMinTextLength("" + teamScore[i], 3);
        if (str !== this.textScore[i].element.text) {
            this.textScore[i].element.text = str;
        }
    }

    if (roundEndTime === 0) {
        //this.textTimeLeft.innerHTML = "Waiting for players...";
        this.textTimeLeft.enabled = false;
        this.textWaiting.enabled = true;
    } else {
        this.textWaiting.enabled = false;
        var timeLeft = roundEndTime - this.lastUpdateServerTime;
        if (timeLeft < 0) {
            
            if (flushLevel) {
                this.flushLevel();
                flushLevel = false;
            }
            
            if (!finMenuMode) {
                var bestScore = 0;
                var bestTeam = 0;
                for(i=0; i<4; i++) {
                    if (teamScore[i] > bestScore) {
                        bestScore = teamScore[i];
                        bestTeam = i;
                    }
                }
                if (bestScore === 0) {
                    this.scoreWon.innerHTML = "No winners";
                    this.scoreWon.style.color = "white";
                    //this.textNoWinners.enabled = true;
                    this.finMenu.style.display = "block";
                    adDiv.style.display = "block";
                    if (adDiv2) adDiv2.style.display = "block";
                    finMenuMode = true;
                } else if (bestTeam === 0) {
                    this.scoreWon.innerHTML = "Red won!";
                    this.scoreWon.style.color = "#FF002B";
                    //this.textRedWon.enabled = true;
                    this.finMenu.style.display = "block";
                    adDiv.style.display = "block";
                    if (adDiv2) adDiv2.style.display = "block";
                    finMenuMode = true;
                } else if (bestTeam === 1) {
                    this.scoreWon.innerHTML = "Green won!";
                    this.scoreWon.style.color = "#00FFBF";
                    //this.textGreenWon.enabled = true;
                    this.finMenu.style.display = "block";
                    adDiv.style.display = "block";
                    if (adDiv2) adDiv2.style.display = "block";
                    finMenuMode = true;
                } else if (bestTeam === 2) {
                    this.scoreWon.innerHTML = "Blue won!";
                    this.scoreWon.style.color = "#77c6ff";
                    //this.textBlueWon.enabled = true;
                    this.finMenu.style.display = "block";
                    adDiv.style.display = "block";
                    if (adDiv2) adDiv2.style.display = "block";
                    finMenuMode = true;
                } else {
                    this.scoreWon.innerHTML = "Yellow won!";
                    this.scoreWon.style.color = "#FF9F00";
                    //this.textYellowWon.enabled = true;
                    this.finMenu.style.display = "block";
                    adDiv.style.display = "block";
                    if (adDiv2) adDiv2.style.display = "block";
                    finMenuMode = true;
                }
            }
            if (finMenuMode) this.scoreTime.innerHTML = "Next round in: " + Math.max(Math.floor((timeToNextRound - pc.now()) / 1000), 0);
            timeLeft = 0;
        } else {
            if (finMenuMode) {
                this.finMenu.style.display = "none";
                adDiv.style.display = "none";
                if (adDiv2) adDiv2.style.display = "none";
                finMenuMode = false;
            }
            //this.textWon.innerHTML = "";
            this.textNoWinners.enabled = false;
            this.textRedWon.enabled = false;
            this.textGreenWon.enabled = false;
            this.textBlueWon.enabled = false;
            this.textYellowWon.enabled = false;
        }
        //this.textTimeLeft.innerHTML = "Time left: " + Math.floor(timeLeft / 1000);
        this.textTimeLeft.enabled = true;
        //this.textTimeLeft.element.text = "Time left: " + this.fixMinTextLength("" + Math.floor(timeLeft / 1000), 3);
        var seconds = Math.floor(timeLeft / 1000);
        var minutes = Math.floor(seconds / 60);
        seconds = seconds % 60;
        this.textTimeLeft.element.text = this.fixMinTextLength((minutes > 9 ? minutes : "0" + minutes) + ":" + 
                                                               (seconds > 9 ? seconds : "0" + seconds), 5);
        
        if (minutes === 0 && seconds < 10) {
            this.textTimeLeft.enabled = (timeLeft % 1000) < 500;
        }
    }
    
    //this.textXp.innerHTML = "XP: " + playerScore;
    /*str = "XP:" + this.fixMinTextLength("" + playerScore, 3);
    if (this.textXp.element.text !== str) {
        this.textXp.element.text = str;
    }*/
    
    var t = this.textTime;//pc.now();
    
    if (t < playerScoreDiffShowEndTime) {
        //this.textXpBonus.enabled = true;
        if (!this.textXp.enabled) {
            //if (playerScoreDiff > 0) {
                //this.textXpDiff.innerHTML = "(+" + playerScoreDiff + ")";
                //this.textXpDiff.style.color = "lime";

                //this.textXpBonus.element.text = this.fixMinTextLength("(+" + playerScoreDiff + ")", 6);
                //this.textXpBonus.element.color = this.colorLime;
                this.textXp.element.text = this.fixMinTextLength("XP:" + playerScore + "(" + (playerScoreDiff > 0 ? "+":"") + playerScoreDiff + ")", 12);
                this.textXp.element.color = playerScoreDiff > 0 ? this.colorLime : this.colorRed;
                var clr = this.textXpBg.element.color;
                clr.copy(this.textXp.element.color);
                //if (playerScoreDiff > 0) {
                    clr.r *= 0.5;
                    clr.g *= 0.5;
                    clr.b *= 0.5;
                //}
                this.textXpBg.element.color = clr;
            
                if (playerScoreDiff > 0) {
                    clr = this.textXp.element.color;
                    clr.r = pc.math.lerp(clr.r, 1, 0.5);
                    clr.g = pc.math.lerp(clr.g, 1, 0.5);
                    clr.b = pc.math.lerp(clr.b, 1, 0.5);
                    this.textXp.element.color = clr;
                } /*else {
                    clr = this.textXp.element.color;
                    clr.r = pc.math.lerp(clr.r, 1, 0.125);
                    clr.g = pc.math.lerp(clr.g, 1, 0.125);
                    clr.b = pc.math.lerp(clr.b, 1, 0.125);
                    this.textXp.element.color = clr;
                }*/
            
            //} else if (playerScoreDiff < 0) {
                //this.textXpDiff.innerHTML = "(" + playerScoreDiff + ")";
                //this.textXpDiff.style.color = "red";

                //this.textXpBonus.element.text = this.fixMinTextLength("(" + playerScoreDiff + ")", 6);
                //this.textXpBonus.element.color = this.colorRed;

                //this.textXp.element.text = this.fixMinTextLength("(" + playerScoreDiff + ")", 6);
                //this.textXp.element.color = this.colorRed;
            //}
        }
        //this.textXpDiff.style.opacity = opacity;
        //this.textXpBonus.element.opacity = opacity;
        var opacity = (playerScoreDiffShowEndTime - t) / 5000;
        opacity = Math.sqrt(opacity);
        this.textXp.element.opacity = opacity;
        this.textXpBg.element.opacity = opacity * 0.619;
        this.textXp.enabled = this.textXpBg.enabled = true;
    } else {
        //this.textXpBonus.enabled = false;
        this.textXp.enabled = this.textXpBg.enabled = false;
    }
    
    //this.stats.innerHTML = "";
    
    var timeSinceLastStart, remaining, regenTime;
    
    if (!this.player) return;
    
    if (playerActiveParts[this.id].body & PART_SHIELD) {
        if (this.lastShieldStart) {
            timeSinceLastStart = t - this.lastShieldStart;
            
            if (playerActiveParts[this.id].body & PART_SHIELD2) {
                remaining = (shieldRegenTime2 + shieldTime2) - timeSinceLastStart / 1000.0;
                regenTime = shieldRegenTime2;
            } else {
                remaining = (shieldRegenTime + shieldTime) - timeSinceLastStart / 1000.0;
                regenTime = shieldRegenTime;
            }
            
            if (remaining < 0) {
                this.lastShieldStart = 0;
            } else {
                if (remaining > regenTime) {
                    //this.statsShield.innerHTML = "SHIELD MODE!";
                    if (this.uiAbilityShieldGlow.enabled) {
                        //this.uiAbilityShield.element.material.emissive = this.colorAbilityInactive;
                        //this.uiAbilityShield.element.material.update();
                        this.uiAbilityShield.element.material.setParameter("progress", 0);
                        this.uiAbilityShieldGlow.enabled = false;
                    }
                } else {
                    //this.statsShield.innerHTML = "Can activate shield in " + Math.floor(remaining) + " seconds";
                    this.uiAbilityShield.element.material.setParameter("progress", 1.0 - remaining / regenTime);
                }
                //shieldText = true;
            }
        } else {
            //this.statsShield.innerHTML = "Shield [Shift]";
            if (!this.uiAbilityShieldGlow.enabled) {
                //this.uiAbilityShield.element.material.emissive = this.colorAbilityActive;
                //this.uiAbilityShield.element.material.update();
                this.uiAbilityShield.element.material.setParameter("progress", 1);
                this.uiAbilityShieldGlow.enabled = true;
            }
        }
    }
    
    if (playerActiveParts[this.id].body & PART_BOOST) {
        //this.stats.innerHTML += "<br>";
        if (this.lastBoostStart) {
            timeSinceLastStart = t - this.lastBoostStart;
            
            if (playerActiveParts[this.id].body & PART_BOOST2) {
                remaining = (boostRegenTime2 + boostTime2) - timeSinceLastStart / 1000.0;
                regenTime = boostRegenTime2;
            } else {
                remaining = (boostRegenTime + boostTime) - timeSinceLastStart / 1000.0;
                regenTime = boostRegenTime;
            }
            
            if (remaining < 0) {
                this.lastBoostStart = 0;
            } else {
                if (remaining > regenTime) {
                    //this.statsBoost.innerHTML = "BOOST MODE!";
                    if (this.uiAbilityBoostGlow.enabled) {
                        this.uiAbilityBoost.element.material.setParameter("progress", 0);
                        this.uiAbilityBoostGlow.enabled = false;
                    }
                } else {
                    //this.statsBoost.innerHTML = "Can activate speed boost in " + Math.floor(remaining) + " seconds";
                    this.uiAbilityBoost.element.material.setParameter("progress", 1.0 - remaining / regenTime);
                }
                //boostText = true;
            }
        } else {
            if (renderPlayerStates[this.id] && renderPlayerStates[this.id].hpb > 0) {
                //this.statsBoost.innerHTML = "Speed Boost [Space]";
                if (!this.uiAbilityBoostGlow.enabled) {
                    this.uiAbilityBoost.element.material.setParameter("progress", 1);
                    this.uiAbilityBoostGlow.enabled = true;
                }
            } else if (renderPlayerStates[this.id] && renderPlayerStates[this.id].hpb <= 0) {
                //this.statsBoost.innerHTML = "Speed Boost [BROKEN]";
                this.uiAbilityBoost.element.material.setParameter("progress", 0);
                this.uiAbilityBoostGlow.enabled = false;
            }
        }
    }
    
    /*if (playerActiveParts[this.id].body & PART_DEFLECT) {
        if (this.lastDeflectStart) {
            timeSinceLastStart = t - this.lastDeflectStart;
            
            remaining = deflectRegenTime - timeSinceLastStart / 1000.0;
            regenTime = deflectRegenTime;
            
            if (remaining < 0) {
                this.timeSinceLastStart = 0;
            } else {
                if (remaining > regenTime) {
                    this.stats.innerHTML += "DEFLECT!";
                } else {
                    this.stats.innerHTML += "Can activate deflect in " + Math.floor(remaining) + " seconds";
                }
            }
        } else {
            this.stats.innerHTML += "Deflect [Ctrl]";
        }
        this.stats.innerHTML += "<br>";
    }*/
    
    if (playerActiveParts[this.id].body & PART_ANTISHIELD) {
        if (!this.uiGroupAntishield.enabled) {
            this.uiGroupAntishield.enabled = true;
        }
        
        //this.stats.innerHTML += "<br>";
        if (this.lastAntishieldStart) {
            timeSinceLastStart = t - this.lastAntishieldStart;
            
            remaining = antishieldRegenTime - timeSinceLastStart / 1000.0;
            regenTime = antishieldRegenTime;
            
            if (remaining < 0) {
                this.lastAntishieldStart = 0;
            } else {
                if (remaining > regenTime) {
                    //this.statsAntishield.innerHTML = "ANTISHIELD!";
                    if (this.uiAbilityAntishieldGlow.enabled) {
                        this.uiAbilityAntishield.element.material.setParameter("progress", 0);
                        this.uiAbilityAntishieldGlow.enabled = false;
                    }
                } else {
                    //this.statsAntishield.innerHTML = "Can activate antishield in " + Math.floor(remaining) + " seconds";
                    this.uiAbilityAntishield.element.material.setParameter("progress", 1.0 - remaining / regenTime);
                }
            }
        } else {
            //this.statsAntishield.innerHTML = "Antishield [Q]";
            if (!this.uiAbilityAntishieldGlow.enabled) {
                this.uiAbilityAntishield.element.material.setParameter("progress", 1);
                this.uiAbilityAntishieldGlow.enabled = true;
            }
        }
    } else {
        if (this.uiGroupAntishield.enabled) {
            this.uiGroupAntishield.enabled = false;
        }
    }
    
    /*if (playerActiveParts[this.id].body & PART_SHIELD) {
        if (!shieldText) this.stats.innerHTML += "Ability: Shield [Space]";
    } else if (playerActiveParts[this.id].body & PART_BOOST) {
        if (!boostText) this.stats.innerHTML += "Ability: Speed Boost [Space]";
    }*/
    
    //this.stats.innerHTML += "<br>Buy menu [B]";
    
    var wpn = playerActiveParts[this.id].right;
    if (wpn) {
        /*var str = "Ammo in ";
        //this.stats.innerHTML += "<br>Ammo in ";
        if (wpn == WPN_MGUN) {
            str += "minigun";
        } else if (wpn == WPN_SHOTGUN) {
            str += "shotgun";
        } else if (wpn == WPN_ROCKET) {
            str += "rocket launcher";
        } else if (wpn == WPN_GRENADE) {
            str += "grenade launcher";
        } else if (wpn == WPN_FLAME) {
            str += "flamethrower";
        }
        this.statsAmmo.innerHTML = str + ": " + playerStructs[this.id].ammo;*/
        
        var otherWeaponNearby = false;
        var dx, dz;
        var pstate = stateHistory[stateHistory.length - 1][this.id];
        if (pstate && pickupPos) {
            for(var k=0; k<pickupPos.length; k++) {
                if (!pc.pickups[k].entity.model.enabled) continue;
                dx = pstate.x - pickupPos[k][0];
                dz = pstate.z - pickupPos[k][1];
                if (dx*dx + dz*dz < pickupSqRadius) {
                    otherWeaponNearby = true;
                    break;
                }
            }
            //this.textChange.innerHTML = otherWeaponNearby ? "Press [E] to change weapon" : "";
            this.textChange.enabled = otherWeaponNearby;
        }
    } else {
        //this.textChange.innerHTML = "";
        //this.statsAmmo.innerHTML = "";
        this.textChange.enabled = false;
    }
    
    this.textTime = pc.now() - this.textTime;
};

Client.prototype.throwGrenade = function(id) {
    var pstate = renderPlayerStates[id];
    var grenade = this.grenade;
    /*var grenade = this.grenade.clone();
    if (grenade.parent) {
        grenade.parent.removeChild(grenade);
    }
    this.app.root.addChild(grenade);
    grenade.enabled = true;
    grenade.setPosition(pstate.x, PLAYER_Y + 2, pstate.z);*/
    var phid = phEngine.addParticle(pstate.x, PLAYER_Y + 2, pstate.z, SV_GRENADERADIUS, PHSTATE_ACTIVE);
    var pos = this.cursor.getPosition();
    var strength = 0.4;
    this.velocity.set(pstate.x, PLAYER_Y + 2, pstate.z).sub(pos).normalize().scale(-strength);
    phEngine.addParticleImpulse(phid, this.velocity.x, this.velocity.y, this.velocity.z);
    this.velocity.y = 0;
    var ray = new pc.Ray();
    phEngine.getParticlePos(phid, ray.origin);
    ray.direction.set(0,1,0);
    grenadeList.push({id:phid, ray:ray});
};

Client.prototype.randomVectorFromInt = function(vec, i) {
    vec.x = Math.sin(i) * 10000;
    vec.x = (vec.x - Math.floor(vec.x)) * 2 - 1;
    
    vec.y = Math.sin(i + 1) * 10000;
    vec.y = (vec.y - Math.floor(vec.y)) * 2 - 1;
    
    vec.z = Math.sin(i + 2) * 10000;
    vec.z = (vec.z - Math.floor(vec.z)) * 2 - 1;
    
    vec.normalize();
};

Client.prototype.updateGrenades = function(dt) {
    
    var t = pc.now();
    var path, startServerTime, grenadeTime, pathLerp, i, pointId, pointId2, points, segmentLerp, model, pos;
    var color = new pc.Color(1,0,0);
    var spin, axis, rot;
    for(var uid2 in projPath) {
        if (!projPath.hasOwnProperty(uid2)) continue;
        if (!projModels.hasOwnProperty(uid2)) continue;
        path = projPath[uid2].path;
        startServerTime = projPath[uid2].start;
        grenadeTime = (this.lastUpdateServerTime - startServerTime) + (t - this.lastUpdateClientTime);
        pathLerp = grenadeTime / grenadeLife;
        
        points = path.length/3;
        pointId = Math.floor(points * pathLerp);
        pointId2 = pointId + 1;
        if (pointId2 >= points) pointId2 = points - 1;
        segmentLerp = points * pathLerp - pointId;
        
        model = projModels[uid2];
        pos = model.getLocalPosition();
        this.tmpPos2.copy(pos);
        pos.set(path[pointId * 3], path[pointId * 3 + 1], path[pointId * 3 + 2]);
        this.direction2.set(path[pointId2 * 3], path[pointId2 * 3 + 1], path[pointId2 * 3 + 2]);
        pos.lerp(pos, this.direction2, segmentLerp);
        model.setLocalPosition(pos);
        
        spin = 10 * this.tmpPos2.sub(pos).length();
        //axis = Number.parseInt(uid2);
        axis = parseInt(uid2);
        this.randomVectorFromInt(this.tmpPos1, axis);
        this.tmpQuat.setFromAxisAngle(this.tmpPos1, spin);
        rot = model.getRotation();
        rot.mul(this.tmpQuat);
        model.setRotation(rot);
        
        //model.rotate(spin, spin, spin);
        
        /*for(i=0; i<points - 1; i++) {
            this.direction.set(path[i * 3], path[i * 3 + 1], path[i * 3 + 2]);
            this.direction2.set(path[(i+1) * 3], path[(i+1) * 3 + 1], path[(i+1) * 3 + 2]);
            this.app.renderLine(this.direction, this.direction2, color);
        }*/
    }
    
    //var energyLoss = 0.2;
    var ray;
    var dist;
    for(i=0; i<grenadeList.length; i++) {
        phEngine.getParticlePos(grenadeList[i].id, this.sphere.center);
        this.sphere.radius = this.grenade.getLocalScale().x;
        
        ray = grenadeList[i].ray;
        phEngine.getParticlePos(grenadeList[i].id, ray.direction);
        //this.app.renderLine(ray.origin, ray.direction, new pc.Color(0,1,0), new pc.Color(1,0,0));
        ray.direction.sub(ray.origin);
        dist = ray.direction.length() + SV_GRENADERADIUS;
        //if (ray.direction.lengthSq() < 0.1) continue;
        ray.direction.normalize();
        
        //if (colModels.level.pushSphereOut(this.sphere, this.direction)) {
        if (colModels.level.intersectsRay(ray, this.pickedPoint, this.pickedNormal)) {
            if (this.direction2.copy(ray.origin).sub(this.pickedPoint).lengthSq() > dist*dist) continue;
            
            //this.pickedNormal.normalize();
            phEngine.getParticleVelocity(grenadeList[i].id, this.velocity);
            this.sphere.center.copy(this.pickedNormal).scale(SV_GRENADERADIUS).add(this.pickedPoint);
            phEngine.moveParticleTo(grenadeList[i].id, this.sphere.center.x, this.sphere.center.y, this.sphere.center.z);
            // reflect
            // i - 2 * n * dot(i,n)
            //this.direction3.copy(this.velocity).normalize();
            //this.direction2.copy(this.direction).scale(2 * this.direction3.dot(this.direction));
            //this.direction2.sub2(this.direction, this.direction2).scale(this.velocity.length() * energyLoss);
        
            // bounce off static collision
            var grenadeBounce = 0.5;
            var exchangeVel = (1 + grenadeBounce) * 0.5 * this.velocity.dot(this.pickedNormal);
            if (exchangeVel > 0) {
                this.pickedNormal.scale(exchangeVel);//.add(this.velocity);
                phEngine.addParticleImpulse(grenadeList[i].id, this.pickedNormal.x, this.pickedNormal.y, this.pickedNormal.z);
            }
            
            //phEngine.setParticleVelocity(grenadeList[i], this.direction2);
        }
        
        phEngine.getParticlePos(grenadeList[i].id, ray.origin);
    }
    this.velocity.y = 0;
};

Client.prototype.intersectRayPlayer = function(uid, ray, pickedPoint, pickedNormal) {
    if (!playerStructs[uid]) return false;
    var closestDist = Number.MAX_VALUE;
    var pstate = renderPlayerStates[uid];
    this.playerSphereWorld.center.set(pstate.x, 0, pstate.z).add(this.playerSphereLocal.center);
    if (this.playerSphereWorld.intersectsRay(ray)) {
        var parts = playerActiveParts[uid];
        
        var pbody, pbodyModel;
        if (parts.body & PART_TOPHEAVY) {
            pbody = colModels.topHeavy;
            pbodyModel = playerStructs[uid].topHeavy;
        } else {
            pbody = colModels.topLight;
            pbodyModel = playerStructs[uid].topLight;
        }
        var correctClientToServerRot = false;
        
         this.tmpQuat2.set(0, pstate.ry, 0, pstate.rw); // server version - no tilt
        /*if (pbodyModel) {
            this.tmpQuat2.copy(pbodyModel.getRotation()); // client version - with tilt
        } else {
            this.tmpQuat2.set(0, pstate.ry, 0, pstate.rw);
        }*/
        this.tmpQuat.copy(this.tmpQuat2).invert();
        this.tmpQuat.transformVector(ray.direction, this.localRay.direction); // sub rotation
        this.worldPos.set(pstate.x, PLAYER_Y, pstate.z);
        
        this.localPos.set(0, (parts.body & PART_LEGS) ? PLAYER_TOPHEIGHT : 0, 0);
        this.localRay.origin.copy(ray.origin);
        this.localRay.origin.sub(this.worldPos);
        this.localRay.origin.sub(this.localPos);
        this.tmpQuat.transformVector(this.localRay.origin, this.localRay.origin);

        if (pbody.intersectsRay(this.localRay, pickedPoint, pickedNormal)) {
            this.tmpQuat2.transformVector(pickedPoint, pickedPoint);
            pickedPoint.add(this.localPos);
            pickedPoint.add(this.worldPos);
            closestDist = this.localRay.origin.sub(pickedPoint).lengthSq();
            this.pickedPoint3.copy(pickedPoint);
            correctClientToServerRot = true;
        }
        var dist;
        
        var wpn = playerActiveParts[uid].left;
        if (wpn > 0) {
            this.localPos2.copy((parts.body & PART_TOPHEAVY) ? PLAYER_LEFTHEAVYPOS : PLAYER_LEFTLIGHTPOS);
            this.localRay.origin.copy(ray.origin);
            this.localRay.origin.sub(this.worldPos);
            this.localRay.origin.sub(this.localPos);
            this.tmpQuat.transformVector(this.localRay.origin, this.localRay.origin);
            this.localRay.origin.sub(this.localPos2);
            pbody = colModels.weapons[wpn];
            if (pbody.intersectsRay(this.localRay, pickedPoint, pickedNormal)) {
                pickedPoint.add(this.localPos2);
                this.tmpQuat2.transformVector(pickedPoint, pickedPoint);
                pickedPoint.add(this.localPos);
                pickedPoint.add(this.worldPos);
                dist = this.localRay.origin.sub(pickedPoint).lengthSq();
                if (dist < closestDist) {
                    this.pickedPoint3.copy(pickedPoint);
                    closestDist = dist;
                    correctClientToServerRot = true;
                }
            }
        }
        
        wpn = playerActiveParts[uid].right;
        if (wpn > 0) {
            this.localPos2.copy((parts.body & PART_TOPHEAVY) ? PLAYER_RIGHTHEAVYPOS : PLAYER_RIGHTLIGHTPOS);
            this.localRay.origin.copy(ray.origin);
            this.localRay.origin.sub(this.worldPos);
            this.localRay.origin.sub(this.localPos);
            this.tmpQuat.transformVector(this.localRay.origin, this.localRay.origin);
            this.localRay.origin.sub(this.localPos2);
            pbody = colModels.weapons[wpn];
            if (pbody.intersectsRay(this.localRay, pickedPoint, pickedNormal)) {
                pickedPoint.add(this.localPos2);
                this.tmpQuat2.transformVector(pickedPoint, pickedPoint);
                pickedPoint.add(this.localPos);
                pickedPoint.add(this.worldPos);
                dist = this.localRay.origin.sub(pickedPoint).lengthSq();
                if (dist < closestDist) {
                    this.pickedPoint3.copy(pickedPoint);
                    closestDist = dist;
                    correctClientToServerRot = true;
                }
            }
        }
        
        this.localPos.set(0, PLAYER_LEGHEIGHT, 0);
        this.localRay.origin.copy(ray.origin);
        this.localRay.origin.sub(this.worldPos);
        this.localRay.origin.sub(this.localPos);
        this.tmpQuat.transformVector(this.localRay.origin, this.localRay.origin);
        if (parts.body & PART_LEGS) {
            pbody = colModels.legs;
        } else {
            pbody = colModels.tracks;
        }
        if (pbody.intersectsRay(this.localRay, pickedPoint, pickedNormal)) {
            this.tmpQuat2.transformVector(pickedPoint, pickedPoint);
            pickedPoint.add(this.localPos);
            pickedPoint.add(this.worldPos);
            dist = this.localRay.origin.sub(pickedPoint).lengthSq();
            if (dist < closestDist) {
                this.pickedPoint3.copy(pickedPoint);
                closestDist = dist;
                correctClientToServerRot = false;
            }
        }
        
        if (closestDist < Number.MAX_VALUE) {
            
            /*if (correctClientToServerRot) {
                 // subtract client body transform
                this.localPos.set(0, (parts.body & PART_LEGS) ? PLAYER_TOPHEIGHT : 0, 0);
                this.pickedPoint3.sub(this.worldPos);
                this.pickedPoint3.sub(this.localPos);
                this.tmpQuat2.invert().transformVector(this.pickedPoint3, this.pickedPoint3);
                // add server body transform
                this.tmpQuat.set(0, pstate.ry, 0, pstate.rw).transformVector(this.pickedPoint3, this.pickedPoint3);
                this.pickedPoint3.add(this.localPos);
                this.pickedPoint3.add(this.worldPos);
            }*/
            
            pickedPoint.copy(this.pickedPoint3);
            return true;
        }
    }
    
    return false;
};

Client.prototype.intersectRayScene = function(ray, pickedPoint, owner, normal, maxLength) {
    
    var sceneDist = Number.MAX_VALUE;
    var playerDist = Number.MAX_VALUE;
    if (colModels.level.intersectsRay(ray, this.pickedPoint2, normal, maxLength)) {
        sceneDist = this.midPoint.copy(this.pickedPoint2).sub(ray.origin).lengthSq();
    }
    
    for (var uid in renderPlayerStates) {
        if (uid == owner) continue;
        if (!renderPlayerStates.hasOwnProperty(uid)) continue;
        if (!playerActiveParts.hasOwnProperty(uid)) continue;
        if (renderPlayerStates[uid].hpt <= 0) continue;
        if (this.intersectRayPlayer(uid, ray, pickedPoint, normal)) {
            playerDist = this.midPoint.copy(pickedPoint).sub(ray.origin).lengthSq();
            this.playerHit = uid;
            break;
        }
    }
    
    var floorDist = Number.MAX_VALUE;
    if (this.floor.intersectsRay(ray, this.pickedPoint3)) {
        floorDist = this.midPoint.copy(this.pickedPoint3).sub(ray.origin).lengthSq();
    }
    
    if (sceneDist < playerDist && sceneDist < floorDist) {
        pickedPoint.copy(this.pickedPoint2);
        return true;
    } else if (playerDist < sceneDist && playerDist < floorDist) {
        ColUtils.hitBoxId = -1;
        return true;
    } else if (floorDist < Number.MAX_VALUE) {
        pickedPoint.copy(this.pickedPoint3);
        if (normal) normal.set(0,1,0);
        ColUtils.hitBoxId = -2;
        return true;
    }
    
    /*if ((sceneDist < playerDist && sceneDist >= 0) || (sceneDist >= 0 && playerDist < 0)) {
        pickedPoint.copy(this.pickedPoint2);
        return true;
    } else if (playerDist >= 0) {
        ColUtils.hitBoxId = -1;
        return true;
    }*/
    
    //if (normal) normal.set(0,1,0);
    //ColUtils.hitBoxId = -2;
    //return this.floor.intersectsRay(ray, pickedPoint);
    return false;
};

Client.prototype.setDiffuse = function(entity, vec) {
    var meshes = entity.model.model.meshInstances;
    for(var i=0; i<meshes.length; i++) {
        meshes[i].setParameter("material_diffuse", vec.data);
    }
};

Client.prototype.setDiffuseForNode = function(node, vec) {
    var meshes = this.app.scene.drawCalls;
    for(var i=0; i<meshes.length; i++) {
        if (meshes[i].node === node) {
            meshes[i].setParameter("material_diffuse", vec.data);
        }
    }
};

//Client.prototype.changeDiffuse = function(entity, a) {
Client.prototype.changeDiffuse = function(id, part, a) {
    a *= a;
    /*var meshes = entity.model.model.meshInstances;
    for(var i=0; i<meshes.length; i++) {
        meshes[i].setParameter("material_diffuse", new pc.Vec3(a,a,a).data);
    }*/
    var color = playerStructs[id].dynDiffuse[part].data;
    color[0] = color[1] = color[2] = a;
};

Client.prototype.refreshBuyMenu = function() {
    if (!playerActiveParts[this.id]) return;
    
    var text = "Shop<br><br><br>";
    text += "You have: " + playerScore + "XP<br><br><br>";
    var priceClass, acquired;
    for(var i=0; i<buyItems.length; i++) {
        priceClass = buyItems[i].price <= playerScore ? "itemBuyable" : "itemExpensive";
        acquired = playerActiveParts[this.id].body & buyItems[i].part;
        if (acquired) priceClass = "itemAcquired";

        /*
        text += "<div class='ability " + priceClass + "' data-tip='"+buyItems[i].desc+
            "' onmousemove='hoverToolTip(this)' onmouseout='hideToolTip()' onclick='doBuyItem("+ (acquired?0:buyItems[i].part) +")'>" + buyItems[i].name + 
            "</div><div class='price "+ priceClass +"'>" + (acquired ? "Acquired" : (buyItems[i].price+" XP")) + "</div><br><hr>";
            */
        text += "<div class='abilityContainer' data-tip='"+buyItems[i].desc+
            "' onmousemove='hoverToolTip(this)' onmouseout='hideToolTip()' onclick='doBuyItem("+ (acquired?0:buyItems[i].part) +")'>" + 
            "<div class='ability " + priceClass + "'>" + buyItems[i].name + "</div>" + 
            "<div class='price "+ priceClass +"'>" + (acquired ? "Acquired" : (buyItems[i].price+" XP")) + "</div>" + 
            "</div>" + 
            //"<br> +
            "<hr>";
    }

    this.buyMenu.innerHTML = text;
};

Client.prototype.toggleBuyMenu = function() {
    if (!buyMenuMode) {
        this.refreshBuyMenu();
        //this.buyMenu.style.visibility = "visible";
        this.buyMenu.style.display = "block";
        adDiv.style.display = "block";
        if (adDiv2) adDiv2.style.display = "block";
        buyMenuMode = true;
    } else {
        //this.buyMenu.style.visibility = "hidden";
        this.buyMenu.style.display = "none";
        adDiv.style.display = "none";
        if (adDiv2) adDiv2.style.display = "none";
        hideToolTip();
        buyMenuMode = false;
    }
};

Client.prototype.updateControlsFixed = function(dt) {
    // Process input
    
    // Sample keys
    var isW, isS, isA, isD;
    if (!(buyMenuMode || startMenuMode) && this.stunTicksLeft <= 0) {
        if (this.app.keyboard.isPressed(pc.KEY_W)) {
            this.command.ctrl |= CTRL_FORWARD;
            isW = true;
        }
        if (this.app.keyboard.isPressed(pc.KEY_S)) {
            this.command.ctrl |= CTRL_BACK;
            isS = true;
        }
        if (this.app.keyboard.isPressed(pc.KEY_A)) {
            this.command.ctrl |= CTRL_LEFT;
            isA = true;
        }
        if (this.app.keyboard.isPressed(pc.KEY_D)) {
            this.command.ctrl |= CTRL_RIGHT;
            isD = true;
        }
    }
    
    /*if (isW || isS || isA || isD) {
    } else {
        if (playerStructs[this.id]) {
            playerStructs[this.id].timeForStepSound = 0;
        }
    }*/

    var currentParts;
    /*if (this.wasPressed[pc.KEY_1]) {
        currentParts = playerActiveParts[this.id].body;
        
        if (currentParts & PART_LEGS) {
            currentParts &= ~PART_LEGS;
            currentParts |= PART_TRACKS;
        } else {
            currentParts &= ~PART_TRACKS;
            currentParts |= PART_LEGS;
        }
        pendingSendPartsBody = currentParts;
    }
    if (this.wasPressed[pc.KEY_2]) {
        currentParts = playerActiveParts[this.id].body;
        
        if (currentParts & PART_TOPHEAVY) {
            currentParts &= ~PART_TOPHEAVY;
            currentParts |= PART_TOPLIGHT;
        } else {
            currentParts &= ~PART_TOPLIGHT;
            currentParts |= PART_TOPHEAVY;
        }
        pendingSendPartsBody = currentParts;
    }
    if (this.wasPressed[pc.KEY_3]) {
        currentParts = playerActiveParts[this.id].left;
        currentParts++;
        if (currentParts > WPN_SHOTGUN) currentParts = 0;
        pendingSendPartsLeft = currentParts;
    }
    if (this.wasPressed[pc.KEY_4]) {
        currentParts = playerActiveParts[this.id].right;
        currentParts++;
        if (currentParts > WPN_SHOTGUN) currentParts = 0;
        pendingSendPartsRight = currentParts;
    }*/
    
    /*if (this.wasPressed[pc.KEY_X]) {
        this.wasPressed[pc.KEY_X] = false;
        currentParts = playerActiveParts[this.id].body;
        
        if (currentParts & PART_BOOST) {
            currentParts &= ~PART_BOOST;
            currentParts |= PART_SHIELD;
        } else {
            currentParts &= ~PART_SHIELD;
            currentParts |= PART_BOOST;
        }
        pendingSendPartsBody = currentParts;
    }*/
    
    if (!(buyMenuMode || startMenuMode) && this.stunTicksLeft <= 0) {
        if (this.wasPressed[pc.KEY_SPACE]) {
            this.wasPressed[pc.KEY_SPACE] = false;
            this.command.ctrl |= CTRL_BONUS;

            if (playerActiveParts[this.id].body & PART_BOOST && this.boostTicksLeft <= 0 && renderPlayerStates[this.id].hpb > 0) {//} !(playerActiveParts[this.id].body & PART_BOOSTON)) {
                playerSpeed = (playerActiveParts[this.id].body & PART_LEGS) ? PLAYER_SPEEDLEGS : PLAYER_SPEEDTRACKS;
                if (stateHistory[stateHistory.length-1][this.id].hpb <= 0) playerSpeed *= PLAYER_SPEEDSLOWFACTOR;
                this.lastBoostStart = pc.now();
                
                if (playerActiveParts[this.id].body & PART_BOOST2) {
                    playerSpeed *= boostSpeed2;
                    this.boostTicksLeft = boostTicks2 + boostRegenTicks2;
                } else {
                    playerSpeed *= boostSpeed;
                    this.boostTicksLeft = boostTicks + boostRegenTicks;
                }
            }
        }
    }
    
    if (this.boostTicksLeft <= ((playerActiveParts[this.id].body & PART_BOOST2) ? boostRegenTicks2 : boostRegenTicks)) {
        //console.log("boost off - ticks");
        playerSpeed = (playerActiveParts[this.id].body & PART_LEGS) ? PLAYER_SPEEDLEGS : PLAYER_SPEEDTRACKS;
        if (stateHistory[stateHistory.length-1][this.id].hpb <= 0) playerSpeed *= PLAYER_SPEEDSLOWFACTOR;
    }
    this.boostTicksLeft--;
    this.stunTicksLeft--;
    
    if (!(buyMenuMode || startMenuMode) && this.stunTicksLeft <= 0) {
        if (this.wasPressed[pc.KEY_SHIFT]) {
            this.wasPressed[pc.KEY_SHIFT] = false;
            this.command.ctrl |= CTRL_BONUS2;
        }

        if (this.wasPressed[pc.KEY_E]) {
            this.wasPressed[pc.KEY_E] = false;
            this.command.ctrl |= CTRL_USE;
        }
        
        if (this.wasPressed[pc.KEY_Q]) {
            this.wasPressed[pc.KEY_Q] = false;
            this.command.ctrl |= CTRL_BONUS3;
        }
        
        if (this.wasPressed[pc.KEY_T]) {
            this.wasPressed[pc.KEY_T] = false;
            //this.command.ctrl |= CTRL_BONUS4;
        }
    }
    
    if (this.wasPressed[pc.KEY_B]) {
        this.wasPressed[pc.KEY_B] = false;
        this.toggleBuyMenu();
    }
    
    /*if (this.wasPressed[pc.KEY_F]) {
        this.wasPressed[pc.KEY_F] = false;
        this.command.ctrl |= CTRL_PATHFIND;
        var pos = this.cursor.getPosition();
        this.command.tx = pos.x;
        this.command.ty = pos.y;
        this.command.tz = pos.z;
        console.log("PATHFIND");
    }*/
    
    /*if (this.wasPressed[pc.KEY_G]) {
        this.throwGrenade(this.id);
    }*/
    
    /*if (this.app.keyboard.wasPressed(pc.KEY_Q)) {
        this.makeStep(this.id);
    }
    if (this.app.keyboard.wasPressed(pc.KEY_E)) {
        this.makeStep2(this.id);
    }*/
    
    // Update mouse holding events
    //if (playerStructs[this.id]) console.log(playerStructs[this.id].prevFlame);
    playerStructs[this.id].spinL = false;
    playerStructs[this.id].spinR = false;
    
    if (!(buyMenuMode || startMenuMode) && this.stunTicksLeft <= 0) {
        
        var fPressed = this.app.keyboard.isPressed(pc.KEY_F);
            
        if (this.mouseHold[0]) this.updateMouse(0);
        if (this.mouseHold[2] || fPressed) {
            this.updateMouse(2);
        } else {
            //if (playerStructs[this.id]) playerStructs[this.id].prevFlame = -1;
        }
    }
        
    var rot3;
    
    // Calculate velocity
    var velocity = this.velocity;
    velocity.x = 0;
    velocity.z = 0;
    if (isW) {
        velocity.z += 1;
    } 
    if (isS) {
        velocity.z += -1;
    }
    if (isA) {
        velocity.x += 1;
    }
    if (isD) {
        velocity.x += -1;
    }
    if (velocity.x !== 0 && velocity.z !== 0) {
        /*
        // fake normalize
        velocity.x *= 0.7071067690849304;
        velocity.z *= 0.7071067690849304;
        */
    }
    if (
        ((playerActiveParts[this.id].body & PART_TRACKS) || this.playerWeight < MAXWEIGHT_LEGS) //&&
        ) {//renderPlayerStates[this.id].hpb > 0) {
        velocity.x *= dt * playerSpeed;
        velocity.z *= dt * playerSpeed;
        
        /*if (playerSpeed > 10) {
            if (pc.COUNTER === undefined) pc.COUNTER = 0;
            pc.COUNTER++;
        }*/
        
        if (velocity.x !== 0 && velocity.z !== 0) {
            // align to map
            if (velocity.x > 0 && velocity.z > 0) {
                velocity.x = 0;
            } else if (velocity.x < 0 && velocity.z < 0) {
                velocity.x = 0;
            } else {
                velocity.z = 0;
            }
        } else {
            velocity.y = velocity.x;
            velocity.x = velocity.x * CL_RIGHT.x + velocity.z * CL_FORWARD.x;
            velocity.z = velocity.y * CL_RIGHT.z + velocity.z * CL_FORWARD.z;
            velocity.y = 0;
        }
        
        this.vx += velocity.x;
        this.vz += velocity.z;
    } else {
        velocity.x = 0;
        velocity.z = 0;
    }
    
    /*if (this.autopilot) {
        var targetX = this.debugNavPath[this.debugNavNext*2];
        var targetZ = this.debugNavPath[this.debugNavNext*2+1];
        playa = stateHistory[stateHistory.length-1][this.id];
        velocity.x = targetX - playa.x;
        velocity.z = targetZ - playa.z;
        if (velocity.lengthSq() < 0.5*0.5) {
            this.debugNavNext++;
            if (this.debugNavNext === this.debugNavPath.length/2) {
                this.autopilot = false;
            }
        }
        velocity.normalize().scale(playerSpeed * dt);
        this.vx += velocity.x;
        this.vz += velocity.z;
    }*/
    
    if (this.autopilotPoint) {
        var ppos = playerModels[this.id].getPosition();
        
        var pdx = this.autopilotPoint[0] - ppos.x;
        var pdz = this.autopilotPoint[1] - ppos.z;
        var plen = pdx*pdx + pdz*pdz;
        if (plen > 1) {
            plen = 1.0 / Math.sqrt(plen);
            pdx *= plen;
            pdz *= plen;
            
            velocity.x = pdx * playerSpeed * dt;
            velocity.z = pdz * playerSpeed * dt;
            
            this.vx += velocity.x;
            this.vz += velocity.z;
        }
    }
    
    
    if (CL_PREDICT && predictedState) {
        rot3 = null;
        if (playerStructs[this.id].legs) rot3 = playerStructs[this.id].legs.getRotation();
        
        predictedStatePrev.x = predictedState.x;
        predictedStatePrev.z = predictedState.z;
        
        var cmd = this.command;
        var pstate = predictedState;
        var playa = playerModels[this.id];

        // Move player
        pstate.x += velocity.x;
        pstate.z += velocity.z;
        pstate.ry = cmd.ry;
        pstate.rw = cmd.rw;
       
        // Collide player
        if (velocity.x !== 0 || velocity.z !== 0)  {
            var uid2, playa2, len;
            var sqDist = PLAYER_RADIUS*2;
            sqDist *= sqDist;
            for(uid2 in renderPlayerStates) {
                if (this.id == uid2) continue;
                if (!renderPlayerStates.hasOwnProperty(uid2)) continue;
                playa2 = renderPlayerStates[uid2];
                if (!playa2) continue;
                if (playa2.hpt <= 0) continue;

                this.direction.x = pstate.x - playa2.x;
                this.direction.z = pstate.z - playa2.z;
                len = this.direction.x * this.direction.x + this.direction.z * this.direction.z;
                if (len < sqDist) {
                    len = 1.0 / Math.sqrt(len);
                    len *= PLAYER_RADIUS * 2;
                    this.direction.x *= len;
                    this.direction.z *= len;
                    pstate.x = playa2.x + this.direction.x;
                    pstate.z = playa2.z + this.direction.z;
                }
            }
        }

        this.collidePlayerScene(pstate);
        
        /*if (!pc.TESTprevposFixed) {
            pc.TESTprevposFixed = new pc.Vec3();
            pc.TESTprevposFixed.set(pstate.x, 0, pstate.z);
        }
        pc.TESTprevposFixed.x = pstate.x - pc.TESTprevposFixed.x;
        pc.TESTprevposFixed.z = pstate.z - pc.TESTprevposFixed.z;
        console.log("fixed");
        console.log(pc.TESTprevposFixed.data);
        pc.TESTprevposFixed.set(pstate.x, 0, pstate.z);*/
        
        //this.setPlayerPhSphere(this.id, pstate);
        
        /*playa.setLocalPosition(pstate.x, PLAYER_Y, pstate.z);
        rot = playa.getLocalRotation();
        rot.y = pstate.ry;
        rot.w = pstate.rw;
        playa.setLocalRotation(rot);
        
        if (rot3) playerStructs[this.id].legs.setRotation(rot3);*/
    }
};

Client.prototype.sampleKeyHit = function(key) {
    if (!this.wasPressed[key]) this.wasPressed[key] = this.app.keyboard.wasPressed(key);
};

Client.prototype.updateControls = function(dt) {
    if (startMenuMode) return;
    var i;
    // Sampe key hits
    this.sampleKeyHit(pc.KEY_E);
    this.sampleKeyHit(pc.KEY_F);
    this.sampleKeyHit(pc.KEY_X);
    this.sampleKeyHit(pc.KEY_SPACE);
    this.sampleKeyHit(pc.KEY_SHIFT);
    this.sampleKeyHit(pc.KEY_Q);
    this.sampleKeyHit(pc.KEY_T);
    this.sampleKeyHit(pc.KEY_B);
    
    if (this.app.keyboard.wasPressed(pc.KEY_Y)) {
        if (!this.debugLabels) {
            this.debugLabels = [];
            for(i=0; i<phRadius.length; i += 8) {
                if (!phDebugEntity[i]) continue;
                if (phPos[i*3+1] > 100) continue;

                var label = document.createElement("div");
                label.innerHTML = "" + i;
                label.style.position = "absolute";
                this.direction.set(phPos[i*3], phPos[i*3+1], phPos[i*3+2]);
                this.cam.camera.worldToScreen(this.direction, this.direction2);
                label.style.left = this.direction2.x + "px";
                label.style.top = this.direction2.y + "0px";
                label.style.color = "green";
                label.style.textShadow = "1px 1px 0px rgba(0, 0, 0, 1)";
                document.body.appendChild(label);
                this.debugLabels.push(label);
            }
        } else {
            for(i=0; i<this.debugLabels.length; i++) {
                document.body.removeChild(this.debugLabels[i]);
            }
            this.debugLabels = null;
        }
    }
    
    this.gametime += dt;
    var ticksF = (this.gametime - this.gametimePrevUpdate) / SV_DELTATIME;
    var ticks = Math.floor(ticksF);
    var tickLerp = ticksF - ticks;
    //console.log("delta:" +dt+" "+(this.gametime - this.gametimePrevUpdate));
    this.gametimePrevUpdate += ticks * SV_DELTATIME;
    if (ticks > 10) ticks = 10;
    //console.log("ticks:" +ticks);
    for(i=0; i<ticks; i++) {
        this.updateControlsFixed(SV_DELTATIME);
        //this.framesToSend ++;
        this.clientSend();
        //this.gametimeSinceLastTick = 0;
    }
    //this.gametimeSinceLastTick += dt;
    
    // Sample rotation
    var rot3;
    //if (this.mouseMoved || this.command.ctrl !== 0) {
        
        rot3 = null;
        if (playerStructs[this.id].legs) rot3 = playerStructs[this.id].legs.getRotation();
      
        // Calculate local direction
        this.cam.camera.screenToWorld(this.mx, this.my, this.cam.camera.nearClip + 0.1, this.pickedPoint);
        this.ammoIndicator.setPosition(this.pickedPoint);
    
        this.camRay.origin.copy(this.pickedPoint);
        this.camRay.direction.copy(this.pickedPoint).sub(this.cam.getPosition()).normalize();
        this.intersectRayScene(this.camRay, this.pickedPoint);
            //if (this.pickedPoint.y < 0.001) this.pickedPoint.y = 1; // don't shoot to the floor
        //this.pickedPoint.y = Math.min(this.pickedPoint.y, );
        
        var heightLimit = PLAYER_Y + PLAYER_TOPHEIGHT + 0.5;
        if (this.pickedPoint.y > heightLimit) {
            var diff = this.pickedPoint.y - heightLimit;
            var mul = diff / -this.camRay.direction.y;
            this.pickedPoint.x += this.camRay.direction.x * mul;
            this.pickedPoint.y += this.camRay.direction.y * mul;
            this.pickedPoint.z += this.camRay.direction.z * mul;
        }
        
        this.cursor.setLocalPosition(this.pickedPoint);
    
        //this.app.renderLine(playerModels[this.id].getLocalPosition(), this.pickedPoint, new pc.Color(1,0,0));
    
        this.shootRay.origin.copy(this.player.getLocalPosition());
        this.shootRay.direction.copy(this.pickedPoint);
        this.shootRay.direction.y = PLAYER_Y;
        this.shootRay.direction.sub(this.player.getLocalPosition()).normalize();
    
        //this.direction3.copy(this.pickedPoint).sub(this.player.getLocalPosition()).normalize();
    
        this.pickedPoint.sub(this.player.getLocalPosition()).scale(-1).add(this.player.getLocalPosition());
    
    /*    var gunRot = playerStructs[this.id].left.getLocalRotation();
        gunRot.slerp(pc.Quat.IDENTITY, gunRotationDown, pc.math.clamp(-this.direction3.y, 0, 1));
        gunRot.slerp(gunRot, gunRotationUp, pc.math.clamp(this.direction3.y, 0, 1));
        playerStructs[this.id].left.setLocalRotation(gunRot);*/
    
        /*this.tmpQuat.copy(playerStructs[this.id].right.getLocalRotation());
        playerStructs[this.id].right.lookAt(this.pickedPoint);
        playerStructs[this.id].right.rotateLocal(gunRotationX, gunRotationY, gunRotationZ);
        this.tmpQuat.slerp(this.tmpQuat, playerStructs[this.id].right.getLocalRotation(), dt * ANIM_TURNSPEED);
        playerStructs[this.id].right.setLocalRotation(this.tmpQuat);
    */
        this.pickedPoint.y = PLAYER_Y;
        this.tmpQuat.copy(this.player.getLocalRotation());
        this.direction.copy(this.player.forward);
        if (this.direction2.copy(this.pickedPoint).sub(this.player.getLocalPosition()).lengthSq() > 2*2) {
            this.player.lookAt(this.pickedPoint);
        }

        var rot = this.player.getLocalRotation();
        var rotSpeed = ANIM_TURNSPEED;
        if (playerActiveParts[this.id] && playerActiveParts[this.id].right == WPN_FLAME) rotSpeed = ANIM_TURNSPEEDFLAME;
        rot.slerp(this.tmpQuat, rot, dt * rotSpeed);
        this.player.setLocalRotation(rot);
        if (this.player.forward.dot(this.direction) > 0.9999) {
            this.mouseMoved = false; // tell that the mouse is still moving when we're interpolating to the final angle...
        }
        
        this.command.ry = rot.y;
        this.command.rw = rot.w;        
        this.rotationChanged = true;

        this.player.setLocalRotation(this.tmpQuat);
        
        if (rot3) playerStructs[this.id].legs.setRotation(rot3);
    //}
    
    if (CL_PREDICT && predictedState) {
        rot3 = null;
        if (playerStructs[this.id].legs) rot3 = playerStructs[this.id].legs.getRotation();
        
        var pstateA = predictedStatePrev;
        var pstateB = predictedState;
        var lerp = tickLerp;// (this.gametimeSinceLastTick) / SV_DELTATIME;
        //console.log("lerp: "+lerp+ " "+tickLerp);
        //if (lerp > 1) lerp = 1;
        var playa = playerModels[this.id];

        playa.setLocalPosition(
            pc.math.lerp(pstateA.x, pstateB.x, lerp),
            PLAYER_Y,
            pc.math.lerp(pstateA.z, pstateB.z, lerp));
        rot = playa.getLocalRotation();
        rot.y = ticks === 0 ? this.command.ry : pstateB.ry;
        rot.w = ticks === 0 ? this.command.rw : pstateB.rw;
        playa.setLocalRotation(rot);

        if (rot3) playerStructs[this.id].legs.setRotation(rot3);
    }
    
        /*if (!pc.TESTprevpos) {
            pc.TESTprevpos = new pc.Vec3();
            pc.TESTprevpos.copy(playerModels[this.id].getLocalPosition());
        }
        pc.TESTprevpos.x = playerModels[this.id].getLocalPosition().x - pc.TESTprevpos.x;
        pc.TESTprevpos.z = playerModels[this.id].getLocalPosition().z - pc.TESTprevpos.z;
        //console.log("lerped");
        console.log(pc.TESTprevpos.data);
        pc.TESTprevpos.copy(playerModels[this.id].getLocalPosition());*/
};

Client.prototype.updateMotions = function(dt) {
    var objs;
    
    for (var uid in playerStructs) {
        if (!playerStructs.hasOwnProperty(uid)) continue;
        objs = playerStructs[uid];
        
        this.updateSpinningBarrels(uid, 0, dt);
        this.updateSpinningBarrels(uid, 1, dt);
        
        if (objs.shield.enabled) {
            objs.shield.setRotation(this.shieldRotation);
            if (!objs.disableShield) {
                objs.shieldHeight += dt * 10;
                if (objs.shieldHeight > 4.5) objs.shieldHeight = 4.5;
            } else {
                objs.shieldHeight -= dt * 10;
                if (objs.shieldHeight < 0) {
                    objs.shieldHeight = 0;
                    objs.disableShield = false;
                    objs.shield.enabled = false;
                }
            }
            //console.log(objs.shieldHit.z);
            objs.shieldHit.z -= dt * 10;
            if (objs.shieldHit.z < 0) {
                objs.shieldHit.z = 0;
            }
            objs.shield.model.meshInstances[0].setParameter("height", objs.shieldHeight);
            objs.shield.model.meshInstances[0].setParameter("hit", objs.shieldHit.data);
        }
        
        if (CL_PREDICT && uid == this.id && predictedState) {
            this.setPlayerPhSphere(uid, predictedState, dt);
        } else {
            if (renderPlayerStates[uid]) this.setPlayerPhSphere(uid, renderPlayerStates[uid], dt);
        }
        
        phEngine.setParticleRadius(objs.phCenterOfMass, 
                                   stateHistory[stateHistory.length-1][uid].hpt <= (14 / CL_HP2PARTS) ? PLAYER_WEIGHTRADIUS : PLAYER_WEIGHTRADIUS*3);
        
        pc.batching.updateBatch(objs.batchModelTopLight.batch);
        pc.batching.updateBatch(objs.batchModelLegs.batch);
    }
    
    phEngine.updateVariable(dt);
    
    var temps = this.temporaryPhysics;
    var t = pc.now();
    var temp;
    var i, j;
    
    var slowFactor = 1.0 - dt;
    if (slowFactor < 0) slowFactor = 0;
    
    //var slowFactor2 = 1.0 - dt * 2;
    //if (slowFactor2 < 0) slowFactor2 = 0;
    
    //slowFactor = 0;
    var pid;
    
    for(i=0; i<temps.length; i++) {
        temp = temps[i];
        if (t > temp.endTime - 500) {
            if (!temp.rb.indexed) {
                for(j=temp.rb.rangeStart; j<temp.rb.rangeEnd; j++) {
                    phPos[j*3+1] = pc.math.lerp(0, phPos[j*3+1], (temp.endTime - t)/500);//-= dt * 100;
                    //if (phPos[j*3+1] < 0) phPos[j*3+1] = 0;
                }
            } else {
                for(j=0; j<temp.rb.ids.length; j++) {
                    pid = temp.rb.ids[j];
                    phPos[pid*3+1] = pc.math.lerp(0, phPos[pid*3+1], (temp.endTime - t)/500);//-= dt * 100;
                    //if (phPos[pid*3+1] < 0) phPos[pid*3+1] = 0;
                }
            }
        }
        
        if (t > temp.endTime - 5000) {
            
            slowFactor = (temp.endTime - t) / 5000.0;
            slowFactor = 1.0 - dt * (1.0 - slowFactor * slowFactor) * 2;
            
            if (!temp.rb.indexed) {
                for(j=temp.rb.rangeStart; j<temp.rb.rangeEnd; j++) {
                    phDeltaPos[j*3] *= slowFactor;
                    phDeltaPos[j*3+2] *= slowFactor;
                    if (phDeltaPos[j*3+1] > 0) {
                        phDeltaPos[j*3+1] *= slowFactor;
                    }
                }
            } else {
                for(j=0; j<temp.rb.ids.length; j++) {
                    pid = temp.rb.ids[j];
                    phDeltaPos[pid*3] *= slowFactor;
                    phDeltaPos[pid*3+2] *= slowFactor;
                    if (phDeltaPos[pid*3+1] > 0) {
                        phDeltaPos[pid*3+1] *= slowFactor;
                    }
                }
            }
        }
    }
      
    for(i=0; i<temps.length; i++) {
        temp = temps[i];
        if (t > temp.endTime) {
            
            //console.log("remove temporary physobject");
            
            if (temp.attachL) {
                phEngine.removeLine(temp.attachL);
            }
            if (temp.attachT) {
                phEngine.removeTri(temp.attachT);
            }
            if (!temp.rb.indexed) {
                for(j=temp.rb.rangeStart; j<temp.rb.rangeEnd; j++) {
                    phEngine.removeParticle(j);
                }
                //console.log("remove " + (temp.rb.rangeEnd - temp.rb.rangeStart));
            } else {
                for(j=0; j<temp.rb.ids.length; j++) {
                    phEngine.removeParticle(temp.rb.ids[j]);
                }
                //console.log("remove " + temp.rb.ids.length);
            }
            phEngine.removeRigidBody(temp.rb);
            this.temporaryPhysics.splice(i, 1);
            break;            
        }
    }
    
    if (playerStructs[this.id]) {
        window.DEBUGPARTICLE = playerStructs[this.id].phAttached0;
        window.DEBUGLIST = [];
        window.DEBUGLIST2 = [];
    }
    
};

Client.prototype.playSound = function(obj, maxTimeout, x, y, z) {
    if (!this.supportsAudio) return;
    if (!this.enableAudio) return;
    
    var panner = this.app.systems.sound.context.createPanner();
    panner.panningModel = "equalpower";
    //panner.distanceModel = "linear";
    panner.setOrientation(0,0,1);
    
    var clean = obj.sound.play("fire");
    var reverb = obj.sound.play("fire echo");
    
    clean.setExternalNodes(panner);
    //reverb.setExternalNodes(panner);
    /*var speakers = this.app.systems.sound.context.destination;
    reverb._lastNode.disconnect(speakers);
    reverb._lastNode.connect(panner);
    panner.connect(speakers);
    reverb._lastNode = panner;*/
    
    gameSounds.push(obj);
    gameSounds.push(clean);
    gameSounds.push(reverb);
    gameSounds.push(x);
    gameSounds.push(y);
    gameSounds.push(z);
    gameSounds.push(maxTimeout > 0 ? (pc.now() + maxTimeout) : -1);
};

Client.prototype.stopSound = function(obj) {
    if (!this.supportsAudio) return;
    obj.sound.stop();
    var index = gameSounds.indexOf(obj);
    if (index >= 0) {
        gameSounds.splice(index, 7);
    }
};

Client.prototype.playImpactSound = function(id) {
    var rnd = Math.floor(this.audioImpact.length * Math.random());
    var pos = playerModels[id].position;
    this.playSound(this.audioImpact[rnd], -1, pos.x, pos.y, pos.z);
};

Client.prototype.playImpactSoundPos = function(sounds, x, y, z) {
    var rnd = Math.floor(sounds.length * Math.random());
    this.playSound(sounds[rnd], -1, x, y, z);
};

Client.prototype.playWeaponSoundLeft = function(id) {
    if (playerStructs[id].timeToStopShootSoundL === 0) {
        this.playSound(playerStructs[id].leftWpnMuzzle, 3000);
    }
    playerStructs[id].timeToStopShootSoundL = pc.now() + weaponRate[playerActiveParts[id].left] + 100;
    if (playerActiveParts[id].left === WPN_SHOTGUN || playerActiveParts[id].left === WPN_GRENADE || playerActiveParts[id].left === WPN_ROCKET) {
        playerStructs[id].timeToStopShootSoundL = 0;
    }
};

Client.prototype.playWeaponSoundRight = function(id) {
    if (playerStructs[id].timeToStopShootSoundR === 0) {
        this.playSound(playerStructs[id].rightWpnMuzzle, 3000);
    }
    playerStructs[id].timeToStopShootSoundR = pc.now() + weaponRate[playerActiveParts[id].right] + 100;
    if (playerActiveParts[id].right === WPN_SHOTGUN || playerActiveParts[id].right === WPN_GRENADE || playerActiveParts[id].right === WPN_ROCKET) {
        playerStructs[id].timeToStopShootSoundR = 0;
    }
};

Client.prototype.updateSounds = function(dt) {
    var t = pc.now();
    var st;
    for (var uid in playerStructs) {
        if (!playerStructs.hasOwnProperty(uid)) continue;
        
        st = playerStructs[uid].timeToStopShootSoundL;
        if (st !== 0 && st < t) {
            this.stopSound(playerStructs[uid].leftWpnMuzzle);
            playerStructs[uid].timeToStopShootSoundL = 0;
        }

        st = playerStructs[uid].timeToStopShootSoundR;
        if (st !== 0 && st < t) {
            this.stopSound(playerStructs[uid].rightWpnMuzzle);
            playerStructs[uid].timeToStopShootSoundR = 0;
        }
    }
    
    var i;
    var checkForFinish = true;
    while(checkForFinish) {
        checkForFinish = false;
        for(i=0; i<gameSounds.length; i += 7) {
            if (!gameSounds[i].sound) {
                console.log("No sound in " + gameSounds[i].name);
                gameSounds.splice(i, 7);
                checkForFinish = true;
                break;
            }
            if ((!gameSounds[i].sound.slots.fire.isPlaying) || (gameSounds[i + 6] > 0 && t > gameSounds[i + 6])) {
                gameSounds.splice(i, 7);
                checkForFinish = true;
                break;
            }
        }
    }
    
    var x, y, vx, vy, volume, panX, panZ, len;
    var device = this.app.graphicsDevice;
    var width = device.width;
    var height = device.height;
    var dbg;
    for(i=0; i<gameSounds.length; i += 7) {
        if (gameSounds[i + 3] === undefined) {
            this.cam.camera.worldToScreen(gameSounds[i].getPosition(), this.direction2);
        } else {
            this.direction.set(gameSounds[i + 3], gameSounds[i + 4], gameSounds[i + 5]);
            this.cam.camera.worldToScreen(this.direction, this.direction2);
        }
        if (isNaN(this.direction2.x)) {
            console.log("worldToScreen -> NaN");
            continue;
        }
        x = this.direction2.x / width;
        y = this.direction2.y / height;
        
        vx = 1 - Math.abs(x * 2 - 1);
        vy = 1 - Math.abs(y * 2 - 1);
        vx = pc.math.clamp(vx, 0, 1);
        vy = pc.math.clamp(vy, 0, 1);
        volume = (vx*vx + vy*vy);
        panX = x * 2 - 1;
        panZ = 0;//y * 2 - 1;
        panZ += Math.abs(panX * 3);
        len = Math.sqrt(panX*panX + panZ*panZ);
        if (len) len = 1.0 / len;
        panX *= len;
        panZ *= len;
        //panZ += y * 2 - 1;
        //panZ += Math.sin(Math.acos(panX)) * 0.5;
        dbg = volume * gameSounds[i].sound.slots.fire.volume * gameSounds[i].sound.volume;
        gameSounds[i + 1].volume = dbg;
        gameSounds[i + 1]._lastNode.setPosition(panX,0,panZ);
        
        vx = x - 0.5;
        vy = y - 0.5;
        volume = 1.0 / ((vx*vx + vy*vy) + 1);
        gameSounds[i + 2].volume = volume * gameSounds[i].sound.slots["fire echo"].volume * gameSounds[i].sound.volume;
        //gameSounds[i + 2]._lastNode.setPosition(panX,0,panZ);
    }
};

Client.prototype.collidePlayerScene = function(pstate) {
    this.sphere.center.set(pstate.x, PLAYER_Y, pstate.z);
    this.sphere.radius = PLAYER_Y;
    if (colModels.level.pushSphereOut(this.sphere)) {
        pstate.x = this.sphere.center.x;
        pstate.z = this.sphere.center.z;
    }
};

Client.prototype.interpolateBone = function(obj, anim, frame, nextFrame, lerp, idle) {
    var idleFrame = nextFrame + 4;
    var rot = obj.getLocalRotation();
    
    //lerp = (1.0 - Math.cos(lerp * Math.PI)) * 0.5;
    //lerp = lerp * lerp * (3 - 2 * lerp);
    
    rot.slerp(anim[frame], anim[nextFrame], lerp);
    rot.slerp(rot, anim[idleFrame], idle);
    obj.setLocalRotation(rot);
};

Client.prototype.interpolateBoneFromAnim = function(obj, anim, frame, nextFrame, lerp, idle, idleAnim) {
    var rot = obj.getLocalRotation();
    rot.slerp(anim[frame], anim[nextFrame], lerp);
    rot.slerp(rot, idleAnim, idle);
    obj.setLocalRotation(rot);
};

Client.prototype.interpolateBoneFromAnimWithPosition = function(obj, anim, animPos, frame, nextFrame, lerp, idle, idleAnim, idleAnimPos) {
    var rot = obj.getLocalRotation();
    rot.slerp(anim[frame], anim[nextFrame], lerp);
    rot.slerp(rot, idleAnim, idle);
    obj.setLocalRotation(rot);
    
    var pos = obj.getLocalPosition();
    pos.lerp(animPos[frame], animPos[nextFrame], lerp);
    pos.lerp(pos, idleAnimPos, idle);
    obj.setLocalPosition(pos);
};

Client.prototype.interpolateBoneRoma = function(obj, anim, frame, nextFrame, lerp, idle) {
    var idleFrame = 0;
    var rot = obj.getLocalRotation();
    rot.slerp(anim[frame], anim[nextFrame], lerp);
    rot.slerp(rot, anim[idleFrame], idle);
    obj.setLocalRotation(rot);
};

Client.prototype.controlFoot = function(foot, localPos, idle) {
    foot.setLocalPosition(localPos);
    if (!idle) return;
    pos = foot.getPosition();
    pos.y = 0.1;
    foot.setPosition(pos);
};

Client.prototype.legIk = function(foot, loleg, upleg, parent) {
    var a = this.triA;
    var b = this.triB;
    var c = this.triC;
    var matrix = parent.getWorldTransform();
    matrix.transformPoint(foot.getPosition(), a);
    matrix.transformPoint(loleg.getPosition(), b); // can just take local?
    matrix.transformPoint(upleg.getPosition(), c);
    // 2D triangle in ZY
    
};

Client.prototype.setPlayerPhSphere = function(id, pstate, dt) {
    if (playerActiveParts[id].body & PART_SHIELDON) {
        phEngine.setParticlePos(playerPhId[id], pstate.x, playerStructs[id].shield.getPosition().y, pstate.z);
    } else {
        phEngine.setParticlePos(playerPhId[id], pstate.x, PLAYER_Y - 0.5, pstate.z);
    }

    var objs = playerStructs[id];
    phEngine.setParticlePos(objs.phCenterOfMass, pstate.x, PLAYER_Y + PLAYER_TOPHEIGHT, pstate.z);
    //phAccel[objs.phAttached0 * 3 + 1] = -60 * phDelta * phDelta;
    objs.phAttached0Damp.targetPos.set(pstate.x, PLAYER_Y + PLAYER_TOPHEIGHT - PLAYER_WEIGHTRADIUS*2, pstate.z);

    phEngine.wakeUp(objs.phAttached0);
    
    var pbody = (playerActiveParts[id] & PART_TOPHEAVY) ? objs.topHeavy : objs.topLight;
    if (!pbody) return;
    this.direction.copy(pbody.getPosition());
    this.direction.add(playerModels[id].forward); // Z
    phEngine.getParticlePos(objs.phAttached0, this.direction2);
    //this.direction3.set(pstate.x, PLAYER_Y + PLAYER_TOPHEIGHT, pstate.z);
    phEngine.getParticlePos(objs.phCenterOfMass, this.direction3);
    this.direction2.sub(this.direction3).normalize().scale(-1); // Y
    
        // also find walking tilt and add to Y
        this.tmpPos1.copy(objs.lFoot.getPosition()).sub(objs.rFoot.getPosition()).normalize();
        this.tmpPos2.cross(this.tmpPos1, pc.Vec3.UP);
        var walkTiltWeight = 0.3;
        this.tmpPos2.cross(this.tmpPos1, this.tmpPos2).scale(walkTiltWeight);
        this.direction2.scale(1.0 - walkTiltWeight).add(this.tmpPos2).normalize();
    
    this.direction2.lerp(pbody.up, this.direction2, dt * 2);//4);
    this.localPos.copy(this.direction2);
    
    this.direction3.cross(playerModels[id].forward, this.direction2); // X
    this.direction3.cross(this.direction3, this.direction2).scale(-1); // new Z
    this.direction3.add(pbody.getPosition());
    pbody.lookAt(this.direction3, this.direction2);
    
    
    var plegs = (playerActiveParts[id].body & PART_LEGS) ? playerStructs[id].legs : playerStructs[id].tracks;
    if (plegs) {
        var rot;
        if (playerMoveDir[id].x !== 0 || playerMoveDir[id].z !== 0) {
            
            this.direction.copy(plegs.getPosition());
            this.direction.y = 0;
            this.direction.sub(playerMoveDir[id]); // Z
            this.tmpQuat.copy(plegs.getRotation());
            
            if (playerActiveParts[id].body & PART_LEGS) {
                var idle = 1.0 - objs.accel;
                this.direction2.lerp(this.direction2, pc.Vec3.UP, idle*idle);
                
                this.midPoint.copy(plegs.getPosition());

                this.direction3.cross(playerMoveDir[id], this.direction2); // X
                this.direction3.cross(this.direction3, this.direction2).scale(1); // new Z
                this.direction3.add(plegs.getPosition());

                    this.direction2.lerp(this.direction2, pc.Vec3.UP, idle);
                
                if (objs.rLoLeg2) {
                    this.direction3.y = plegs.getPosition().y;
                    plegs.lookAt(this.direction3);
                } else {
                    plegs.lookAt(this.direction3, this.direction2);
                }

                this.direction.set(pstate.x, PLAYER_Y + PLAYER_TOPHEIGHT, pstate.z); // center of mass
                this.direction2.scale(2);
                this.direction.sub(this.direction2);

                if (objs.rLoLeg2) {
                    rot = plegs.getRotation();
                    rot.slerp(this.tmpQuat, rot, dt * ANIM_TURNSPEED);
                    plegs.setRotation(rot);
                    
                } else {
                    rot = plegs.getRotation();
                    rot.slerp(this.tmpQuat, rot, dt * ANIM_TURNSPEED);
                    plegs.setRotation(rot);
                    this.midPoint.lerp(this.midPoint, this.direction, dt * ANIM_TURNSPEED);
                    plegs.setPosition(this.midPoint); 
                }
                
                var dist = playerMoveDist[id];
                
                //idle = 0;
                
                /*if (objs.rLoLeg2) {
                    // Roma mode
                    var frameDist = 1.25 * 2.5;
                    var lerp = (dist / frameDist) - Math.floor(dist / frameDist);
                    var frame = Math.floor(dist / frameDist) % 2;
                    var nextFrame = (frame + 1) % 2;
                    frame++;
                    nextFrame++;
                    
                    this.interpolateBoneRoma(objs.rUpLeg, objs.rUpLegAnim, frame, nextFrame, lerp, idle);
                    this.interpolateBoneRoma(objs.lUpLeg, objs.lUpLegAnim, frame, nextFrame, lerp, idle);

                    this.interpolateBoneRoma(objs.rLoLeg, objs.rLoLegAnim, frame, nextFrame, lerp, idle);
                    this.interpolateBoneRoma(objs.lLoLeg, objs.lLoLegAnim, frame, nextFrame, lerp, idle);
                    
                        this.interpolateBoneRoma(objs.rLoLeg2, objs.rLoLegAnim2, frame, nextFrame, lerp, idle);
                        this.interpolateBoneRoma(objs.lLoLeg2, objs.lLoLegAnim2, frame, nextFrame, lerp, idle);

                    this.interpolateBoneRoma(objs.rFoot, objs.rFootAnim, frame, nextFrame, lerp, idle);
                    this.interpolateBoneRoma(objs.lFoot, objs.lFootAnim, frame, nextFrame, lerp, idle);
                    
                } else {*/
                
                    
                    /*var frameDist = 1.25;
                    if (objs.rLoLeg2) {
                        frameDist = 1.8;
                    }
                    var lerp = (dist / frameDist) - Math.floor(dist / frameDist);
                    var frame = Math.floor(dist / frameDist) % 4;
                    var nextFrame = (frame + 1) % 4;
                    frame++;
                    nextFrame++;
                    
                    this.interpolateBone(objs.rUpLeg, objs.rUpLegAnim, frame, nextFrame, lerp, idle);
                    this.interpolateBone(objs.lUpLeg, objs.lUpLegAnim, frame, nextFrame, lerp, idle);

                    this.interpolateBone(objs.rLoLeg, objs.rLoLegAnim, frame, nextFrame, lerp, idle);
                    this.interpolateBone(objs.lLoLeg, objs.lLoLegAnim, frame, nextFrame, lerp, idle);
                
                    if (objs.rLoLeg2) {
                        this.interpolateBone(objs.center, objs.centerAnim, frame, nextFrame, lerp, idle);
                        this.interpolateBone(objs.rLoLeg2, objs.rLoLegAnim2, frame, nextFrame, lerp, idle);
                        this.interpolateBone(objs.lLoLeg2, objs.lLoLegAnim2, frame, nextFrame, lerp, idle);
                    }

                    this.interpolateBone(objs.rFoot, objs.rFootAnim, frame, nextFrame, lerp, idle);
                    this.interpolateBone(objs.lFoot, objs.lFootAnim, frame, nextFrame, lerp, idle);*/
                    
                var frameDist = 1;
                var anim = this.animRun;
                var numFrames = anim.numFrames;
                var lerp = (dist / frameDist) - Math.floor(dist / frameDist);
                var frame = Math.floor(dist / frameDist) % numFrames;
                var nextFrame = (frame + 1) % numFrames;
                
                this.interpolateBoneFromAnimWithPosition(objs.rootBone, anim.root, anim.rootPos, frame, nextFrame, lerp, idle, objs.rootBoneDefault, objs.rootBoneDefaultPos);
                this.interpolateBoneFromAnim(objs.centerBone, anim.center, frame, nextFrame, lerp, idle, objs.centerBoneDefault);
                this.interpolateBoneFromAnim(objs.rUpLegBone, anim.rUpLeg, frame, nextFrame, lerp, idle, objs.rUpLegBoneDefault);
                this.interpolateBoneFromAnim(objs.lUpLegBone, anim.lUpLeg, frame, nextFrame, lerp, idle, objs.lUpLegBoneDefault);
                this.interpolateBoneFromAnim(objs.rLoLegBone, anim.rLoLeg, frame, nextFrame, lerp, idle, objs.rLoLegBoneDefault);
                this.interpolateBoneFromAnim(objs.lLoLegBone, anim.lLoLeg, frame, nextFrame, lerp, idle, objs.lLoLegBoneDefault);
                this.interpolateBoneFromAnim(objs.rLoLeg2Bone, anim.rLo2Leg, frame, nextFrame, lerp, idle, objs.rLoLeg2BoneDefault);
                this.interpolateBoneFromAnim(objs.lLoLeg2Bone, anim.lLo2Leg, frame, nextFrame, lerp, idle, objs.lLoLeg2BoneDefault);
                this.interpolateBoneFromAnim(objs.rFootBone, anim.rFoot, frame, nextFrame, lerp, idle, objs.rFootBoneDefault);
                this.interpolateBoneFromAnim(objs.lFootBone, anim.lFoot, frame, nextFrame, lerp, idle, objs.lFootBoneDefault);
                
                var pos = pbody.getLocalPosition();
                pos.copy(objs.rootBone.getLocalPosition()).sub(objs.rootBoneOrigPos).scale(0.025);
                rot = plegs.getRotation();//playerModels[id].getLocalRotation();
                rot.transformVector(pos, pos);
                this.tmpQuat.copy(playerModels[id].getLocalRotation()).invert();
                this.tmpQuat.transformVector(pos, pos);
                pos.y += PLAYER_TOPHEIGHT;
                pbody.setLocalPosition(pos);
                
                var loopsElapsed = Math.floor(dist / (frameDist*numFrames));
                var framesElapsed = Math.floor(dist / frameDist);
                if (objs.timeForStepSound < framesElapsed) {
                    pos = playerModels[id].position;
                    this.playSound(plegs, -1);
                    objs.timeForStepSound = framesElapsed + numFrames/2;
                }
                
                //}
                
                                
                /*var height = ((frame - 1) % 2) ? 1 : 0;
                var nextHeight = 1 - height;
                //var height = frame <= 1 ? 1 : 0;
                //var nextHeight = nextFrame <= 1 ? 1 : 0;
                var heightMult = 0.25;
                //var lerpCos = (1.0 - Math.cos(lerp * Math.PI)) * 0.5;
                var lerpCos = lerp;//lerp * lerp * (3 - 2 * lerp);
                
                var pos = pbody.getPosition();
                pbody.setPosition(pos.x, PLAYER_Y + PLAYER_TOPHEIGHT + pc.math.lerp(height, nextHeight, lerpCos)*heightMult, pos.z);
                
                pos = plegs.getPosition();
                plegs.setPosition(pos.x, PLAYER_Y + PLAYER_LEGHEIGHT + pc.math.lerp(height, nextHeight, lerpCos)*heightMult, pos.z);*/
                
                
                
            } else {
                
                plegs.lookAt(this.direction);
                rot = plegs.getRotation();
                rot.slerp(this.tmpQuat, rot, dt * ANIM_TURNSPEED);
                plegs.setRotation(rot);
            }

        } else {
            plegs.setRotation(pc.Quat.IDENTITY);
        }
    }
    
    return;
    
    if (!objs.legs) return;
    
    /*if (pc.now() > objs.timeToBalance) {
        objs.phConstraintR0.lock = true;
        objs.phConstraintR1.lock = true;
        objs.phConstraintL0.lock = true;
        objs.phConstraintL1.lock = true;
        
        phEngine.getParticleVelocity(objs.phBody0, this.velocity);
        this.velocity.x *= -1;
        this.velocity.z *= -1;
        phEngine.setParticleVelocity(objs.phBody0, this.velocity);

        phEngine.getParticleVelocity(objs.phBody1, this.velocity);
        this.velocity.x *= -1;
        this.velocity.z *= -1;
        phEngine.setParticleVelocity(objs.phBody1, this.velocity);
        this.velocity.y = 0;
    }*/
    
    /*var t = pc.now();
    if (t > objs.timeToStep) {
        var fwd = objs.legs.forward;
        phEngine.addParticleImpulse(objs.stepLeg ? objs.phRLoLeg : objs.phLLoLeg, fwd.x*-0.1, 0.1, fwd.z*-0.1);
        phEngine.addParticleImpulse(objs.stepLeg ? objs.phRFoot : objs.phLFoot, fwd.x*-0.1, 0.1, fwd.z*-0.1);
        
        phEngine.addParticleImpulse(objs.stepLeg ? objs.phLFoot : objs.phRFoot, fwd.x*0.1, -0.1, fwd.z*0.1);
        //phEngine.addParticleImpulse(objs.stepLeg ? objs.phLFoot : objs.phRFoot, 0, -0.1, 0);
        objs.timeToStep = t + 250;
        objs.stepLeg = !objs.stepLeg;
    }*/
    
    // Right
    var pos = objs.rUpLeg.getPosition();
    phEngine.setParticlePos(objs.phRUpLeg, pos.x, pos.y, pos.z);
    this.tmpMatrix.copy(objs.legs.getWorldTransform());
    this.tmpMatrix.data[12] = pos.x;
    this.tmpMatrix.data[13] = pos.y;
    this.tmpMatrix.data[14] = pos.z;
    objs.phConstraintR0.setMatrix(this.tmpMatrix);
    //objs.rUpLegLine.up.copy(objs.legs.right);
    
    pos = playerStructs[id].rLoLeg.getPosition();
        if (objs.accel === 1) phEngine.setParticlePos(objs.phRLoLeg, pos.x, pos.y, pos.z);
    this.tmpMatrix.data[12] = pos.x;
    this.tmpMatrix.data[13] = pos.y;
    this.tmpMatrix.data[14] = pos.z;
    playerStructs[id].phConstraintR1.setMatrix(this.tmpMatrix);
    //objs.rLoLegLine.up.copy(objs.legs.right);
    
    pos = objs.rFoot.getPosition();
        if (objs.accel === 1) {
            phEngine.setParticlePos(objs.phRFoot, pos.x, pos.y, pos.z);
        } else {
            phEngine.setParticlePos(objs.phRFoot, pos.x, PLAYER_LEGBONERADIUS, pos.z);
        }
    /*var rpos = pos;
    phEngine.getParticlePos(objs.phRFoot, pos);
    objs.rFoot.setPosition(pos);*/
    
    // Left
    pos = playerStructs[id].lUpLeg.getPosition();
    phEngine.setParticlePos(playerStructs[id].phLUpLeg, pos.x, pos.y, pos.z);
    this.tmpMatrix.data[12] = pos.x;
    this.tmpMatrix.data[13] = pos.y;
    this.tmpMatrix.data[14] = pos.z;
    playerStructs[id].phConstraintL0.setMatrix(this.tmpMatrix);

    pos = playerStructs[id].lLoLeg.getPosition();
        if (objs.accel === 1) phEngine.setParticlePos(objs.phLLoLeg, pos.x, pos.y, pos.z);
    this.tmpMatrix.data[12] = pos.x;
    this.tmpMatrix.data[13] = pos.y;
    this.tmpMatrix.data[14] = pos.z;
    playerStructs[id].phConstraintL1.setMatrix(this.tmpMatrix);
    //objs.lLoLegLine.up.copy(objs.legs.right);
    
    pos = objs.lFoot.getPosition();
        if (objs.accel === 1) {
            phEngine.setParticlePos(objs.phLFoot, pos.x, pos.y, pos.z);
        } else {
            phEngine.setParticlePos(objs.phLFoot, pos.x, PLAYER_LEGBONERADIUS, pos.z);
        }
    /*var lpos = pos;
    phEngine.getParticlePos(objs.phLFoot, pos);
    objs.lFoot.setPosition(pos);*/
    
    //var pbody = (playerActiveParts[id] & PART_TOPHEAVY) ? objs.topHeavy : objs.topLight;
    //var mx = (lpos.x + rpos.x) * 0.5;
    //var mz = (lpos.z + rpos.z) * 0.5;
    //pbody.setPosition(mx, PLAYER_Y + PLAYER_TOPHEIGHT, mz);
};

Client.prototype.destroyTop = function(id) {
    var objs = playerStructs[id];
    if (!objs.leftWpn && !objs.rightWpn && (!objs.topLight || !objs.topHeavy)) return;
    
    if (objs.leftWpn) this.makePhys(objs.leftWpn, true);
    if (objs.rightWpn) this.makePhys(objs.rightWpn, true);
    objs.leftWpn = null;
    objs.rightWpn = null;
    objs.leftWpnId = 0;
    objs.rightWpnId = 0;

    var pbody = (playerActiveParts[id].body & PART_TOPHEAVY) ? objs.topHeavy : objs.topLight;
    if (pbody === null) return;
    if (pbody.children.length === 0) return;
    var parent = pbody.children[0];//findByName("Object").parent;
    var details = [];
    var k;
    for(k=0; k<parent.children.length; k++) {
        details.push(parent.children[k]);
    }
    for(k=0; k<details.length; k++) {
        this.makePhys(details[k], true);
    }
    
    if (objs.topLight.parent) {
        objs.topLight.parent.removeChild(objs.topLight);
    }
    this.app.root.addChild(objs.topLight);
    
    if (objs.topHeavy.parent) {
        objs.topHeavy.parent.removeChild(objs.topHeavy);
    }
    this.app.root.addChild(objs.topHeavy);
    
    objs.topLight = null;
    objs.topHeavy = null;
    
    var pos = playerModels[id].position;
    this.playSound(this.audioCrash, -1, pos.x, pos.y, pos.z);
};

Client.prototype.breakTopPart = function(id) {
    var objs = playerStructs[id];
    if (!objs.leftWpn && !objs.rightWpn && (!objs.topLight || !objs.topHeavy)) return;
    
    var pbody = (playerActiveParts[id].body & PART_TOPHEAVY) ? objs.topHeavy : objs.topLight;
    if (pbody === null) return;
    if (pbody.children.length === 0) return;
    var parent = pbody.children[0];//findByName("Object").parent;
    var details = [];
    var k;
    var name;
    for(k=0; k<parent.children.length; k++) {
        name = parent.children[k].name;
        if (name === "CAGE" || name === "LARM" || name === "RARM" || name === "INNER") continue;
        details.push(parent.children[k]);
    }
    if (details.length === 0) {
        for(k=0; k<parent.children.length; k++) {
            name = parent.children[k].name;
            if (name === "CAGE" || name === "LARM" || name === "RARM") continue;
            details.push(parent.children[k]);
        }
    }
    /*if (details.length === 0) {
        for(k=0; k<parent.children.length; k++) {
            name = parent.children[k].name;
            if (name === "CAGE") continue;
            details.push(parent.children[k]);
        }
    }*/
    if (details.length === 0) {
        return;
    }
    k = Math.floor(Math.random() * details.length);
    if (k === details.length) k--;
    /*if (details[k].name === "LARM") {
        if (objs.leftWpn) {
            if (playerStructs[id].lefttWpnMuzzle) this.stopSound(playerStructs[id].leftWpnMuzzle);
            this.makePhys(objs.leftWpn, true);
            objs.leftWpn = null;
            objs.leftWpnId = 0;
        }
    } else if (details[k].name === "RARM") {
        if (objs.rightWpn) {
            if (playerStructs[id].rightWpnMuzzle) this.stopSound(playerStructs[id].rightWpnMuzzle);
            this.makePhys(objs.rightWpn, true);
            objs.rightWpn = null;
            objs.rightWpnId = 0;
        }
    }*/
    this.makePhys(details[k], true);
    
    this.playImpactSound(id);
};

Client.prototype.collectBottomDetails = function(parent, details) {
    var name;
    for(var k=0; k<parent.children.length; k++) {
        if (parent.children[k].children.length > 0) {
            this.collectBottomDetails(parent.children[k], details);
        }
        name = parent.children[k].name;
        //if (name.indexOf("R_UP_LEG") >= 0 || name.indexOf("R_LO_LEG") >= 0) continue;
        //if (name.indexOf("L_UP_LEG") >= 0 || name.indexOf("L_LO_LEG") >= 0) continue;
        //if (name.indexOf("#") >= 0 || name.indexOf("SPH") >= 0) continue;
        if (name.indexOf("DET") !== 0) continue;
        details.push(parent.children[k]);
    }
};

Client.prototype.breakBottomPart = function(id) {
    var objs = playerStructs[id];
    if ((playerActiveParts[id].body & PART_LEGS) === 0) return;
    
    var pbody = objs.legs;
    if (pbody === null) return;
    if (pbody.children.length === 0) return;
    var parent = pbody;//.children[0];//findByName("Object").parent;
    var details = [];
    var k;
    this.collectBottomDetails(parent, details);
    //console.log(details);
    if (details.length === 0) return;
    k = Math.floor(Math.random() * details.length);
    if (k === details.length) k--;
    this.makePhys(details[k], true);
    
    this.playImpactSound(id);
};

Client.prototype.destroyBottom = function(id) {
    var objs = playerStructs[id];
    var pbody;
    if (!objs.legs && !objs.tracks) {
        /*pbody = (playerActiveParts[id].body & PART_TOPHEAVY) ? objs.topHeavy : objs.topLight;
        if (!pbody) return;
        var pos = pbody.getLocalPosition();
        pos.y = blendTo(pos.y, 0, 5);
        pbody.setLocalPosition(pos);*/
        
        return;
    }
    
    if (objs.tracks && playerActiveParts[id].body & PART_TRACKS) {
        var pos = objs.tracks.getPosition();
        var rot = objs.tracks.getRotation();
        
        if (objs.tracks.parent) {
            objs.tracks.parent.removeChild(objs.tracks);
        }
        this.app.root.addChild(objs.tracks);
        
        objs.tracks.setPosition(pos);
        objs.tracks.setRotation(rot);
        
        objs.tracks = null;
    }
    
    if ((playerActiveParts[id].body & PART_LEGS) === 0) return;
    
    pbody = objs.legs;
    if (pbody === null) return;
    if (pbody.children.length === 0) return;
    
    //var parent = pbody.findByName("CENTER");//children[0];//findByName("Object").parent;
    //var details = [];
    //var k;
    //for(k=0; k<parent.children.length; k++) {
        //details.push(parent.children[k]);
    //}
    //for(k=0; k<details.length; k++) {
        //this.makePhys(details[k], true);
    //}

    this.makePhys(objs.rFoot, true);
    this.makePhys(objs.rLoLeg2, true);
    this.makePhys(objs.rLoLeg, true);
    this.makePhys(objs.rUpLeg, true);
    
    this.makePhys(objs.lFoot, true);
    this.makePhys(objs.lLoLeg2, true);
    this.makePhys(objs.lLoLeg, true);
    this.makePhys(objs.lUpLeg, true);
    
    this.makePhys(objs.center, true);
    
    if (objs.legs.parent) {
        objs.legs.parent.removeChild(objs.legs);
    }
    this.app.root.addChild(objs.legs);
    
    objs.legs = null;
};

/*Client.prototype.makeStep = function(id) {
    var objs = playerStructs[id];
    objs.phConstraintR0.lock = false;
    objs.phConstraintR1.lock = false;
    objs.phConstraintL1.lock = false;
    phEngine.addParticleImpulse(objs.phRFoot, 0, 0.1, 0.1);
    //phEngine.addParticleImpulse(objs.phLFoot, 0, -0.1, -0.1);
    phEngine.addParticleImpulse(objs.phBody0, 0, 0.5, 0.5);
    phEngine.addParticleImpulse(objs.phBody1, 0, 0.5, 0);
    objs.timeToBalance = pc.now() + 500;
};

Client.prototype.makeStep2 = function(id) {
    var objs = playerStructs[id];
    objs.phConstraintL0.lock = false;
    objs.phConstraintL1.lock = false;
    //objs.phConstraintL1.lock = false;
    phEngine.addParticleImpulse(objs.phLFoot, 0, 0.1, 0.1);
    //phEngine.addParticleImpulse(objs.phLFoot, 0, -0.1, -0.1);
    phEngine.addParticleImpulse(objs.phBody1, 0, 0, 0.1);
    objs.timeToBalance = pc.now() + 500;
};*/

Client.prototype.deleteMeshInstancesByNode = function(node) {
    var i;
    var meshes = this.app.scene.drawCalls;
    var loop = true;
    
    var mnode;
    
    while(loop) {
        loop = false;
        for(i=0; i<meshes.length; i++) {
            if (!meshes[i].node) continue;
            mnode = meshes[i].node;
            while(mnode !== node && mnode) {
                mnode = mnode.parent;
            }
            if (mnode === node) {
                meshes.splice(i, 1);
                loop = true;
                break;
            }
        }
    }
    
    loop = true;
    meshes = this.app.scene.shadowCasters;
    
    while(loop) {
        loop = false;
        for(i=0; i<meshes.length; i++) {
            if (!meshes[i].node) continue;
            mnode = meshes[i].node;
            while(mnode !== node && mnode) {
                mnode = mnode.parent;
            }
            if (mnode === node) {
                meshes.splice(i, 1);
                loop = true;
                break;
            }
        }
    }
};

Client.prototype.flushLevel = function() {
    pc.decals.clearGroup(this.decalGroupBulletHole);
    pc.decals.clearGroup(this.decalGroupBulletHole2);
    pc.decals.clearGroup(this.decalGroupExplosion);
    
    this.clearBulletShells();
    
    var i;
    for(i=0; i<roboDebris.length; i++) {
        this.app.scene.removeModel(roboDebris[i]);
    }

    for(i=0; i<this.debris.length; i++) {
        this.deleteMeshInstancesByNode(this.debris[i]);
        this.app.root.removeChild(this.debris[i]);
    }
    this.debris.length = 0;
};

// update code called every frame
Client.prototype.update = function(dt) {

    if (this.splash) {
        this.splashOpacity -= dt * 2;
        if (this.splashOpacity < 0) {
            this.splash.parentElement.removeChild(this.splash);
            this.splash = null;
        } else {
            this.splash.style.opacity = this.splashOpacity;
        }
    }
    
    // Clear old history
    var localTime = pc.now();
    var time = this.lastUpdateServerTime + (localTime - this.lastUpdateClientTime); // count on client from the last server time
    var earliestNeededTime = (time - CL_LERPTIME) - SV_SENDRATE;
    //while(historyTimestamp.length > 0 && historyTimestamp[0] < earliestNeededTime) {
    while(historyTimestamp.length > 1 && historyTimestamp[0] < earliestNeededTime) { // store at least one
        stateHistory.shift();
        historyTimestamp.shift();
        projStateHistory.shift();
    }

    // Generate interpolated state
    var renderableTime = time - CL_LERPTIME;
    var historyA;
    var historyB = -1;
    var uid;
    for(var i=0; i<historyTimestamp.length; i++) {
        if (historyTimestamp[i] > renderableTime) {
            historyB = i;
            break;
        }
    }
    if (historyB > 0) {
        historyA = historyB - 1;
        var timeB = historyTimestamp[historyB];
        var timeA = historyTimestamp[historyA];
        var lerpFactor = (renderableTime - timeA) / (timeB - timeA);
        
        // Interpolate players
        renderPlayerStates = {};
        var prevStates = stateHistory[historyA];
        var nextStates = stateHistory[historyB];
        var playaA, playaB;
        for(uid in nextStates) {
            if (!nextStates.hasOwnProperty(uid)) continue;
            playaA = prevStates[uid];
            playaB = nextStates[uid];
            if (!playaA || !playaB) continue;
            renderPlayerStates[uid] = {};
            this.lerpState(renderPlayerStates[uid], playaA, playaB, lerpFactor);
        }
        
        // Interpolate projectiles
        renderProjStates = {};
        prevStates = projStateHistory[historyA];
        nextStates = projStateHistory[historyB];
        for(uid in nextStates) {
            if (!nextStates.hasOwnProperty(uid)) continue;
            playaA = prevStates[uid];
            playaB = nextStates[uid];
            if (!playaA || !playaB) continue;
            renderProjStates[uid] = {};
            this.lerpProjState(renderProjStates[uid], playaA, playaB, lerpFactor);
        }
        
    } else if (historyB < 0) {
        // use last
        renderPlayerStates = stateHistory[stateHistory.length - 1];
        renderProjStates = projStateHistory[projStateHistory.length - 1];
    } else { // === 0
        // use first
        renderPlayerStates = stateHistory[0];
        renderProjStates = projStateHistory[0];
    }
    
    if (!renderPlayerStates) {
        return;
    }
    
    // Apply state
    var playa, pstate, rot;
    var justAdded = false;
    var moved = false;
    var angle = 0;
    var len = 0;
    for (uid in renderPlayerStates) {
        if (!renderPlayerStates.hasOwnProperty(uid)) continue;

        // Join new players
        justAdded = false;
        if (!playerModels[uid]) {
            if (!stateHistory[stateHistory.length - 1][uid]) continue;
            if (!playerActiveParts[uid]) continue;
            this.addPlayer(uid);
            justAdded = true;
        }

        playa = playerModels[uid];
        pstate = renderPlayerStates[uid];
        
        if (uid != this.id || !CL_PREDICT || !predictedState) {
            // Position other players
            playa.setLocalPosition(pstate.x, PLAYER_Y, pstate.z);
            rot = playa.getLocalRotation();
            rot.y = pstate.ry;
            rot.w = pstate.rw;
            playa.setLocalRotation(rot);
            //this.setPlayerPhSphere(uid, pstate);
        } else {
            // correct current player's position
            pstate = stateHistory[stateHistory.length - 1][uid];
            if (justAdded) {
                predictedState.x = pstate.x;
                predictedState.z = pstate.z;
                predictedState.ry = pstate.ry;
                predictedState.rw = pstate.rw;
                predictedState.hpt = pstate.hpt;
                predictedState.hpb = pstate.hpb;
                predictedState.hpl = pstate.hpl;
                predictedState.hpr = pstate.hpr;
            } else {
                if (this.timeToEndCorrectPrediction > 0) {
                    if (localTime < this.timeToEndCorrectPrediction) {
                        this.smoothCorrectState(predictedState, pstate);
                    } else {
                        this.timeToEndCorrectPrediction = 0;
                        predictedState.x = pstate.x;
                        predictedState.z = pstate.z;
                        predictedState.ry = pstate.ry;
                        predictedState.rw = pstate.rw;
                    }
                }
            }
        }
        
        playerVelocity[uid].copy(playerStructs[uid].prevPos).sub(playa.getLocalPosition());
        playerVelocitySmooth[uid].lerp(playerVelocitySmooth[uid], playerVelocity[uid], dt*10);
        //console.log(playerVelocity[uid].data);
        len = playerVelocity[uid].length();
        playerVelocity[uid].scale((1.0 / dt) * phDelta);
        playerMoveDist[uid] += len;
        playerStructs[uid].prevPos.copy(playa.getLocalPosition());
        playerStructs[uid].prevAccel = playerStructs[uid].accel;
        playerStructs[uid].accel += len > 0 ? len : (-dt * 4);
        if (playerStructs[uid].accel > 1) playerStructs[uid].accel = 1;
        if (playerStructs[uid].accel < 0) playerStructs[uid].accel = 0;
        
        if (pstate.hpt <= 0) {
            this.killPlayer(uid);
        }
        if (pstate.hpb <= 0) {
            //this.destroyBottom(uid);
            /*if (this.id == uid) {
                if (playerActiveParts[uid]) {
                    playerSpeed = (playerActiveParts[uid].body & PART_LEGS) ? PLAYER_SPEEDLEGS : PLAYER_SPEEDTRACKS;
                    console.log("boost change - hp");
                    if (stateHistory[stateHistory.length-1][uid].hpb <= 0) playerSpeed *= PLAYER_SPEEDSLOWFACTOR;
                    if (playerActiveParts[uid].body & PART_BOOSTON) {
                        playerSpeed *= boostSpeed;
                    }
                }
            }*/
        }
    }
    
    // Remove old projectiles
    for (uid in projModels) {
        if (!projModels.hasOwnProperty(uid)) continue;
        if (!renderProjStates[uid]) {
            this.removeProjectile(uid);
        }
    }
    
    // Position projectiles
    for (uid in renderProjStates) {
        if (!renderProjStates.hasOwnProperty(uid)) continue;
        if (!projModels[uid]) {
            this.addProjectile(uid);
        }
        playa = projModels[uid];
        pstate = renderProjStates[uid];
        
        playa.setLocalPosition(pstate.x, pstate.y, pstate.z);
        if (renderProjStates[uid].type == PROJ_ROCKET) {
            this.direction.set(-pstate.vx, -pstate.vy, -pstate.vz).add(playa.getLocalPosition());
            //console.log(this.direction.data);
            playa.lookAt(this.direction);
            if (isNaN(playa.getRotation().x)) {
                console.log("Rocket " + uid + " is fucked. " + pstate.vx+" "+pstate.vz);
            }
        }
    }
    
    this.updateParticles();
    this.updateTraces();
    this.updateHitSpheres();
    this.updateImpactSpheres(dt);
    this.updateBulletShells(dt);
    this.updateFireworks(dt);
    this.updateExpSpheres(dt);
    this.updateFlameSpheres(dt);
    this.updateStaticFlames(dt);
    
    // Update damage
    for (uid in playerStructs) {
        if (!playerStructs.hasOwnProperty(uid)) continue;
        
        /*this.changeDiffuse(uid, 1, renderPlayerStates[uid].hpt / SV_MAXHEALTHTOP);
        this.changeDiffuse(uid, 0, renderPlayerStates[uid].hpb / SV_MAXHEALTHBOTTOM);
        this.changeDiffuse(uid, 2, renderPlayerStates[uid].hpl / SV_MAXHEALTHWPN);
        this.changeDiffuse(uid, 3, renderPlayerStates[uid].hpr / SV_MAXHEALTHWPN);*/
    }
    
    if (!this.player || (stateHistory[stateHistory.length-1][this.id].hpt <= 0) ||
       (roundEndTime && roundEndTime - this.lastUpdateServerTime < 0) 
    ) {
        this.updateTexts(dt);
        this.updateMotions(dt);
        this.updateSounds(dt);
        this.updateMuzzleFlashes(dt);
        this.updateGrenades(dt);
        return;
    }
    
    this.updateControls(dt);
    
    if (buyMenuMode) {
        this.updateTexts(dt);
        this.updateMotions(dt);
        this.updateSounds(dt);
        this.updateMuzzleFlashes(dt);
        this.updateGrenades(dt);
        return;
    }
    
    // Move camera
    //var targetPos = this.camTarget.getPosition();
    //blendTo3(targetPos, this.player.getLocalPosition(), CAMERA_BLENDFACTOR);
    
    var device = this.app.graphicsDevice;
    var pos = this.camTarget.getLocalPosition();
    if (!startMenuMode && !freeCamera) {
        pos.copy(this.player.getLocalPosition());
        var camMoveOffsetX = 10;//5;
        var camMoveOffsetY = 20;//5;
        var camXoff = ((this.mx / device.width) * 2 - 1) * camMoveOffsetX;
        var camYoff = ((this.my / device.height) * 2 - 1) * -camMoveOffsetY;
        pos.x += this.cam.right.x * camXoff + this.cam.forward.x * camYoff;
        pos.z += this.cam.right.z * camXoff + this.cam.forward.z * camYoff;
        this.camTarget.setPosition(pos);
    }
        
    this.updateTexts(dt);
    this.updateMotions(dt);
    this.updateSounds(dt);
    this.updateMuzzleFlashes(dt);
    this.updateGrenades(dt);
    
    pstate = stateHistory[stateHistory.length - 1][this.id];
    if (debugDesync) {
        playerModels[this.id].findByName("playerServerDebug").setPosition(pstate.x, PLAYER_Y, pstate.z);
        if (predictedState) playerModels[this.id].findByName("playerClientDebug").setPosition(predictedState.x, PLAYER_Y, predictedState.z);
    }
};

Client.prototype.clientSend = function() {
    //console.log(this.framesToSend);
    //this.framesToSend = 0;
    if (!this.player) return;
    if (!predictedState) return;
    if (roundEndTime && roundEndTime - this.lastUpdateServerTime < 0) return;
    
    if (pendingSendPartsBody>=0){// || pendingSendPartsLeft>=0 || pendingSendPartsRight>=0) {
        
        /*var reqMsg = {n:MSG_REQUESTPARTS, parts:{
            body:pendingSendPartsBody >= 0 ? pendingSendPartsBody : playerActiveParts[this.id].body, 
            left:pendingSendPartsLeft >= 0 ? pendingSendPartsLeft : playerActiveParts[this.id].left, 
            right:pendingSendPartsRight >= 0 ? pendingSendPartsRight : playerActiveParts[this.id].right,
            ammo: playerActiveParts[this.id].ammo
        }};
        //console.log("client: request parts");
        //console.log(reqMsg);
        this.socket.send(JSON.stringify(reqMsg));*/
        
        this.commandBinReqParts.setUint8(0, MSG_REQUESTPARTS);
        this.commandBinReqParts.setInt32(1, pendingSendPartsBody, true);
        this.socket.send(this.commandBinReqParts.buffer);
        
        pendingSendPartsBody = -1;
        pendingSendPartsLeft = -1;
        pendingSendPartsRight = -1;
    }
       
    if (CL_PREDICT) {
        this.timeToGetResults = (this.timeToNextWorldUpdate - pc.now()) + SV_SENDRATE;
        predictedStateAtLastSend = new PlayerState();
        
        predictedStateAtLastSend.x = predictedState.x;
        predictedStateAtLastSend.z = predictedState.z;
        predictedStateAtLastSend.ry = predictedState.ry;
        predictedStateAtLastSend.rw = predictedState.rw;
        predictedStateAtLastSend.hpt = predictedState.hpt;
        predictedStateAtLastSend.hpb = predictedState.hpb;
        predictedStateAtLastSend.hpl = predictedState.hpl;
        predictedStateAtLastSend.hpr = predictedState.hpr;
        
        predictedAtSendHistory.push(predictedStateAtLastSend);
        predictedAtSendHistoryTimestamp.push(this.lastUpdateServerTime + (pc.now() - this.lastUpdateClientTime));
    }
    
    this.command.vx = this.vx;
    this.command.vz = this.vz;
    this.vx = 0;
    this.vz = 0;
    if (this.command.ctrl === 0 && !this.rotationChanged && !this.sentNonEmptyInputOnPrevTick) {
        this.sentNonEmptyInputOnPrevTick = false;
        //console.log("what");
        return;
    }
    //this.socket.emit("clmv", this.command);
    
    //if ((this.command.ctrl & CTRL_FIRER) && playerActiveParts[this.id].right && playerStructs[this.id].ammo) {
      //  playerStructs[this.id].ammo--;
    //}    
    
    //this.command.n = MSG_CLIENTMOVE;
    //this.socket.send(JSON.stringify(this.command));
    
    var ctrl = this.command.ctrl;
    if (this.command.ry < 0) ctrl |= CTRL_NEG_ANGLEY;
    if (this.command.rw < 0) ctrl |= CTRL_NEG_ANGLEW;
    if (this.command.vx < 0) ctrl |= CTRL_NEG_VX;
    if (this.command.vz < 0) ctrl |= CTRL_NEG_VZ;
    this.commandBin.setUint8(0, MSG_CLIENTMOVE);
    this.commandBin.setUint16(1, ctrl, true);
    this.commandBin.setUint8(3, Math.abs(this.command.rw) * 0xFF);
    //var invVlen = this.command.vx * this.command.vx + this.command.vz * this.command.vz;
    //if (invVlen !== 0) {
      //  invVlen = 1.0 / Math.sqrt(invVlen);
    //}
    
    // velocity is actually just 8 float values but with high precision; can pack to 1-byte lookup table
    
    //this.commandBin.setUint8(4, Math.abs(this.command.vx) * invVlen * 0xFF);
    //this.commandBin.setUint8(5, Math.abs(this.command.vz) * invVlen * 0xFF);
    //this.commandBin.setUint16(4, Math.abs(this.command.vx) * invVlen * 0xFFFF, true);
    //this.commandBin.setUint16(6, Math.abs(this.command.vz) * invVlen * 0xFFFF, true);
    //this.commandBin.setFloat32(4, this.command.vx, true);
    //this.commandBin.setFloat32(8, this.command.vz, true);
       
    var invLen = this.command.vx*this.command.vx + this.command.vz*this.command.vz;
    if (invLen) invLen = 1.0 / Math.sqrt(invLen);
    this.command.vx *= invLen;
    this.command.vz *= invLen;
    
    /*if (!pc.debugX) {
        pc.debugX = {};
        pc.debugZ = {};
    }
    pc.debugX[this.command.vx] = true;
    pc.debugZ[this.command.vz] = true;*/
    
    var i;
    var len = velocityLookupValues.length;
    var smallestError = 100;
    var bestX = 0;
    var bestZ = 0;
    var err;
    for(i=0; i<len; i++) {
        err = Math.abs(velocityLookupValues[i] - this.command.vx);
        if (err < smallestError) {
            smallestError = err;
            bestX = i;
        }
    }
    if (smallestError > 0.001) console.log(smallestError);
    smallestError = 100;
    for(i=0; i<len; i++) {
        err = Math.abs(velocityLookupValues[i] - this.command.vz);
        if (err < smallestError) {
            smallestError = err;
            bestZ = i;
        }
    }
    if (smallestError > 0.001) console.log(smallestError);
    var velocityLookup = bestX | (bestZ << 4);
    //console.log(bestX+" "+bestZ+" "+velocityLookup);
    this.commandBin.setUint8(4, velocityLookup, true);
        
    /*var tx = (this.command.tx - phMinX) / (phMaxX - phMinX);
    var ty = pc.math.clamp(this.command.ty / 6.0, 0, 1);
    var tz = (this.command.tz - phMinZ) / (phMaxZ - phMinZ);
    this.commandBin.setUint16(6, tx * 0xFFFF, true);
    this.commandBin.setUint8(8, ty * 0xFF);
    this.commandBin.setUint16(9, tz * 0xFFFF, true);*/
    
    //this.commandBin.setFloat32(6, this.command.tx, true);
    //this.commandBin.setFloat32(10, this.command.ty, true);
    //this.commandBin.setFloat32(14, this.command.tz, true);
    /*this.commandBin.setFloat32(8, this.command.tx, true);
    this.commandBin.setFloat32(12, this.command.ty, true);
    this.commandBin.setFloat32(16, this.command.tz, true);*/
    /*this.commandBin.setFloat32(12, this.command.tx, true);
    this.commandBin.setFloat32(16, this.command.ty, true);
    this.commandBin.setFloat32(20, this.command.tz, true);*/
    this.commandBin.setFloat32(5, this.command.tx, true);
    this.commandBin.setFloat32(9, this.command.ty, true);
    this.commandBin.setFloat32(15, this.command.tz, true);
    /*this.commandBin.setFloat32(4, this.command.tx, true);
    this.commandBin.setFloat32(8, this.command.ty, true);
    this.commandBin.setFloat32(14, this.command.tz, true);*/
    
    this.socket.send(this.commandBin.buffer);
    
    this.sentNonEmptyInputOnPrevTick = this.command.ctrl !== 0 || this.rotationChanged;
    this.command.ctrl = 0;
    this.rotationChanged = false;
};

Client.prototype.updateWorld = function(data) {
    stateHistory.push(data.state);
    historyTimestamp.push(data.t);
    this.lastUpdateServerTime = data.t;
    this.lastUpdateClientTime = pc.now();
    
    if (this.regenList.length > 0) this.regenList.length = 0;
    
    if (stateHistory.length > 1) {
        var prevStates = stateHistory[stateHistory.length - 2];
        var nextStates = stateHistory[stateHistory.length - 1];
        for(var uid in nextStates) {
            if (!playerMoveDir[uid]) continue;
            if (!prevStates.hasOwnProperty(uid)) continue;
            if (!nextStates.hasOwnProperty(uid)) continue;
            var vx = nextStates[uid].x - prevStates[uid].x;
            var vz = nextStates[uid].z - prevStates[uid].z;
            if (vx !== 0 || vz !== 0) {
                playerMoveDir[uid].x = vx;
                playerMoveDir[uid].z = vz;
                playerMoveDir[uid].normalize();
            }
            var curHealth = Math.floor(nextStates[uid].hpt) * CL_HP2PARTS;
            var prevHealth = Math.floor(prevStates[uid].hpt) * CL_HP2PARTS;
            
            if (curHealth > prevHealth) {
                this.regenList.push(uid);
            } else {
                while (curHealth < prevHealth) {
                    this.breakTopPart(uid);
                    prevHealth--;
                }

                curHealth = Math.floor(nextStates[uid].hpb) * CL_HP2PARTS;
                prevHealth = Math.floor(prevStates[uid].hpb) * CL_HP2PARTS;
                while (curHealth < prevHealth) {
                    this.breakBottomPart(uid);
                    prevHealth--;
                }
            }
        }
    }
    
    var i;
    
    for(i=0; i<this.regenList.length; i++) {
        uid = this.regenList[i];
        console.log("regen model");
        
        var pstate = stateHistory[stateHistory.length - 1][uid];
        var px = pstate.x;
        var pz = pstate.z;
        var parts = playerActiveParts[uid];
        var pright = parts.right;
        var pammo = parts.ammo;
        var pbody = parts.body;
        
        this.removePlayer(uid);
        
        pstate = new PlayerState();
        pstate.x = px;
        pstate.z = pz;
        stateHistory[stateHistory.length - 1][uid] = renderPlayerStates[uid] = pstate;
        
        var predicted = predictedState;
        var predictedPrev = predictedStatePrev;
        var predicted2 = predictedStatePreCorrect;
        var predicted3 = predictedStateAtLastSend;
        var predicted4 = this.timeToEndCorrectPrediction;
        var predicted5 = this.timesPredictionWasIncorrect;
        if (this.id == uid) {
            /*pendingSendPartsBody = -1;
            pendingSendPartsLeft = -1;
            pendingSendPartsRight = -1;
            predictedState = null;
            predictedStatePrev = null;
            predictedStatePreCorrect = null;
            predictedStateAtLastSend = null;
            predictedAtSendHistory.length = 0;
            predictedAtSendHistoryTimestamp.length = 0;
            this.timeToEndCorrectPrediction = false;
            this.timesPredictionWasIncorrect = 0;*/
        }
        
        playerActiveParts[uid] = {left:WPN_MGUN, right:pright, ammo:pammo, body:pbody};
        this.addPlayer(uid);
        
        if (this.id == uid) {
            /*predictedState.x = px;
            predictedState.z = pz;
            predictedStatePrev.x = px;
            predictedStatePrev.z = pz;*/
            predictedState = predicted;
            predictedStatePrev = predictedPrev;
            predictedStatePreCorrect = predicted2;
            predictedStateAtLastSend = predicted3;
            this.timeToEndCorrectPrediction = predicted4;
            this.timesPredictionWasIncorrect = predicted5;
        }
    }
    
    var dead = !data.state[this.id];
    if (dead && this.player) {
        this.timeToRespawn = SV_RESPAWNTIME;
        //this.textRespawn.innerHTML = "";
        this.textRespawn.enabled = false;
        adDiv.style.display = "none";
        if (adDiv2) adDiv2.style.display = "none";
        this.removePlayer(this.id);
        this.player = null;
        pendingSendPartsBody = -1;
        pendingSendPartsLeft = -1;
        pendingSendPartsRight = -1;
        predictedState = null;
        predictedStatePrev = null;
        predictedStatePreCorrect = null;
        predictedStateAtLastSend = null;
        predictedAtSendHistory.length = 0;
        predictedAtSendHistoryTimestamp.length = 0;
        this.timeToEndCorrectPrediction = false;
        this.timesPredictionWasIncorrect = 0;
    }
    
    for (var uid in playerModels) {
        if (!playerModels.hasOwnProperty(uid)) continue;
        // Remove disconnected players
        if (!data.state[uid]) {
            this.removePlayer(uid);
            continue;
        }
        
        if (this.id != uid && playerStructs[uid]) {
            if (this.lastUpdateClientTime > playerStructs[uid].spinLOffTime) {
                playerStructs[uid].spinL = false;
            }
            if (this.lastUpdateClientTime > playerStructs[uid].spinROffTime) {
                playerStructs[uid].spinR = false;
            }
        }
    }
    
    if (this.player) {
        playerStructs[this.id].ammo = data.a;
        if (playerStructs[this.id].rightWpn) {
            this.ammoIndicator.model.meshInstances[0].visible = true;
            this.ammoIndicator.model.meshInstances[0].material.alphaTest = 1.0 - data.a / weaponAmmo[playerStructs[this.id].rightWpnId];
        } else {
            this.ammoIndicator.model.meshInstances[0].visible = false;
        }
    }
    
    
    if (CL_PREDICT && predictedState) {
        this.timeToNextWorldUpdate = this.lastUpdateClientTime + SV_SENDRATE;
        
        // Clear old predicted history
        var earliestNeededPredictedTime = this.lastUpdateServerTime - CL_PREDICTHISTORYTIME;
        while(predictedAtSendHistoryTimestamp.length > 0 && earliestNeededPredictedTime > predictedAtSendHistoryTimestamp[0]) {
            predictedAtSendHistory.shift();
            predictedAtSendHistoryTimestamp.shift();
        }
        
        // Find mathcing history

        var match = false;
        for(i=0; i<predictedAtSendHistory.length; i++) {
            if (this.statesMatch(predictedAtSendHistory[i], data.state[this.id])) {
                match = true;
                break;
            }
        }

        if (!match) {
            this.timesPredictionWasIncorrect++;
            if (this.timesPredictionWasIncorrect > CL_CORRECTTHRESHOLD) {
                /*this.timeToEndCorrectPrediction = this.lastUpdateClientTime + CL_CORRECTTIME;
                predictedStatePreCorrect.x = predictedState.x;
                predictedStatePreCorrect.z = predictedState.z;
                predictedStatePreCorrect.ry = predictedState.ry;
                predictedStatePreCorrect.rw = predictedState.rw;
                predictedStatePreCorrect.hpt = predictedState.hpt;
                predictedStatePreCorrect.hpb = predictedState.hpb;*/
                // no smooth correction, instant
                //stateHistory[stateHistory.length - 1][this.id].x = predictedState.x = renderPlayerStates[this.id].x = data.state[this.id].x;
                //stateHistory[stateHistory.length - 1][this.id].z = predictedState.z = renderPlayerStates[this.id].z = data.state[this.id].z;
                
                if (stateHistory[stateHistory.length - 1]) {
                    if (stateHistory[stateHistory.length - 1][this.id]) {
                        stateHistory[stateHistory.length - 1][this.id].x = data.state[this.id].x;
                        stateHistory[stateHistory.length - 1][this.id].z = data.state[this.id].z;
                    }
                }
                if (predictedState && data.state[this.id]) {
                    predictedState.x = data.state[this.id].x;
                    predictedState.z = data.state[this.id].z;
                }
                if (renderPlayerStates) {
                    if (renderPlayerStates[this.id]) {
                        renderPlayerStates[this.id].x = data.state[this.id].x;
                        renderPlayerStates[this.id].z = data.state[this.id].z;
                    }
                }
                this.timesPredictionWasIncorrect = 0;
            }
        } else {
            this.timesPredictionWasIncorrect = 0;
        }
    }

    var fx = data.fx;
    var parent;
    var k;
    var uid2, edx, edz;
    for(i=0; i<fx.length; i++) {
        if (!playerStructs[fx[i].owner] && fx[i].type != FX_EXPLODE) continue;
        this.pickedPoint.x = fx[i].x;
        this.pickedPoint.y = fx[i].y;//PLAYER_Y;
        this.pickedPoint.z = fx[i].z;
        
        if (fx[i].type == FX_MUZZLEL) {
            if (fx[i].owner == this.id) continue;
            parent = playerStructs[fx[i].owner].leftWpnMuzzle;
            if (!parent) continue;
            //this.playParticle("muzzle", parent);
            this.addMuzzleFlash(parent);
            if (playerStructs[fx[i].owner].leftWpnShell) this.addBulletShell(playerStructs[fx[i].owner].leftWpnShell.getPosition(), pc.Vec3.UP, 
                                                                             playerActiveParts[fx[i].owner].left == WPN_SHOTGUN ? 1 : 0);
            //--//this.playParticle("metalimpact2", null, this.pickedPoint.x, this.pickedPoint.y, this.pickedPoint.z);
            this.drawWeaponTraces(playerActiveParts[fx[i].owner].left, parent.getPosition(), 
                                  this.pickedPoint, fx[i].owner);
            this.playWeaponSoundLeft(fx[i].owner);
            
            if (playerStructs[fx[i].owner].leftWpnBarrel) {
                this.spinBarrel(fx[i].owner, 0);
                playerStructs[fx[i].owner].spinLOffTime = this.lastUpdateClientTime + 500;
            }
            
        } else if (fx[i].type == FX_MUZZLER) {
            if (fx[i].owner == this.id) continue;
            parent = playerStructs[fx[i].owner].rightWpnMuzzle;
            if (!parent) continue;
            //this.playParticle("muzzle", parent);
            this.addMuzzleFlash(parent);
            if (playerStructs[fx[i].owner].rightWpnShell) this.addBulletShell(playerStructs[fx[i].owner].rightWpnShell.getPosition(), pc.Vec3.UP,
                                                                              playerActiveParts[fx[i].owner].right == WPN_SHOTGUN ? 1 : 0);
            //--//this.playParticle("metalimpact2", null, this.pickedPoint.x, this.pickedPoint.y, this.pickedPoint.z);
            this.drawWeaponTraces(playerActiveParts[fx[i].owner].right, parent.getPosition(), 
                                  this.pickedPoint, fx[i].owner);
            this.playWeaponSoundRight(fx[i].owner);
            
            if (playerStructs[fx[i].owner].rightWpnBarrel) {
                this.spinBarrel(fx[i].owner, 1);
                playerStructs[fx[i].owner].spinROffTime = this.lastUpdateClientTime + 500;
            }
            
        } else if (fx[i].type == FX_EXPLODE) {
            //this.playParticle("explode", null, this.pickedPoint.x, this.pickedPoint.y, this.pickedPoint.z);
            this.addHitSphere(this.pickedPoint, 1);
            phEngine.explosion(this.pickedPoint, 3.5, 0.5);
            for(k=0; k<8; k++) {
                this.midPoint.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1).add(this.pickedPoint);
                this.addImpactSphere(this.midPoint, pc.Vec3.ZERO);
            }
            for(k=0; k<8; k++) {
                this.midPoint.set(Math.random()*2-1, Math.random()*2-1, Math.random()*2-1);
                this.addExpSphere(this.pickedPoint, this.midPoint);
            }           
            if (playerModels[this.id]) {
                var dist = this.midPoint.copy(this.pickedPoint).sub(playerModels[this.id].getLocalPosition()).length();
                dist *= 0.2;
                var pow = 0.8;
                //pc.shake.shake(1.0 / (dist + 1.0));
                pc.shake.shake((1.0 - pc.math.clamp(dist / 10,0,1)) * pow);
                //console.log(1.0 / (dist + 1.0));
            }
            this.addLightEffect(this.pickedPoint, 3, 2);
            this.playSound(this.audioExplosion, -1, this.pickedPoint.x, this.pickedPoint.y, this.pickedPoint.z);
            
            this.shootRay.origin.copy(this.pickedPoint);
            var rayDist = 5;
            var distToPicked;
            for(k=0; k<explosionRayDirs.length; k++) {
            //k = 1;
                this.shootRay.direction.copy(explosionRayDirs[k]);
                if (this.intersectRayScene(this.shootRay, this.pickedPoint, -1, this.pickedNormal, rayDist)) {
                //if (colModels.level.intersectsRay(this.shootRay, this.pickedPoint, this.pickedNormal, rayDist)) {
                    distToPicked = this.direction2.copy(this.shootRay.origin).sub(this.pickedPoint).lengthSq();
                    if (distToPicked < rayDist*rayDist) {
                        //this.pickedPoint.x -= this.pickedNormal.x * 0.1;
                        //this.pickedPoint.y -= this.pickedNormal.y * 0.1;
                        //this.pickedPoint.z -= this.pickedNormal.z * 0.1;
                        this.addExplosionDecal(ColUtils.hitBoxId, this.pickedPoint, this.pickedNormal);
                    }
                    //if (ColUtils.hitBoxId === -1) this.renderPlayerHit(this.shootRay);
                }
            }
            for (uid2 in renderPlayerStates) {
                if (!renderPlayerStates.hasOwnProperty(uid2)) continue;
                if (!playerModels.hasOwnProperty(uid2)) continue;
                edx = this.pickedPoint.x - renderPlayerStates[uid2].x;
                edz = this.pickedPoint.z - renderPlayerStates[uid2].z;
                if ((edx*edx + edz*edz) < SV_EXPLOSIONRADIUS*SV_EXPLOSIONRADIUS) {
                    this.playerHit = uid2;
                    this.renderPlayerHit(this.pickedPoint);
                }
            }
            
        } else if (fx[i].type == FX_FLAMESL) {
            if (fx[i].owner == this.id) continue;
            parent = playerStructs[fx[i].owner].leftWpnMuzzle;
            if (!parent) continue;
            //this.playParticle("flames", parent);
            playerStructs[fx[i].owner].emitFlameEndTimeL = this.lastUpdateClientTime + 1000;
            playerStructs[fx[i].owner].emitFlameTickEndTimeL = this.lastUpdateClientTime + weaponRate[WPN_FLAME];
            
        } else if (fx[i].type == FX_FLAMESR) {
            if (fx[i].owner == this.id) continue;
            parent = playerStructs[fx[i].owner].rightWpnMuzzle;
            if (!parent) continue;
            //this.playParticle("flames", parent);
            playerStructs[fx[i].owner].emitFlameEndTimeR = this.lastUpdateClientTime + 1000;
            playerStructs[fx[i].owner].emitFlameTickEndTimeR = this.lastUpdateClientTime + weaponRate[WPN_FLAME];
            
        } else if (fx[i].type == FX_FIREL) {
            //this.playParticle("fire", playerStructs[fx[i].owner].left);
            this.addStaticFlameLinked(playerStructs[fx[i].owner].left, fx[i].owner);
            
        } else if (fx[i].type == FX_FIRER) {
            //this.playParticle("fire", playerStructs[fx[i].owner].right);
            this.addStaticFlameLinked(playerStructs[fx[i].owner].right, fx[i].owner);
            
        } else if (fx[i].type == FX_FIRET) {
            var pbody = playerActiveParts[fx[i].owner] & PART_TOPHEAVY ? playerStructs[fx[i].owner].topHeavy : playerStructs[fx[i].owner].topLight;
            if (!pbody) continue;
            //this.playParticle("fire", pbody);
            this.addStaticFlameLinked(pbody, fx[i].owner);
            
        } else if (fx[i].type == FX_FIREB) {
            //var pbody = playerActiveParts[fx[i].owner] & PART_LEGS ? playerStructs[fx[i].owner].legs : playerStructs[fx[i].owner].tracks;
            var pbody = playerActiveParts[fx[i].owner] & PART_TOPHEAVY ? playerStructs[fx[i].owner].topHeavy : playerStructs[fx[i].owner].topLight;
            if (!pbody) continue;
            //this.playParticle("fire", pbody);
            this.addStaticFlameLinked(pbody, fx[i].owner);
            
        } else if (fx[i].type == FX_ANTISHIELD) {
            if (fx[i].owner == this.id) this.lastAntishieldStart = pc.now();
            this.addAntishield(fx[i].owner);
            
        } else if (fx[i].type == FX_EMP) {
            if (fx[i].owner == this.id) {
                this.stunTicksLeft = stunTicks;
            }
            
        }
    }
    
    projStateHistory.push(data.pr);
    
    var prPath = data.pt;
    for(uid2 in prPath) {
        if (!prPath.hasOwnProperty(uid2)) continue;
        projPath[uid2] = prPath[uid2];
    }
    
    if (data.pc) {
        for(i=0; i<pc.pickups.length; i++) {
            pc.pickups[i].entity.model.enabled = !!(data.pc & (1 << i));
        }
    }
    
    if (data.rp !== undefined) {
        console.log("repairs update");
        console.log(data.rp);
        var enabled;
        for(i=0; i<pc.repairs.length; i++) {
            enabled = !!(data.rp & (1 << i));
            pc.repairs[i].entity.enabled = enabled;
            if (enabled) {
                pc.doors.open(i);
            } else {
                pc.doors.close(i);
            }
            enabled = !!((data.rp >> 4) & (1 << i));
            pc.doors.setNotification(i, enabled);
        }
    }
    
    this.autopilotPoint = data.nav;
    //if (data.nav) {
        //this.debugNavPath = data.nav;
        //this.debugNavNext = 1;
        //this.autopilot = true;
        
    //}
    
    /*if (data.fs) {
        if (!this.debugFlameSpheres) {
            var meshInstance = this.app.root.findByName("debugFlameSphere").model.meshInstances[0];
            this.debugFlameSphereMesh = meshInstance.mesh;
            this.debugFlameSphereMat = meshInstance.material;
        }
        this.debugFlameSpheres = data.fs;
    }*/
};

// swap method called for script hot-reloading
// inherit your script state here
// Client.prototype.swap = function(old) { };

// to learn more about script anatomy, please read:
// http://developer.playcanvas.com/en/user-manual/scripting/
