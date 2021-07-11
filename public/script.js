  const socket = io('/')
  const videoGrid = document.getElementById('video-grid')
  const myPeer = new Peer(undefined, {
    host: '/',
    port: '3001'
  })
  const audioNode = createAudioNode()
  const myVideo = audioNode.firstChild
  myVideo.muted = true
  const peers = {}
  navigator.mediaDevices.getUserMedia({
    audio: true
  }).then(stream => {
    addVideoStream(myVideo, stream , audioNode)

    myPeer.on('call', call => {
      call.answer(stream)
      const videoNode = createAudioNode()
      const video = videoNode.firstChild
      call.on('stream', userVideoStream => {
        addVideoStream(video, userVideoStream , videoNode)
      })
    })

    socket.on('user-connected', userId => {
      connectToNewUser(userId, stream)
    })
  })

  socket.on('user-disconnected', userId => {
    if (peers[userId]) peers[userId].close()
  })

  myPeer.on('open', id => {
    socket.emit('join-room', ROOM_ID, id)
  })

  function connectToNewUser(userId, stream) {
    const call = myPeer.call(userId, stream)
    const audioNode = createAudioNode()
    const video = audioNode.firstChild
    call.on('stream', userVideoStream => {
      addVideoStream(video, userVideoStream , audioNode)
    })
    call.on('close', () => {
      video.remove()
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

  function createAudioNode(){
    const audio_div = document.createElement('div')
    audio_div.className = "audio_node"
    const audio_element = document.createElement('audio')
    audio_div.appendChild(audio_element)
    return audio_div
  }