const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose')
const DBCONNECTION_URL = "mongodb+srv://darwin:darwin@cluster0.ismdm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
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

const { PeerServer } = require('peer');

const peerServer = PeerServer({ port: 9000});

app.use(session({secret: 'mySecret', resave: false, saveUninitialized: false}));
app.set('view engine', 'ejs')
app.use(express.static('public'))

app.use(bodyParser.urlencoded({ extended: true }))

app.get("/",(req,res) => {
  res.redirect("/firstpage")
})

app.get('/firstpage',async (req,res) => {
  var user_map = []
  try {
    const Roomodel = await Rooms.find({},function(err,room){
      if(err){
        throw err
      }
     for(var i in room){
       var obj = {}
       obj['created_by'] = room[i].created_by
       obj['roomName'] = room[i].roomName
       obj['roomDesc'] = room[i].roomDesc
       obj['room_link'] = room[i].roomid
       user_map.push(obj)
     }
    res.render('firstpage',{user_map : user_map})
  })
  }
  catch(err){
    console.log(err)
  } 
})

app.post('/createRoom', async (req, res) => {
  const roomId = uuidV4()
  const room_name = req.body.room_name
  const user_name = req.body.user_name
  const room_desc = req.body.room_desc
  req.session.room_name = room_name
  req.session.user_name = user_name
  req.session.room_desc = room_desc
  req.session.from_create = true
  res.redirect(`/${roomId}`)
})

app.get('/:room', async (req,res) => {
  var user_name = req.session.user_name
  var room_desc = req.session.room_desc
  var room_name = req.session.room_name
  var from_create = req.session.from_create
  var from_speaker = req.session.from_speaker
  var speakers = []
  var members = []
  console.log("user_name"+user_name)
  if(user_name == undefined){
    res.redirect("/firstpage")
  }
  else {
    try {
      const roommodel = await Rooms.findOne({roomid : req.params.room}, function(err,room){
        if(err)
        {
          throw err
        }
        else {
          if(room_name == undefined && room != null){
            room_name = room.roomName
          }
          if(room_desc == undefined && room != null){
            room_desc = room.roomDesc
          }

          if(from_speaker){
            var obj = {}
            obj['user_name'] = user_name
            speakers.push(obj)
          }
          if(room == undefined && from_create){
            var obj = {}
            obj['user_name'] = user_name
            speakers.push(obj) 
          }
          else {
            if(room.speakers.length > 0){
              for(var i in room.speakers){
                var obj = {}
                obj['user_name'] = room.speakers[i].user_name
                speakers.push(obj)
              }
            }

            if(room.members.length > 0){
              for(var i in room.members){
                var obj = {}
                obj['user_name'] = room.members[i].user_name
                members.push(obj)
              }
            }
            else {
              if(from_create == undefined){
                var obj = {}
                obj['user_name'] = room.members[i].user_name
                members.push(obj)
              }
            }
          }
          res.render('room', { roomId: req.params.room , room_name : room_name , user_name : user_name , room_desc : room_desc ,speakers : speakers , members : members})  
        }
      })
    }
    catch(err){
      console.log(err)
    }
  }
})

app.post('/joinRoom', async (req,res) => {
  const room_url = req.body.room_url
  const join_name = req.body.join_name
  req.session.user_name = join_name
  req.session.from_join = true
  res.redirect(`/${room_url}`)
})

app.get('/inviteSpeaker/:room',async (req,res) => {
  const room_url = req.params.room
  console.log(room_url)
  res.render("invitespeaker",{roomId : room_url})
})

app.post('/inviteSpeaker', async(req,res) => {
  const room_url = req.body.room_url
  const user_name = req.body.join_name
  req.session.from_speaker = true
  req.session.user_name = user_name
  res.redirect(`${room_url}`)
  
})

io.on('connection', socket => {
  socket.on('join-room', async (roomId, userId , roomname, username , room_desc , isspeaker) => {
    console.log("connected")
    try {
      const Roommodel = await Rooms.findOne({roomid: roomId},async function(err,res){
        if(res == undefined){
          var user_obj = {}
          user_obj['user_id'] = userId
          user_obj['user_name'] = username
          var createroom = new Rooms()
          createroom.roomid = roomId
          createroom.roomName = roomname
          createroom.users = user_obj
          createroom.roomDesc = room_desc
          createroom.created = new Date()
          createroom.speakers = user_obj
          createroom.members = {}
          createroom.created_by = username
          createroom.save(function(err,data){
            if(err){
              console.log(err)
            }
            else {
              console.log("create room")
              console.log(data)
            }
          })
        }
        else {
            $update = {}
            $user_obj = {}
            $user_obj['user_id'] = userId
            $user_obj['user_name'] = username
            if(isspeaker){
              $update['$push'] = {"speakers" : $user_obj}
            }
            else {
              $update['$push'] = {"members" : $user_obj}
            }
            await Rooms.findOneAndUpdate({roomid:roomId},$update,async function(err,res){
              if(err){
                console.log(err)
              }
              else {
                console.log("join room")
                console.log(res)
              }
            })
        }
      });
    }
    catch(err){
      console.log(err)
    }
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)
    
    socket.on('disconnect', async () => {
      console.log('disconnected')
      const filter = {roomid : roomId}
      const Roommodel = await Rooms.findOne(filter , async function(err,res){
        if(res == undefined){
          console.log(err)
        }
        else if(res != undefined){
          $update = {}
          $remove = false
          $is_found_in_speaker = false
          $is_found_in_member = false
          for(var i in res.speakers){
            if(res.speakers[i].user_id == userId){
              $is_found_in_speaker = true;
              if(i == 0){
                $remove = true;
              }
            }
          }
          for(var i in res.members){
            if(res.members[i].user_id == userId){
              $is_found_in_member = true;
            }
          }
          if($is_found_in_speaker){
            $update['$pull'] = {'speakers' : {'user_id' : userId}}
          }
          else if($is_found_in_member){
            $update['$pull'] = {'members' : {'user_id' : userId}}
          }
          console.log($update)
          if($remove){
            await Rooms.findOneAndDelete(filter,async function(err,res){
              if(err){
                console.log(err)
              }
              else {
                console.log(res)
              }
            })
          }
          else {
            await Rooms.findOneAndUpdate(filter,$update, async function(err,res){
              if(err){
                console.log(err)
              }
              else {
                console.log(res)
              }
            })
          }
        }
      })
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })

})
server.listen(process.env.PORT || 3000)