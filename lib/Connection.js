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
        on: this.emitter.on.bind(this.emitter),
        removeListener: this.emitter.removeListener.bind(this.emitter),
        ack: this.ack.bind(this)
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
	var stringified = JSON.stringify(message);
	this.connection.sendUTF(stringified);
};

Connection.prototype.ack = function(ackToken, err) {
    this.send([MESSAGE_TYPE.ACKNOWLEDGE, ackToken, err]);
};