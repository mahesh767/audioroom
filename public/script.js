  const socket = io('/')
  const videoGrid = document.getElementById('video-grid')
  const myPeer = new Peer({
    config: {'iceServers': [
      { url: 'stun:stun.l.google.com:19302' },
      { url: 'turn:3.108.53.55?transport=tcp', username : 'virtualcafe' , credential: 'virtualcafe' }
    ]},
    //secure : true,
    // host: 'http://ec2-13-232-222-167.ap-south-1.compute.amazonaws.com',
    host : 'ec2-65-2-70-49.ap-south-1.compute.amazonaws.com',
    port: 9000,
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
    addVideoStream(audio, stream)

    myPeer.on('call', call => {
      console.log(call)
      call.answer(stream)
      var user_name = call.metadata.username
      const audio = createAudioNode(user_name)
      call.on('stream', (userVideoStream) => {
        addVideoStream(audio, userVideoStream)
      })
    })

    socket.on('user-connected', userId => {
      connectToNewUser(userId, stream)
    })
  })

function leaveMeeting(){
  console.log("leaveMeeting")
  socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()
  })
  window.location.href = "/firstpage"
}
  myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id , ROOM_NAME , USER_NAME , ROOM_DESC)
    peer_names[id] = USER_NAME
  })

  function connectToNewUser(userId, stream) {
    peer_names[userId] = USER_NAME
    const call = myPeer.call(userId, stream , {metadata : {username : USER_NAME}})
    const audio = createAudioNode()
    call.on('stream', userVideoStream => {
      addVideoStream(audio, userVideoStream)
    })
    call.on('close', () => {
      audio.remove()
    })
    peers[userId] = call
  }

  function addVideoStream(audio, stream) {
    audio.srcObject = stream
    audio.addEventListener('loadedmetadata', () => {
      audio.play()
    })
    //videoGrid.appendChild(audio)
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