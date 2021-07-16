const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose')
const DBCONNECTION_URL = "mongodb+srv://darwin:darwin@cluster0.ismdm.mongodb.net/myFirstDatabase?retryWrites=true&w=majority"
const connection = mongoose.connect(DBCONNECTION_URL,{useNewUrlParser : true , useUnifiedTopology : true},function(error){
    if(error){
      console.log(error)
    }
    else {
      console.log("DB connected")
    }
})

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
  try {
    const Roomodel = await Rooms.find({},function(err,room){
      if(err){
        throw err
      }
    room.forEach(function(Room){
      user_map.push({users:Room.users , room_name : Room.roomName , room_count : Room.users.length}) 
    })
    res.render('firstpage',{user_map : user_map})
  })
  }
  catch(err){
    console.log(err)
  } 
})

app.post('/createRoom', (req, res) => {
  const roomId = uuidV4()
  const room_name = req.body.room_name
  const user_name = req.body.user_name
  req.session.room_name = room_name
  req.session.user_name = user_name
  res.redirect(`/${roomId}`)
})

app.get('/:room',async (req,res) => {
  var room_name = req.session.room_name
  var user_name = req.session.user_name
  if(room_name == undefined){
    try {
      room_name = await Rooms.find({roomid : req.params.room},function(err,res){
        if(err)
          throw err
        room_name = res.roomName
      })
    }
    catch(err){
      console.log(err)
    }
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
  socket.on('join-room', async (roomId, userId , roomname, username , isspeaker) => {
    console.log("connected")
    const update = {"$push" : {"users" : userId},"roomName" : roomname}
    try {
      const Roommodel = await Rooms.findOne({roomid: roomId},async function(err,res){
        if(res == undefined){
          var user_obj = {}
          user_obj['user_id'] = userId
          user_obj['user_name'] = username
          var createroom = new Rooms()
          createroom.roomid = roomId
          createroom.roomname = roomname
          createroom.users = user_obj
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