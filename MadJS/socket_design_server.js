
const debug_mode = true;
const DEFAULT_TICK_SPEED = 1250;

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let sockets = [];
let room_ids = []; //['game_00000001'];

app.use(express.static(__dirname + '/public'));

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/public/socket_design.html');
});

function mad_log(msg) {
    console.log(msg);
    // let emitted = io.to('mad_log').emit(msg);
    io.emit('mad_log', msg);
    // console.log(emitted);
    
}

io.on('connection', (socket) => {
    mad_log(`user ${socket.id} connected`)

    socket.join('lobby');

    socket.on('create_room', function(){ // user clicked Create Room
        if(debug_mode){console.log('create_room')}

        let room_id = 'r' + Math.floor(Math.random()*10**8); // use a sufficiently random identifier for the room
        // let room_id = 2; //temp

        socket.join(room_id); // create new room by joining it
        room_ids.push(room_id);
        io.to(socket.id).emit('client_joined_room', room_id)
    });

    socket.on('join_game_room', function(room_to_join){ // user clicked Join Room (while a valid room is selected?)
        if(debug_mode){console.log('join_game_room', room_to_join)}

        if (room_ids.includes(room_to_join)) {
            socket.join(room_to_join)
            io.to(socket.id).emit('client_joined_room', room_to_join)
        } else {
            console.log(`Socket ${socket.id} attempted to join non-existent room ${room_to_join}`);
        }
        
        
    });

    socket.on('leave_game_room', function(room_id){ // user clicked Leave Room button
        if(debug_mode){console.log('leave_room - room:', room_id )}
        socket.leave(room_id)
    });

    socket.on('toggle_ready', function(room_id){ // user clicked "Ready"
        if(debug_mode){console.log('toggle_ready - room', room_id)}
    });

    socket.on('start_game', function(room_id){ // host clicked Start Game
        if(debug_mode){console.log('start_game', room_id)}

        io.to(room_id).emit('tell_client_game_has_started')
    });

    socket.on('add_move_to_queue', function(){ //
        if(debug_mode){console.log('add_move_to_queue')}
    });

    
    
    // socket.on('', function(){ //
    //     if(debug_mode){console.log('')}
    // });

    // socket.on('', function(){ //
    //     if(debug_mode){console.log('')}
    // });

    // socket.on('', function(){ //
    //     if(debug_mode){console.log('')}
    // });

    // socket.on('', function(){ //
    //     if(debug_mode){console.log('')}
    // });
    


});

function update_lobby_room_info() {
// Updates the list of active rooms and returns a list of currently open rooms and their statuses
    let list_open_rooms = []

    room_ids.forEach(room_id => {
        //console.log('Emitting to room ' + room_id)
        let g_room = io.sockets.adapter.rooms.get(room_id);
        if(g_room) {
            let players = io.sockets.adapter.rooms.get(room_id).size
        
            let room_row = {'room_id':room_id, 'game_mode':'Free For All', 'players':`${players}/8`, 'bots':'2','status':'Open'}
            list_open_rooms.push(room_row)
        } else {
            console.log(`TODO remove the room ${g_room}`)
        }

    });
    return list_open_rooms






}

function game_state(room_id) {
// Returns an object representing the current game state and other pertinent information about the current room

    let data = {
        'room_id': room_id
    }

}
server.listen(3000, () => {
    console.log('Listening on *:3000');
    setInterval(function(){ 

        let lobby_room_info = update_lobby_room_info()
        io.to('lobby').emit('lobby_room_info', lobby_room_info);

        room_ids.forEach(room_id => {
            console.log('Emitting to room ' + room_id)
            io.to(room_id).emit('tick', game_state(room_id))
        });


        // console.log('.')   
        // io.to('game_00000001').emit('tick', 'test !!!!')

    }, DEFAULT_TICK_SPEED);
});
