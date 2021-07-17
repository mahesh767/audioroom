  const socket = io('/')
  const videoGrid = document.getElementById('video-grid')
  const myPeer = new Peer({
    config: {'iceServers': [
      { url: 'stun:stun.l.google.com:19302' },
      { url: 'turn:52.66.48.157:3478?transport=tcp', username : 'virtualcafe' , credential: 'virtualcafe' }
    ]},
    secure : true,
    host: 'virtualcafepeerjs.herokuapp.com',
    port: 443,
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
    videoGrid.appendChild(audio)
  }

  function createAudioNode(){
    audio_element = document.createElement('audio')
    return audio_element
  }

  const muteUnmute = () => {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
      setUnmuteButton();
      myVideoStream.getAudioTracks()[0].enabled = false;
      document.getElementById('muteUnmute').innerHTML="Unmute";
    } else {
      setMuteButton();
      document.getElementById('muteUnmute').innerHTML="Mute";
      myVideoStream.getAudioTracks()[0].enabled = true;
    }
  }

  const setMuteButton = () => {
    const html = `
    <i class="fas fa-microphone"></i>
    <button id="muteUnmute" style="color: black; border-radius: 5px;" onclick="muteUnmute()">Mute</button>
    `
    document.querySelector('.mutebutton').innerHTML = html;
  }

  const setUnmuteButton = () => {
    const html = `
    <i class="Unmute fas fa-microphone-slash"></i>
    <button id="muteUnmute" style="color: black; border-radius: 5px;" onclick="muteUnmute()">Unmute</button>
    `
    document.querySelector('.mutebutton').innerHTML = html;
  }