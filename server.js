const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose')
const DBCONNECTION_URL = "mongodb://localhost/audioroom"
try {
   mongoose.connect(
    DBCONNECTION_URL,
    { useNewUrlParser: true, useUnifiedTopology: true },
    () => console.log("DB is connected")
  );

} catch (e) {
  console.log("could not connect");
}

const Rooms = require('./models/Rooms')

app.use(session({secret: 'mySecret', resave: false, saveUninitialized: false}));
app.set('view engine', 'ejs')
app.use(express.static('public'))

app.use(bodyParser.urlencoded({ extended: true }))

app.get("/",(req,res) => {
  res.redirect("/firstpage")
})

app.get('/firstpage',async (req,res) => {
  var user_map = []
  const Roomodel = await Rooms.find({},function(err,res){
    if(err){
      throw err
    }
    res.forEach(function(Room){
      user_map.push({users:Room.users , room_name : Room.roomName , room_count : Room.users.length, link: "http://localhost:3000/"+Room.roomid}) 
    })
  })
  res.render('firstpage',{user_map : user_map})
})

app.post('/createRoom', (req, res) => {
  const roomId = uuidV4()
  const room_name = req.body.room_name
  const user_name = req.body.user_name
  const room_desc = req.body.room_desc
  req.session.room_name = room_name
  req.session.user_name = user_name
  req.session.room_desc = room_desc
  res.redirect(`/${roomId}`)
})

app.get('/:room',(req,res) => {
  var room_name = req.session.room_name
  var user_name = req.session.user_name
  if(room_name == undefined){
    room_name = Rooms.find({roomid : req.params.room},function(err,res){
      if(err)
        throw err
      room_name = res.roomName
    })
  }
  if(user_name == undefined){
    user_name = "anonymous"
  }
  res.render('room', { roomId: req.params.room , room_name : room_name , user_name : user_name})
})

app.post('/joinRoom',(req,res) => {
  const room_url = req.body.room_url
  const join_name = req.body.join_name
  req.session.user_name = join_name
  req.session.room_name = ""
  res.redirect(room_url)
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId , roomname, username) => {
    const filter = {roomid : roomId}
    const update = {"$push" : {"users" : userId},"roomName" : roomname}
    const Roommodel = Rooms.findOneAndUpdate(filter,update,{
      new :true,
      upsert : true,
    },function(err,res){
      if(err)
        throw err
      console.log(res)
    })
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)

    socket.on('disconnect', () => {
      console.log("disconnect")
      const filter = {roomid : roomId}
      const update = {"$pull" : {"users" : userId}}
      const Roommodel = Rooms.findOneAndUpdate(filter,update,{
        new :true,
        upsert : true,
      },function(err,res){
        if(err){
          throw err
        }
        console.log(res)
      })
      // const deletewhenrequired = Rooms.findOneAndDelete({"users" : {"$size" : 0}},function(err,res){
      //   if(err)
      //     throw err
      //   console.log(res)
      // })
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })
})


server.listen(3000)