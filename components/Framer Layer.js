/**
1. Go to http://app.flowhub.io/
2. Open or create a project
3. Create a new component
4. Paste all this code into the *Implementation* section
5. Switch back to the graph editor
6. Search for this component
  * Note: You can't skip this part! There's a bug in the noflo-ui that makes it impossible to insert a component without searching first. This is beta software.
7. Insert an instance of this component
8. Press the play button in the *Preview* section on the right side of the graph editor UI

You should see a blue square
*/
exports.getComponent = getFramerLayerComponent;
var noflo = require('noflo');

function LayerManager(){}
LayerManager.prototype = {
  _layer: null,
  destroy: function(){
    if (this._layer == null) return;
    this._layer.destroy();
    this._layer = null;
  },
  findOrCreate: function(callback){
    if (this._layer != null) return callback(null, this._layer);
    var self = this;
    onFramerReady(function(error, Framer){
      if (error) return callback(error);
      if (self._layer == null && self._name) {
        self._layer = Framer.Layer.Layers().filter(function(layer){return layer.name == self._name})[0];
      }
      if (self._layer == null) self._layer = new Framer.Layer({name:self._name});
      self._name = self._layer.name;
      callback(null, self._layer);
    });
  },
  set: function(key, value){
    if (key == 'name') this._name = value;
    if (this._layer == null) return this.findOrCreate(function(error, layer){
      layer[key] = value;
    });
    this._layer[key] = value;
  },
  subscribeClick: function(callback){
    this.findOrCreate(function(error, layer){
      layer.on(Framer.Events.Click, function(){
        callback();
      });
    });
  },
  subscribe: function(event, callback){
    this.findOrCreate(function(error, layer){
      layer.on(event, callback);
    });
  },
  unsubscribe: function(event, callback){
    if (!this._layer) return;
    var layer = this._layer;
    layer.off(event, callback);
  },
}

////////////////////////////////////////////////////////////////////////////////

function getFramerLayerComponent() {
  var layerManager = new LayerManager;

  function defaultCallback(error){
    console.error(error);
    // c.outPorts.error.send(error);
  }
  function setterFor(key){
    return function(event, payload){
      if (event != 'data') return;
      layerManager.set(key, payload);
    }
  }
  
  var c = new noflo.Component({
    inPorts:{

      exists: {
        datatype: 'boolean',
        process: function(event, payload){
          if (event != 'data') return;
          layerManager[payload ? 'destroy' : 'findOrCreate'](defaultCallback);
        },
      },

      name: { datatype: 'string', process: setterFor('name') },

      x: { datatype: 'number', process: setterFor('x') },
      y: { datatype: 'number', process: setterFor('y') },
      width: { datatype: 'number', process: setterFor('width') },
      height: { datatype: 'number', process: setterFor('height') },

      origin_x: { datatype: 'number', process: setterFor('originX') },
      origin_y: { datatype: 'number', process: setterFor('originY') },

      rotation_x: { datatype: 'number', process: setterFor('rotationX') },
      rotation_y: { datatype: 'number', process: setterFor('rotationY') },
      rotation_z: { datatype: 'number', process: setterFor('rotationZ') },

      scale_x: { datatype: 'number', process: setterFor('scaleX') },
      scale_y: { datatype: 'number', process: setterFor('scaleY') },
      scale_z: { datatype: 'number', process: setterFor('scaleZ') },

      visible: { datatype: 'boolean', process: setterFor('visible') },
      opacity: { datatype: 'number', process: setterFor('opacity') },
      clip: { datatype: 'boolean', process: setterFor('clip') },

    },
    outPorts: {
      // error:{datatype:'object'},
      clicked:{datatype:'boolean'},
      touching:{datatype:'boolean'},
    }
  });
  c.outPorts.clicked.once('attach', function(){
    c.outPorts.clicked.send(false);
    layerManager.subscribeClick(function(){
      c.outPorts.clicked.send(true);
      setTimeout(function(){
        c.outPorts.clicked.send(false);
      }, 100);
    });
  });
  function onTouchStart(){
    c.outPorts.touching.send(true);
  }
  function onTouchEnd(){
    c.outPorts.touching.send(false);
  }
  c.outPorts.touching.on('attach', function(){
    onTouchEnd();
    onFramerReady(function(error, Framer){
      if (error) return console.error(error);
      layerManager.subscribe(Framer.Events.TouchStart, onTouchStart);
      layerManager.subscribe(Framer.Events.TouchEnd, onTouchEnd);
    });
    c.outPorts.touching.on('detach', function(){
      if (c.outPorts.touching.isAttached()) return;
      layerManager.unsubscribe(Framer.Events.TouchStart, onTouchStart);
      layerManager.unsubscribe(Framer.Events.TouchEnd, onTouchEnd);
    });
  });
  return c;
}

////////////////////////////////////////////////////////////////////////////////

function loadScript(src){
  var firstScript = document.getElementsByTagName('script')[0];
  var firstScriptParent = firstScript.parentNode;
  var newScript = document.createElement('script');
  newScript.src = src;
  firstScriptParent.insertBefore(newScript, firstScript);
}

onFramerReady.URI = 'http://builds.framerjs.com/293c7a7/framer.js';
onFramerReady.TIMEOUT = 50;
onFramerReady.MAX_ATTEMPTS = 5000 / onFramerReady.TIMEOUT;
function onFramerReady(callback){
  if (typeof Framer == 'object' && typeof Layer == 'function'){
    onFramerReady = function(callback){ callback(null, Framer) };
    callback(null, Framer);
    return;
  }
  if (!onFramerReady.isTrying) {
    loadScript(onFramerReady.URI);
    onFramerReady.isTrying = true;
  }
  callback._onFramerReady_attempts = (callback._onFramerReady_attempts || 0) + 1;
  if (callback._onFramerReady_attempts > onFramerReady.MAX_ATTEMPTS){
    callback(Error("Looks like Framer isn't loading (_onFramerReady_attempts exceeded MAX_ATTEMPTS while waiting for '" + onFramerReady.URI + "' to load)"));
    return;
  }
  setTimeout(function(){
    onFramerReady(callback);
  }, onFramerReady.TIMEOUT);
}
