var http = require('http');
var uuid = require('node-uuid');
var EventEmitter = require('events').EventEmitter;
var WebSocketServer = require('websocket').server;

var Connection = require('./Connection.js');

var protocol = require('./protocol.js');
var MESSAGE_TYPE = protocol.MESSAGE_TYPE;
var PROTOCOL_NAME = protocol.NAME;

var DEFAULT_PORT = 20500;

var Server = module.exports = function(wsServer){
    this.emitter = new EventEmitter();
    this.wsServer = wsServer;

    this.connectionMap = {};
    this.connectionList = [];

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

    server = new Server(options.wsServer);
    return server.getApi();
};

Server.prototype.getApi = function(){
    var api = {};

    api.on = this.emitter.on.bind(this.emitter);
    api.removeListener = this.emitter.removeListener.bind(this.emitter);

    Object.defineProperty(api, 'connections', {
        get: this.getConnections.bind(this)
    });

    return api;
};

Server.prototype.connectionHandler = function(request){
    var id = uuid.v4();
    var connection = Connection.create(id, request.accept(PROTOCOL_NAME, request.origin));
    
    connection.on('message', this.messageHandler.bind(this, connection));
    connection.on('close', this.connectionCloseHandler.bind(this, connection));

    this.connectionMap[id] = connection;
    this.connectionList.push(connection);

    this.emitter.emit('connection', connection);
};

Server.prototype.getConnections = function(){
    return this.connectionList.slice(0);
};

Server.prototype.broadcast = function(message){
    var connections = this.connectionList,
        index = 0,
        length = connections.length;

    for(; index < length; index++){
        connections[index].send.apply(connections[index], arguments);
    }
};

Server.prototype.connectionCloseHandler = function(connection){
    var index = this.connectionList.indexOf(connection);
    this.connectionList.splice(index, 1);
    delete this.connectionMap[connection.id];
};

Server.prototype.messageHandler = function(origin, message){
    switch(message[0]){
        case MESSAGE_TYPE.RELAY:
            this.relay(
                origin, 
                message[1], // detinationId
                message[2]  // message
            );
        break;
    }
};

Server.prototype.relay = function(origin, destinationId, message){
    var destination = this.connectionMap[destinationId];
    if(!destination) return;
    
    destination.relayed(
        origin.id,
        message
    );
};
