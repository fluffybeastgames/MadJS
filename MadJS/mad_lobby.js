// "use strict";

function create_new_room() {
    console.log('create_new_room')
    // create new socket room and connect client to it
    // creator goes directly to lobby view
    // on refresh, populate_room_list will include new room in list
}

function test_click() {
    console.log('test_click')
}

function populate_room_list(room_data) {

    let rooms = room_data.rooms;
    // scoreboard_data.sort((a, b) => (a.troops > b.troops) ? -1 : 1); //sort by troops, descending
    
    const table_body = rooms.map(room => {
        // let bg_color = room.admirals == 0 ? CellClient.neutral_entity_color : room.color; // remove the player's fleet color from the scoreboard if they're out of the game
        
        let cursor_style, bg_color;
        if (room.status == 'Open') {
            cursor_style = 'cursor:pointer;';
            bg_color = '#BBFFBB';
        } else  {
            cursor_style = 'cursor:default;';
            bg_color = '#DDDDDD';
        }

        return (
            `<tr bgcolor="${bg_color}" style="${cursor_style}" onclick="test_click()">
            <td style="color:#222288;text-align:center;">${room.game_mode}</td>
            <td style="color:#222288;text-align:center;">${room.players_curr}/${room.players_max}</td>
            <td style="color:#222288;text-align:center;">${room.bot_count}</td>
            <td style="color:#222288;text-align:center;">${room.status}</td>
            <td style="color:#222288;text-align:center;">${room.room_id}</td>
            </tr>`
        );
    }).join('');
    document.getElementById('room_list_body').innerHTML = table_body;
}

function test_populate_room_list() {

    let room0 = {
        'game_mode': 'Free For All',
        'room_id': 'abcdef0',
        'players_curr': 8, 'players_max': 8,
        'bot_count': 0,
        'status': 'Full'
    }
    let room1 = {
        'game_mode': 'Free For All',
        'room_id': 'abcdef1',
        'players_curr': 5, 'players_max': 8,
        'bot_count': 2,
        'status': 'In Progress'
    }
    let room2 = {
        'game_mode': '1v1',
        'room_id': 'abcdef2',
        'players_curr': 1, 'players_max': 2,
        'bot_count': 0,        
        'status': 'Locked'
    }
    let room3 = {
        'game_mode': 'Free For All',
        'room_id': 'abcdef3',
        'players_curr': 2, 'players_max': 8,
        'bot_count': 4,
        'status': 'Open'
    }
    let room4 = {
        'game_mode': 'Free For All',
        'room_id': 'abcdef4',
        'players_curr': 0, 'players_max': 4,
        'bot_count': 0,
        'status': 'Open'
    }
    
    room_data = {
        rooms: [room0, room1, room2, room3, room4]
    }

    // console.log(room_data);
    populate_room_list(room_data);
}

test_populate_room_list();