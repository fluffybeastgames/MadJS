"use strict";

///////////
// Local App constants and global variables
///////////
let canvas, context; // the canvas and context we will draw the game cells on
const cells_client = []; // This is the array of cell objects as understood by the client. Currently is only used for rendering.
let  game_tick_local;
let local_player_id = 0 // TODO temp syntax - don't want this hardcoded
const active_cell = [0,0]; // will hold the row/col pair of currently selected coordinates, if any
const valid_key_presses = ['W', 'w', 'A', 'a', 'S', 's', 'D', 'd', 'E', 'e', 'Q', 'q'] //, 37]
const local_move_queue = [];
let local_queued_move_counter = 0; // this gets incremented every time the users queues a move and serves as the move's unique identifier, both locally and on the server (each player has a separate queue)

const MIN_SCALE = 1;
const MAX_SCALE = 15;
const DEFAULT_ZOOM = 4;
let zoom_scale = DEFAULT_ZOOM; // for scroll wheel zooming

const DEFAULT_CANVAS_WIDTH = 50
const DEFAULT_CANVAS_HEIGHT = 50
const DEFAULT_FONT_SIZE = 18
let font_size = DEFAULT_FONT_SIZE;

const RENDER_REFRESH_TIME = 50 // time in ms to wait after rendering before rendering. Due to how setTimeout works, may be up to 16 ms late

///////////
// Server constants and global variables
///////////
let tick_time = 500 // ms to wait before rendering each new frame
let game_on; // when game_on, the game will loop every ~tick_time ms, increasing the game_tick and advancing the simulation
let game_tick_server;
let last_starting_configuration;
let game = null;
let move_mode; // values are defined in the ACTION_MOVE_ constants

const GAME_MODE_FFA = 1
const GAME_MODE_FFA_CUST = 2
const GAME_MODE_REPLAY = 3

const GAME_STATUS_INIT = 0 // loading
const GAME_STATUS_READY = 1 // able to start
const GAME_STATUS_IN_PROGRESS = 2 //
const GAME_STATUS_PAUSE = 3 //
const GAME_STATUS_GAME_OVER_WIN = 4 // game instance is complete and can no longer be played
const GAME_STATUS_GAME_OVER_LOSE = 5 // game instance is complete and can no longer be played

///////////
// Shared constants
///////////

const TERRAIN_TYPE_WATER = 101
const TERRAIN_TYPE_SWAMP = 104 
const TERRAIN_TYPE_MOUNTAIN = 105
const TERRAIN_TYPE_MOUNTAIN_CRACKED = 106
const TERRAIN_TYPE_MOUNTAIN_BROKEN = 107

const ENTITY_TYPE_ADMIRAL = 200
const ENTITY_TYPE_SHIP = 201
const ENTITY_TYPE_SHIP_2 = 202 // combine 2 ships to make this. Increased growth rate
const ENTITY_TYPE_SHIP_3 = 203 // combine 1 ship_2 with a ship to make this. Increased growth rate
const ENTITY_TYPE_SHIP_4 = 204 // combine 2 ship_2s or 1 ship_3 and 1 ship to make this. Increased growth rate
const ENTITY_TYPE_INFANTRY = 205


const ACTION_MOVE_NORMAL = 1
const ACTION_MOVE_HALF = 2
const ACTION_MOVE_ALL = 3
const ACTION_MOVE_CITY = 4
const ACTION_MOVE_NONE = 5

    

///////////
// Local App classes and functions
///////////

function game_loop_client() {
    if (true) {
        render_board(); // Redraw the game canvas        
    }
    setTimeout( () => { window.requestAnimationFrame(() => game_loop_client()); }, RENDER_REFRESH_TIME) // therefore each game loop will last at least tick_time ms    
}

//game init on server, event handlers on client side, canvas/context def on client
function init_client(){
    console.log('Initializing a Madmirals instance')
    
    init_server()
    // Add event listener on keydown
    document.addEventListener('keydown', (event) => {
        if (valid_key_presses.includes(event.key)) {
            handle_key_press(event.key)
        }
    }, false);

    move_mode = ACTION_MOVE_NORMAL

    canvas = document.getElementById('canvas'); // Get a reference to the canvas
    context = canvas.getContext('2d');

    canvas.height = CellClient.height*game.num_rows // canvas width must match cols*col_size
    canvas.width = CellClient.width*game.num_cols // canvas width must match cols*col_size

    canvas.addEventListener('mousedown', function (event) { mouse_handler(event) }, false); //our main click handler function
    canvas.addEventListener('contextmenu', function(event) { event.preventDefault(); }, false); // prevent right clicks from bringing up the context menu
    canvas.addEventListener('wheel', function (event) { wheel_handler(event) },  {passive: true}); // zoom in/out with the scroll wheel
    drag_canvas_event_handler(canvas); // custom function to handle dragging the canvas while the mouse is down

    // create_board_cells(num_rows, num_cols); // Create an array of Cells objects, each representing one cell in the simulation
    create_client_cells(game.num_rows, game.num_cols); // Create an array of Cells objects, each representing one cell in the simulation
    render_board(); // display the starting conditions for the sim
    
    window.requestAnimationFrame(() => game_loop_client()); // start the game loop
}

class CellClient {
    static width = DEFAULT_CANVAS_WIDTH;
    static height = DEFAULT_CANVAS_HEIGHT;
    static grid_color = '#bb00ff'
    static mountain_color = '#888888'
    static swamp_color = '#0E735A'
    static high_tide_color = '#0E306C'
    static neutral_entity_color = '#BBBBBB'
            
    constructor(context, id, row, col) {
        this.context = context; // the context of the canvas we'll be drawing to
        this.id = id //position w/in the 1d array of cells
        this.row = row;
        this.col = col;
        this.owner = null
        this.troops = 0
        this.terrain = TERRAIN_TYPE_WATER //water is traversable, mountains are not
        this.entity = null // what type of entity (if any) is here - eg admiral
        this.visible = false // can the user view this cell at the moment? If not, it should be blackened out
    }   

    draw_cell() {
        //First draw a grid around the cell
        //Draw outline around the cell
        this.context.strokeStyle = CellClient.grid_color;
        this.context.lineWidth = 1;
        this.context.strokeRect(this.col*CellClient.width, this.row*CellClient.height, CellClient.width, CellClient.height)
        
        if (this.visible) {
            if (this.terrain == TERRAIN_TYPE_MOUNTAIN) {
                this.context.fillStyle = CellClient.mountain_color            
                this.context.fillRect(this.col*CellClient.width, this.row*CellClient.height, CellClient.width, CellClient.height)
            } else if (this.terrain == TERRAIN_TYPE_SWAMP) {
                this.context.fillStyle = CellClient.swamp_color            
                this.context.fillRect(this.col*CellClient.width, this.row*CellClient.height, CellClient.width, CellClient.height)
            } else {
                this.context.fillStyle = CellClient.high_tide_color            
                this.context.fillRect(this.col*CellClient.width, this.row*CellClient.height, CellClient.width, CellClient.height)    
            }
            
            // If there is an admiral here, draw a star to represent it
            if (this.entity == ENTITY_TYPE_ADMIRAL ) { //&& false) {
                this.draw_star(13);
            } else if (this.entity == ENTITY_TYPE_SHIP) {
                this.draw_star(3);
            } else if (this.entity == ENTITY_TYPE_SHIP_2) {
                this.draw_star(4);
            } else if (this.entity == ENTITY_TYPE_SHIP_3) {
                this.draw_star(5);
            } else if (this.entity == ENTITY_TYPE_SHIP_4) {
                this.draw_star(6);
                

            } else if (this.owner != null) { // Otherwise, if the spot is owned, draw a circle over it in the owner's color
                this.draw_circle();
            } 

            this.draw_troops();
        }
    }


    // draw_ship(ship_type) {
    //     this.draw_star()
    // }

    draw_circle() {
        this.context.beginPath()
        // Draw the circle containing the cell, its remains, or nothing
        let x, y, radius;
        x = this.col*CellClient.width + CellClient.width/2;
        y = this.row*CellClient.height + CellClient.height/2;
        radius = CellClient.width/2 - 1;

        this.context.beginPath();
        this.context.arc(x, y, radius, 0, 2 * Math.PI, false);
        this.context.fillStyle = game.players[this.owner].color;
        this.context.fill(); // apply the solid color
    
    }

    draw_star(num_points=5) { // Draws an n-pointed star within the bounds of the cell, representing an Admiral or ship cell
    // Credit to https://stackoverflow.com/a/45140101
        //let num_points = 5 //Math.floor(Math.random() * 7 + 3)
        let inset = .5
        let x = this.col*CellClient.width + CellClient.width/2;
        let y = this.row*CellClient.height + CellClient.height/2;
        let radius = CellClient.width/2;

        let fillColor = (this.owner !=null) ? game.players[this.owner].color: CellClient.neutral_entity_color;

        this.context.save();
        this.context.fillStyle = fillColor;
        this.context.beginPath();
        this.context.translate(x, y);
        this.context.moveTo(0, 0-radius);
        for (let i = 0; i < num_points; i++) {
            this.context.rotate(Math.PI / num_points);
            this.context.lineTo(0, 0 - (radius*inset));
            this.context.rotate(Math.PI / num_points);
            this.context.lineTo(0, 0 - radius);
        }
        this.context.closePath();
        this.context.fill();
        this.context.restore();
    }
    
    draw_troops() {
        let x = this.col*CellClient.width + CellClient.width/2;
        let y = this.row*CellClient.height + CellClient.height/2;
        // Add the number of troops (if any)
        if (this.troops != 0) {
            this.context.font = `${font_size}px Comic Sans MS`;
            this.context.fillStyle = '#FFFFFF';
            this.context.textBaseline = 'middle';
            this.context.textAlign = 'center';
            this.context.fillText(this.troops, x, y, CellClient.width); //limit the width to the size of the cell, squeezing text if need be
        }
        
    }

    draw_arrow(dir, action) { // Draw an arrow over the cell to indicate a queued move
        let arrow_color = '#FFFFFF';
        if (action == ACTION_MOVE_ALL) {arrow_color = '#FF0000'} 
        else if (action == ACTION_MOVE_HALF) {arrow_color = '#FFcc00'} 
        
        this.context.beginPath();
        let x_origin, y_start, x_dest, y_dest;
        const strokeWidth = 2;

        x_origin = this.col*CellClient.width + CellClient.width/2;
        y_start = this.row*CellClient.height + CellClient.height/2;
        
        if (dir == 'up') {
            x_dest=x_origin
            y_dest=y_start - CellClient.height/2;
        } else if (dir == 'down') {
            x_dest=x_origin;
            y_dest=y_start + CellClient.height/2;
        } else if (dir == 'left') {
            x_dest=x_origin - CellClient.width/2;
            y_dest=y_start;
        } else if (dir == 'right') {
            x_dest=x_origin+CellClient.width/2;
            y_dest=y_start;
        } else 
        
        // this.context.beginPath();
        this.context.lineWidth = 1; //for some reason this needs to be called both before and after drawing the line, or the arrows won't render correctly
        this.context.strokeStyle = arrow_color;
        this.context.strokeWidth = strokeWidth
        this.context.stroke();
        
        // Inspired by / adapted from https://stackoverflow.com/a/6333775 :
        let arrow_head_length = CellClient.width/7; // length of arrow head in pixels
        let dx = x_dest - x_origin;
        let dy = y_dest - y_start;
        let angle = Math.atan2(dy, dx);
        this.context.moveTo(x_origin, y_start);
        this.context.lineTo(x_dest, y_dest);
        this.context.lineTo(x_dest - arrow_head_length * Math.cos(angle - Math.PI / 6), y_dest - arrow_head_length * Math.sin(angle - Math.PI / 6));
        this.context.moveTo(x_dest, y_dest);
        this.context.lineTo(x_dest - arrow_head_length * Math.cos(angle + Math.PI / 6), y_dest - arrow_head_length * Math.sin(angle + Math.PI / 6));
        this.context.lineWidth = 1; //for some reason this needs to be called both before and after drawing the line, or the arrows won't render correctly
        this.context.strokeStyle = arrow_color;
        this.context.strokeWidth = strokeWidth
        this.context.stroke();
    }
};

function create_client_cells(n_rows, n_cols) { // in the future this will only be defined on the client side
    console.log('creating client cell grid')

    let id;
    id = 0
    for(let r = 0; r < n_rows; r++) {
        for(let c = 0; c < n_cols; c++) {
            cells_client.push(new CellClient(context, id, r, c));
            id++;
        }
    }
}

function render_board() {    
    //context.fillStyle='#0E306C'  // High Tide Blue '#DDDDDD' // grey
    context.fillStyle='#222222'  // High Tide Blue '#DDDDDD' // grey
    context.fillRect(0, 0, canvas.width, canvas.height); // Clear the board
    
    // Draw each gridline and object on the canvas
    for (let i = 0; i < cells_client.length; i++) {
        cells_client[i].draw_cell();
    }

    //Add the highlights around the active cell (if present)
    highlight_active_cell()

    // Draw arrows over each square containig one or more queued moves
    local_move_queue.forEach(move => {
        let id;
        id = move.row * game.num_cols + move.col; // id 0 is the topleft most cells, and there num_cols cols per row        
        cells_client[id].draw_arrow(move.dir, move.action);
    }); 

    // display the turn number
    document.getElementById('turn_counter').innerText = `Turn ${game_tick_local}`
}

// Show the user where they are by highlighting the active cell
function highlight_active_cell() {
    cells_client.forEach(cell => {
        if(cell.row == active_cell[0] && cell.col == active_cell[1]) {
            cell.context.lineWidth = 5;
            
            if (move_mode == ACTION_MOVE_NORMAL) { cell.context.strokeStyle = '#FFFFFF'; }
            else if (move_mode == ACTION_MOVE_ALL) { cell.context.strokeStyle = '#FF0000'; }
            else if (move_mode == ACTION_MOVE_HALF) { cell.context.strokeStyle = '#FFcc00'; }
    
            cell.context.strokeRect(cell.col*CellClient.width, cell.row*CellClient.height, CellClient.width, CellClient.height);
            
            // Slightly darken the cells around the active cell to highlight its location
            context.fillStyle = "rgba(0, 0, 0, 0.2)";
            cell.context.fillRect((cell.col-1)*CellClient.width, cell.row*CellClient.height, CellClient.width, CellClient.height);
            cell.context.fillRect((cell.col+1)*CellClient.width, cell.row*CellClient.height, CellClient.width, CellClient.height);
            cell.context.fillRect((cell.col)*CellClient.width, (cell.row-1)*CellClient.height, CellClient.width, CellClient.height);
            cell.context.fillRect((cell.col)*CellClient.width, (cell.row+1)*CellClient.height, CellClient.width, CellClient.height);
        }
    }); 
}

function mouse_handler(event) {
    event.preventDefault() // prevent default mouse behavior, mainly preventing middle click from activating scroll mode
        
    if (event.button == 0) { //left click
        let mousePos = getMousePos(canvas, event);
        select_cell_at(mousePos.x, mousePos.y);
        move_mode = ACTION_MOVE_NORMAL;

    } else if (event.button == 1) { // middle click
        let mousePos = getMousePos(canvas, event);
        select_cell_at(mousePos.x, mousePos.y);          
        move_mode = ACTION_MOVE_ALL; 

    } else if (event.button == 2) { // right click 
        let mousePos = getMousePos(canvas, event);
        select_cell_at(mousePos.x, mousePos.y);         
        move_mode = ACTION_MOVE_HALF; 
    };
}

// Zoom in or out when the scrollwheel is used. Scale cells and inner text at the same rate
// Originally zoomed the canvas in or out, but as this scales the whole canvas, it didn't reveal any additional cells
function wheel_handler(event) {
    // event.preventDefault(); 
    
    if (event.deltaY > 0 && zoom_scale > MIN_SCALE) { // zoom out
        zoom_scale --;
    } else if (event.deltaY < 0 && zoom_scale < MAX_SCALE)  { //zoom in
        zoom_scale ++;
    };

    CellClient.height = Math.round(DEFAULT_CANVAS_HEIGHT*(zoom_scale/DEFAULT_ZOOM));
    CellClient.width = Math.round(DEFAULT_CANVAS_WIDTH*(zoom_scale/DEFAULT_ZOOM));
    font_size = Math.round(DEFAULT_FONT_SIZE*(zoom_scale/DEFAULT_ZOOM));

        // canvas.height = CellClient.height*num_rows // canvas width must match cols*col_size
    // canvas.width = CellClient.width*num_cols // canvas width must match cols*col_size
    canvas.width = CellClient.width*game.num_cols;
    canvas.height = CellClient.height*game.num_rows;

    render_board();
}

//Get Mouse Position
function getMousePos(canvas, event) {
    let rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function select_cell_at(x, y) {
    let row, col, id;
    row = Math.floor(y/CellClient.height)
    col = Math.floor(x/CellClient.width)
    // console.log(`Selecting cell ${row},${col}`)

    active_cell[0] = row;
    active_cell[1] = col;
    
    // if (row >= 0 && row < num_rows && col >= 0 && col < num_cols) {
    //     id = row * num_cols + col // id 0 is the topleft most cells, and there num_cols cols per row        
    //     cells[id].alive = !cells[id].alive
    // };
    render_board();
}

function handle_key_press(key_key) {
    //If they user has pressed a movement key (currently only WASD supported), then try to move the active cell
    let dir, target_row, target_col;
    
    
    if ((key_key == 'W' || key_key == 'w') && active_cell[0] > 0) {
        target_row = active_cell[0] - 1
        target_col = active_cell[1]
        add_to_queue(active_cell[0], active_cell[1], target_row, target_col, 'up')
    //} else if ((key_key == 'A' || key_key == 'a' || key_key == 37) && active_cell[1] > 0) { // left
    } else if ((key_key == 'A' || key_key == 'a') && active_cell[1] > 0) { // left
        target_row = active_cell[0]
        target_col = active_cell[1] - 1
        add_to_queue(active_cell[0], active_cell[1], target_row, target_col, 'left')
    } else if ((key_key == 'S' || key_key == 's') && active_cell[0] < game.num_rows - 1) { // down
        target_row = active_cell[0] + 1
        target_col = active_cell[1]
        add_to_queue(active_cell[0], active_cell[1], target_row, target_col, 'down')
    } else if ((key_key == 'D' || key_key == 'd') && active_cell[1] < game.num_cols - 1) { // right
        target_row = active_cell[0]
        target_col = active_cell[1] + 1
        add_to_queue(active_cell[0], active_cell[1], target_row, target_col, 'right')
    } else {
        if (key_key == 'Q' || key_key == 'q') { 
            cancel_queue()
            
        } else if (key_key == 'E' || key_key == 'e') {
            undo_queued_move(); //undo last queued move and return active cell to it
            
        }
    };
}

function cancel_queue() { //undo all queued moves
    server_receives_cancel_queue(local_player_id)
    local_move_queue.length = 0 // empty the queue list. Do not bother updating active cell location
    render_board();
}

function undo_queued_move() { //undo last queued move and return active cell to it
    if (local_move_queue.length > 0) {
        let popped = local_move_queue.pop();
        
        active_cell[0] = popped.row;
        active_cell[1] = popped.col;
        
        server_receives_undo_queued_move(local_player_id, popped.id)

        render_board();
    }
}

function weighted_choice(arr_options) {
//Given an array of objects containing a key 'weight' containing a non-negative number. The bigger the number, the more likely it is to be picked
    let total_weight = 0; 
    arr_options.forEach(option => { total_weight += Math.max(option.weight,0) }); // sum up the individual weights to determine the scale of our randrange

    let rand_weight = Math.random()*total_weight;

    let traversed_weight = 0, arr_pos = -1;
    while(traversed_weight < rand_weight && arr_pos < arr_options.length - 1) {
        arr_pos++;
        traversed_weight += arr_options[arr_pos].weight
    }
    return arr_options[arr_pos]

}

function test_weighted_choice() {
    let num_tests = 10000;
    let weighted_choice_data = [
        {'value1':'value_0', 'other_val_1':'test', 'weight':0}, // 0 should never be selected
        {'value1':'value_1', 'other_val_1':'test', 'weight':1},
        {'value1':'value_2', 'other_val_1':'test', 'weight':2},
        {'value1':'value_3', 'other_val_1':'test', 'weight':3},
        {'value1':'value_4', 'other_val_1':'test', 'weight':4},
        {'value1':'value_5', 'other_val_1':'test', 'weight':5},
        {'value1':'value_6', 'other_val_1':'test', 'weight':6},
        {'value1':'value_7', 'other_val_1':'test', 'weight':7},
        {'value1':'value_8', 'other_val_1':'test', 'weight':8},
        {'value1':'value_9', 'other_val_1':'test', 'weight':9}, // a weight of 9 should be selected ~9x as often as a weight of 1
        {'value1':'value_10', 'other_val_1':'test', 'weight':-10}, // should default to 0
    ];

    let arr_results = new Array(11).fill(0);

    for (let i = 0; i < num_tests; i++) {
        let result = weighted_choice(weighted_choice_data)
        arr_results[result.weight] ++
    };
    console.log(arr_results) // results with a sample size of 10,000: [0, 240, 447, 711, 851, 1127, 1322, 1586, 1710, 2006, 0]
}
      

function add_to_queue(source_row, source_col, target_row, target_col, dir) {
    local_queued_move_counter ++;
    let new_move = {'id':local_queued_move_counter, 'row':active_cell[0], 'col':active_cell[1], 'dir':dir, 'queuer':0,'target_row':target_row, 'target_col':target_col, 'action':move_mode}
    //to do queuer: 0 assumes player is always player 0
    server_receives_new_queued_moved(local_player_id, new_move)
    local_move_queue.push(new_move) //TODO owner = 0 is a stand-in for the user, for now
    
    if (move_mode == ACTION_MOVE_HALF) {move_mode = ACTION_MOVE_NORMAL} // if we had right clicked to move half and half applied the half move in the above step, then we want to revert to normal movement mode

    // Update the active/highlighted cell to match the new target
    active_cell[0] = target_row
    active_cell[1] = target_col
    
    render_board();

}
// Adapted from https://www.w3schools.com/howto/howto_js_draggable.asp, but my version's even cooler
function drag_canvas_event_handler(canvas_element) {
    let x_dest = 0, y_dest = 0, x_origin = 0, y_origin = 0;
    let mousedown_timer = null; // delay drag until the mouse has been briefly held down, to avoid accidental dragging during normal play
    canvas_element.onmousedown = mouse_down_on_canvas;

    function mouse_down_on_canvas(event) {
        if (event.button == 0) { // if left click
            event = event || window.event;
            event.preventDefault();

            mousedown_timer = Date.now()

            x_origin = event.clientX;
            y_origin = event.clientY;

            document.onmouseup = stop_dragging; // stop dragging when the mouse is unclicked (even if it's outside the bounds of the canvas) 
            document.onmousemove = drag_canvas; // drag whenever the mouse is clicked is moving (even if it's outside the bounds of the canvas) 
        };
    }

    function drag_canvas(event) {
        event = event || window.event;
        event.preventDefault();

        if (Date.now() - mousedown_timer > 125) {
            // calculate the new cursor position:
            x_dest = x_origin - event.clientX;
            y_dest = y_origin - event.clientY;
            x_origin = event.clientX;
            y_origin = event.clientY;

            // set the element's new position:
            canvas_element.style.top = (canvas_element.offsetTop - y_dest) + "px";
            canvas_element.style.left = (canvas_element.offsetLeft - x_dest) + "px";
        }
    }

    function stop_dragging() { // stop moving when mouse button is released:    
        document.onmouseup = null;
        document.onmousemove = null;
    }
}


function toggle_pause() { //TODO remove this
    console.log('This button has been phased out!')
    // console.log('Toggling pause')
    // game_on = !game_on //game_loop will keep running when game_on is false but will not update the board or render it
    
    // // Update the button text to indicate the action it would perform
    // document.getElementById('pause_resume_button').innerText = game_on ? 'Pause' : 'Play';
}

function client_receives_game_state_here(json) {
    if (cells_client.length > 0) {    
        //console.log('Attempting a new way of rendering')
        
        game_tick_local = json.game.turn // update the turn count
        
        // Update the board to contain only info the player should currently be able to see
        cells_client.forEach(cell => {
            cell.owner = null;
            cell.troops = 0;
            cell.entity = null;
            cell.terrain = null;
            cell.visible = false;
        });
                
        json.board.forEach(new_cell => {
            if('owner' in new_cell) { cells_client[new_cell.id].owner = new_cell.owner };
            if('troops' in new_cell) { cells_client[new_cell.id].troops = new_cell.troops };
            if('entity' in new_cell) { cells_client[new_cell.id].entity = new_cell.entity };
            if('terrain' in new_cell) { cells_client[new_cell.id].terrain = new_cell.terrain };
            if('visible' in new_cell) { cells_client[new_cell.id].visible = new_cell.visible };
        });
    } else {console.log('Not ready yet!')}

    
    // Update the local move queue - if one or more moves has been removed by the server, remove them from the front of the local queue
    let new_min_queue_id = json.game.next_queue_id

    if (new_min_queue_id == '-1') {
        //console.log('got here')
        local_move_queue.length = 0;
    } else {
        let not_caught_up = true;
        while (local_move_queue.length>0 && not_caught_up) {
            if (local_move_queue[0].id < new_min_queue_id) {
                local_move_queue.shift();
            } else { not_caught_up = false; } //escape 
        };
    }
    
}









///////////
// Server classes and functions
///////////

function game_loop_server() {
    // console.log('tick')
    if (game_on) {
        game_tick_server++;
        check_for_game_over();
        update_game(); // check each cell to see if it should be alive next turn and update the .alive tag                
        send_game_state();
    }
    setTimeout( () => { window.requestAnimationFrame(() => game_loop_server()); }, tick_time) // TODO THIS IS STILL CLIENT ONLY NEED TO ADOPT SEPARATE TIMER FOR NODE SIDE
}

class Game {
    constructor(n_rows, n_cols, fog_of_war) {
        this.players = []
        this.player_turn_order = []
        this.game_state = GAME_STATUS_INIT
        this.fog_of_war = fog_of_war;
        this.num_rows = n_rows
        this.num_cols =  n_cols
        this.cells = []; // will hold an array Cell objects. This will become the server-side all-knowing set of cells
        this.initialize_cells();
    }

    add_human(session_id, color) {
        let new_id = this.players.length
        this.player_turn_order.push(new_id)
        this.players.push(new HumanPlayer(new_id, session_id, color))
    }

    add_bot(personality, color) {
        let new_id = this.players.length
        this.player_turn_order.push(new_id)
        this.players.push(new Bot(new_id, personality, color))
    }
    
    initialize_cells() {
        let id = 0;
        for(let r = 0; r < this.num_rows; r++) {
            for(let c = 0; c < this.num_cols; c++) {
                this.cells.push(new CellServer(context, id, r, c));
                id++;;
            }
        }
    }
    
}

class CellServer {
    constructor(context, id, row, col) {
        this.id = id //position w/in the 1d array of cells
        this.row = row;
        this.col = col;
        this.owner = null
        this.troops = 0
        this.terrain = TERRAIN_TYPE_WATER //water is traversable, mountains are not
        this.entity = null // what type of entity (if any) is here - eg admiral
    }   

    neighbor(dir) { //returns the neighboring cell. If out of bounds, returns null
        if(dir=='left' && this.col>0) { 
            return game.cells[this.id-1]
        } else if (dir=='right' && this.col < game.num_cols - 1) { 
            return game.cells[this.id+1]
        } else if (dir=='up' && this.row>0) { 
            return game.cells[this.id - game.num_cols]
        } else if (dir=='down' && this.row < game.num_rows - 1) { 
            return game.cells[this.id + game.num_cols]
        } else {
            return null;
        }

        
    }
}

class HumanPlayer {
    constructor(uid, session_id, color) {
        this.uid = uid // 0-n, may be unecessary as we can use the position in Players[] as the uid
        this.session_id = session_id // the session ID of the connected player
        this.color = color //temp. green
        this.queued_moves = []
        this.is_human = true;
        this.active = true; // if active, still in the game. if not, keep in the scoreboard but ignore during gameplay
    }
    
    admiral_count() {
        let counter = 0;
        game.cells.forEach(cell => {
            if (cell.owner == this.uid && cell.entity == ENTITY_TYPE_ADMIRAL) {counter ++} 
        });
        return counter
    }

    cell_count() {
        let counter = 0;
        game.cells.forEach(cell => {
            if (cell.owner == this.uid) {counter += cell.troops} 
        });
        return counter
    }

    
}

class Bot {
    constructor(uid, personality, color) {
        this.uid = uid
        this.personality = personality
        this.color = color
        this.queued_moves = []
        this.is_human = false;
        this.active = true; // if active, still in the game. if not, keep in the scoreboard but ignore during gameplay
    }

    admiral_count() {
        let counter = 0;
        game.cells.forEach(cell => {
            if (cell.owner == this.uid && cell.entity == ENTITY_TYPE_ADMIRAL) {counter ++} 
        });
        return counter
    }

    cell_count() {
        let counter = 0;
        game.cells.forEach(cell => {
            if (cell.owner == this.uid) {counter += cell.troops} 
        });
        return counter
    }

    take_move() {
        if (this.queued_moves.length < 1) {
            this.grow()
        }
    }

    grow() { // a bot behavior that emphasizes growth over safey or combat. However, it will probably try to take over admirals and ships, given the chance
        function eval_potential_move(cell, target, this_uid, cell_count) {        
            //Evaluate the given situation and assign it a weight based on its suspected quality
            let cell_ratio = (cell.troops - target.troops)/ cell_count;
            if (target.terrain == TERRAIN_TYPE_MOUNTAIN) {return [0, ACTION_MOVE_NONE]} // don't try to grow into mountains (not yet, anyway)            
            if (cell.troops <= 1) {return [0, ACTION_MOVE_NONE]} // don't try growing if you don't have any troops to spare
            
            let weight = 0
            let move_mode = ACTION_MOVE_NORMAL
            if (target.owner == this_uid) { weight += 1 }
            if (target.owner == null) { weight += 15 }
            if (target.owner != this_uid && target.troops < cell.troops + 1) { weight += 10 }
            if (target.owner != this_uid && target.troops < cell.troops + 1 && target.entity == ENTITY_TYPE_ADMIRAL) { weight += 40 } //strongly prioritize capturing enemy admirals
            if (target.owner != this_uid && target.troops < cell.troops + 1 && target.entity == ENTITY_TYPE_SHIP) { 
                weight += 10;
                move_mode = ACTION_MOVE_ALL;
            } //also capturing enemy ships
            if (target.owner != this_uid && target.troops >= cell.troops + 1) { weight += 2 }
            if (cell.terrain == TERRAIN_TYPE_SWAMP && target.terrain == TERRAIN_TYPE_WATER) { 
                weight += 25;
                move_mode = ACTION_MOVE_ALL;
            }
            if (target.terrain == TERRAIN_TYPE_SWAMP) { weight -= 15 }
            
            // console.log(weight, cell.troops, cell_count, cell_ratio)
            weight = Math.max(weight * cell_ratio, 0);
            //return [Math.max(weight, 0), ACTION_MOVE_NORMAL];
            return [weight, move_mode];
        };
        
        let potential_moves = [];
        let neighbor_left, neighbor_right, neighbor_up, neighbor_down, weight;
        let cell_count = game.players[this.uid].cell_count();

        let pm_id = 0; // a counter

        game.cells.forEach(cell => {
            if(cell.owner == this.uid) {
                neighbor_left = cell.neighbor('left');
                neighbor_right = cell.neighbor('right');
                neighbor_up = cell.neighbor('up');
                neighbor_down = cell.neighbor('down');
                
                if(neighbor_left)   { 
                    let result = eval_potential_move(cell, neighbor_left, this.uid, cell_count);
                    potential_moves.push({'id':pm_id++, 'move_mode':result[1], 'source_cell':cell, 'target_cell': neighbor_left, 'dir':'left', 'weight': result[0]});
                };
                
                if(neighbor_right)  { 
                    let result = eval_potential_move(cell, neighbor_right, this.uid, cell_count);
                    potential_moves.push({'id':pm_id++, 'move_mode':result[1], 'source_cell':cell, 'target_cell': neighbor_right, 'dir':'right', 'weight': result[0]})
                };
                
                if(neighbor_up)     { 
                    let result = eval_potential_move(cell, neighbor_up, this.uid, cell_count);
                    potential_moves.push({'id':pm_id++, 'move_mode':result[1], 'source_cell':cell, 'target_cell': neighbor_up, 'dir':'up', 'weight': result[0]})
                };
                
                if(neighbor_down)   { 
                    let result = eval_potential_move(cell, neighbor_down, this.uid, cell_count);
                    potential_moves.push({'id':pm_id++, 'move_mode':result[1], 'source_cell':cell, 'target_cell': neighbor_down, 'dir':'down', 'weight': result[0]})
                };
            };
        });

        //let num_moves_to_queue = Math.floor(Math.random()*5+1); // queue up to this many moves at a time - compromise between performance and quick thinking of bot's part
        let num_moves_to_queue = Math.floor(Math.random()*3+1); // queue up to this many moves at a time - compromise between performance and quick thinking of bot's part
        num_moves_to_queue = Math.min(potential_moves.length, num_moves_to_queue);

        for (let i = 0; i < num_moves_to_queue; i++) {
            if (potential_moves.length > 0) {
                let result = weighted_choice(potential_moves)

                if (result) {
                    // console.log(result)
                    let row = result.source_cell.row
                    let col = result.source_cell.col
                    let target_row = result.target_cell.row
                    let target_col = result.target_cell.col
                    
                    let new_move = {'id':-1, 'row':row, 'col':col, 'dir':result.dir, 
                                    'queuer':this.uid,'target_row':target_row, 'target_col':target_col, 'action':result.move_mode}
                    game.players[this.uid].queued_moves.push(new_move);

                    //console.log(`tick: ${game_tick_server} move_id: ${result.id};  ${row}x${col} ${result.dir} to ${target_row}x${target_col}, queue: ${this.queued_moves.length}, winning weight ${result.weight} `)

                    // Remove result from list of potential_moves for the remainder of the turn
                    potential_moves = potential_moves.filter(item => item.cell !== result.cell)
                };
            }
        };
    }
}

function try_to_move_ship(cell_id_source, cell_id_dest, action) {
    // Assumes this a valid move where the same player owns both cells and the action is ACTION_MOVEALL. 
    // This function calculates whether or not to move the ship and combines ships if appropriate. Also makes sure to leave 1 troop behind if a ship remains in source cell
    let source_entity = game.cells[cell_id_source].entity
    let dest_entity = game.cells[cell_id_dest].entity
    let dest_terrain = game.cells[cell_id_dest].terrain
    

    if ([ENTITY_TYPE_SHIP, ENTITY_TYPE_SHIP_2, ENTITY_TYPE_SHIP_3, ENTITY_TYPE_SHIP_4, null].includes(dest_entity) && // make sure we're not moving into an admiral
                [TERRAIN_TYPE_WATER, TERRAIN_TYPE_SWAMP].includes(dest_terrain)) { // make sure we're able to put a ship here
            
        let mast_count = 0;
        switch (source_entity) {
            case ENTITY_TYPE_SHIP: mast_count += 1; break;
            case ENTITY_TYPE_SHIP_2: mast_count += 2; break;
            case ENTITY_TYPE_SHIP_3: mast_count += 3; break;
            case ENTITY_TYPE_SHIP_4: mast_count += 4; break;
        };
        
        switch (dest_entity) {
            case ENTITY_TYPE_SHIP: mast_count += 1; break;
            case ENTITY_TYPE_SHIP_2: mast_count += 2; break;
            case ENTITY_TYPE_SHIP_3: mast_count += 3; break;
            case ENTITY_TYPE_SHIP_4: mast_count += 4; break;
        };
        
        switch (mast_count) {
            case 1: 
                game.cells[cell_id_source].entity = null;
                game.cells[cell_id_dest].entity = ENTITY_TYPE_SHIP;
                break;
            case 2: 
                game.cells[cell_id_source].entity = null;
                game.cells[cell_id_dest].entity = ENTITY_TYPE_SHIP_2;
                break;
            case 3: 
                game.cells[cell_id_source].entity = null;
                game.cells[cell_id_dest].entity = ENTITY_TYPE_SHIP_3;
                break;
            case 4: 
                game.cells[cell_id_source].entity = null;
                game.cells[cell_id_dest].entity = ENTITY_TYPE_SHIP_4;
                break;
            case 5: 
                game.cells[cell_id_source].entity = ENTITY_TYPE_SHIP;
                game.cells[cell_id_dest].entity = ENTITY_TYPE_SHIP_4;
                game.cells[cell_id_source].troops = 1
                break;
            case 6: 
                game.cells[cell_id_source].entity = ENTITY_TYPE_SHIP_2;
                game.cells[cell_id_dest].entity = ENTITY_TYPE_SHIP_4;
                game.cells[cell_id_source].troops = 1
                break;
            case 7: 
                game.cells[cell_id_source].entity = ENTITY_TYPE_SHIP_3;
                game.cells[cell_id_dest].entity = ENTITY_TYPE_SHIP_4;
                game.cells[cell_id_source].troops = 1
                break;
            case 8: 
                game.cells[cell_id_source].entity = ENTITY_TYPE_SHIP_4;
                game.cells[cell_id_dest].entity = ENTITY_TYPE_SHIP_4;
                game.cells[cell_id_source].troops = 1
                break;                    
        };    
        
    } else if (action ==ACTION_MOVE_ALL) { // instead of abandoning ship, leave one troop behind
        game.cells[cell_id_source].troops += 1
    }
        
}

function update_game() { // advance game by 1 tick
    if (game_on) {
        //growth phase
        game.cells.forEach(cell => {
            if(cell.owner != null) {
                if (cell.entity == ENTITY_TYPE_ADMIRAL && game_tick_server % 2 == 0) { // admiral grow every 2 turns
                    cell.troops++;
                } else if (cell.entity == ENTITY_TYPE_SHIP && game_tick_server % 8 == 0) {
                    cell.troops++;
                } else if (cell.entity == ENTITY_TYPE_SHIP_2 && game_tick_server % 4 == 0) {
                    cell.troops++;
                } else if (cell.entity == ENTITY_TYPE_SHIP_3 && game_tick_server % 2 == 0) {
                    cell.troops++;
                } else if (cell.entity == ENTITY_TYPE_SHIP_4 && game_tick_server % 1 == 0) {
                    cell.troops++;
                } else if (cell.terrain == TERRAIN_TYPE_SWAMP && game_tick_server % 1 == 0) { // swamps drain every turn
                    cell.troops--;
                    if (cell.troops < 0) { //check if the swamp killed off the last troops in the cell
                        cell.troops = 0;
                        cell.owner = null;
                    }
                } else if (game_tick_server % 25 == 0) { // regular owned cells grow every 25 turns
                cell.troops++;
                }
            }
        });

        // Queue up bot behaviors
        if (game_tick_server > 2) {
            game.players.forEach(player => {
                if (!player.is_human) {
                    //console.log('bot')
                    player.take_move()
                }
            });  
        };      

        //Process the queue. Note that this currently always goes in the same order - we want to flip flop this order every turn
        game.players.forEach(player => {
            let valid_move = false
            let move, troops_to_move;
            while (!valid_move && player.queued_moves.length>0) {
                move = player.queued_moves.shift();
                
                let cell_id_source, cell_id_dest;
                cell_id_source = move.row * game.num_cols + move.col; // 0 is the topleft most cells, and there game.num_cols cols per row        
                cell_id_dest = move.target_row * game.num_cols + move.target_col

                // Only complete the move if the queuer owns the source cell
                if (game.cells[cell_id_source].owner == move.queuer) {
                    // console.log(move);     
                    
                    // Is it a valid destination?
                    if (game.cells[cell_id_dest].terrain == TERRAIN_TYPE_MOUNTAIN) {
                        valid_move = false;
                    } else {
                        valid_move = true;

                        if (move.action == ACTION_MOVE_NORMAL) { 
                            troops_to_move =  game.cells[cell_id_source].troops - 1 ;
                        } else if (move.action == ACTION_MOVE_ALL) { 
                            //if (game.cells[cell_id_source].entity != ENTITY_TYPE_ADMIRAL && game.cells[cell_id_source].entity != ENTITY_TYPE_SHIP) {
                                if (game.cells[cell_id_source].entity != ENTITY_TYPE_ADMIRAL) {
                                troops_to_move = game.cells[cell_id_source].troops;
                            } else {troops_to_move = game.cells[cell_id_source].troops - 1;}
                            
                        } else { //right click
                            troops_to_move =  Math.floor(game.cells[cell_id_source].troops/2);
                        }                

                        troops_to_move = Math.max(troops_to_move, 0); // I believe this will fix a bug where sometimes moving out of a swamp with 1 troop left would result in a neutral cell gaining +1 troops
                        
                        // If the queuer also owns the destination cell, stack their troops together
                        if (game.cells[cell_id_dest].owner == move.queuer) {
                            
                            game.cells[cell_id_source].troops -= troops_to_move;
                            game.cells[cell_id_dest].troops += troops_to_move;
                            
  

                        } else { // Otherwise invade the destination cell
                            game.cells[cell_id_source].troops -= troops_to_move;
                            game.cells[cell_id_dest].troops -= troops_to_move;
                            if (game.cells[cell_id_dest].troops < 0) {
                                let old_owner = game.cells[cell_id_dest].owner;
                                
                                game.cells[cell_id_dest].troops *= -1;
                                game.cells[cell_id_dest].owner = move.queuer;

                                if (game.cells[cell_id_dest].entity == ENTITY_TYPE_ADMIRAL) {
                                    attempt_takeover(old_owner, move.queuer);
                                };
                                // if(game.cells[cell_id_source].entity == ENTITY_TYPE_SHIP && move.action == ACTION_MOVE_ALL && !game.cells[cell_id_dest].entity) {
                                //     game.cells[cell_id_source].entity = null;
                                //     game.cells[cell_id_dest].entity = ENTITY_TYPE_SHIP;
                                // };
                                
                            };
                        };

                        if (game.cells[cell_id_dest].owner == move.queuer) { //either we owned it already or it was just taken over
                            //If we are trying to MOVE_ALL a ship, run a check on the appropriate logic (unload troops, move ship, or combine ships)
                            if([ENTITY_TYPE_SHIP, ENTITY_TYPE_SHIP_2, ENTITY_TYPE_SHIP_3, ENTITY_TYPE_SHIP_4, null].includes(game.cells[cell_id_source].entity) ) { //} && move.action == ACTION_MOVE_ALL) { 
                                try_to_move_ship(cell_id_source, cell_id_dest, move.action);
                                
                            };
                        };
                        
                        
                        if (game.cells[cell_id_source].troops <= 0) { 
                            game.cells[cell_id_source].owner = null; //renounce ownership if there are no troops left on the starting cell
                        };
                    } ;
                };
            };
        });
    }
}

function attempt_takeover(victim_id, culprit_id) {
// When one player captures another's admiral, see if they nabbed their last one. If, so the player is out of the game and their remaining cells transfer to the capturer
    let admirals_remaining = game.players[victim_id].admiral_count();
    // console.log(`Admiral captured! Victim: ${victim_id} Remaining admirals: ${admirals_remaining}`);

    if (admirals_remaining == 0) { //admiral captured!
        game.cells.forEach(cell => {
            if(cell.owner == victim_id) {
                cell.owner = culprit_id;
                cell.troops = Math.max(Math.floor(cell.troops/2), 1);
            };
        });  
    };
}

function init_server() {
    let fog_of_war = Math.random() > .5;
    //let fog_of_war = false;
    
    let n_rows = 15 + Math.floor(Math.random()*15) 
    let n_cols = 15 + Math.floor(Math.random()*30)

    let water_weight = 10 + Math.random();
    let mountain_weight = 1 + Math.random();
    let swamp_weight  = .1 + Math.random() / 4 ; 
    let ship_weight = .2 + Math.random() / 2;


    game = new Game(n_rows, n_cols, fog_of_war);
    game.add_human('12345678', '#0a5a07')
    game.add_bot('bot personality', '#E74856')
    game.add_bot('bot personality', '#B9B165')
    game.add_bot('bot personality', '#881798')

    spawn_admirals(25); // the number of entities to create and the number of troops they start with
    

    spawn_terrain(water_weight, mountain_weight, swamp_weight, ship_weight);
    
    game_tick_server = -1
    game_on = true; // start with the simulation running instead of paused
    send_game_state();
    game_loop_server()
}

function spawn_admirals(starting_troops) {
    for (let i = 0; i < game.players.length; i++) {
        let not_found = true;
        while (not_found) {
            let rand_cell = Math.floor(Math.random() * game.num_rows * game.num_cols);
            if (game.cells[rand_cell].owner == null) {
                game.cells[rand_cell].owner = i;
                game.cells[rand_cell].troops = starting_troops;
                game.cells[rand_cell].entity = ENTITY_TYPE_ADMIRAL;
                not_found = false;
            }
        } 
    }
}

function spawn_terrain(water_weight, mountain_weight, swamp_weight, ship_weight) {
    let arr_options = [
        {'value': TERRAIN_TYPE_WATER, 'weight':water_weight},
        {'value': TERRAIN_TYPE_MOUNTAIN, 'weight':mountain_weight},
        {'value': TERRAIN_TYPE_SWAMP, 'weight':swamp_weight},
        {'value': ENTITY_TYPE_SHIP, 'weight':ship_weight},
    ];

    game.cells.forEach(cell => {
        if(cell.owner == null) {
            let result = weighted_choice(arr_options).value
            if (result == ENTITY_TYPE_SHIP) {
                cell.terrain = TERRAIN_TYPE_WATER
                cell.entity = result
                cell.troops = Math.floor(Math.random()*30)+12

            } else {
                cell.terrain = result
            }

            
        };
    });
}

function server_receives_new_queued_moved(player_id, new_move) {
    game.players[player_id].queued_moves.push(new_move);
}

function server_receives_undo_queued_move(player_id, popped_item_id) {
    // Remove all moves with an ID of or newer than popped_item_id (the or newer is an perhaps premature attempt at handling the possibly out of sync queuing of moves)
    let not_caught_up = true;
    while (game.players[player_id].queued_moves.length>0 && not_caught_up) {
        if (game.players[player_id].queued_moves[game.players[player_id].queued_moves.length - 1].id >= popped_item_id) {
            game.players[player_id].queued_moves.pop();
        } else { not_caught_up = false; }; //escape 
    };
}

function server_receives_cancel_queue(player_id) {
    game.players[player_id].queued_moves.length = 0;
}

function should_be_visible(cell, player_id) {
    if (!game.fog_of_war) {
        return true;
    // } else if (cell.owner == player_id || cell.terrain == TERRAIN_TYPE_MOUNTAIN) { 
    //     return true; 
    } else if (cell.owner == player_id) { 
        return true; 
    
    } else if (true){
        return (get_owned_neighbors(cell, player_id) > 0);
    }
}

function get_owned_neighbors(cell, player_id) { // Returns the number of adjacent cells owned by the provided player_id. Normally, this is used to determine if a cell should be visible to said user
    let num_neighbors = 0;

    if (cell.row > 0 && cell.col > 0)                                       { num_neighbors += (get_cell_by_coords(cell.row-1, cell.col-1).owner    == player_id) ? 1 : 0; }; // top left
    if (cell.row > 0)                                                       { num_neighbors += (get_cell_by_coords(cell.row-1, cell.col).owner      == player_id) ? 1 : 0; }; // top
    if (cell.row > 0 && cell.col < game.num_cols - 1)                       { num_neighbors += (get_cell_by_coords(cell.row-1, cell.col+1).owner    == player_id) ? 1 : 0; }; // top right
    if (cell.col < game.num_cols - 1)                                       { num_neighbors += (get_cell_by_coords(cell.row, cell.col+1).owner      == player_id) ? 1 : 0; }; // right
    if ((cell.row < game.num_rows - 1) && cell.col < (game.num_cols - 1))   { num_neighbors += (get_cell_by_coords(cell.row+1, cell.col+1).owner    == player_id) ? 1 : 0; }; // bottom right
    if (cell.row < game.num_rows - 1)                                       { num_neighbors += (get_cell_by_coords(cell.row+1, cell.col).owner      == player_id) ? 1 : 0; }; // bottom
    if ((cell.row < game.num_rows - 1) && cell.col > 0)                     { num_neighbors += (get_cell_by_coords(cell.row+1, cell.col-1).owner    == player_id) ? 1 : 0; }; // bottom left
    if (cell.col > 0)                                                       { num_neighbors += (get_cell_by_coords(cell.row, cell.col-1).owner      == player_id) ? 1 : 0; }; // left
        
    return num_neighbors
}

function get_cell_by_coords(row, col) { // Returns the server cell object at the given row and column
    return game.cells[row*game.num_cols+col]
}

//An attempt at predicting what the server to client communication will look like
function send_game_state() {
    let player_id = 0;
    
    let next_queue_id = game.players[0].queued_moves.length > 0 ? game.players[0].queued_moves[0].id : -1; // if there are any items remaining in the queue, let them know which ones we've eliminated this turn. -1 will indicate to the client that the queue is empty

    // Start with header information about the game
    let game_string = '{ "game": {' +
        `"state" : "${game_on}",` +
        `"turn": "${game_tick_server}",` +
        `"row_count": "${game.num_rows}",` +
        `"col_count": "${game.num_cols}",` +
        `"next_queue_id": "${next_queue_id}"` +
        '}, "board":[  '; // the two trailing spaces are intentional -- if no board cells are included, then the slicing below will still work smoothly

    // Then loop through and add info about each visible cell
    game.cells.forEach(cell => {
        if (should_be_visible(cell, player_id)) {
            let cell_string = `{ "id":${cell.id}, "row":${cell.row}, "col":${cell.col}`;
            if (cell.owner != null) {cell_string += `, "owner":${cell.owner}`}
            if (cell.terrain != TERRAIN_TYPE_WATER) {cell_string += `, "terrain":${cell.terrain}`}
            if (cell.entity != null) {cell_string += `, "entity":${cell.entity}`}
            if (cell.troops != null) {cell_string += `, "troops":${cell.troops}`}
            if (true) {cell_string += `, "visible":true`}
   
            cell_string += '}, '
            game_string += cell_string ;
        }
        else if (cell.terrain != TERRAIN_TYPE_WATER || [ENTITY_TYPE_SHIP, ENTITY_TYPE_SHIP_2, ENTITY_TYPE_SHIP_3, ENTITY_TYPE_SHIP_4].includes(cell.entity)) {
            let cell_string = `{ "id":${cell.id}, "row":${cell.row}, "col":${cell.col}`;
            cell_string += `, "terrain":${TERRAIN_TYPE_MOUNTAIN}`
            if (true) {cell_string += `, "visible":true`}
   
            cell_string += '}, '
            game_string += cell_string ;
        };
    });

    game_string = game_string.slice(0,-2); // remove the last two characters from the string - either remove a trailing ', ' or if no cells are included then then the '  ' from the end of the header
    game_string += ']}'; // close the whole object-generating string    

    let json_obj = JSON.parse(game_string);
    
    // console.log(game_string);    
    // console.log(game_json.game.row_count);
    client_receives_game_state_here(json_obj)
    
}

function check_for_game_over() {
    //if the game has been won, lost, or abandoned, mark it as such and alert the user
    
    let troop_count = new Array(game.players.length).fill(0);
    let admiral_count = new Array(game.players.length).fill(0);
    game.cells.forEach(cell => {
        if (cell.owner != null) {
            troop_count[cell.owner] += cell.troops;
            if (cell.entity == ENTITY_TYPE_ADMIRAL) { 
                admiral_count[cell.owner]++;
            };            
        }
    });
    
    let remaining_humans_count = 0; // make sure at least 1 human player is still in the game
    let remaining_bots_count = 0; // make sure at least 1 human player is still in the game
    for (let i = 0; i < admiral_count.length; i++) {
        if (admiral_count[i] > 0 && game.players[i].is_human) {
            remaining_humans_count++;
        } else if (admiral_count[i] > 0 && !game.players[i].is_human) {
            remaining_bots_count++;
        };
    };

    if (remaining_humans_count == 0) {
        game_on = false;
        console.log('Game over! Humans lose.'); // TODO pass this info on to the client
    
    } else if (remaining_bots_count == 0 && remaining_humans_count == 1) {
        console.log(`Game over! Player (TBD) wins!!!`); // TODO pass this info on to the client
    };
}
