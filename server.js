const express = require('express')
const app = express()
const server = require('http').Server(app)
const io = require('socket.io')(server)
const { v4: uuidV4 } = require('uuid')
const bodyParser = require('body-parser');
const session = require('express-session');
const mongoose = require('mongoose')
const request = require('request')
const nodemailer = require('nodemailer');
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

var transport = nodemailer.createTransport({
  host: "smtp.mailtrap.io",
  port: 2525,
  auth: {
    user: "c127613cab7c5e",
    pass: "32a37538ce66af"
  }
});

app.use(session({ secret: 'mySecret', resave: false, saveUninitialized: false }));
app.set('view engine', 'ejs')
app.use(express.static('public'))

app.use(bodyParser.urlencoded({ extended: true }))



app.get("/", async (req, res) => {
  res.redirect("/firstpage")
})

app.get("/favicon.ico" , async(req,res) => {
  res.send({"status" : "ok"})
})

app.get("/getMembers" , async(req,mainresponse) => {
  const room_id = "a991fa6a-af7f-4118-b5f7-32e6f8e43d0e"
  const room = Rooms.findOne({roomid : room_id}).then((res) => {
      var members = []
      console.log(res)
      if(res.members.length > 0){
        for(var i in res.members){
          if(res.members[i].user_id != undefined){
            var obj = {}
            obj['user_id'] = res.members[i].user_id
            obj['user_name'] = res.members[i].user_name
            members.push(obj)
          }
        }
      }
      mainresponse.send({"members" : members})
  })
  .catch(err => {
    console.log(err)
  })
})

app.get('/firstpage', async (req, res) => {
  var user_map = []
  try {
    Rooms.find({})
      .then(room => {
        for (var i in room) {
          var obj = {}
          obj['created_by'] = room[i].created_by
          obj['roomName'] = room[i].roomName
          obj['roomDesc'] = room[i].roomDesc
          obj['room_link'] = room[i].roomid
          user_map.push(obj)
        }
        res.render('firstpage', { user_map: user_map })
      })
      .catch(error1 => {
        console.log(err)
      });

  }
  catch (err) {

  }
})

app.get('/getSuggestions', async (req,mainresponse) => {
  var searchtext = req.query.searchinput
  var body = {
    "query": {
        "query_string": {
            "query": "*"+searchtext+"*",
            "fields": [
                "firstname^3",
                "lastname^2",
                "employee_no^1",
                "department_wo_code",
                "designation_wo_code",
                "email",
                "known_as_name"
            ]
        }
    },
    "sort": {
        "firstname": {
            "order": "asc"
        }
    },
    "size": 100,
    "filter": {
        "and": [
            {
                "terms": {
                    "status": [
                        1
                    ]
                }
            }
        ]
    }
}
  var resulthits = []
  request({
    "url" : "http://demo.darwinboxlocal.com:9200/2/user/_search",
    "json" : true,
    "body" : body,
    "method" : "POST",
    },
    function(err,response){
      if(err)
      throw err
      if(response.body.hits.total > 0){
        var hitobjects = response.body.hits.hits
        for(var i in hitobjects){
          var obj = {}
          obj['value'] = hitobjects[i]._source.fullname
          obj['id'] = [hitobjects[i]._source.email]
          resulthits.push(obj)
        }
      }
      mainresponse.send(resulthits)
    })
})

app.post("/sendEmails",async(req,mainresponse) => {
  const url = req.body.url
  const user_emails = req.body.user_emails
  var message = {
    from: "virtualcafe@darwinbox.com",
    subject: "You have been invited to the Audio Room",
    html: "<h1> Hello . You have been invited to the Audio Room.</h1> Please copy paste the url in browser of your choice . " + url
  }
  user_emails.forEach(val => {
    message['to'] = val
    transport.sendMail(message,function(err,res){
      if(err){
        console.log(err)
      }
      else {
        console.log(res)
      }
    })
  })
  mainresponse.send({"status" : "success"})
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

app.get('/:room', async (req, res) => {
  var user_name = req.session.user_name
  var room_desc = req.session.room_desc
  var room_name = req.session.room_name
  var from_create = req.session.from_create
  var from_speaker = req.session.from_speaker
  var speakers = []
  var members = []
  var isspeaker = undefined
  var ismember = undefined
  console.log("user_name" + user_name)
  if (user_name == undefined) {
    res.redirect("/firstpage")
  }
  else {
    try {
      const roommodel = Rooms.findOne({ roomid: req.params.room }).then((room) => {
          if (room_name == undefined && room != null) {
            room_name = room.roomName
          }
          if (room_desc == undefined && room != null) {
            room_desc = room.roomDesc
          }

          if (from_speaker) {
            var obj = {}
            obj['user_name'] = user_name
            speakers.push(obj)
            isspeaker = true
          }
          if (room == undefined && from_create) {
            var obj = {}
            obj['user_name'] = user_name
            speakers.push(obj)
            isspeaker = true
          }
          else {
            if (room.speakers.length > 0) {
              for (var i in room.speakers) {
                var obj = {}
                obj['user_name'] = room.speakers[i].user_name
                speakers.push(obj)
              }
            }

            if (room.members.length > 0) {
              for (var i in room.members) {
                var obj = {}
                obj['user_name'] = room.members[i].user_name
                members.push(obj)
              }
            }
            else {
              if (from_create == undefined) {
                var obj = {}
                obj['user_name'] = room.members[i].user_name
                members.push(obj)
                ismember = true
              }
            }
          }
          res.render('room', { roomId: req.params.room, room_name: room_name, user_name: user_name, room_desc: room_desc, speakers: speakers, members: members, isspeaker: isspeaker, ismember: ismember })
      })
      .catch(error1 => {
        console.log(error1);
      })
    }
    catch (err){
      console.log(err)
    }
  }
})

app.post('/joinRoom', async (req, res) => {
  const room_url = req.body.room_url
  const join_name = req.body.join_name
  req.session.user_name = join_name
  req.session.from_join = true
  res.redirect(`/${room_url}`)
})

app.get('/inviteSpeaker/:room', async (req, res) => {
  const room_url = req.params.room
  console.log(room_url)
  res.render("invitespeaker", { roomId: room_url })
})

app.post('/inviteSpeaker', async (req, res) => {
  const room_url = req.body.room_url
  const user_name = req.body.join_name
  req.session.from_speaker = true
  req.session.user_name = user_name
  res.redirect(`${room_url}`)
})

app.post('/makeSpeakers',async (req,mainresponse) => {
  const room_id = req.body.room_id
  const user_id = req.body.user_id
  const user_name = req.body.user_name
  $update = {}
  $update['$pull'] = { 'members': { 'user_id': user_id } }
  $update['$push'] = { 'speakers' : { 'user_id' : user_id , 'user_name' : user_name }}
  Rooms.findOneAndUpdate({ roomid: room_id }, $update).then((res) => {
    console.log(res)
  })
  .catch((err) => {
    console.log(err)
  })
  mainresponse.send("")
})

app.post('/getSpeakersAndMembers',async(req,response) => {
  const room_url = req.body.room_url
  const Roommodel = Rooms.findOne({roomid : room_url}).then((res) => {
    if(res == null){
      response.send({status : "0"})
      return
    }
    const speakers = res.speakers
    const members = res.members
    var speakers_res = [] 
    var members_res = []
    for(var i in speakers){
      var obj = {}
      obj['user_name'] = speakers[i].user_name
      obj['user_id'] = speakers[i].user_id
      speakers_res.push(obj)
    }
    for(var j in members){
      var obj = {}
      if(members[j].length != 0){
        obj['user_name'] = members[j].user_name
        obj['user_id'] = members[j].user_id
        members_res.push(obj)
      }
    }
    response.send({'members_res' : members_res , 'speaker_res' : speakers_res , status : "1"})
  })
  .catch(err => {
    console.log(err)
  })
})

io.on('connection', socket => {
  socket.on('join-room', (roomId, userId, roomname, username, room_desc, isspeaker) => {
    console.log("connected")
    try {
      const Roommodel = Rooms.findOne({ roomid: roomId }).then((res) => {
        if (res == undefined) {
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
          createroom.save().then((res) => {
            console.log("create room")
            console.log(res)
          })
          .catch(err => {
            console.log(err)
          })
        }
        else {
          $update = {}
          $user_obj = {}
          $user_obj['user_id'] = userId
          $user_obj['user_name'] = username
          if (isspeaker) {
            $update['$push'] = { "speakers": $user_obj }
          }
          else {
            $update['$push'] = { "members": $user_obj }
          }
          Rooms.findOneAndUpdate({ roomid: roomId }, $update).then((res) => {
            console.log(res)
          })
          .catch((err) => {
            console.log(err)
          })
        }
      }).catch((err) => {
        console.log(err)
      })
    }
    catch(err) {
      console.log(err)
    }
    socket.join(roomId)
    socket.to(roomId).broadcast.emit('user-connected', userId)

    socket.on('disconnect', () => {
      console.log("disconnnected")
      const filter = { roomid: roomId }
      const Roommodel = Rooms.findOne(filter).then((res) => {
        if(res != undefined) {
          $update = {}
          $remove = false
          $is_found_in_speaker = false
          $is_found_in_member = false
          for (var i in res.speakers) {
            if (res.speakers[i].user_id == userId) {
              $is_found_in_speaker = true;
              if (i == 0) {
                $remove = true;
              }
            }
          }
          for (var i in res.members) {
            if (res.members[i].user_id == userId) {
              $is_found_in_member = true;
            }
          }
          if ($is_found_in_speaker) {
            $update['$pull'] = { 'speakers': { 'user_id': userId } }
          }
          else if ($is_found_in_member) {
            $update['$pull'] = { 'members': { 'user_id': userId } }
          }
          console.log($update)
          if ($remove) {
             Rooms.findOneAndDelete(filter).then((res) => {
                console.log("deleted")
                console.log(res)
            })
            .catch(err => {
              console.log(err)
            })
          }
          else {
             Rooms.findOneAndUpdate(filter, $update).then((res) => {
                console.log(res)
            })
            .catch(err => {
              console.log(err)
            })
          }
        }
      })
      .catch(err => {
        console.log(err)
      })
      socket.to(roomId).broadcast.emit('user-disconnected', userId)
    })
  })

})
server.listen(process.env.PORT || 3000)