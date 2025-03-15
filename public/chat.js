//variables that store different aspects of data from the webpage, including the socket connection
const socket = io()
const usernameInput = document.getElementById("username")
const connectBtn = document.getElementById("connectBtn")
const msgBox = document.getElementById("msgBox")
const send_button = document.getElementById("send_button")
const clear_button = document.getElementById("clear_button")
const messages = document.getElementById("messages")

connectBtn.addEventListener("click", function() {
    const username = usernameInput.value.trim() //retrieves the input username from the users registration
    socket.emit("register", username) //sends a register event to the server.
})

socket.on("registrationSuccess", function(message) {
    messages.innerHTML += `<p>${message}</p>` //displays the successful registration acknowledgement
    socket.username = usernameInput.value.trim() //stores the username in the socket
    usernameInput.setAttribute("disabled", "") //disables the registraction text field
    connectBtn.setAttribute("disabled", "") // disables the registraction button
    msgBox.removeAttribute("disabled") //enables the send a message text field
    send_button.removeAttribute("disabled") //enables the send button.
})

socket.on("registrationError", function(error) {
    messages.innerHTML += `<p>${error}</p>` // prints the error to the chat, signifying an invalid username.
    usernameInput.value = "" //clear the invalid input
})


send_button.addEventListener("click", function() {
    const message = msgBox.value.trim() //grabs the input from the user when send is clicked
    if (message) {
        console.log(`Sending message as ${socket.username}: ${message}`) //logs data to terminal.
        socket.emit("sendMessage", message) //sends a sendMessage event to the server
        msgBox.value = "" //clears the input
    }
})


socket.on("receiveMessage", function(data) {

    //determines if a message is private or not or if it was sent by the user.
    let messageType = "public-message"
    if (data.private) {
        messageType = "private-message"
    } else if (data.user === socket.username || data.user === `Me {to: ${socket.username}}`) {
        messageType = "my-message"
    }

    //checks if the sender is the current user or if it is someone else. if it is, updates the senders name to "Me"
    let sender = ""
    if (data.user === socket.username) {
        sender = "Me"
    } else {
        sender = data.user
    }
    
    //formats the message to be printed to the chat.
    let messageContent = `<p class="${messageType}">${sender}: ${data.message}</p>`
    //prints the message to the chat
    messages.innerHTML += messageContent
})
clear_button.addEventListener("click", function() {
    messages.innerHTML = "" //clears the chat for the user
})

//sends the current message when the enter key is pressed.
msgBox.addEventListener("keydown", function (event) {
    const ENTER_KEY = 13
    if (event.keyCode === ENTER_KEY) {
        send_button.click() 
    }
})
