const UPDATE_INTERVAL_MS = 1000;
const TIMEOUT_MS = 5000;
const COOLDOWN_INTERVALS = Math.floor(TIMEOUT_MS / UPDATE_INTERVAL_MS);
const COOLDOWN_COUNTER_KEY = "cooldownCounter";
const COOLDOWN_SHADED_IMG_KEY = "cooldownShadedImage";
const COOLDOWN_READY_IMG_KEY = "cooldownReadyImage";
const BACKGROUND_IMAGE_PATH = "images/button-background.png";
const CANVAS_WIDTH = 72;
const CANVAS_HEIGHT = 72;

var websocket = null;
var pluginUUID = null;

var DestinationEnum = Object.freeze({"HARDWARE_AND_SOFTWARE":0, "HARDWARE_ONLY":1, "SOFTWARE_ONLY":2})

var timer;

var cooldownAction = {		
    
    type : "com.check6soft.cooldown.action",
    timer: null,
    timeoutTimer: null,

    getStoreKey : function(store, key, defaultValue) {
        var result = defaultValue;
        if(store != null && store.hasOwnProperty(key)){
            result = store[key];
        }
        return result;
    },
    
    setStoreKey : function(store, key, value) {
        if (store == null) {
            store = {};
        }

        store[key] = value;
        return store;
    },

    getImage : async function(imgSource, shaded) {
        var canvas = document.createElement('canvas');
        canvas.width = CANVAS_WIDTH;
        canvas.height = CANVAS_HEIGHT;

        var ctx = canvas.getContext('2d');
       
        var loadedPromise = new Promise((resolve) => {
            const img = new Image();
            img.src = imgSource;
            img.onload = () => {
                ctx.drawImage(img, 0, 0);
                if (shaded) {
                    ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                }
                resolve();
            };
        });

        await loadedPromise;
        return canvas.toDataURL();
    },

    finalize : function() {
        if (this.timer != null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
        
        if (this.timeoutTimer != null) {
            clearInterval(this.timeoutTimer);
            this.timeoutTimer = null;
        }
    },

    onKeyDown : function(context, settings, coordinates, userDesiredState) {
        if (this.timer == null) {
            var updatedSettings = this.setStoreKey(settings, COOLDOWN_COUNTER_KEY, COOLDOWN_INTERVALS);

            // Initialize the title
            this.SetImage(context, updatedSettings[COOLDOWN_SHADED_IMG_KEY]);
            this.SetTitle(context, updatedSettings[COOLDOWN_COUNTER_KEY]);

            // Start the update timer- some grain of the timeout value
            this.timeoutTimer = setInterval(function () {
                var cooldownCounter = this.getStoreKey(updatedSettings, COOLDOWN_COUNTER_KEY, 0);
                cooldownCounter > 0 ? cooldownCounter-- : cooldownCounter = 0;

                updatedSettings = this.setStoreKey(updatedSettings, COOLDOWN_COUNTER_KEY, cooldownCounter);
                
                this.SetSettings(context, updatedSettings);
                this.SetTitle(context, cooldownCounter);

            }.bind(this), UPDATE_INTERVAL_MS);	

        
            this.timer = setTimeout(function () {
                var updatedSettings = this.setStoreKey(null, COOLDOWN_COUNTER_KEY, 0);
            
                this.SetSettings(context, updatedSettings);
                this.SetImage(context, updatedSettings[COOLDOWN_READY_IMG_KEY]);
                this.SetTitle(context, "");
                
                // Cleanup
                this.finalize();
            }.bind(this), TIMEOUT_MS);
        }
    },
    
    onKeyUp : function(context, settings, coordinates, userDesiredState) {
        
    },

    onWillAppear : function(context, settings, coordinates) {
        // Initialize the title
        settings = this.setStoreKey(settings, COOLDOWN_COUNTER_KEY, "");
        settings = this.setStoreKey(
            settings, 
            COOLDOWN_SHADED_IMG_KEY, 
            this.getImage(BACKGROUND_IMAGE_PATH, true)
        );
        settings = this.setStoreKey(
            settings, 
            COOLDOWN_READY_IMG_KEY, 
            this.getImage(BACKGROUND_IMAGE_PATH, false).await()
        );
        this.SetImage(context, settings[COOLDOWN_READY_IMG_KEY]);
        this.SetSettings(context, settings);
    },
    
    SetTitle : function(context, text) {
        var json = {
            "event": "setTitle",
            "context": context,
            "payload": {
                "title": "" + text,
                "target": DestinationEnum.HARDWARE_AND_SOFTWARE            }
        };
    
        websocket != null ? websocket.send(JSON.stringify(json)) :
            console.error("WebSocket is not connected");
     },
     
     SetImage : function(context, img) {
        var json = {
            "event": "setImage",
            "context": context,
            "payload": {
                "image": img,
                "target": DestinationEnum.HARDWARE_AND_SOFTWARE
            }
        };
    
        websocket != null ? websocket.send(JSON.stringify(json)) :
            console.error("WebSocket is not connected");
     },

     SetSettings : function(context, settings) {
        var json = {
            "event": "setSettings",
            "context": context,
            "payload": settings
        };
    
        websocket != null ? websocket.send(JSON.stringify(json)) :
            console.error("WebSocket is not connected");
     }
};

function connectElgatoStreamDeckSocket(inPort, inPluginUUID, inRegisterEvent, inInfo)
 {
     pluginUUID = inPluginUUID
     
    // Open the web socket
    websocket = new WebSocket("ws://127.0.0.1:" + inPort);
    cooldownAction.websocket = websocket;
    
    function registerPlugin(inPluginUUID)
     {
        var json = {
            "event": inRegisterEvent,
            "uuid": inPluginUUID
        };
    
        websocket != null ? websocket.send(JSON.stringify(json)) :
            console.error("WebSocket is not connected");
     };
    
    websocket.onopen = function()
    {
        // WebSocket is connected, send message
        registerPlugin(pluginUUID);
    };

    websocket.onmessage = function (evt)
    { 
        // Received message from Stream Deck
        var jsonObj = JSON.parse(evt.data);
        var event = jsonObj['event'];
        var action = jsonObj['action'];
        var context = jsonObj['context'];
        
        if(event == "keyDown")
        {
            var jsonPayload = jsonObj['payload'];
            var settings = jsonPayload['settings'];
            var coordinates = jsonPayload['coordinates'];
            var userDesiredState = jsonPayload['userDesiredState'];
            cooldownAction.onKeyDown(context, settings, coordinates, userDesiredState);
        }
        else if(event == "keyUp")
        {
            var jsonPayload = jsonObj['payload'];
            var settings = jsonPayload['settings'];
            var coordinates = jsonPayload['coordinates'];
            var userDesiredState = jsonPayload['userDesiredState'];
            cooldownAction.onKeyUp(context, settings, coordinates, userDesiredState);
        }
        else if(event == "willAppear")
        {
            var jsonPayload = jsonObj['payload'];
            var settings = jsonPayload['settings'];
            var coordinates = jsonPayload['coordinates'];
            cooldownAction.onWillAppear(context, settings, coordinates);
        }
    };

    websocket.onclose = function()
    { 
        // Websocket is closed
        cooldownAction.finalize();
    };
 };
