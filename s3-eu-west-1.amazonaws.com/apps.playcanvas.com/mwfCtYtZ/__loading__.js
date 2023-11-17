var SV_DEVMODE = false;


var startMenu, startMenuPlay, startMenuPlayText, userNameDiv, nameInput, startMenuProgressBar, soundCheckbox, qualityCheckbox, fullscreenCheckbox, serverInput, imgControls, adDiv, disconnectMenuParent;
var disconnectReason, qualityCheckbox2, changelog, adDiv2;

var gmt = (new Date()).getTimezoneOffset() / -60;
var SV_URLID = (gmt >= -2 && gmt <= 7) ? 0 : 1;
var urlNames = ["EU", "US"];

// google analytics
var gaScript = document.createElement("script");
gaScript.src = "https://www.googletagmanager.com/gtag/js?id=UA-110391410-1";
gaScript.async = true;
document.head.appendChild(gaScript);

window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'UA-110391410-1');


pc.script.createLoadingScreen(function (app) {
    
    var createCheckbox = function(parent, disabled) {
        var c = document.createElement("div");
        c.className = "checkbox";

        var checkmark = document.createElement("div");
        checkmark.innerHTML = String.fromCharCode(10761);//"⨉";// "🞩";
        checkmark.style.display = "none";
        c.appendChild(checkmark);

        c._checked = false;
        c._disabled = disabled;

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
            Object.defineProperty(c, "disabled", {
                get: function () {
                    return this._disabled;
                },
                set: function (val) {
                    if (this._disabled === val) return;
                    this._disabled = val;
                    c.className = "checkboxDisabled";
                }
            });
            c.onclick = function() {
                this.checked = !this._checked;
                if (this.onchange) this.onchange();
            };
        }

        parent.appendChild(c);
        return c;
    };

    
    var showSplash = function () {
        // splash wrapper
        var wrapper = document.createElement('div');
        wrapper.id = 'application-splash-wrapper';
        document.body.appendChild(wrapper);

        // splash
        var splash = document.createElement('div');
        splash.id = 'application-splash';
        wrapper.appendChild(splash);
        splash.style.display = 'none';

        /*var logoPc = document.createElement('img');
        logoPc.src = 'https://s3-eu-west-1.amazonaws.com/static.playcanvas.com/images/play_text_252_white.png';
        splash.appendChild(logoPc);
        logoPc.onload = function () {
            splash.style.display = 'block';
        };*/

        var container = document.createElement('div');
        container.id = 'progress-bar-container';
        splash.appendChild(container);

        var bar = document.createElement('div');
        bar.id = 'progress-bar';
        //container.appendChild(bar);

        
        startMenu = document.createElement("div");
        startMenu.style.position = "absolute";
        //startMenu.style.width = "320px";
        //startMenu.style.height = "575px";// "500px";// "320px";
        startMenu.style.width = "684px";
        startMenu.style.height = "472px";
        startMenu.style.left = "50%";
        startMenu.style.top = "50%";
        startMenu.style.transform = "translate(-50%, -50%)";
        startMenu.style.backgroundColor = "rgba(0,0,0,0.8)";
        startMenu.style.padding = "10px";
        startMenu.style.color = "white";
        document.body.appendChild(startMenu);

        var logo = document.createElement("div");
        logo.innerHTML = "ROBOSTORM";
        logo.id = "logo";
        logo.className= "header";
        startMenu.appendChild(logo);
        
        var desc = document.createElement("div");
        desc.innerHTML = "A fast-paced multiplayer robot action game";
        desc.id = "description";
        startMenu.appendChild(desc);
        
        if (pc.platform.mobile) {
            var warn = document.createElement("div");
            warn.innerHTML = "This game requires keyboard and doesn't run on mobile for now";
            warn.id = "description";
            warn.style.color = "red";
            warn.style.opacity = 1;
            startMenu.appendChild(warn);
        }
        
        var hr = document.createElement("hr");
        hr.className = "menuHr";
        startMenu.appendChild(hr);

        var about = document.createElement("div");
        about.innerHTML = "ABOUT";
        about.id = "about";
        startMenu.appendChild(about);
        
        userNameDiv = document.createElement("div");
        userNameDiv.className = "userNameDiv";

        var userNameTip = document.createElement("div");
        userNameTip.innerHTML = "<div class='ml'>N</div>ame:";
        userNameTip.className = "setting";
        userNameTip.style.color = "#ffe56a";
        userNameDiv.appendChild(userNameTip);

        var userNameInput = document.createElement("input");
        userNameInput.value = localStorage.getItem("username") || "Player";
        userNameInput.maxLength = 32;
        nameInput = userNameInput;
        userNameDiv.appendChild(userNameInput);
        
        serverInput = document.createElement("select");
        
        var serverInputOption = document.createElement("option");
        serverInputOption.className = "selectOption";
        serverInputOption.innerHTML = "EU";
        serverInput.appendChild(serverInputOption);
        
        serverInputOption = document.createElement("option");
        serverInputOption.className = "selectOption";
        serverInputOption.innerHTML = "US";
        serverInput.appendChild(serverInputOption);
        
        var storedServer = localStorage.getItem("server");
        if (storedServer === null) storedServer = SV_URLID;
        serverInput.selectedIndex = storedServer;
        SV_URLID = storedServer;
        console.log("GMT: " + gmt + "; Selected " + urlNames[SV_URLID] + " server.");
        localStorage.setItem("server", SV_URLID);
        
        serverInput.onchange = function() {
            if (SV_URLID === serverInput.selectedIndex) return;
            SV_URLID = serverInput.selectedIndex;
            localStorage.setItem("server", SV_URLID);
            console.log("Setting server to " + SV_URLID);
        };
        
        nameInput = userNameInput;
        
        //userNameDiv.appendChild(document.createElement("br"));
        //userNameDiv.appendChild(document.createElement("br"));
        //userNameDiv.appendChild(document.createElement("hr"));

        var serverTip = document.createElement("div");
        serverTip.innerHTML = "<div class='ml'>S</div>erver:";
        serverTip.className = "setting";
        
        //userNameDiv.appendChild(serverInput);
        
        //userNameDiv.appendChild(document.createElement("br"));
        //userNameDiv.appendChild(document.createElement("br"));
        //userNameDiv.appendChild(document.createElement("hr"));

        startMenu.appendChild(userNameDiv);
        startMenu.appendChild(document.createElement("br"));
        hr = document.createElement("hr");
        hr.className = "menuHr";
        startMenu.appendChild(hr);
        
        var settingsContainer = document.createElement("div");
        settingsContainer.className = "settingsContainer";
        startMenu.appendChild(settingsContainer);
        
        var stretch = document.createElement("span");
        stretch.className = "stretch";
        
        
        var soundGroup = document.createElement("div");
        soundGroup.className = "settingGroup";
        settingsContainer.appendChild(soundGroup);
        
        var soundTip = document.createElement("div");
        soundTip.className = "setting";
        soundTip.innerHTML = "<div class='ml'>S</div>ound";
        soundGroup.appendChild(soundTip);

        //var enableAudio = false;
        soundCheckbox = createCheckbox(soundGroup, false);//!self.supportsAudio);
        soundCheckbox.checked = false;//self.supportsAudio && this.enableAudio;
        /*soundCheckbox.onchange = function(evt) {
            if (this.checked) {
                self.enableAudio = true;
            } else {
                self.enableAudio = false;
            }
        };*/

        //startMenu.appendChild(document.createElement("br"));
        //startMenu.appendChild(document.createElement("hr"));

        
        var qualityGroup = document.createElement("div");
        qualityGroup.className = "settingGroup";
        settingsContainer.appendChild(qualityGroup);
        
        var qualityTip = document.createElement("div");
        qualityTip.className = "setting";
        qualityTip.innerHTML = "<div class='ml'>H</div>igh quality";
        qualityGroup.appendChild(qualityTip);

        qualityCheckbox = createCheckbox(qualityGroup);
        var stored = localStorage.getItem("quality");
        qualityCheckbox.checked = stored === null ? true : (stored === "true");
        /*qualityCheckbox.onchange = function(evt) {
            if (!this.checked) {
                console.log("Setting low quality");
                pc.gameSettings.setLow();
            } else {
                console.log("Setting high quality");
                pc.gameSettings.setHigh();
            }
        };*/
        //settingsContainer.appendChild(qualityCheckbox);

        //startMenu.appendChild(document.createElement("br"));
        //startMenu.appendChild(document.createElement("hr"));

        /*
        var qualityGroup2 = document.createElement("div");
        qualityGroup2.className = "settingGroup";
        settingsContainer.appendChild(qualityGroup2);
        
        
        var qualityTip2 = document.createElement("div");
        qualityTip2.className = "setting";
        qualityTip2.innerHTML = "<div class='ml'>E</div>xtreme debris";
        qualityGroup2.appendChild(qualityTip2);

        qualityCheckbox2 = createCheckbox(qualityGroup2);
        stored = localStorage.getItem("quality2");
        qualityCheckbox2.checked = stored === null ? false : (stored === "true");
        */
        
        
        var fullscreenGroup = document.createElement("div");
        fullscreenGroup.className = "settingGroup";
        settingsContainer.appendChild(fullscreenGroup);
        
        var fullscreenTip = document.createElement("div");
        fullscreenTip.className = "setting";
        fullscreenTip.innerHTML = "<div class='ml'>F</div>ullscreen";
        fullscreenGroup.appendChild(fullscreenTip);

        fullscreenCheckbox = createCheckbox(fullscreenGroup);
        fullscreenCheckbox.onchange = function(evt) {
            if (this.checked) {
                document.documentElement.requestFullscreen();
            } else {
                document.exitFullscreen();
            }
        };
        document.addEventListener("fullscreenchange", function( event ) {
            var isFs = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;
            fullscreenCheckbox.checked = isFs;
            
            var splash = document.getElementById("application-splash-wrapper");
            if (!splash) return;
            var screenWidth = document.documentElement.clientWidth;
            var screenHeight = document.documentElement.clientHeight;
            var screenAspect = screenWidth / screenHeight;
            var imgAspect = 2.8376623376623376;
            splash.style.backgroundSize = (screenWidth * (imgAspect / screenAspect)) + "px " + screenHeight + "px";
        });
        fullscreenGroup.appendChild(fullscreenCheckbox);
        
        
        var serverGroup = document.createElement("div");
        serverGroup.className = "settingGroup";
        settingsContainer.appendChild(serverGroup);

        serverGroup.appendChild(serverTip);
        serverGroup.appendChild(serverInput);
        
        settingsContainer.appendChild(stretch);
        
        startMenu.appendChild(document.createElement("br"));
        hr = document.createElement("hr");
        hr.className = "menuHr";
        startMenu.appendChild(hr);

        
        imgControls = document.createElement('img');
        imgControls.style.margin = "auto";
        imgControls.style.display = "block";
        imgControls.width = 628;
        imgControls.height = 193;
        startMenu.appendChild(imgControls);
        
        
        startMenuPlay = document.createElement("div");
        //startMenuPlay.innerHTML = "Go";
        startMenuPlay.id = "startButton";
        //startMenuPlay.onclick = function(evt) {
            //this.innerHTML = "Loading...";
            //startMenuPlayText.innerHTML = "Loading...";
        //};
        startMenu.appendChild(startMenuPlay);

        /*var menuRules = document.createElement("div");
        menuRules.className = "menuTips";
        menuRules.innerHTML = "<div class='mh'><div class='ml'>R</div>ules:</div> <div class='mu'>kill robots</div> from other teams and capture big <div class='mu'><div class='ml'>H</div> circles</div> to get points (<div class='ml'>XP</div>) for you and your team. <div class='ml'>S</div>pend points to improve your robot.";
        startMenu.appendChild(menuRules);

        var menuControls = document.createElement("div");
        menuControls.className = "menuTips";
        menuControls.innerHTML = "<br><div class='mh'><div class='ml'>C</div>ontrols:</div> <div class='mu'><div class='ml'>W</div>, <div class='ml'>A</div>, <div class='ml'>S</div>, <div class='ml'>D</div></div> to move. <div class='mu'><div class='ml'>L</div>eft</div> and <div class='mu'><div class='ml'>R</div>ight</div> mouse buttons to shoot left/right weapons. <div class='mu'><div class='ml'>B</div></div> to buy upgrades. <div class='mu'><div class='ml'>S</div>pace</div> to accelerate. <div class='mu'><div class='ml'>S</div>hift</div> for shield.";
        startMenu.appendChild(menuControls);*/
        
        startMenuPlay.appendChild(bar);
        
        startMenuPlayText = document.createElement("div");
        startMenuPlayText.innerHTML = "<div class='ml'>L</div>oading";
        startMenuPlayText.id = "startMenuPlayText";
        startMenuPlay.appendChild(startMenuPlayText);
        
        startMenuProgressBar = bar;
        
        
        var aboutMenu = document.createElement("div");
        aboutMenu.style.position = "absolute";
        aboutMenu.style.width = "400px";
        aboutMenu.style.height = "760px";
        aboutMenu.style.left = "50%";
        aboutMenu.style.top = "50%";
        aboutMenu.style.transform = "translate(-50%, -50%)";
        aboutMenu.style.backgroundColor = "rgba(0,0,0,0.95)";
        aboutMenu.style.padding = "10px";
        aboutMenu.style.color = "white";
        aboutMenu.style.border = "1px solid gray";
        aboutMenu.style.display = "none";
        document.body.appendChild(aboutMenu);

        var aboutHeader = document.createElement("div");
        aboutHeader.innerHTML = "Credits";
        aboutHeader.className = "header";
        aboutMenu.appendChild(aboutHeader);
        aboutMenu.appendChild(document.createElement("hr"));
        
        var abountContent = document.createElement("div");
        //abountContent.style.fontFamily = "Arial";
        abountContent.style.textTransform = "none";
        /*var str = "<div class='ml'>P</div>rogramming: <a href='https://twitter.com/guycalledfrank' target='_blank'><div class='ml'>M</div>r <div class='ml'>F</div></a><br><hr>";
        str += "<div class='ml'>3D</div> art: <div class='ml'>G</div>eorge <div class='ml'>A</div>melekhin and <div class='ml'>R</div>oman <div class='ml'>Y</div>uris<br><hr>";
        str += "<div class='ml'>A</div>nimation: <div class='ml'>A</div>ra<br><hr>";
        str += "<br>";
        str += "<div class='ml'>U</div>ses:<br>";
        str += "<br>";
        str += "<a href='https://playcanvas.com' target='_blank'><div class='ml'>P</div>lay<div class='ml'>C</div>anvas engine and tools</a><br><hr>";
        str += "<a href='https://playcanvas.com' target='_blank'><div class='ml'>P</div>lay<div class='ml'>C</div>anvas engine and tools</a><br><hr>";*/
        var str = "Programming: <a href='https://twitter.com/guycalledfrank' target='_blank'>Mr F</a><br><br>";
        str += "3D art: MrSavio and Roman Yuris<br><br>";
        str += "Animation: Ara<br><br>";
        str += "Special thanks to: Sasha, <a href='https://twitter.com/mrmaxm' target='_blank'>moka</a>, <a href='https://twitter.com/willeastcott' target='_blank'>Will Eastcott</a>,<br><a href='https://twitter.com/daredevildave' target='_blank'>Dave Evans</a>, <a href='http://maslov.co/' target='_blank'>ABTOMAT</a>, Randomize<br><br>";
        str += "<hr>Uses:<br><br>";
        str += "<a href='https://playcanvas.com' target='_blank'>PlayCanvas engine and tools</a><br><br><hr>";
        str += "Sounds from <a href='https://freesound.org' target='_blank'>freesound.org</a>:<br><br>";
        str += "<a href='https://freesound.org/people/SuperPhat/sounds/396324/' target='_blank'>'Heavy machine gun' by SuperPhat</a><br><br>";
        str += "<a href='https://freesound.org/people/steveygos93/sounds/80401/' target='_blank'>'Explosion2' by steveygos93</a><br><br>";
        str += "<a href='https://freesound.org/people/pugaeme/sounds/396890/' target='_blank'>'Flamethrower' by pugaeme</a><br><br>";
        str += "<a href='https://freesound.org/people/LeMudCrab/sounds/163458/' target='_blank'>'Grenade Launcher' by LeMudCrab</a><br><br>";
        
        str += "<a href='https://freesound.org/people/Selector/sounds/250200/' target='_blank'>'rocket launch' by Selector</a><br><br>";
        str += "<a href='https://freesound.org/people/morganpurkis/sounds/397886/' target='_blank'>'Even Meatier Gunshot' by morganpurkis</a><br><br>";
        
        str += "<a href='https://freesound.org/people/JoelAudio/sounds/135465/' target='_blank'>'QUICK_SMASH_001' by JoelAudio</a><br><br>";
        str += "<a href='https://freesound.org/people/JoelAudio/sounds/135461/' target='_blank'>'QUICK_SMASH_002' by JoelAudio</a><br><br>";
        str += "<a href='https://freesound.org/people/JoelAudio/sounds/135463/' target='_blank'>'QUICK_SMASH_003' by JoelAudio</a><br><br>";
        
        str += "<hr>More IO games:<br><br>";
        str += "<div style='width:60%; margin: 0 auto;'>";
        str += "<a style='float:left;' href='http://poki.com/' target='_blank'>Poki.com</a>";
        str += "<a style='float:right;' href='https://www.crazygames.com/c/io' target='_blank'>Crazygames.com</a>";
        str += "</div>";
        
        abountContent.innerHTML = str;
        aboutMenu.appendChild(abountContent);
        
        var okButton = document.createElement("div");
        okButton.className = "okButton";
        okButton.innerHTML = "OK";
        okButton.onclick = function() {
            aboutMenu.style.display = "none";
        };
        aboutMenu.appendChild(okButton);
        
        about.onclick = function() {
            aboutMenu.style.display = "block";
        };
        
        changelog = document.createElement("div");
        changelog.style.position = "fixed";
        changelog.style.top = "0";
        changelog.style.left = "0";
        changelog.style.padding = "5px";
        changelog.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        changelog.style.top = "50%";
        changelog.style.transform = "translateY(-50%)";
        changelog.style.width = "200px";
        changelog.style.height = "472px";
        document.body.appendChild(changelog);
        
        var changelogHeader = document.createElement("div");
        changelogHeader.innerHTML = "Changelog";
        changelogHeader.className = "header";
        changelog.appendChild(changelogHeader);
        changelog.appendChild(document.createElement("hr"));
        
        var changelogContent = document.createElement("div");
        changelogContent.style.color = "#BBBBBB";
        changelogContent.style.fontSize = "13px";
        changelogContent.style.textTransform = "none";
        //changelogContent.style.fontFamily = "Arial";
        changelogContent.innerHTML += "<div class='date'>20 Dec 2017</div><br>- Added ranks.<br>- Fixed dead robots collision.<br><hr>";
        changelogContent.innerHTML += "<div class='date'>13 Dec 2017</div><br>- Changed machine gun power and grenade/rocket speed.";
        changelog.appendChild(changelogContent);
        
        // ads

        // Dummy
        adDiv = document.createElement("div");
        adDiv.style.position = "absolute";
        adDiv.style.top = "0";
        adDiv.style.right = "0";
        adDiv.style.padding = "5px";
        adDiv.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        
        // Sideways blinking shit
        /*
        adDiv = document.createElement("div");
        adDiv.innerHTML = '<ins data-a4g-zone=64542></ins>';
        document.body.appendChild(adDiv);
        (function (cdnPath, charset) {var el = document.createElement("SCRIPT"),body = document.body,asyncAjsSrc = cdnPath + "/async-ajs.min.js",isAsyncPresent = (function (scripts, asyncAjsSrc) {for (var i = 0; i < scripts.length; i++) {if (scripts[i].src === asyncAjsSrc) {return true;}}return false;} (document.getElementsByTagName("SCRIPT"), asyncAjsSrc));if (!isAsyncPresent) {el.type = "text/javascript";el.async = true;el.src = asyncAjsSrc;if (charset) {el.setAttribute("data-a4g-charset", charset);}body.appendChild(el);}} ("https://ad4game-a.akamaihd.net", ""));
        */
        
        // Quad shit (can be sometimes blinking, but usually less annoying)
        /*
        adDiv = document.createElement("div");
        adDiv.innerHTML = '<ins data-a4g-zone=64543></ins>';
        adDiv.style.position = "absolute";
        adDiv.style.top = "0";
        adDiv.style.right = "0";
        adDiv.style.padding = "35px";
        adDiv.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
        document.body.appendChild(adDiv);
        (function (cdnPath, charset) {var el = document.createElement('SCRIPT'),body = document.body,asyncAjsSrc = cdnPath + '/async-ajs.min.js',isAsyncPresent = (function (scripts, asyncAjsSrc) {for (var i = 0; i < scripts.length; i++) {if (scripts[i].src === asyncAjsSrc) {return true;}}return false;} (document.getElementsByTagName('SCRIPT'), asyncAjsSrc));if (!isAsyncPresent) {el.type = 'text/javascript';el.async = true;el.src = asyncAjsSrc;if (charset) {el.setAttribute('data-a4g-charset', charset);}body.appendChild(el);}} (location.protocol === 'https:' ? 'https://ad4game-a.akamaihd.net' : 'http://cdn.ad4game.com', ''));
        */
        
        // Long shit, often blinking
        /*
        adDiv = document.createElement("div");
        adDiv.innerHTML = '<ins data-a4g-zone=64544></ins>';
        document.body.appendChild(adDiv);
        (function (cdnPath, charset) {var el = document.createElement('SCRIPT'),body = document.body,asyncAjsSrc = cdnPath + '/async-ajs.min.js',isAsyncPresent = (function (scripts, asyncAjsSrc) {for (var i = 0; i < scripts.length; i++) {if (scripts[i].src === asyncAjsSrc) {return true;}}return false;} (document.getElementsByTagName('SCRIPT'), asyncAjsSrc));if (!isAsyncPresent) {el.type = 'text/javascript';el.async = true;el.src = asyncAjsSrc;if (charset) {el.setAttribute('data-a4g-charset', charset);}body.appendChild(el);}} (location.protocol === 'https:' ? 'https://ad4game-a.akamaihd.net' : 'http://cdn.ad4game.com', ''));
        */
        
        // Common setup
        /*
        adDiv.id = "I-am-sorry-for-this-shit-but-we-need-to-pay-for-servers";
        //adDiv.style.display = "none";
        */
        
        // Life is feudal
        // They are good guys
        
        // Horizontal
        //<!-- admitad.banner: a761qxqxva95f4a334258b7bbdb2ba Life is Feudal INT -->
        //adDiv.innerHTML = '<a target="_blank" rel="nofollow" href="https://ad.admitad.com/g/a761qxqxva95f4a334258b7bbdb2ba/?i=4"><img width="600" height="90" border="0" src="https://ad.admitad.com/b/a761qxqxva95f4a334258b7bbdb2ba/" alt="Life is Feudal INT"/></a>';
        //document.body.appendChild(adDiv);
        //<!-- /admitad.banner -->
        
        // Vertical
        /*
        //<!-- admitad.banner: 9d5n7217ca95f4a334258b7bbdb2ba Life is Feudal INT -->
        adDiv.innerHTML = '<a target="_blank" rel="nofollow" href="https://ad.admitad.com/g/9d5n7217ca95f4a334258b7bbdb2ba/?i=4"><img width="160" height="600" border="0" src="https://ad.admitad.com/b/9d5n7217ca95f4a334258b7bbdb2ba/" alt="Life is Feudal INT"/></a>';
        adDiv.style.top = "50%";
        adDiv.style.transform = "translateY(-50%)";
        document.body.appendChild(adDiv);
        //<!-- /admitad.banner -->
        */
        
        // Warframe - really big banner
        /*
        //<!-- admitad.banner: bdea1887e695f4a33425443d27d95a WarFrame -->
        adDiv.innerHTML = '<a target="_blank" rel="nofollow" href="https://ad.admitad.com/g/bdea1887e695f4a33425443d27d95a/?i=4"><img width="400" height="400" border="0" src="https://ad.admitad.com/b/bdea1887e695f4a33425443d27d95a/" alt="WarFrame"/></a>';
        adDiv.style.position = "absolute";
        adDiv.style.bottom = "0";
        adDiv.style.right = "0";
        document.body.appendChild(adDiv);
        //<!-- /admitad.banner -->
        */
        
        if (!SV_DEVMODE) {
            // ylix ads (if present in html)
            var yad = document.body.getElementsByTagName("iframe");
            if (yad && yad[0]) {
                
                adDiv2 = document.createElement("div");
                adDiv2.style.position = "absolute";
                adDiv2.style.bottom = "0";
                adDiv2.style.left = "0";
                adDiv2.style.padding = "5px";
                adDiv2.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
                
                adDiv2.appendChild(yad[0]);
                //adDiv2.style.width = "300px";
                document.body.appendChild(adDiv2);
            }
            
            // iogames.space cross-promotion
            adDiv.innerHTML += '<iframe id="IOG_CP" scrolling="no" frameborder="0" width="200" height="145" src="https://viral.iogames.space/cp/robostorm-io" style="border-radius:10px;-webkit-box-shadow:0 3px 6px rgba(0,0,0,.25),0 3px 6px rgba(0,0,0,.4); -moz-box-shadow:0 3px 6px rgba(0,0,0,.25),0 3px 6px rgba(0,0,0,.4); box-shadow:0 3px 6px rgba(0,0,0,.25),0 3px 6px rgba(0,0,0,.4);"> </iframe>';    
            document.body.appendChild(adDiv);
        }
        
        disconnectMenuParent = document.createElement("div");
        disconnectMenuParent.style.backgroundColor = "rgba(0,0,0,0.8)";
        disconnectMenuParent.style.width = "100%";
        disconnectMenuParent.style.height = "100%";
        disconnectMenuParent.style.position = "absolute";
        disconnectMenuParent.style.left = "0px";
        disconnectMenuParent.style.top = "0px";
        disconnectMenuParent.style.display = "none";
        document.body.appendChild(disconnectMenuParent);
        
        var disconnectMenu = document.createElement("div");
        disconnectMenu.style.position = "absolute";
        disconnectMenu.style.width = "400px";
        disconnectMenu.style.height = "70px";
        disconnectMenu.style.left = "50%";
        disconnectMenu.style.top = "50%";
        disconnectMenu.style.transform = "translate(-50%, -50%)";
        disconnectMenu.style.backgroundColor = "rgba(0,0,0,0.95)";
        disconnectMenu.style.padding = "10px";
        disconnectMenu.style.color = "white";
        disconnectMenu.style.border = "1px solid gray";
        //disconnectMenu.style.display = "none";
        disconnectMenuParent.appendChild(disconnectMenu);
        
        var disconnectText = document.createElement("div");
        disconnectMenu.innerHTML = "Disconnected";
        disconnectMenu.className = "header";
        disconnectMenu.appendChild(disconnectText);
        
        disconnectReason = document.createElement("div");
        disconnectReason.innerHTML = "";
        disconnectReason.className = "header";
        disconnectMenu.appendChild(disconnectReason);
        
        var okButton2 = document.createElement("div");
        okButton2.className = "okButton";
        okButton2.innerHTML = "Refresh";
        okButton2.onclick = function() {
            location.reload();
        };
        disconnectMenu.appendChild(okButton2);
    };

    var hideSplash = function () {
        //var splash = document.getElementById('application-splash-wrapper');
        //splash.parentElement.removeChild(splash);
    };

    var setProgress = function (value) {
        var bar = document.getElementById('progress-bar');
        if(bar) {
            value = value * 2 - 1; // progressbar fix
            value *= 0.7; // 0.7 for assets, 0.3 for shaders
            value = Math.min(1, Math.max(0, value));
            bar.style.width = value * 100 + '%';
        }
    };
    
    var setProgress2 = function (value) {
        var bar = document.getElementById('progress-bar');
        if(bar) {
            //value = value * 2 - 1; // progressbar fix
            value *= 0.3 + 0.7; // 0.7 for assets, 0.3 for shaders
            value = Math.min(1, Math.max(0, value));
            bar.style.width = value * 100 + '%';
        }
    };

    var createCss = function () {
        var css = [
            //"@import url('https://fonts.googleapis.com/css?family=Roboto');",
            "@import url('https://fonts.googleapis.com/css?family=Audiowide');",
            'body {',
            //'    background-color: #283538;',
            '    background-color: #222222 !important;',
            '}',

            '#application-splash-wrapper {',
            '    position: absolute;',
            '    top: 0;',
            '    left: 0;',
            '    height: 100%;',
            '    width: 100%;',
            //'    background-color: #283538;',
            '    background-color: #222222;',
            '    background-repeat: no-repeat;',
            '    background-position: center center;',
            '}',

            '#application-splash {',
            '    position: absolute;',
            '    top: calc(50% - 28px);',
            '    width: 264px;',
            '    left: calc(50% - 132px);',
            '}',

            '#application-splash img {',
            '    width: 100%;',
            '}',

            '#progress-bar-container {',
            '    margin: 20px auto 0 auto;',
            '    height: 2px;',
            '    width: 100%;',
            '    background-color: #1d292c;',
            '}',

            '#progress-bar {',
            '    width: 0%;',
            '    height: 100%;',
            //'    background-color: #f60;',
            //'    background-color: rgba(255, 165, 0, 0.7);',
            //'    background-color: rgba(207, 222, 209, 0.7);',
            //'    background-color: rgba(147, 213, 199, 0.7);',
            '    background-color: rgba(197, 177, 84, 0.7);',
            'background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,1) 2px, rgba(0,0,0,1) 8px);',
            //'background-size: 8px 50px;',
            //' display: inline-block;', // door effect?
            '}',
            '@media (max-width: 480px) {',
            '    #application-splash {',
            '        width: 170px;',
            '        left: calc(50% - 85px);',
            '    }',
            '}'
        ].join("\n");

        css += [
"body {",
    
    "font-family: 'Audiowide', cursive !important;",
    "text-transform: uppercase;",
    "font-size: 13px !important;",
            
    //"font-family: 'Roboto';",
    //"font-size: 15px;",
    "-webkit-touch-callout: none !important;    -webkit-user-select: none !important;    -moz-user-select: none !important;    -ms-user-select: none !important;    user-select: none !important;",
"}",
"",
".abilityContainer {",
    "height: 10px;",
"}",
"a {",
    "color: #cfded1;",
    "text-decoration: none;",
    //"border-bottom: 1px solid #555555;",
"}",
".ability {",
    "float: left;",
    "cursor: default;",
"}",
"",
".itemBuyable {",
    "text-decoration: underline;",
    "color: #cfded1;",
    "cursor: pointer;",
"}",
"",
".itemExpensive {",
    "color: #57837c;",
"}",
"",
".itemAcquired {",
    "color: orange;",
"}",
"",
".price {",
    "float: right;",
    "cursor: default;",
"}",
"",
"hr {",
//    "border-top: 1px dashed #8c8b8b;",
    "border-top: 1px dashed #385651;",
    "border-bottom: 0;",
    "margin-top: 5px;",
    "margin-bottom: 15px;",
    "width: 100%;",
"}",
"",
"#description {",
    "text-align: center;",
    "opacity: 0.3;",
"}",
"#toolTip {",
    "background-color: black;",
    "color: white;",
    "//display: none;",
    "visibility: hidden;",
    "position: absolute;",
    "top:0;",
    "left:0;",
    "padding: 10px;",
    "margin-top: 10px;",
    "z-index: 2001;",
    "cursor: default;",
"}",
"",
"#startButton {",
    "width: 440px;",
    "height: 30px;",
    "//background-color: gray;",
    //"border: 1px solid white;",
    //"color: white;",
    "color: #c4b054;",
    "border: 1px solid #c4b054;",
    //"opacity: 0.58;",
    "cursor: pointer;",
    "text-align: center;",
    "line-height: 30px;",
    "position: absolute;",
    "bottom: 20px;",
    "left: 50%;",
    "transform: translate(-50%, 0%);",
"}",
".okButton {",
    "width: 90%;",
    "height: 30px;",
    "//background-color: gray;",
    //"border: 1px solid white;",
    //"color: white;",
    "color: #c4b054;",
    "border: 1px solid #c4b054;",
    //"opacity: 0.58;",
    "cursor: pointer;",
    "text-align: center;",
    "line-height: 30px;",
    "position: absolute;",
    "bottom: 15px;",
    "left: 50%;",
    "transform: translate(-50%, 0%);",
"}",
"#logo {",
    "color: #ffe049;",
    "font-size: 50px;",
"}",
"#about {",
    "color: #ffdc36;",
    "cursor: pointer;",
    "position: absolute;",
    "bottom: 20px;",
    "right: 15px;",
    "opacity: 0.5;",
"}",
"",
".header {",
    "text-align: center;",
    "color: #cfded1;",
    //"color: #ffdc36;",
    //"font-size: 50px;",
"}",
".stretch {",
    "width: 100%;",
    "display: inline-block;",
    "line-height: 0;",
"}",
".menuHr {",
    "border-top: 1px solid #3b3a3a;",
    "border-bottom: 0;",
    "border-left: 0;",
    "border-right: 0;",
"}",
"",
"input {",
    "float: right;",
    "background-color: rgba(0,0,0,0);",
    //"color: #cfded1;",
    "color: #ffe56a;",
    //"border: 1px solid #cfded1;",
    "border: 1px solid #bababa;",
    //"font-family: 'Roboto';",
    "font-family: 'Audiowide', cursive;",
    //"font-size: 17px;",
    "font-size: 15px;",
    "padding: 7px;",
    "transform: translate(0%, -4px);",
"}",
"select {",
    "display: inline-block;",        
    "width: 60px;",
    "height: 30px;",
    //"float: right;",
    "background-color: rgba(0,0,0,0);",
    //"color: #cfded1;",
    "color: #e2e2e2;",
    //"border: 1px solid #cfded1;",
    "border: 1px solid #bababa;",
    //"font-family: 'Roboto';",
    "font-family: 'Audiowide', cursive;",
    //"font-size: 17px;",
    "font-size: 13px;",
    "padding: 7px;",
    "transform: translate(0%, -4px);",
"}",
".selectOption {",
    "background-color: rgba(0,0,0,1);",
    "color: #e2e2e2;",
"}",
"",
".checkbox {",
    "display: inline-block;",        
    "width: 18px;",
    "height: 18px;",
//"    border: 1px solid #57837c;",
"    border: 1px solid #c4b054;",
"   color: #ffe56a;",
//"    float: right;",
"    font-size: 18px;",
"    text-align: center;",
"    line-height: 18px;",
"    cursor: pointer;",
"}",
"",
".settingsContainer {",
"    white-space: nowrap;",
"    text-align: center;",
"}",
"",
".checkboxDisabled {",
    "display: inline-block;",
    "width: 18px;",
    "height: 18px;",
"    border: 1px solid #57837c;",
//"    float: right;",
"    font-size: 18px;",
"    text-align: center;",
"    line-height: 18px;",
"}",
"",
".checkboxLabel {",
    "width: 18px;",
    "height: 18px;",
    "border: 1px solid #cfded1;",
    //"float: right;",
"}",
".settingGroup {",
    //"width: 175px;",
    "display: inline-block;",
    "vertical-align: middle;",
            
    "padding-right: 53px;",
    //"padding-right: 27px;",
    //"font-size: 11px;",
"}",
".userNameDiv {",
    "width: 350px;",
    "margin-left: auto;",
    "margin-right: auto;",
"}",
"",
".setting {",
    "float: left;",
    "display: inline-block;",
    "color: #bababa;",
    "padding-right: 15px;",
    //"padding-right: 5px;",
"}",
"",
".menuTips {",
    "color: #ffdc36;",
    "line-height: 20px;",
    "word-spacing: 3px;",
"}",
".date {",
    "color: #ffdc36;",
    "display: inline;",
"}",
"",
".mh {",
    "display: inline;",
    "color: orange;",
"}",
"",
".mu {",
    "color: white;",
    "display: inline;",
    "//text-decoration: underline;",
    "border-bottom: 1px dashed #cfded1;",
"}",
"",
".won {",
    "text-align: center;",
    "font-size: 30px;",
"}",
"",
".highscores {",
    "width: 100%;",
    "line-height: 24px;",
"}",
"",
"table {",
    //"font-family: 'Roboto';",
    //"font-size: 15px;",
    "font-family: 'Audiowide', cursive;",
    "text-transform: uppercase;",
    "font-size: 13px;",
"}",
"#startMenuPlayText {",
    '    transform: translate(0%, -100%);',
 'text-shadow: 0 0 3px #000000;',
"}",
"",
".ml {",
    "display: inline;",
    "font-size: 150%;",
"}",
"th {",
    "font-weight: normal;",
    "text-align: left;",
"}"].join("\n");
        
        var style = document.createElement('style');
        style.type = 'text/css';
        if (style.styleSheet) {
          style.styleSheet.cssText = css;
        } else {
          style.appendChild(document.createTextNode(css));
        }

        document.head.appendChild(style);
    };


    createCss();

    showSplash();
    
    app.on('preload:start', function() {
        var img = app.assets.findByTag("controlsImg")[0];
        if (!img) {
            console.log("No controls img");
            return;
        }
        var imgUrl = img.getFileUrl();
        console.log(imgUrl);
        imgControls.src = imgUrl;
        
        var imgBg = app.assets.findByTag("blurBg")[0];
        if (!imgBg) {
            console.log("No BG img");
            return;
        }
        var imgBgUrl = imgBg.getFileUrl();
        console.log(imgBgUrl);
        var splash = document.getElementById("application-splash-wrapper");
        splash.style.backgroundImage = 'url("' +imgBgUrl + ')'; // optimized for aspectRatio = 2.8376623376623376
        var screenWidth = document.documentElement.clientWidth;
        var screenHeight = document.documentElement.clientHeight;
        var screenAspect = screenWidth / screenHeight;
        var imgAspect = 2.8376623376623376;
        splash.style.backgroundSize = (screenWidth * (imgAspect / screenAspect)) + "px " + screenHeight + "px";
    });
    
    app.on('preload:end', function () {
        app.off('preload:progress');
    });
    app.on('preload:progress', setProgress);
    app.on('start', hideSplash);
    
    app.startOld = app.start;
    app.start = function() {
        //return app.startOld();
        
        var device = app.graphicsDevice;
        
        var cacheVersion = device.webgl2 ? "shaderCacheGL2" : "shaderCache";
        var shaderCacheAsset = app.assets.findByTag(cacheVersion)[0];
        if (!shaderCacheAsset)
            return app.startOld();
        
        var cache = device.programLib._cache;
        
        var shaders = shaderCacheAsset.resource.split('^SH^');
        var shadersTotal = shaders.length;
        var shadersCompiled = 0;
        
        var compileBudget = 50;
        var compileStart = Date.now();
        
        var compileQueue = function() {
            compileStart = Date.now();
            compileNext();
        };
        
        var compileNext = function() {
            if (shaders.length === 0) {
                //var status = document.getElementById('progress-status');
                //if (status) status.textContent = 'initializing';
                
                return requestAnimationFrame(function() {
                    app.startOld();
                });
            }
            
            var str = shaders.shift();
            
            if (!str) return compileNext();
            
            var vsStart = str.indexOf("^VS^");
            var psStart = str.indexOf("^PS^");
            var atStart = str.indexOf("^AT^");
            
            var entry = str.substring(0, vsStart);
            if (cache[entry]) return compileNext();
            
            var vsCode = str.substring(vsStart + 4, psStart);
            var psCode = str.substring(psStart + 4, atStart);
            var attribsString = str.substring(atStart + 4, str.length);
            
            var a1 = attribsString.split(",");
            var attribs = { };
            for(var j = 0; j < a1.length - 1; j += 2)
                attribs[a1[j]] = a1[j + 1];
            
            var def = {
                vshader: vsCode,
                fshader: psCode,
                attributes: attribs
            };
            
            cache[entry] = new pc.Shader(device, def);
            device.setShader(cache[entry]);
            shadersCompiled++;
            
            if ((Date.now() - compileStart) < compileBudget) {
                compileNext();
            } else {
                //var status = document.getElementById('progress-status');
                //if (status) status.textContent = shadersCompiled + ' / ' + shadersTotal + ' shaders compiled';
                console.log(shadersCompiled + ' / ' + shadersTotal + ' shaders compiled');
                
                setProgress2((shadersCompiled / shadersTotal)*0.3 + 0.7);
                requestAnimationFrame(compileQueue);
            }
        };
        //var status = document.getElementById('progress-status');
        //if (status) status.textContent = shadersCompiled + ' / ' + shadersTotal + ' shaders compiled';
        console.log(shadersCompiled + ' / ' + shadersTotal + ' shaders compiled');
        setProgress2(shadersCompiled / shadersTotal + 1.0);
        requestAnimationFrame(compileQueue);
    };
});