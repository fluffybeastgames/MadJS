"use strict"
console.log('socket_design_client.js loaded')

let active_room_id = '-1';
let active_game_id = '-2';
let last_clicked_lobby_room_id = -1;

let socket_local = io();

socket_local.on('mad_log', function(msg) {
    console.log('From server: ' + msg);
    document.getElementById('socket_log').innerHTML = document.getElementById('socket_log').innerHTML + '<br>' + msg 
});

socket_local.on('tick', function(msg) {
    console.log('tick ' + msg)
} );


socket_local.on('client_joined_room', function(room_id) {
    console.log('client_joined_room')
    active_room_id = room_id;

    document.getElementById('waiting_room_id').innerHTML = `Room: ${room_id}`
    

    switch_to_waiting_room_gui()

});

socket_local.on('lobby_room_info', function(list_rooms) {
    // console.log('lobby_room_info', list_rooms)
    let lobby_table = document.getElementById('table-lobby');

    // var myTable = document.getElementById('myTable');
    // myTable.rows[0].cells[1].innerHTML = 'Hello';
    const num_rows_in_tbl = 10; // TODO this is 1 constant stored in 2 places - unify them!
    let num_rooms_to_display = Math.min(num_rows_in_tbl, list_rooms.length)
    let bg_color;
    const N_COLS = 5; //TODO magic number in 2 places again

    for (let i = 0; i < num_rooms_to_display; i++) {
        // console.log('add row for room ', i)
        
        bg_color = (list_rooms[i]['room_id'] == last_clicked_lobby_room_id) ? '#FFBBBB' : '#EEEEEE';
        for(let col=0; col < N_COLS; col++) {
            //tbl_row.cells[i].style.backgroundColor = '#FFBBBB' //todo only highlight this cell
            lobby_table.rows[i+1].cells[col].style.backgroundColor = bg_color;
        }        
        lobby_table.rows[i+1].style.cursor = 'pointer';
    
        lobby_table.rows[i+1].cells[0].innerHTML = list_rooms[i]['room_id']; //row i+1 because of the the header row
        lobby_table.rows[i+1].cells[1].innerHTML = list_rooms[i]['game_mode'];
        lobby_table.rows[i+1].cells[2].innerHTML = list_rooms[i]['players'];
        lobby_table.rows[i+1].cells[3].innerHTML = list_rooms[i]['bots'];
        lobby_table.rows[i+1].cells[4].innerHTML = list_rooms[i]['status'];       
    }
    
    for (let i = num_rooms_to_display; i < num_rows_in_tbl; i++) {
        bg_color = '#BBBBBB'
        for(let col=0; col < N_COLS; col++) {
            //tbl_row.cells[i].style.backgroundColor = '#FFBBBB' //todo only highlight this cell
            lobby_table.rows[i+1].cells[col].style.backgroundColor = bg_color;
        }
        lobby_table.rows[i+1].style.cursor = 'default';

        lobby_table.rows[i+1].cells[0].innerHTML = '-';
        lobby_table.rows[i+1].cells[1].innerHTML = '-';
        lobby_table.rows[i+1].cells[2].innerHTML = '-';
        lobby_table.rows[i+1].cells[3].innerHTML = '-';
        lobby_table.rows[i+1].cells[4].innerHTML = '-';

    }

})

socket_local.on('tell_client_game_has_started', function(game_id) {
    active_game_id = game_id;
})


function switch_to_waiting_room_gui() {
    document.getElementById('mad-lobby-div').style.display = 'none';
    document.getElementById('mad-waiting-room-div').style.display = 'block';
    document.getElementById('mad-game-div').style.display = 'none';
}

function switch_to_lobby_gui() {
    document.getElementById('mad-lobby-div').style.display = 'block';
    document.getElementById('mad-waiting-room-div').style.display = 'none';
    document.getElementById('mad-game-div').style.display = 'none';
}

function switch_to_game_gui() {
    document.getElementById('mad-lobby-div').style.display = 'none';
    document.getElementById('mad-waiting-room-div').style.display = 'none';
    document.getElementById('mad-game-div').style.display = 'block';
}





function send_chat_message(room, msg) {
    // socket_local.to
}

// function generateTableHead(table, data) {
//     let thead = table.createTHead();
//     let row = thead.insertRow();
//     for (let key of data) {
//       let th = document.createElement("th");
//       let text = document.createTextNode(key);
//       th.appendChild(text);
//       row.appendChild(th);
//     }
//   }


function get_selected_room() {
    //placeholder logic:
    let selected_room_id = last_clicked_lobby_room_id;

    return selected_room_id;
}


function populate_gui() {  

    function get_lobby_div() {
        let div = document.createElement('div');
        div.id = 'mad-lobby-div'
    
        let tbl_lobby = document.createElement('table')
        tbl_lobby.id = 'table-lobby';
        div.appendChild(tbl_lobby)
        
        // Create table header row
        let tbl_tr = document.createElement('tr');
        let keys = ['id', 'Game Mode', 'Players', 'Bots', 'Status']
        for (let key of keys) {
            let tabl_th = document.createElement('th');
            tabl_th.textContent = key;
            tbl_tr.appendChild(tabl_th);
        }
        tbl_lobby.appendChild(tbl_tr);
        
        //Create placeholder table rows
        const n_rows = 10; // number of placeholder table rows to include TODO constant defined in 2 places, unify them
        const n_cols = keys.length;
        for(let r = 0; r < n_rows; r++) {
            let tbl_row = document.createElement('tr');
            tbl_row.id = `tbl_row_${r}`;
            
            tbl_row.addEventListener('click', function(){
                console.log('test click on a row', tbl_row.id, r)
                if (tbl_row.cells[0].innerHTML != '-') {
                    last_clicked_lobby_room_id = tbl_row.cells[0].innerHTML;
                    
                    for(let i=0; i<n_cols; i++) {
                        tbl_row.cells[i].style.backgroundColor = '#FFBBBB' //todo only highlight this cell
                    }
                    
                }


            });


            for (const key of keys) {
                const tbl_cell = document.createElement('td');
                tbl_cell.textContent = '-';
                tbl_row.appendChild(tbl_cell);
              }

            tbl_lobby.appendChild(tbl_row);
            
        }
        

        let btn_create = document.createElement('button');
        btn_create.innerText = 'Create New Room';
        btn_create.addEventListener('click', function(){
            socket_local.emit('create_room')
        });
        div.appendChild(btn_create);
        
        let btn_join_room = document.createElement('button');
        btn_join_room.innerText = 'Join Room';
        btn_join_room.addEventListener('click', function(){
            let room_to_join = get_selected_room(); // TODO TEMP until we add a table listing open rooms
            socket_local.emit('join_game_room', room_to_join)
        });
        div.appendChild(btn_join_room);
        
        return div;
    }

    function get_waiting_room_div() {
        let div = document.createElement('div');
        div.id = 'mad-waiting-room-div'

        let waiting_room_id = document.createElement('div');
        waiting_room_id.id = 'waiting_room_id'
        waiting_room_id.innerHTML = 'Room:';

        let btn_toggle_ready = document.createElement('button');
        btn_toggle_ready.innerText = 'Toggle Ready';
        btn_toggle_ready.addEventListener('click', function(){
            socket_local.emit('toggle_ready', active_room_id)
        });        
        
        let btn_start_game = document.createElement('button');
        btn_start_game.innerText = 'Start Game';
        btn_start_game.addEventListener('click', function(){
            socket_local.emit('start_game', active_room_id)
        });
                
        let btn_leave_room = document.createElement('button');
        btn_leave_room.innerText = 'Leave Room';
        btn_leave_room.addEventListener('click', function(){
            socket_local.emit('leave_game_room', active_room_id)
            switch_to_lobby_gui();
        });        
        
        div.appendChild(waiting_room_id);
        div.appendChild(btn_toggle_ready);
        div.appendChild(btn_start_game);
        div.appendChild(btn_leave_room);
        
        return div;
    }

    function get_chat_div() {
        let div = document.createElement('div');
        div.id = 'mad-chat-div';
        
        let p_chat = document.createElement('p')
        p_chat.id = 'socket_log'
        div.appendChild(p_chat);
        return div;
    }

    function get_game_div() {
        let div = document.createElement('div');
        div.id = 'mad-game-div';
        return div;
    }
    
    let parent_div = document.getElementById('mad_div');

    let lobby_div = get_lobby_div(); //the global lobby
    let room_div = get_waiting_room_div(); // the waiting room between games
    let game_canvas_div = get_game_div(); // the game board itself
    let game_scoreboard = document.createElement('div'); // the scoreboard
    let chat_div = get_chat_div();
    let footer_div = document.createElement('div');
    let news_div = document.createElement('div');

    parent_div.appendChild(lobby_div);
    parent_div.appendChild(room_div);
    parent_div.appendChild(game_scoreboard);
    parent_div.appendChild(game_canvas_div);
    parent_div.appendChild(chat_div);
    parent_div.appendChild(footer_div);
    parent_div.appendChild(news_div);

    switch_to_lobby_gui();

    // document.getElementById("para").onclick = function() {  }
}


populate_gui();
