var EventEmitter = require('events').EventEmitter;
var protocol = require('./protocol.js');
var MESSAGE_TYPE = protocol.MESSAGE_TYPE;
var PROTOCOL_NAME = protocol.NAME;

var Connection = module.exports = function(address, peers, connection){
	this.address = address;
    this.peers = peers;
    this.connection = connection;
    this.emitter = new EventEmitter();

    connection.on('message', this.messageHandler.bind(this));
    connection.on('close', this.closeHandler.bind(this));
};

Connection.create = function(address, peers, connection){
	var connection = new Connection(address, peers, connection);
	return connection.getApi();
};

Connection.prototype.getApi = function(){
	return {
        address: this.address,
        send: this.send.bind(this),
        relay: this.relay.bind(this),
        relayed: this.relayed.bind(this),
        on: this.emitter.on.bind(this.emitter),
        removeListener: this.emitter.removeListener.bind(this.emitter)
    };
};

Connection.prototype.messageHandler = function(message){
    console.log('message', message);

    if(message.type === "utf8"){
        message = JSON.parse(message.utf8Data);

        switch(message[0]){
            case MESSAGE_TYPE.PLAIN:
                this.emitter.emit('message', message[1]);
                break;
            case MESSAGE_TYPE.RELAY:
                this.relayHandler(
                    message[1], // detinationId
                    message[2]  // message
                );
                break;
        }
    }
};

Connection.prototype.closeHandler = function(){
    this.emitter.emit('close');
};

Connection.prototype.send = function(message){
    if(message instanceof ArrayBuffer){
        this.connection.sendBinary(message);
    } else {
        this.sendProtocolMessage([MESSAGE_TYPE.PLAIN, message]);
    }
};

Connection.prototype.sendProtocolMessage = function(message){
    var message = JSON.stringify(message);
    this.connection.sendUTF(message);
};

Connection.prototype.relayHandler = function(destination, message){
    var peer = this.peers.get(destination);
    if(!peer) return;

    peer.relayed(this.address, message);
};

Connection.prototype.relay = function(remoteId, message){
    this.sendProtocolMessage([MESSAGE_TYPE.RELAY, remoteId, message]);
};

Connection.prototype.relayed = function(remoteId, message){
    this.sendProtocolMessage([MESSAGE_TYPE.RELAYED, remoteId, message]);
};
