var EventEmitter = require('events').EventEmitter;
var protocol = require('./protocol.js');
var MESSAGE_TYPE = protocol.MESSAGE_TYPE;
var PROTOCOL_NAME = protocol.NAME;

var Connection = module.exports = function(id, connection){
	this.id = id;
    this.connection = connection;
    this.emitter = new EventEmitter();

    connection.on('message', this.messageHandler.bind(this));
    connection.on('close', this.closeHandler.bind(this));
};

Connection.create = function(id, connection){
	var connection = new Connection(id, connection);
	return connection.getApi();
};

Connection.prototype.getApi = function(){
	return {
        id: this.id,
        send: this.send.bind(this),
        relay: this.relay.bind(this),
        relayed: this.relayed.bind(this),
        on: this.emitter.on.bind(this.emitter),
        removeListener: this.emitter.removeListener.bind(this.emitter)
    };
};

Connection.prototype.messageHandler = function(message){
    if(message.type === "utf8"){
        message = JSON.parse(message.utf8Data);
        this.emitter.emit("message", message);
    }
};

Connection.prototype.closeHandler = function(){
    this.emitter.emit('close');
};

Connection.prototype.send = function(message){
    if(message instanceof ArrayBuffer){
        this.connection.sendBinary(message);
    } else {
        this.sendProtocolMessage(MESSAGE_TYPE.PLAIN, Array.prototype.slice.call(arguments));
    }
};

Connection.prototype.sendProtocolMessage = function(messageType){
    var message = Array.prototype.slice.call(arguments);
    message = JSON.stringify(message);
    this.connection.sendUTF(message);
};

Connection.prototype.relay = function(remoteId, message){
    this.sendProtocolMessage(MESSAGE_TYPE.RELAY, remoteId, message);
};

Connection.prototype.relayed = function(remoteId, message){
    this.sendProtocolMessage(MESSAGE_TYPE.RELAYED, remoteId, message);
};
