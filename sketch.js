const boardSize = 40;
const cellSize = 16;
const roundness = 3;

const maxApples = 16;
let snakes = [];
let apples = [];
let snake;

const tickMillis = 500;
let lastTick = 0;

const maxPlayers = 8;
let peer;
let connection;
let dataConnections = [];
let gameRunning = false;
let isServer = false;

// CSS is overrated L0L
const beginInfoE = document.getElementById("beginInfo");
const peerIdE = document.getElementById("peerId");
const joinInfoE = document.getElementById("joinInfo");
const playerInfoE = document.getElementById("playerCount");
const hostButtonE = document.getElementById("hostButton");
const joinButtonE = document.getElementById("joinButton");
const quitButtonE = document.getElementById("quitButton");
const targetIdLabelE = document.getElementById("targetIdLabel");
const targetIdE = document.getElementById("targetId");
const connectButtonE = document.getElementById("connectButton");
const cancelButtonE = document.getElementById("cancelButton");
const startButtonE = document.getElementById("startButton");


// Called when the program starts
function setup() {
  createCanvas(boardSize * cellSize, boardSize * cellSize);
}


// Draws every frame
function draw() {
  background(0);
  fill(255);
  
  // Every tick, move snakes if peer is server
  if (isServer && millis()-tickMillis > lastTick) {
    lastTick = millis();
    for (let i = 0; i < snakes.length; i++) {
      snakes[i].march();
    }
    
    // Remove dead snakes
    for (let s = 0; s < snakes.length; s++) {
      if (snakes[s].dead) {
        snakes.splice(s, 1);
      }
    }
    
    // Then communicate the new data to all of the clients
    // Snakes data
    let snakesMessage = [];
    for (let s = 0; s < snakes.length; s++) {
      let cellsMessage = [];
      let cells = snakes[s].cells;
      for (let c = 0; c < cells.length; c++) {
        let pos = cells[c].position;
        cellsMessage.push({"x":pos.x, "y":pos.y});
      }
      snakesMessage.push({"id":snakes[s].id, "cells":cellsMessage});
    }
    // Apples data
    let applesMessage = [];
    for (let a = 0; a < apples.length; a++) {
      let pos = apples[a].position;
      applesMessage.push({"x":pos.x, "y":pos.y});
    }
    let finalMessage = {"snakes":snakesMessage, "apples":applesMessage};
    for (let i = 0; i < dataConnections.length; i++) {
      dataConnections[i].send(finalMessage);
    }
  }
  
  // Draw apples
  for (let i = 0; i < apples.length; i++) {
    apples[i].process();
  }
  
  // Draw snakes
  for (let i = 0; i < snakes.length; i++) {
    snakes[i].process();
  }
}


// User changes snake direction
function keyPressed() {
  if (keyCode === LEFT_ARROW) {
    if (isServer) {
      snake.queuedDirection = createVector(-1,0);
    } else {
      connection.send({"id":peer.id, "dir":{"x":-1, "y":0}})
    }
  } else if (keyCode === RIGHT_ARROW) {
    if (isServer) {
      snake.queuedDirection = createVector(1,0);
    } else {
      connection.send({"id":peer.id, "dir":{"x":1, "y":0}})
    }
  } else if (keyCode === UP_ARROW) {
    if (isServer) {
      snake.queuedDirection = createVector(0,-1);
    } else {
      connection.send({"id":peer.id, "dir":{"x":0, "y":-1}})
    }
  } else if (keyCode === DOWN_ARROW) {
    if (isServer) {
      snake.queuedDirection = createVector(0,1);
    } else {
      connection.send({"id":peer.id, "dir":{"x":0, "y":1}})
    }
  }
  
  return false;
}


// Spawns a new apple pickup
function spawnApple() {
  if (apples.length >= maxApples) {
    return;
  }
  
  let x = floor(random(boardSize));
  let y = floor(random(boardSize));
  
  apples.push(new Apple(createVector(x, y)));
}


// Snake collected an apple
function appleCollected(apple) {
  apples.splice(apples.indexOf(apple), 1);
  spawnApple();
}


// Host starts the game
function startGame() {
  snake = new Snake(peer.id, createVector(boardSize/8+4, boardSize/2));
  snakes.push(snake);
  
  for (let i = 0; i < dataConnections.length; i++) {
    snakes.push(new Snake(dataConnections[i].peer, createVector(boardSize*(i+2)/8+4)));
  }
  
  for (let i = 0; i < maxApples; i++) {
    spawnApple();
  }
  
  gameRunning = true;
}


// Quit the game
function quitGame() {
  console.log("Quitting");
  for (let i = 0; i < dataConnections.length; i++) {
    dataConnections[i].close();
  }
  
  snake = null;
  snakes = [];
  apples = [];
  
  gameRunning = false;
}


// Player connected to the lobby
function playerJoined(dataConnection) {
  if (dataConnections.length >= maxPlayers-1 || gameRunning == true) {
    console.log("Cannot join now");
    dataConnection.close();
    return;
  }
  
  dataConnection.on('open', function() {
    dataConnections.push(dataConnection);
    dataConnection.on('data', clientMessageReceive);
  });
  dataConnection.on('close', function() {
    console.log("Connection closed");
    playerLeft(dataConnection);
  });
  dataConnection.on('error', function(err) {
    console.log("Client error " + err.type);
    playerLeft(dataConnection);
  });
  
  playerInfoE.innerText = "Player Count: " + str(dataConnections.length+1);
}


// Player disconnected from the lobby
function playerLeft(dataConnection) {
  dataConnections.splice(dataConnections.indexOf(dataConnection),1);
  
  playerInfoE.innerText = "Player Count: " + str(dataConnections.length+1);
}


// Server received client message
function clientMessageReceive(data) {
  if (!isServer) {
    return;
  }  
  
  let snakeId = data.id;
  // Find snake with matching id
  let matchingSnake;
  for (let i = 0; i < snakes.length; i++) {
    if (snakes[i].id == snakeId) {
      matchingSnake = snakes[i];
      break;
    }
  }
  if (!matchingSnake) {
    return;
  }
  
  let direction = createVector(data.dir.x, data.dir.y);
  matchingSnake.queuedDirection = direction;
}


// Client received server message
function serverMessageReceive(data) {
  if (isServer) {
    return;
  }
  
  snakes = [];
  apples = [];
  
  // Construct snakes from data
  let snakeList = data.snakes;
  for (let s = 0; s < snakeList.length; s++) {
    let newSnake = new Snake(snakeList[s].id);
    let cellList = snakeList[s].cells;
    for (let c = 0; c < cellList.length; c++) {
      let posData = cellList[c];
      newSnake.appendCell(
        new Cell(createVector(
          posData.x,
          posData.y
        )));
    }
    snakes.push(newSnake);
  }
  
  // Construct apples from data
  let appleList = data.apples;
  for (let a = 0; a < appleList.length; a++) {
    let posData = appleList[a];
    let newApple = new Apple(createVector(
      posData.x,
      posData.y
    ));
    apples.push(newApple);
  }
}


// User creates a new lobby to host
function createLobby() {
  isServer = true;
  
  beginInfo.hidden = true;
  peerIdE.hidden = false;
  
  peer = new Peer();
  peer.on('open', function(id) {
	peerIdE.innerText = "Peer ID: " + str(id);
  });
  peer.on('connection', playerJoined);
  peer.on('close', function() {
    quit();
  });
  peer.on('disconnected', function() {
    quit();
  });
  peer.on('error', function(err) {
    peerIdE.innerText = "ERROR: " + err.type;
  });
  
  playerInfoE.hidden = false;
  
  joinButtonE.hidden = true;
  hostButtonE.hidden = true;
  quitButtonE.hidden = false;
  startButtonE.hidden = false;
}


// User wants to join a lobby
function joinLobby() {
  beginInfoE.hidden = true;
  joinInfoE.hidden = false;
  
  peer = new Peer();
  peer.on('open', function(id) {
	joinInfoE.innerText = "Connect to a lobby using the host's Peer ID.";
    connectButtonE.hidden = false;
  });
  peer.on('close', function() {
    cancel();
  });
  peer.on('disconnected', function() {
    cancel();
  });
  peer.on('error', function(err) {
    joinInfoE.innerText = "ERROR: " + err.type;
  });
  
  targetIdLabel.hidden = false;
  targetId.hidden = false;
  
  hostButtonE.hidden = true;
  joinButtonE.hidden = true;
  cancelButtonE.hidden = false;
}


// User tries to connect to a lobby
function connect() {
  if (!peer) {
    return;
  }
  
  let hostPeerId = targetId.value;
  if (hostPeerId == "") {
    return;
  }
  
  connectButtonE.hidden = true;
  joinInfoE.innerText = "CONNECTING";
  connection = peer.connect(hostPeerId);
  connection.on('open', function() {
    joinInfoE.innerText = "WAITING FOR HOST";
    connection.on('data', serverMessageReceive);
  });
  connection.on('close', function() {
    cancel();
  });
  connection.on('disconnected', function() {
    cancel();
  });
  connection.on('error', function(err) {
    connectButtonE.hidden = false;
    joinInfoE.innerText = "ERROR: " + err.type;
  });
}


// User cancels joining a lobby
function cancel() {
  isServer = false;
  
  joinInfoE.hidden = true;
  beginInfoE.hidden = false;
  joinInfoE.innerText = "LOADING";
  
  if (peer) {
    peer.destroy();
  }
  
  targetIdLabel.hidden = true;
  targetId.hidden = true;
  
  connectButtonE.hidden = true;
  cancelButtonE.hidden = true;
  hostButtonE.hidden = false;
  joinButtonE.hidden = false;
}


// User quits the lobby
function quit() {
  isServer = false;
  
  if (gameRunning) {
    quitGame();
  }
  
  peerIdE.hidden = true;
  peerIdE.innerText = "LOADING";
  beginInfo.hidden = false;
  
  if (peer) {
    peer.destroy();
  }
  
  playerInfoE.hidden = true;
  
  quitButtonE.hidden = true;
  hostButtonE.hidden = false;
  joinButtonE.hidden = false;
  startButtonE.hidden = true;
}