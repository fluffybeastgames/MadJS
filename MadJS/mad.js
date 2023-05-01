"use strict";

///////////
// Local App constants and global variables
///////////
let canvas, context; // the canvas and context we will draw the game cells on
const cells_client = []; // This is the array of cell objects as understood by the client. Currently is only used for rendering.
let  game_tick_local;
var local_player_id = 0 // TODO temp syntax - don't want this hardcoded
const active_cell = [0,0]; // will hold the row/col pair of currently selected coordinates, if any
const valid_key_presses = ['W', 'w', 'A', 'a', 'S', 's', 'D', 'd', 'E', 'e', 'Q', 'q'] //, 37]
var local_move_queue = [];
var local_queued_move_counter = 0; // this gets incremented every time the users queues a move and serves as the move's unique identifier, both locally and on the server (each player has a separate queue)

const MIN_SCALE = 1;
const MAX_SCALE = 15;
const DEFAULT_ZOOM = 4;
let zoom_scale = DEFAULT_ZOOM; // for scroll wheel zooming

const DEFAULT_CANVAS_WIDTH = 50
const DEFAULT_CANVAS_HEIGHT = 50
const DEFAULT_FONT_SIZE = 18
var font_size = DEFAULT_FONT_SIZE;


// class FrontApp {

// }
// var local_app = new FrontApp();

///////////
// Server constants and global variables
///////////
const refresh_time = 500 // ms to wait before rendering each new frame
let game_on; // when game_on, the game will loop every ~refresh_time ms, increasing the game_tick and advancing the simulation
let  game_tick_server;
let last_starting_configuration;
var game = null;
let move_mode; //0 for normal/left click mode, 1 for move all/middle click mode, 2 for move half/right click mode

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

///////////
// Server classes and functions
///////////


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
        var new_id = this.players.length
        this.player_turn_order.push(new_id)
        this.players.push(new HumanPlayer(new_id, session_id, color))
    }

    add_bot(personality, color) {
        var new_id = this.players.length
        this.player_turn_order.push(new_id)
        this.players.push(new Bot(new_id, personality, color))
    }
    
    initialize_cells() {
        var id = 0;
        for(let r = 0; r < this.num_rows; r++) {
            for(let c = 0; c < this.num_cols; c++) {
                this.cells.push(new Cell(context, id, r, c));
                id++;;
            }
        }
    }
    
}

class HumanPlayer {
    constructor(uid, session_id, color) {
        this.uid = uid // 0-n, may be unecessary as we can use the position in Players[] as the uid
        this.session_id = session_id // the session ID of the connected player
        this.color = color //temp. green
        this.queued_moves = []
    }
}

class Bot {
    constructor(uid, personality, color) {
        this.uid = uid
        this.personality = personality
        this.color = color
        this.queued_moves = []
    }

    take_move() {

    }
}
class Cell {
    
    static width = DEFAULT_CANVAS_WIDTH;
    static height = DEFAULT_CANVAS_HEIGHT;
    static grid_color = '#bb00ff'
    static mountain_color = '#BBBBBB'
    static swamp_color = '#0E735A'
    static high_tide_color = '#0E306C'
            
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
        this.context.strokeStyle = Cell.grid_color;
        this.context.lineWidth = 1;
        this.context.strokeRect(this.col*Cell.width, this.row*Cell.height, Cell.width, Cell.height)
        
        if (this.visible) {
            if (this.terrain == TERRAIN_TYPE_MOUNTAIN) {
                this.context.fillStyle = Cell.mountain_color            
                this.context.fillRect(this.col*Cell.width, this.row*Cell.height, Cell.width, Cell.height)
            } else if (this.terrain == TERRAIN_TYPE_SWAMP) {
                this.context.fillStyle = Cell.swamp_color            
                this.context.fillRect(this.col*Cell.width, this.row*Cell.height, Cell.width, Cell.height)
            } else {
                this.context.fillStyle = Cell.high_tide_color            
                this.context.fillRect(this.col*Cell.width, this.row*Cell.height, Cell.width, Cell.height)
                
            }
            

            // If there is an admiral here, draw a star to represent it
            if (this.entity == ENTITY_TYPE_ADMIRAL ) { //&& false) {
                this.draw_star()
                
            } else if (this.owner != null) { // Otherwise, if the spot is owned, draw a circle over it in the owner's color
                this.draw_circle()
            } 

            this.draw_troops()
        }
    }

    draw_circle() {
        this.context.beginPath()
        // Draw the circle containing the cell, its remains, or nothing
        let x, y, radius;
        x = this.col*Cell.width + Cell.width/2;
        y = this.row*Cell.height + Cell.height/2;
        radius = Cell.width/2 - 1;

        this.context.beginPath();
        this.context.arc(x, y, radius, 0, 2 * Math.PI, false);
        this.context.fillStyle = game.players[this.owner].color;
        this.context.fill(); // apply the solid color
    
    }

    draw_star() { // Draws a 5-pointed star within the bounds of the cell, representing an Admiral cell
    // Credit to https://stackoverflow.com/a/45140101
        var num_points = 5
        var inset = .5
        var x = this.col*Cell.width + Cell.width/2;
        var y = this.row*Cell.height + Cell.height/2;
        var radius = Cell.width/2;

            this.context.save();
            this.context.fillStyle = game.players[this.owner].color;
            this.context.beginPath();
            this.context.translate(x, y);
            this.context.moveTo(0, 0-radius);
            for (var i = 0; i < num_points; i++) {
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
        var x = this.col*Cell.width + Cell.width/2;
        var y = this.row*Cell.height + Cell.height/2;
        // Add the number of troops (if any)
        if (this.troops != 0) {
            this.context.font = `${font_size}px Comic Sans MS`;
            this.context.fillStyle = '#FFFFFF';
            this.context.textBaseline = 'middle';
            this.context.textAlign = 'center';
            this.context.fillText(this.troops, x, y, Cell.width); //limit the width to the size of the cell, squeezing text if need be
        }
        
    }
    draw_arrow(dir) { // Draw an arrow over the cell to indicate a queued move
        this.context.beginPath();
        let x_origin, y_start, x_dest, y_dest;
        const strokeWidth = 2;

        x_origin = this.col*Cell.width + Cell.width/2;
        y_start = this.row*Cell.height + Cell.height/2;
        
        if (dir == 'up') {
            x_dest=x_origin
            y_dest=y_start - Cell.height/2;
        } else if (dir == 'down') {
            x_dest=x_origin;
            y_dest=y_start + Cell.height/2;
        } else if (dir == 'left') {
            x_dest=x_origin - Cell.width/2;
            y_dest=y_start;
        } else if (dir == 'right') {
            x_dest=x_origin+Cell.width/2;
            y_dest=y_start;
        } else 
        
        // this.context.beginPath();
        this.context.lineWidth = 1; //for some reason this needs to be called both before and after drawing the line, or the arrows won't render correctly
        this.context.strokeStyle = '#FFFFFF';
        this.context.strokeWidth = strokeWidth
        this.context.stroke();
        
        // Inspired by / adapted from https://stackoverflow.com/a/6333775 :
        var arrow_head_length = Cell.width/7; // length of arrow head in pixels
        var dx = x_dest - x_origin;
        var dy = y_dest - y_start;
        var angle = Math.atan2(dy, dx);
        this.context.moveTo(x_origin, y_start);
        this.context.lineTo(x_dest, y_dest);
        this.context.lineTo(x_dest - arrow_head_length * Math.cos(angle - Math.PI / 6), y_dest - arrow_head_length * Math.sin(angle - Math.PI / 6));
        this.context.moveTo(x_dest, y_dest);
        this.context.lineTo(x_dest - arrow_head_length * Math.cos(angle + Math.PI / 6), y_dest - arrow_head_length * Math.sin(angle + Math.PI / 6));
        this.context.lineWidth = 1; //for some reason this needs to be called both before and after drawing the line, or the arrows won't render correctly
        this.context.strokeStyle = '#FFFFFF';
        this.context.strokeWidth = strokeWidth
        this.context.stroke();
    }
};

function init(){
    console.log('Initializing a Madmirals instance')
    //var rand_cell = Math.floor(Math.random() * game.num_rows * game.num_cols);
    // let n_rows = 15
    // let n_cols = 25

    let n_rows = 8 + Math.floor(Math.random()*20) 
    let n_cols = 8 + Math.floor(Math.random()*30)

    let fog_of_war = true;

    game = new Game(n_rows, n_cols, fog_of_war);
    game.add_human('12345678', '#0a5a07')
    game.add_bot('bot personality ', '#E74856')
    game.add_bot('bot personality ', '#F9F1A5')
    game.add_bot('bot personality ', '#881798')
    
    // Add event listener on keydown
    document.addEventListener('keydown', (event) => {
        if (valid_key_presses.includes(event.key)) {
            handle_key_press(event.key)
        }
    }, false);


    game_tick_server = 0
    move_mode = 1

    canvas = document.getElementById('canvas'); // Get a reference to the canvas
    // let canvas_div = document.getElementById('canvas_div'); // the div that exists solely to contain the canvas
    context = canvas.getContext('2d');

    canvas.height = Cell.height*game.num_rows // canvas width must match cols*col_size
    canvas.width = Cell.width*game.num_cols // canvas width must match cols*col_size

    canvas.addEventListener('mousedown', function (event) { mouse_handler(event) }, false); //our main click handler function
    canvas.addEventListener('contextmenu', function(event) { event.preventDefault(); }, false); // prevent right clicks from bringing up the context menu
    canvas.addEventListener('wheel', function (event) { wheel_handler(event) },  {passive: true}); // zoom in/out with the scroll wheel
    drag_canvas_event_handler(canvas); // custom function to handle dragging the canvas while the mouse is down

    // create_board_cells(num_rows, num_cols); // Create an array of Cells objects, each representing one cell in the simulation
    create_client_cells(game.num_rows, game.num_cols); // Create an array of Cells objects, each representing one cell in the simulation
    
    spawn_admirals(50); // the number of entities to create and the number of troops they start with
    spawn_terrain();
    render_board(); // display the starting conditions for the sim
    game_on = true; // start with the simulation running instead of paused
    window.requestAnimationFrame(() => game_loop()); // start the game loop
}

function game_loop() {
    if (game_on) {
        game_tick_server++;
        check_for_game_over();
        update_game(); // check each cell to see if it should be alive next turn and update the .alive tag        
        render_board(); // Redraw the game canvas  
        
    }
    setTimeout( () => { window.requestAnimationFrame(() => game_loop()); }, refresh_time) // therefore each game loop will last at least refresh_time ms
}

function get_cell_by_coords(row, col) { // Returns the server cell object at the given row and column
    return game.cells[row*game.num_cols+col]
}

function get_owner_color(owner) { // returns fill and stroke, respectively
    switch(owner) {
        case 0:
            return '#0a5a07' // dark green        
        case 1:
            return '#E74856' // light red
        case 2:
            return '#61D6D6' // cyan
    }
    return ['#444444'] // default to grey
}

function update_game() { // advance game by 1 tick
    if (game_on) {
        //growth phase
        game.cells.forEach(cell => {
            if(cell.owner != null) {
                if (cell.entity == ENTITY_TYPE_ADMIRAL && game_tick_server % 2 == 0) { // admiral grow every 2 turns
                    cell.troops++;
                } else if (cell.terrain == TERRAIN_TYPE_SWAMP && game_tick_server % 1 == 0) { // swamps drain every turn
                    cell.troops--;

                    if (cell.troops < 0) {
                        cell.troops = 0;
                        cell.owner = null;
                    }
                } else if (game_tick_server % 25 == 0) { // regular owned cells grow every 25 turns
                cell.troops++;
                }
            }
        });

        game.players.forEach(player => {
            //Process the queue. Note that this currently always goes in the same order - we want to flip flop this order every turn
            var valid_move = false
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
                        valid_move = false
                    } else {
                        valid_move = true

                        if (move.action == 0) { //left click
                            troops_to_move =  game.cells[cell_id_source].troops - 1 ;
                        } else if (move.action == 1) { // middle click
                            if (game.cells[cell_id_source].entity != ENTITY_TYPE_ADMIRAL) {
                                troops_to_move = game.cells[cell_id_source].troops;
                            } else {troops_to_move = game.cells[cell_id_source].troops - 1;}
                            
                        } else { //right click
                            troops_to_move =  Math.floor(game.cells[cell_id_source].troops/2);
                        }                
                        
                        // If the queuer also owns the destination cell, stack their troops together
                        if (game.cells[cell_id_dest].owner == move.queuer) {
                            game.cells[cell_id_dest].troops += troops_to_move;
                            
                        } else { // Otherwise invade the destination cell
                            game.cells[cell_id_dest].troops -= troops_to_move
                            if (game.cells[cell_id_dest].troops < 0) {
                                game.cells[cell_id_dest].troops *= -1;
                                game.cells[cell_id_dest].owner = move.queuer;
                            }
                        }

                        game.cells[cell_id_source].troops -= troops_to_move;
                        
                        if (game.cells[cell_id_source].troops <= 0) { 
                            game.cells[cell_id_source].owner = null; //renounce ownership if there are no troops left on the starting cell
                        }

                    } 
                }
            }
        });

        send_game_state();
    }
}



function create_client_cells(n_rows, n_cols) { // in the future this will only be defined on the client side
    console.log('creating client cell grid')

    let id;
    id = 0
    for(let r = 0; r < n_rows; r++) {
        for(let c = 0; c < n_cols; c++) {
            cells_client.push(new Cell(context, id, r, c));
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
        cells_client[id].draw_arrow(move.dir);
    }); 

    // display the turn number
    document.getElementById('turn_counter').innerText = `Turn ${game_tick_local}`
}

// Show the user where they are by highlighting the active cell
function highlight_active_cell() {
    cells_client.forEach(cell => {
        if(cell.row == active_cell[0] && cell.col == active_cell[1]) {
            cell.context.lineWidth = 5;
            
            if (move_mode == 0) { cell.context.strokeStyle = '#FFFFFF'; }
            else if (move_mode == 1) { cell.context.strokeStyle = '#FF0000'; }
            else if (move_mode == 2) { cell.context.strokeStyle = '#FFcc00'; }
    
            cell.context.strokeRect(cell.col*Cell.width, cell.row*Cell.height, Cell.width, Cell.height);
            
            // Slightly darken the cells around the active cell to highlight its location
            context.fillStyle = "rgba(0, 0, 0, 0.2)";
            cell.context.fillRect((cell.col-1)*Cell.width, cell.row*Cell.height, Cell.width, Cell.height);
            cell.context.fillRect((cell.col+1)*Cell.width, cell.row*Cell.height, Cell.width, Cell.height);
            cell.context.fillRect((cell.col)*Cell.width, (cell.row-1)*Cell.height, Cell.width, Cell.height);
            cell.context.fillRect((cell.col)*Cell.width, (cell.row+1)*Cell.height, Cell.width, Cell.height);
        }
    }); 
}

function mouse_handler(event) {
    event.preventDefault() // prevent default mouse behavior, mainly preventing middle click from activating scroll mode
        
    if (event.button == 0) { //left click
        var mousePos = getMousePos(canvas, event);
        select_cell_at(mousePos.x, mousePos.y);
        move_mode = 0;

    } else if (event.button == 1) { // middle click
        var mousePos = getMousePos(canvas, event);
        select_cell_at(mousePos.x, mousePos.y);          
        move_mode = 1; 

    } else if (event.button == 2) { // right click 
        var mousePos = getMousePos(canvas, event);
        select_cell_at(mousePos.x, mousePos.y);         
        move_mode = 2; 
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

    Cell.height = Math.round(DEFAULT_CANVAS_HEIGHT*(zoom_scale/DEFAULT_ZOOM));
    Cell.width = Math.round(DEFAULT_CANVAS_WIDTH*(zoom_scale/DEFAULT_ZOOM));
    font_size = Math.round(DEFAULT_FONT_SIZE*(zoom_scale/DEFAULT_ZOOM));

        // canvas.height = Cell.height*num_rows // canvas width must match cols*col_size
    // canvas.width = Cell.width*num_cols // canvas width must match cols*col_size
    canvas.width = Cell.width*game.num_cols;
    canvas.height = Cell.height*game.num_rows;

    render_board();
}


function check_for_game_over() {
    //if the game has been won, lost, or abandoned, mark it as such and alert the user
    
    let troop_count = new Array(game.players.length).fill(0);
    let admiral_count = new Array(game.players.length).fill(0);
    game.cells.forEach(cell => {
        if (cell.owner != null) {
            troop_count[cell.owner] += cell.troops;
            if (cell.entity == ENTITY_TYPE_ADMIRAL) { admiral_count[cell.owner] ++ };            
        }
    });

    if (admiral_count[0] == 0) {
        game_on = false;
        alert('Game over! You lose.'); 
    } else {
        const sum_admirals = admiral_count.reduce((partialSum, a) => partialSum + a, 0);
        if (sum_admirals == admiral_count[0]) {
            game_on = false;
            alert('You win!'); 
        }
    }
}

function spawn_admirals(starting_troops) {
    for (let i = 0; i < game.players.length; i++) {
        var not_found = true;
        while (not_found) {
            var rand_cell = Math.floor(Math.random() * game.num_rows * game.num_cols);
            if (game.cells[rand_cell].owner == null) {
                game.cells[rand_cell].owner = i;
                game.cells[rand_cell].troops = starting_troops;
                game.cells[rand_cell].entity = ENTITY_TYPE_ADMIRAL;
                
                not_found = false;
            }
        } 
    }
}

function spawn_terrain() {
    game.cells.forEach(cell => {
        if(cell.owner == null) {
            var cell_code = Math.random();
            if (cell_code < .25) {
                cell.terrain = TERRAIN_TYPE_MOUNTAIN;
            } else if (cell_code < .3) {
                cell.terrain = TERRAIN_TYPE_SWAMP;
            };   
        }
    });
}

function toggle_pause() {
    console.log('Toggling pause')
    game_on = !game_on //game_loop will keep running when game_on is false but will not update the board or render it
    
    // Update the button text to indicate the action it would perform
    document.getElementById('pause_resume_button').innerText = game_on ? 'Pause' : 'Play';
}

//Get Mouse Position
function getMousePos(canvas, event) {
    var rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function select_cell_at(x, y) {
    let row, col, id;
    row = Math.floor(y/Cell.height)
    col = Math.floor(x/Cell.width)
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


function server_receives_new_queued_moved(player_id, new_move) {
    game.players[player_id].queued_moves.push(new_move)
}

function server_receives_undo_queued_move(player_id, popped_item_id) {
    // Remove all moves with an ID of or newer than popped_item_id (the or newer is an perhaps premature attempt at handling the possibly out of sync queuing of moves)
    var not_caught_up = true;
    while (game.players[player_id].queued_moves.length>0 && not_caught_up) {
        if (game.players[player_id].queued_moves[game.players[player_id].queued_moves.length - 1].id >= popped_item_id) {
            game.players[player_id].queued_moves.pop();
        } else { not_caught_up = false; } //escape 
    };

}

function server_receives_cancel_queue(player_id) {
    game.players[player_id].queued_moves.length = 0;
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

function add_to_queue(source_row, source_col, target_row, target_col, dir) {
    local_queued_move_counter ++;
    var new_move = {'id':local_queued_move_counter, 'row':active_cell[0], 'col':active_cell[1], 'dir':dir, 'queuer':0,'target_row':target_row, 'target_col':target_col, 'action':move_mode}
    
    server_receives_new_queued_moved(local_player_id, new_move)
    local_move_queue.push(new_move) //TODO owner = 0 is a stand-in for the user, for now
    
    if (move_mode == 2) {move_mode = 0} // if we had right clicked to move half and half applied the half move in the above step, then we want to revert to normal movement mode

    // Update the active/highlighted cell to match the new target
    active_cell[0] = target_row
    active_cell[1] = target_col
    
    render_board();

}
// Adapted from https://www.w3schools.com/howto/howto_js_draggable.asp, but my version's even cooler
function drag_canvas_event_handler(canvas_element) {
    var x_dest = 0, y_dest = 0, x_origin = 0, y_origin = 0;
    var mousedown_timer = null; // delay drag until the mouse has been briefly held down, to avoid accidental dragging during normal play
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

function should_be_visible(cell, player_id) {
    if (!game.fog_of_war) {
        return true;

    } else if (cell.owner == player_id || cell.terrain == TERRAIN_TYPE_MOUNTAIN) { 
        return true; 
    } else if (true){
        return (get_owned_neighbors(cell, player_id) > 0);
    }
}

function get_owned_neighbors(cell, player_id) { // Returns the number of adjacent cells owned by the provided player_id. Normally, this is used to determine if a cell should be visible to said user
    var num_neighbors = 0;

    if (cell.row > 0 && cell.col > 0)                                       { num_neighbors += (get_cell_by_coords(cell.row-1, cell.col-1).owner == player_id) ? 1 : 0; }; // top left
    if (cell.row > 0)                                                       { num_neighbors += (get_cell_by_coords(cell.row-1, cell.col).owner == player_id) ? 1 : 0; }; // top
    if (cell.row > 0 && cell.col < game.num_cols - 1)                       { num_neighbors += (get_cell_by_coords(cell.row-1, cell.col+1).owner == player_id) ? 1 : 0; }; // top right
    if (cell.col < game.num_cols - 1)                                       { num_neighbors += (get_cell_by_coords(cell.row, cell.col+1).owner == player_id) ? 1 : 0; }; // right
    if ((cell.row < game.num_rows - 1) && cell.col < (game.num_cols - 1))   { num_neighbors += (get_cell_by_coords(cell.row+1, cell.col+1).owner == player_id) ? 1 : 0; }; // bottom right
    if (cell.row < game.num_rows - 1)                                       { num_neighbors += (get_cell_by_coords(cell.row+1, cell.col).owner == player_id) ? 1 : 0; }; // bottom
    if ((cell.row < game.num_rows - 1) && cell.col > 0)                     { num_neighbors += (get_cell_by_coords(cell.row+1, cell.col-1).owner == player_id) ? 1 : 0; }; // bottom left
    if (cell.col > 0)                                                       { num_neighbors += (get_cell_by_coords(cell.row, cell.col-1).owner == player_id) ? 1 : 0; }; // left
        
    return num_neighbors
}

//An attempt at predicting what the server to client communication will look like
function send_game_state() {
    var player_id = 0;
    
    var next_queue_id = game.players[0].queued_moves.length > 0 ? game.players[0].queued_moves[0].id : -1; // if there are any items remaining in the queue, let them know which ones we've eliminated this turn

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
    });

    game_string = game_string.slice(0,-2); // remove the last two characters from the string - either remove a trailing ', ' or if no cells are included then then the '  ' from the end of the header
    game_string += ']}'; // close the whole object-generating string    

    let json_obj = JSON.parse(game_string);
    
    // console.log(game_string);    
    // console.log(game_json.game.row_count);
    client_receives_game_state_here(json_obj)
    
}

function client_receives_game_state_here(json) {
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
        // console.log(new_cell.id, new_cell.row, new_cell.col)
        if('owner' in new_cell) { cells_client[new_cell.id].owner = new_cell.owner };
        if('troops' in new_cell) { cells_client[new_cell.id].troops = new_cell.troops };
        if('entity' in new_cell) { cells_client[new_cell.id].entity = new_cell.entity };
        if('terrain' in new_cell) { cells_client[new_cell.id].terrain = new_cell.terrain };
        if('visible' in new_cell) { cells_client[new_cell.id].visible = new_cell.visible };
    });

    
    // Update the local move queue - if one or more moves has been removed by the server, remove them from the front of the local queue
    let new_min_queue_id = json.game.next_queue_id

    if (new_min_queue_id == '-1') {
        //console.log('got here')
        local_move_queue.length = 0;
    } else {
        var not_caught_up = true;
        while (local_move_queue.length>0 && not_caught_up) {
            if (local_move_queue[0].id < new_min_queue_id) {
                local_move_queue.shift();
            } else { not_caught_up = false; } //escape 
        };
    }
    
}

