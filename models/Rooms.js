const mongoose = require('mongoose')
var RoomSchema = new mongoose.Schema({
    roomid : {type : String , unique : true},
    roomName : String,
    users : Array,
    created : Date,
})

module.exports = mongoose.model('Rooms',RoomSchema)