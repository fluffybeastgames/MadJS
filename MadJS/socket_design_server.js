
const debug_mode = true;
const DEFAULT_TICK_SPEED = 250;

const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);


const mad_server = require(__dirname + "/mad_server");

let sockets = [];
let room_ids = []; //['r_00000001'];
let games = []; //[{game_id='g_00000001', players=[], num_rows=x, num_cols=y, game_status = 'Init', game_turn = 0, game_mode = 'ffa', board=[]}]

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
        
        //TODO here start the game
        games.push(room_id);

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

function update_lobby_info() {
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
            room_ids = room_ids.filter(item => item !== room_id) // remove the room from the list of active rooms
        }

    });
    return list_open_rooms

}

function game_state(room_id) {
// Returns an object representing the current game state and other pertinent information about the current room

    let data = {
        'room_id': room_id,
        players: [],
        'game_mode': 'Free For All',
        'game_status': 'In Progress',
        'game_turn': 1,

    };

}
server.listen(3000, () => {
    console.log('Listening on *:3000');
    setInterval(function(){ 

        //Update lobby info
        let lobby_info = update_lobby_info()
        let players_in_lobby = 0;
        if (io.sockets.adapter.rooms.get('lobby')) {
            players_in_lobby = io.sockets.adapter.rooms.get('lobby').size;
        }

        let players_online = io.engine.clientsCount;

        // Send lobby info to all players in the lobby
        io.to('lobby').emit('lobby_info', lobby_info, players_in_lobby, players_online);

        // Send game info to each activer room
        room_ids.forEach(room_id => {
            // console.log('Emitting to room ' + room_id)
            io.to(room_id).emit('tick', game_state(room_id))
        });

    }, DEFAULT_TICK_SPEED);
});
