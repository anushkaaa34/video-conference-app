const socket = io("/");
const videoGrid = document.getElementById("video-grid");
const myPeer = new Peer(undefined, {
  path: "/peerjs",
  host: "/",
  port: "443",
});
let myVideoStream;
const myVideo = document.createElement("video");
myVideo.muted = true;
const peers = {};
navigator.mediaDevices
  .getUserMedia({
    video: true,
    audio: true,
  })
  .then((stream) => {
    myVideoStream = stream;
    addVideoStream(myVideo, stream);
    myPeer.on("call", (call) => {
      call.answer(stream);
      const video = document.createElement("video");
      call.on("stream", (userVideoStream) => {
        addVideoStream(video, userVideoStream);
      });
    });

    socket.on("user-connected", (userId) => {
      connectToNewUser(userId, stream);
    });
    // input value
    let text = $("input");
    // when press enter send message
    $("html").keydown(function (e) {
      if (e.which == 13 && text.val().length !== 0) {
        socket.emit("message", text.val());
        text.val("");
      }
    });
    socket.on("createMessage", (message) => {
      $("ul").append(`<li class="message"><b>user</b><br/>${message}</li>`);
      scrollToBottom();
    });
  });

socket.on("user-disconnected", (userId) => {
  if (peers[userId]) peers[userId].close();
});

myPeer.on("open", (id) => {
  socket.emit("join-room", ROOM_ID, id);
});

function connectToNewUser(userId, stream) {
  const call = myPeer.call(userId, stream);
  const video = document.createElement("video");
  call.on("stream", (userVideoStream) => {
    addVideoStream(video, userVideoStream);
  });
  call.on("close", () => {
    video.remove();
  });

  peers[userId] = call;
}

function addVideoStream(video, stream) {
  video.srcObject = stream;
  video.addEventListener("loadedmetadata", () => {
    video.play();
  });
  videoGrid.append(video);
}

const scrollToBottom = () => {
  var d = $(".main__chat_window");
  d.scrollTop(d.prop("scrollHeight"));
};

const muteUnmute = () => {
  const enabled = myVideoStream.getAudioTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getAudioTracks()[0].enabled = false;
    setUnmuteButton();
  } else {
    setMuteButton();
    myVideoStream.getAudioTracks()[0].enabled = true;
  }
};

const playStop = () => {
  console.log("object");
  let enabled = myVideoStream.getVideoTracks()[0].enabled;
  if (enabled) {
    myVideoStream.getVideoTracks()[0].enabled = false;
    setPlayVideo();
  } else {
    setStopVideo();
    myVideoStream.getVideoTracks()[0].enabled = true;
  }
};

const setMuteButton = () => {
  const html = `
    <i class="fas fa-microphone"></i>
    <span>Mute</span>
  `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

const setUnmuteButton = () => {
  const html = `
    <i class="unmute fas fa-microphone-slash"></i>
    <span>Unmute</span>
  `;
  document.querySelector(".main__mute_button").innerHTML = html;
};

const setStopVideo = () => {
  const html = `
    <i class="fas fa-video"></i>
    <span>Stop Video</span>
  `;
  document.querySelector(".main__video_button").innerHTML = html;
};

const setPlayVideo = () => {
  const html = `
  <i class="stop fas fa-video-slash"></i>
    <span>Play Video</span>
  `;
  document.querySelector(".main__video_button").innerHTML = html;
};

// script.js
// Client-side code for chat functionality
$(document).ready(() => {
  // Get references to DOM elements
  const messageInput = $("#chat_message");
  const messageContainer = $(".messages");
  const leaveMeetingButton = $(".leave_meeting");
  const sendButton = $(".send_message");

  // Send message on clicking Send button
  sendButton.on("click", () => {
    const message = messageInput.val().trim();
    if (message !== "") {
      socket.emit("message", message);
      messageInput.val("");
    }
  });

  // Send message on pressing Enter key
  messageInput.on("keydown", (event) => {
    if (event.key === "Enter" && messageInput.val().trim() !== "") {
      const message = messageInput.val().trim();
      socket.emit("message", message);
      messageInput.val("");
    }
  });

  // Receive and display messages from server
  socket.on("createMessage", (message) => {
    messageContainer.append(`<li class="message"><b>User:</b> ${message}</li>`);
    scrollToBottom();
  });

  // Leave meeting button functionality
  leaveMeetingButton.on("click", () => {
    // Disconnect from the room
    socket.disconnect();

    // Redirect to the login page
    window.location.href = "/login";
  });
});

const roomId = document.getElementById("room-id").innerHTML;

// Join Existing Room
joinRoomBtn.addEventListener("click", () => {
  const roomId = roomInput.value.trim();
  if (roomId !== "") {
    window.location.href = `/room/${roomId}`;
  }
});
// ...

myPeer.on("open", (userId) => {
  socket.emit("join-room", roomId, userId);
});

createRoomBtn.addEventListener("click", () => {
  fetch("/room/new", { method: "GET" })
    .then((response) => response.json())
    .then((data) => {
      const roomId = data.roomId;
      window.location.href = `/room/${roomId}`;
    })
    .catch((error) => {
      console.error("Error creating new room:", error);
    });
});

// Join Existing Room
joinRoomBtn.addEventListener("click", () => {
  const roomId = roomInput.value.trim();
  if (roomId !== "") {
    window.location.href = `/room/${roomId}`;
  }
});
