  const socket = io('/')
  const videoGrid = document.getElementById('video-grid')
  const myPeer = new Peer({
    config: {'iceServers': [
      { url: 'stun:stun.l.google.com:19302' },
      { url: 'turn:13.233.155.97?transport=tcp', username : 'virtualcafe' , credential: 'virtualcafe' }
    ]},
    secure : true,
    host: '/virtualcafepeerjs.herokuapp.com',
    port: 443,
  })
  let myVideoStream;
  const audioNode = createAudioNode(USER_NAME)
  const myVideo = audioNode.firstChild
  myVideo.muted = true
  const peers = {}
  const peer_names = {}
  navigator.mediaDevices.getUserMedia({
    audio: true
  }).then(stream => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream , audioNode)

    myPeer.on('call', call => {
      console.log(call)
      call.answer(stream)
      var user_name = call.metadata.username
      const videoNode = createAudioNode(user_name)
      const video = videoNode.firstChild
      call.on('stream', (userVideoStream) => {
        addVideoStream(video, userVideoStream , videoNode)
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
    socket.emit('join-room', ROOM_ID, id , ROOM_NAME , USER_NAME)
    peer_names[id] = USER_NAME
  })

  function connectToNewUser(userId, stream) {
    peer_names[userId] = USER_NAME
    const call = myPeer.call(userId, stream , {metadata : {username : USER_NAME}})
    const audioNode = createAudioNode(peer_names[userId])
    const video = audioNode.firstChild
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream , audioNode)
    })
    call.on('close', () => {
      audioNode.remove()
    })

    peers[userId] = call
  }

  function addVideoStream(video, stream , audio_node) {
    video.srcObject = stream
    video.addEventListener('loadedmetadata', () => {
      video.play()
    })
    videoGrid.appendChild(audio_node)
  }

  function createAudioNode(username){
    const audio_div = document.createElement('div')
    audio_div.className = "audio_node"
    const audio_element = document.createElement('audio')
    audio_div.appendChild(audio_element)
    name_tag = document.createElement("p")
    name_tag.innerHTML = username
    audio_div.appendChild(name_tag)
    return audio_div
  }

  const muteUnmute = () => {
    const enabled = myVideoStream.getAudioTracks()[0].enabled;
    if (enabled) {
      myVideoStream.getAudioTracks()[0].enabled = false;
      document.getElementById('muteUnmute').innerHTML="Unmute";
    } else {
      document.getElementById('muteUnmute').innerHTML="Mute";
      myVideoStream.getAudioTracks()[0].enabled = true;
    }
  }