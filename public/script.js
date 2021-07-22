  const socket = io('/')
  const videoGrid = document.getElementById('video-grid')
  const myPeer = new Peer({
    config: {'iceServers': [
      {urls: "stun:stun.l.google.com:19302"},
      { urls: 'turn:65.1.65.193?transport=tcp', username : 'virtualcafe' , credential: 'virtualcafe' },
      { urls: 'turn:65.1.65.193?transport=udp', username : 'virtualcafe' , credential: 'virtualcafe' },
      { url: 'turn:65.1.65.193?transport=tcp', username : 'virtualcafe' , credential: 'virtualcafe' },
      { url: 'turn:65.1.65.193?transport=udp', username : 'virtualcafe' , credential: 'virtualcafe' },
    ]},
    secure : true,
    host : "virtualcafepeerjs.herokuapp.com",
    debug : 3,
  })



  let myVideoStream;
  const audio = createAudioNode()
  audio.muted = true
  const peers = {}
  const peer_names = {}
  navigator.mediaDevices.getUserMedia({
    audio: true
  }).then(stream => {
    myVideoStream = stream;
    if(ISSPEAKER != undefined){
      addVideoStream(audio, stream)
    }

    myPeer.on('call', call => {
      call.answer(stream)
      var user_name = call.metadata.username
      const audio = createAudioNode(user_name)
      call.on('stream', (userVideoStream) => {
        addVideoStream(audio, userVideoStream)
      })
    })
    myPeer.on('connection',(conn) => {
      console.log(conn)
      conn.on('data',function(data){
        console.log("remote data came for existing")
        console.log(data)
      })
      var obj = {}
      obj['user_name'] = USER_NAME
      obj['is_speaker'] = ISSPEAKER
      obj['is_member'] = ISMEMBER
      console.log("connnection opened for existing")
      console.log(obj)
      conn.send(obj)
    })
    socket.on('user-connected', userId => {
      connectToNewUser(userId, stream , USER_NAME , ISSPEAKER  , ISMEMBER)
    })
  })

  socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()
  })

function leaveMeeting(){
  console.log("leaveMeeting")
  socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()
  })
  window.location.href = "/firstpage"
}
  myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id , ROOM_NAME , USER_NAME , ROOM_DESC , ISSPEAKER , ISMEMBER)
    peer_names[id] = USER_NAME
  })

  function connectToNewUser(userId, stream , USER_NAME , ISSPEAKER , ISMEMBER) {
    peer_names[userId] = USER_NAME
    const call = myPeer.call(userId, stream , {metadata : {username : USER_NAME}})
    const audio = createAudioNode()
    call.on('stream', userVideoStream => {
      addVideoStream(audio, userVideoStream , userId, USER_NAME , ISSPEAKER , ISMEMBER)
    })
    call.on('close', () => {
      audio.remove()
    })
    const connection = myPeer.connect(userId)
    console.log(connection)
    connection.on('open',() => {
      connection.on('data',function(data){
        console.log("on data opened")
        console.log(data)
      })

      var obj = {}
      obj['user_name'] = USER_NAME
      obj['is_speaker'] = ISSPEAKER
      obj['is_member'] = ISMEMBER
      connection.send(obj)
      console.log(obj)
    })
    peers[userId] = call
  }

  function addVideoStream(audio, stream , userId, USER_NAME , ISSPEAKER , ISMEMBER) {
    audio.srcObject = stream
    audio.addEventListener('loadedmetadata', () => {
      audio.play()
    })
  }

  function createAudioNode(){
    audio_element = document.createElement('audio')
    return audio_element
  }

  const muteUnmute = () => {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
      myVideoStream.getAudioTracks()[0].enabled = false;
      document.getElementById('muteUnmute').innerHTML = '<span><i class="fas fa-microphone-slash"></i></span> Unmute';
    } else {
      document.getElementById('muteUnmute').innerHTML='<span><i class="fas fa-microphone"></i></span> Mute';
      myVideoStream.getAudioTracks()[0].enabled = true;
    }
  }


  setInterval(() => {
    var data = {room_url : ROOM_ID}
    console.log(data)
    $.ajax({
      'type' : "POST",
      'dataType' : "json",
      'url' : '/getSpeakersAndMembers',
      'data' : data,
      'success' : function(data){
        if(data.status === "1"){
          if(data.speaker_res.length != 0){
            $(".speaker-name-container").html('');
            data.speaker_res.forEach(function(speaker){
              var html = '<i class = "far fa-user-circle form-group"> '+ speaker.user_name +' </i><br>';
              if($(".speaker-name-container") != null){
                $(".speaker-name-container").append(html);
              }
            })
          }
          if(data.members_res.length != 0){
            $(".members-container").html('');
            data.members_res.forEach(function(member){
              if(member.user_name != undefined){
                var html = '<i class = "far fa-user-circle form-group"> '+ member.user_name +' </i><br>';
                if($(".members-container") != null){
                  $(".members-container").append(html);
                }
              }
            })
          }
        }
        else {
          window.location.reload();
          return false;
        }
      }
    })
  },3000);


  setInterval(() => {
    $.ajax({
      'type' : "GET",
      'dataType' : "json",
      'url' : 'https://virtualcafepeerjs.herokuapp.com',
      'success' : function(data){
          console.log(data)
        }
      })  
  },3000);