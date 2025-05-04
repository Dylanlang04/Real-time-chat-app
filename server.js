const app = require('http').createServer(handler)
const io = require('socket.io')(app) //wrap server app in socket io capability
const fs = require("fs") //need to read static files
const url = require("url") //to parse url strings

const PORT = process.env.PORT || 3000
app.listen(PORT) //start server listening on PORT

const ROOT_DIR = "public" //dir to serve static files from
//set used to store currently connected users.
const users = new Set()

const MIME_TYPES = {
  css: "text/css",
  gif: "image/gif",
  htm: "text/html",
  html: "text/html",
  ico: "image/x-icon",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  js: "application/javascript",
  json: "application/json",
  png: "image/png",
  svg: "image/svg+xml",
  txt: "text/plain"
}

function get_mime(filename) {
  for (let ext in MIME_TYPES) {
    if (filename.indexOf(ext, filename.length - ext.length) !== -1) {
      return MIME_TYPES[ext]
    }
  }
  return MIME_TYPES["txt"]
}

function handler(request, response) {
    let urlObj = url.parse(request.url, true, false)
    console.log("\n============================")
    console.log("PATHNAME: " + urlObj.pathname)
    console.log("REQUEST: " + ROOT_DIR + urlObj.pathname)
    console.log("METHOD: " + request.method)

    let receivedData = ""

    //attached event handlers to collect the message data
    request.on("data", function(chunk) {
      receivedData += chunk
    })

    //event handler for the end of the message
    request.on("end", function() {
      console.log("REQUEST END: ")
      console.log("received data: ", receivedData)
      console.log("type: ", typeof receivedData)

   
  
      if (request.method == "GET") {
        //handle GET requests as static file requests
        fs.readFile(ROOT_DIR + urlObj.pathname, function(err, data) {
          if (err) {
            //report error to console
            console.log("ERROR: " + JSON.stringify(err))
            //respond with not found 404 to client
            response.writeHead(404)
            response.end(JSON.stringify(err))
            return
          }
          response.writeHead(200, {
            "Content-Type": get_mime(urlObj.pathname)
          })
          response.end(data)
        })
      }
    })
}

io.on("connection", function(socket) { //runs when a new user connects via socket.
  console.log("A user connected") // logged to terminal

  socket.on("register", function(username) { //listens for the register event.
    if (!isValidUsername(username)) { // checks for valid username, if not valid, print an error
        socket.emit("registrationError", `ERROR: ${username} IS NOT A VALID USER NAME`)
        return
    }

    users.add(username) // if valid, add it to users
    socket.username = username  //gives ther current socket the valid username entered.
    socket.emit("registrationSuccess", `Welcome, ${username}!`) // print a successful registration message.
    console.log(`${username} has joined the chat`) // logged to terminal
  })
  
  socket.on("sendMessage", function(message) { // listen for the client for sendMessage event.
    if (!socket.username) return // checks if the sender is a registered user.

    const privateMessageMatch = message.match(/^([\w\s,]+):\s(.+)$/) // checks if the message is a private message/group dm
    if (privateMessageMatch) {
      let recipientsString = privateMessageMatch[1].trim() //grab the user(s)
      let privateMessage = privateMessageMatch[2].trim() //grab the message content

      //split the comma and grab all recipients.
      let recipients = recipientsString.split(/\s*,\s*/)

      
      let onlineRecipients = [] // initializes an empty array
      recipients.forEach(name => { // for each recipient
        //grabs all the socket objects of each recipient, turns it into an array, finds the socket object that fits the recipients username.
        const recipientSocket = [...io.sockets.sockets.values()].find(s => s.username === name)
        if (recipientSocket) {
          onlineRecipients.push(recipientSocket) //if the user is online, add the socket object to the array.
        }
      })

      if (onlineRecipients.length > 0) {
          socket.emit("receiveMessage", { //sends the receiveMessage event to the client.
              user: `Me {to: ${recipients.join(", ")}}`, // user will hold the sender's name in the message object
              message: privateMessage, //message will hold the sender's message in the message object
              private: true //private will indicate if the sender's message is private or not.
          })

          // Send message to each online recipient
          onlineRecipients.forEach(recipientSocket => { // for each recipient
              recipientSocket.emit("receiveMessage", { // sends the receiveMessage event to the client.
                  user: socket.username, // user will store the username of the sender.
                  message: privateMessage, //message will store the message of the sender.
                  private: true // private will indicate if the sender's message is private or not.
              })
          })
          //send a log to the terminal
          console.log(`${socket.username} sent a private message to ${recipients.join(", ")}: ${privateMessage}`)
      } else {
          //if there are no recipients, send a message to the client indeicating so.
          socket.emit("receiveMessage", {
              user: "Error:",
              message: `The recipient(s) are not online.`,
              private: true
          })
      }
    } else {
      // if the message is not a private message.
      io.emit("receiveMessage", {
          user: socket.username, // user will store the sender's username.
          message, //message will store the sender's message.
          private: false //private will indicate that the sender's message is a public message.
      })

      //log the message to the terminal
      console.log(`${socket.username}: ${message}`)
    }
  })

  socket.on("disconnect", function() { //listens for the disconnect event.
    if (socket.username) { 
      users.delete(socket.username) //deletes the username if the user disconnecting was a registered user.
      console.log(`${socket.username} disconnected`) // logs that the user has disconnected to terminal
    }
  })
})

function isValidUsername(username) {
  //checks for a valid username, AkA checks if the username is not "ME" in any form.
  return /^[A-Za-z][A-Za-z0-9]*(?: [A-Za-z0-9]+)*$/.test(username) && !/^Me$/i.test(username) 
}

console.log("Server Running at PORT: 3000  CNTL-C to quit")
console.log("To Test:")
console.log("Open several browsers at: http://localhost:3000/index.html")