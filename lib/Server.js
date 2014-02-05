var http = require('http');
var uuid = require('node-uuid');
var EventEmitter = require('events').EventEmitter;
var WebSocketServer = require('websocket').server;

var Connection = require('./Connection.js');
var ConnectionManager = require('./ConnectionManager.js');

var protocol = require('./protocol.js');
var MESSAGE_TYPE = protocol.MESSAGE_TYPE;
var PROTOCOL_NAME = protocol.NAME;

var DEFAULT_PORT = 20500;

var Server = module.exports = function(wsServer, connectionManager){
    var emitter = this.emitter = new EventEmitter();
    this.wsServer = wsServer;

    this.peers = connectionManager;

    this.peers.onAdd = function(peer){
        emitter.emit('connection', peer);
    };

    this.peers.onRemove = function(peer){
        emitter.emit('disconnection', peer);
    };

    this.wsServer.on('request', this.connectionHandler.bind(this));
};

// constructor function
Server.create = function(options){
    var host,
        server;

    options = options || {};
    if(options.host){
        host = options.host.split(':');

        if(!('hostname' in options)) options.hostname = host[0];
        if(!('port' in options) && host[1]) options.port = host[1];
    }

    if(!('port' in options)) options.port = DEFAULT_PORT;

    if(!('httpServer' in options)){
        options.httpServer = http.createServer();

        console.log('onramp listening on ' + (options.hostname? options.hostname : "*") + ":" + options.port);

        options.httpServer.listen(options.port, options.hostname || void 0);
    }

    if(!('wsServer' in options)){
        options.wsServer = new WebSocketServer({
            httpServer: options.httpServer,
            autoAcceptConnections: false
        });
    }

    var connectionManager = new ConnectionManager();

    server = new Server(options.wsServer, connectionManager);
    return server.getApi();
};

Server.prototype.getApi = function(){
    var api = {};

    api.on = this.emitter.on.bind(this.emitter);
    api.removeListener = this.emitter.removeListener.bind(this.emitter);

    Object.defineProperty(api, 'connections', {
        get: this.peers.get.bind(this.peers)
    });

    return api;
};

Server.prototype.connectionHandler = function(request){
    var address = uuid.v4(),
        peers = this.peers,
        peer = Connection.create(address, this.peers, request.accept(PROTOCOL_NAME, request.origin));
    
    peers.add(peer);

    peer.on('close', function(){
        peers.remove(peer);
    });
};
