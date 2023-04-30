"use strict";
let canvas, context; // the canvas and context we will draw the game cells on
let num_rows, num_cols; // the number of rows and columns in the simulation
const cells = []; // will hold an array Cell objects
const refresh_time = 500 // ms to wait before rendering each new frame
let game_on, game_tick; // when game_on, the game will loop every ~refresh_time ms, increasing the game_tick and advancing the simulation
let last_starting_configuration;

const active_cell = [0,0]; // will hold the row/col pair of currently selected coordinates, if any
const valid_key_presses = ['W', 'w', 'A', 'a', 'S', 's', 'D', 'd', 'E', 'e', 'Q', 'q']

const queued_moves = []; // each entry will be an object containing the next queued move, the owner of the action, the action to perform, and the direction it is pointed

let move_mode; //0 for normal/left click mode, 1 for move all/middle click mode, 2 for move half/right click mode
let num_players; // number of players in the game. Player 0 = human, rest are bots, for now


const MIN_SCALE = 1;
const MAX_SCALE = 15;
const DEFAULT_ZOOM = 5;
let zoom_scale = DEFAULT_ZOOM; // for scroll wheel zooming

const DEFAULT_CANVAS_WIDTH = 50
const DEFAULT_CANVAS_HEIGHT = 50
const DEFAULT_FONT_SIZE = 18
var font_size = DEFAULT_FONT_SIZE;

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


class Cell
{
    static width = DEFAULT_CANVAS_WIDTH;
    static height = DEFAULT_CANVAS_HEIGHT;
    static alive_color = '#bb00ff'
    static dead_color = '#8822dd'
    static alive_color_stroke = '#6600bb'
    static dead_color_stroke = '#666666'
    static mountain_color = '#BBBBBB'
    
        
    constructor(context, id, row, col) {
        this.context = context; // the context of the canvas we'll be drawing to
        this.id = id //position w/in the 1d array of cells
        this.row = row;
        this.col = col;
        this.owner = null
        this.alive = false //start with none alive and add starting config downstream
        this.alive_next_turn = false
        this.troops = 0
        this.terrain = TERRAIN_TYPE_WATER //water is traversable, mountains are not
        this.entity = null // what type of entity (if any) is here - eg admiral

    }   

    draw_cell() {
        //First draw a grid around the cell
        
        if (this.terrain == TERRAIN_TYPE_MOUNTAIN) {
            this.context.fillStyle = Cell.mountain_color            
            this.context.fillRect(this.col*Cell.width, this.row*Cell.height, Cell.width, Cell.height)
        }
        
        //Draw outline around the cell
        this.context.strokeStyle = Cell.alive_color;
        this.context.lineWidth = 1;
        this.context.strokeRect(this.col*Cell.width, this.row*Cell.height, Cell.width, Cell.height)
        
        // If there is an admiral here, draw a star to represent it
        if (this.entity == ENTITY_TYPE_ADMIRAL ) { //&& false) {
            this.draw_star()
            
        } else if (this.owner != null) { // Otherwise, if the spot is owned, draw a circle over it in the owner's color
            this.draw_circle()
        } 

        this.draw_troops()

    }

    draw_circle() {
        this.context.beginPath()
        // Draw the circle containing the cell, its remains, or nothing
        let x, y, radius, fill, stroke, strokeWidth;
        x = this.col*Cell.width + Cell.width/2;
        y = this.row*Cell.height + Cell.height/2;
        radius = Cell.width/2 - 1;
        let colors;
        if (this.owner != null) {
            colors = get_owner_color(this.owner);
        // if (this.alive) {
        //     colors = get_owner_color(0);
            fill = colors[0];
            stroke = colors[1];
        } else {
            fill = null;
            stroke = null;
        }

        strokeWidth='2';
        
        this.context.beginPath()
        this.context.arc(x, y, radius, 0, 2 * Math.PI, false)
        if (fill) {
          this.context.fillStyle = fill;
          this.context.fill(); // apply the solid color
        }

        if (stroke) {
          this.context.lineWidth = strokeWidth;
          this.context.strokeStyle = stroke;
          this.context.stroke(); // apply the outer border
        }
        // this.context.stroke()
    }

    draw_star() { // Draws a 5-pointed star within the bounds of the cell, representing an Admiral cell
    // Credit to https://stackoverflow.com/a/45140101
        var num_points = 5
        var inset = .5
        var x = this.col*Cell.width + Cell.width/2;
        var y = this.row*Cell.height + Cell.height/2;
        var radius = Cell.width/2;

            this.context.save();
            this.context.fillStyle = get_owner_color(this.owner)[0];
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
    
    // Add event listener on keydown
    document.addEventListener('keydown', (event) => {
        if (valid_key_presses.includes(event.key)) {
            handle_key_press(event.key)
        }
    }, false);

    num_players = 3;
    num_rows = 20 // canvas height must match rows*row_size
    num_cols = 30
    game_tick = 0
    move_mode = 1

    canvas = document.getElementById('canvas'); // Get a reference to the canvas
    // let canvas_div = document.getElementById('canvas_div'); // the div that exists solely to contain the canvas
    context = canvas.getContext('2d');

    canvas.height = Cell.height*num_rows // canvas width must match cols*col_size
    canvas.width = Cell.width*num_cols // canvas width must match cols*col_size

    canvas.addEventListener('mousedown', function (event) { mouse_handler(event) }, false); //our main click handler function
    canvas.addEventListener('contextmenu', function(event) { event.preventDefault(); }, false); // prevent right clicks from bringing up the context menu
    canvas.addEventListener('wheel', function (event) { wheel_handler(event) }, false); // zoom in/out with the scroll wheel
    drag_canvas_event_handler(canvas); // custom function to handle dragging the canvas while the mouse is down

    create_board_cells(num_rows, num_cols); // Create an array of Cells objects, each representing one cell in the simulation
    spawn_admirals(num_players, 50); // the number of entities to create and the number of troops they start with
    spawn_terrain();
    render_board(); // display the starting conditions for the sim
    game_on = true; // start with the simulation running instead of paused
    window.requestAnimationFrame(() => gameLoop()); // start the game loop
}

function gameLoop() {
    if (game_on) {
        game_tick++;
        update_game(); // check each cell to see if it should be alive next turn and update the .alive tag
        render_board(); // Redraw the game canvas  
        check_for_game_over();
    }
    setTimeout( () => { window.requestAnimationFrame(() => gameLoop()); }, refresh_time) // therefore each game loop will last at least refresh_time ms
}

function reset_game() {
    console.log(`Restarting simulation with starting config ${last_starting_configuration}`)
    
    if(isNaN(last_starting_configuration)) {
        populate_board_randomly(.49)
    }
    else {
        populate_board_randomly(last_starting_configuration)
    }

    render_board();
}

function get_owner_color(owner) { // returns fill and stroke, respectively
    switch(owner) {
        case 0:
            return ['#0a5a07', '#004a00'] // dark green        
        case 1:
            return ['#E74856', '#B74856'] // light red
        case 2:
            return ['#61D6D6', '#41B6B6'] // cyan
    }
    return ['#444444', '#000000']
}

function update_game() {
    //growth phase
    cells.forEach(cell => {
        if(cell.owner != null) {
            if (cell.entity == ENTITY_TYPE_ADMIRAL && game_tick % 2 == 0) { // admiral grow every 2 turns
                cell.troops++;
            } else if (game_tick % 25 == 0) { // regular owned cells grow every 25 turns
            cell.troops++;
            }
        }
    });

    //Process the queue
    var valid_move = false
    let move, troops_to_move;
    while (!valid_move && queued_moves.length>0) {
        move = queued_moves.shift();
        
        let cell_id_source, cell_id_dest;
        cell_id_source = move.row * num_cols + move.col; // 0 is the topleft most cells, and there num_cols cols per row        
        cell_id_dest = move.target_row * num_cols + move.target_col

        // Only complete the move if the queuer owns the source cell
        if (cells[cell_id_source].owner == move.queuer) {
            // console.log(move);     
            
            // Is it a valid destination?
            if (cells[cell_id_dest].terrain == TERRAIN_TYPE_MOUNTAIN) {
                valid_move = false
            } else {
                valid_move = true

                if (move.action == 0) { //left click
                    troops_to_move =  cells[cell_id_source].troops - 1 ;
                } else if (move.action == 1) { // middle click
                    troops_to_move =  cells[cell_id_source].troops;
                } else { //right click
                    troops_to_move =  Math.floor(cells[cell_id_source].troops/2);
                }                
                
                // If the queuer also owns the destination cell, stack their troops together
                if (cells[cell_id_dest].owner == move.queuer) {
                    cells[cell_id_dest].troops += troops_to_move;
                    
                } else { // Otherwise invade the destination cell
                    cells[cell_id_dest].troops -= troops_to_move
                    if (cells[cell_id_dest].troops < 0) {
                        cells[cell_id_dest].troops *= -1;
                        cells[cell_id_dest].owner = move.queuer;
                    }
                }

                cells[cell_id_source].troops -= troops_to_move;
                if (cells[cell_id_source].troops <= 0) { 
                    cells[cell_id_source].owner = null;
                }

            } 
        }
    }
}

function get_cell_status(row, col) { // returns 1 if valid and alive and otherwise 0
    let id;
    if (row >= 0 && row < num_rows && col >= 0 && col < num_cols) {
        id = row * num_cols + col // id 0 is the topleft most cells, and there num_cols cols per row        
        if  (cells[id].alive) { 
            return 1;
        } 
    }
    return 0 // if cell is dead or out of bounds
}

function create_board_cells(num_rows, num_cols) {
    console.log('creating cell grid')

    let id;
    id = 0
    for(let r = 0; r < num_rows; r++) {
        for(let c = 0; c < num_cols; c++) {
            cells.push(new Cell(context, id, r, c));
            id++;
        }
    }
}

function render_board() {    
    context.fillStyle='#0E306C'  // High Tide Blue '#DDDDDD' // grey
    context.fillRect(0, 0, canvas.width, canvas.height); // Clear the board
    
    // Draw each gridline and object on the canvas
    for (let i = 0; i < cells.length; i++) {
        cells[i].draw_cell();
    }

    //Add the highlights around the active cell (if present)
    highlight_active_cell()

    // Draw arrows over each square containig one or more queued moves
    queued_moves.forEach(move => {
        let id;
        id = move.row * num_cols + move.col; // id 0 is the topleft most cells, and there num_cols cols per row        
        cells[id].draw_arrow(move.dir);
    }); 

    // display the turn number
    document.getElementById('turn_counter').innerText = `Turn ${game_tick}`
}

// Show the user where they are by highlighting the active cell
function highlight_active_cell() {
    cells.forEach(cell => {
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
    event.preventDefault(); 
    
    if (event.deltaY > 0 && zoom_scale > MIN_SCALE) { // zoom out
        zoom_scale --
    } else if (event.deltaY < 0 && zoom_scale < MAX_SCALE)  { //zoom in
        zoom_scale ++
    };

    Cell.height = Math.round(DEFAULT_CANVAS_HEIGHT*(zoom_scale/DEFAULT_ZOOM));
    Cell.width = Math.round(DEFAULT_CANVAS_WIDTH*(zoom_scale/DEFAULT_ZOOM));
    font_size = Math.round(DEFAULT_FONT_SIZE*(zoom_scale/DEFAULT_ZOOM));

        // canvas.height = Cell.height*num_rows // canvas width must match cols*col_size
    // canvas.width = Cell.width*num_cols // canvas width must match cols*col_size
    canvas.width = Cell.width*num_cols;
    canvas.height = Cell.height*num_rows;
}


function check_for_game_over() {
    //if the game has been won, lost, or abandoned, mark it as such and alert the user
    
    let troop_count = new Array(num_players).fill(0);
    let admiral_count = new Array(num_players).fill(0);
    cells.forEach(cell => {
        if (cell.owner != null) {
            troop_count[cell.owner] += cell.troops;
            if (cell.entity == ENTITY_TYPE_ADMIRAL) { admiral_count[cell.owner] ++ };            
        }
    });
    

    if (!game_on) {
        alert('Game over!'); 
    }
}

function populate_board_randomly(fill_rate) {
    cells.forEach(cell => {
        cell.alive = Math.random() >= fill_rate;
    });
    last_starting_configuration = fill_rate;
}

function spawn_admirals(num_admirals, starting_troops) {
    for (let i = 0; i < num_admirals; i++) {
        var not_found = true;
        while (not_found) {
            var rand_cell = Math.floor(Math.random() * num_rows * num_cols);
            if (cells[rand_cell].owner == null) {
                cells[rand_cell].owner = i;
                cells[rand_cell].troops = starting_troops;
                cells[rand_cell].entity = ENTITY_TYPE_ADMIRAL;
                
                not_found = false;
            }
        } 
    }
}

function spawn_terrain() {
    cells.forEach(cell => {
        if(cell.owner == null) {
            var cell_code = Math.random();
            if (cell_code < .25) {
                cell.terrain = TERRAIN_TYPE_MOUNTAIN;
            }
            
        }
        //cell.alive = Math.random() >= fill_rate;
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

function toggle_cell_at(x, y){
    let row, col, id;
    row = Math.floor(y/Cell.height)
    col = Math.floor(x/Cell.width)
    
    if (row >= 0 && row < num_rows && col >= 0 && col < num_cols) {
        id = row * num_cols + col // id 0 is the topleft most cells, and there num_cols cols per row        
        cells[id].alive = !cells[id].alive
    }   
    render_board()
}

function select_cell_at(x, y) {
    let row, col, id;
    row = Math.floor(y/Cell.height)
    col = Math.floor(x/Cell.width)
    // console.log(`Selecting cell ${row},${col}`)

    active_cell[0] = row;
    active_cell[1] = col;
    
    if (row >= 0 && row < num_rows && col >= 0 && col < num_cols) {
        id = row * num_cols + col // id 0 is the topleft most cells, and there num_cols cols per row        
        cells[id].alive = !cells[id].alive
    };
    render_board();
}

function handle_key_press(key_key) {
    //If they user has pressed a movement key (currently only WASD supported), then try to move the active cell
    let dir, target_row, target_col, add_to_queue;
    
    add_to_queue = true;
    if ((key_key == 'W' || key_key == 'w') && active_cell[0] > 0) {
        dir = 'up'
        target_row = active_cell[0] - 1
        target_col = active_cell[1]
    } else if (key_key == 'A' || key_key == 'a' && active_cell[1] > 0) { // left
        dir = 'left'
        target_row = active_cell[0]
        target_col = active_cell[1] - 1
    } else if (key_key == 'S' || key_key == 's' && active_cell[0] < num_rows - 1) { // down
        dir = 'down'
        target_row = active_cell[0] + 1
        target_col = active_cell[1]
    } else if (key_key == 'D' || key_key == 'd' && active_cell[1] < num_cols - 1) { // right
        dir = 'right'
        target_row = active_cell[0]
        target_col = active_cell[1] + 1
    } else {
        add_to_queue = false;
        
        if (key_key == 'Q' || key_key == 'q') { //undo all queued moves
            queued_moves.length = 0 // empty the queue list. Do not bother updating active cell location

        } else if (key_key == 'E' || key_key == 'e') { //undo last queued move and return active cell to it
            if (queued_moves.length > 0) {
                let popped = queued_moves.pop();
                
                active_cell[0] = popped.row;
                active_cell[1] = popped.col;
                
                render_board();
            }
        }
    };
    
    if (add_to_queue) {
        queued_moves.push({'row':active_cell[0], 'col':active_cell[1], 'dir':dir, 'queuer':0,'target_row':target_row, 'target_col':target_col, 'action':move_mode}) //TODO owner = 0 is a stand-in for the user, for now
        
        if (move_mode == 2) {move_mode = 0} // if we had right clicked to move half and half applied the half move in the above step, then we want to revert to normal movement mode

        // Update the active/highlighted cell to match the new target
        active_cell[0] = target_row
        active_cell[1] = target_col
        
        render_board();
    };
}

// Adapted from https://www.w3schools.com/howto/howto_js_draggable.asp
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