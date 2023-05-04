"use strict"

class AStar {
    constructor(board) {
        this.board = board;

    }

    traversable(source_address, target_dir, origin_address, target_address) {
        let target_row;
        let target_col;
        
        if (
            target_dir == 'up') {
            target_row = source_address[0]-1;
            target_col = source_address[1];
        } else if (target_dir == 'down') {
            target_row = source_address[0]+1;
            target_col = source_address[1];
        } else if (target_dir == 'left') {
            target_row = source_address[0];
            target_col = source_address[1]-1;
        } else if (target_dir == 'right') {
            target_row = source_address[0];
            target_col = source_address[1]+1;
        }   
        if (target_row >= 0 && target_row < this.board.num_rows - 1 && target_col >= 0 && target_col < this.board.num_cols - 1) {
            let target_id = target_row*this.board.num_cols + target_col
            if (this.board.cells[target_id].traversable) {
                return true; // valid target and no obstacles in the way
            } else if ((target_row == origin_address[0] && target_col == origin_address[1]) || (target_row == target_address[0] && target_col == target_address[1]))  {
                return true; // there is an obstacle in the way but it's on the origin or target cell so it's ok (otherwise we could never aim for the barriers)
            } else { 
                return false //obstacle in the way
            };
        } else {
            return false; // out of bounds
        };


        

        // let cell_id = target_row*this.board.num_cols + target_col;

        //     if (source_address[0] > 0 && this.board.cells[target_row*]) {
        //         return true
        //     }
        // }

    }

    print_board() {
        let str_out = '';
        for (let r = 0; r < this.board.num_rows; r++) {
            for (let c = 0; c < this.board.num_cols; c++) {
                str_out += ` ${this.board.cells[r*this.board.num_cols + c].str_version()}`

            };
            str_out += '\n'
        };

        console.log(str_out)
    }
    print_board_path(path) {
        let str_out = '';
        let path_found;
        for (let r = 0; r < this.board.num_rows; r++) {
            for (let c = 0; c < this.board.num_cols; c++) {
                path_found = false

                path.forEach(cell => {
                    if (cell[0] == r && cell[1] == c) {
                        str_out += ' O'
                        path_found = true;
                    };
                });

                //str_out = path_found ? str_out : str_out + ` ${this.board.cells[r*this.board.num_cols + c].str_version()}`
                if (!path_found) {
                    str_out += ` ${this.board.cells[r*this.board.num_cols + c].str_version()}`
                };
            };
            str_out += '\n'
        };

        console.log(str_out)
    }
    
    find_path(start_address, target_address) {
        function update_node(new_node, open_set) {
            // console.log('updating node at ' + new_node.address)
            open_set.forEach(o_node => {
                if (o_node.address[0] == new_node.address[0] && o_node.address[1] == new_node.address[1]) {
                    if (new_node.g < o_node.g) {
                        o_node.parent_node = new_node.parent_node
                        o_node.g = new_node.g
                        o_node.f = new_node.f
                        // # g and h values will be different but h does not rely on origin path                        
                    }
                }
            } );
        }

        function new_node_not_in_closed_set(new_node, closed_set) {
            closed_set.forEach(c_node => {
                if (c_node.address[0] == new_node.address[0] && c_node.address[1] == new_node.address[1]) {
                    // console.log('already in closed set')
                    return false;
                }
            } );
            return true;
        }

        function new_node_not_in_open_set(new_node, open_set) {
            open_set.forEach(o_node => {
                if (o_node.address[0] == new_node.address[0] && o_node.address[1] == new_node.address[1]) {
                    // console.log('already in open set')
                    return false;
                }
            } );
            return true;
        }

        let open_set = [];
        let closed_set = [];
        let target_found = false;
        let current_node;
    
        // Create the starting node at the start_address
        open_set.push(new AStarNode(null, start_address, target_address));


        let check_counter = 0;
        while (open_set.length > 0 && !target_found) {
            check_counter++;
            open_set.sort((a, b) => (a.f > b.f) ? 1 : -1); //sort the open nodes by their F value, ascending, ascending, in order to optimize search/final path
            
            current_node = open_set.shift();
            closed_set.push(current_node);
            
            // console.log(`${check_counter} Open set length: ${open_set.length}\tClose set: ${closed_set.length}. current_node: id ${current_node.address} address ${current_node.address}`)
            

            if (current_node.address[0] == target_address[0] && current_node.address[1] == target_address[1]) {
                target_found = true;
            } else{
                
                if (this.traversable(current_node.address, 'up', start_address, target_address)) { // check above
                    let new_node = new AStarNode(current_node, [current_node.address[0]-1, current_node.address[1]], target_address);
                    
                    if(new_node_not_in_closed_set(new_node, closed_set)) {
                        if(new_node_not_in_open_set(new_node, open_set)) {
                            // console.log('push new node up')
                            open_set.push(new_node);
                        }
                        else {
                            update_node(new_node, open_set)
                        };
                    } else {
                        // console.log('Already in closed_set')

                    }
                };

                if (this.traversable(current_node.address, 'left', start_address, target_address)) { // check above
                    let new_node = new AStarNode(current_node, [current_node.address[0], current_node.address[1]-1], target_address);
                    
                    if(new_node_not_in_closed_set(new_node, closed_set)) {
                        if(new_node_not_in_open_set(new_node, open_set)) {
                            // console.log('push new node left')
                            open_set.push(new_node);
                        }
                        else {
                            update_node(new_node, open_set)
                        };
                    } else {
                        console.log('Already in closed_set')

                    }
                };

                if (this.traversable(current_node.address, 'down', start_address, target_address)) { // check above
                    let new_node = new AStarNode(current_node, [current_node.address[0]+1, current_node.address[1]], target_address);
                    
                    if(new_node_not_in_closed_set(new_node, closed_set)) {
                        if(new_node_not_in_open_set(new_node, open_set)) {
                            // console.log('push new node down')
                            open_set.push(new_node);
                        }
                        else {
                            update_node(new_node, open_set)
                        };
                    } else {
                        console.log('Already in closed_set')

                    }
                };

                if (this.traversable(current_node.address, 'right', start_address, target_address)) { // check above
                    let new_node = new AStarNode(current_node, [current_node.address[0], current_node.address[1]+1], target_address);
                    
                    if(new_node_not_in_closed_set(new_node, closed_set)) {
                        if(new_node_not_in_open_set(new_node, open_set)) {
                            // console.log('push new node right')
                            open_set.push(new_node);
                        }
                        else {
                            update_node(new_node, open_set)
                        };
                    } else {
                        console.log('Already in closed_set')

                    }
                };                


            };
        };

        if (target_found) {
            console.log('target found')

            let final_path = [];
            let path_node = current_node;
            while(path_node != null) {
                final_path.push(path_node.address);
                path_node = path_node.parent_node;                
            };
            
            final_path.reverse(); // reverse the list so that the steps are in order of origin to destination
            return final_path;

        } else {
            console.log('target not found')
            return null;
        }

    }
}

class AStarNode {
    constructor(parent, address, target_address) {
        this.parent_node = parent;
        this.address = address;
        //this.target_address = target_address;

        this.g = (this.parent_node == null) ? 0 : this.parent_node.g + 1; // distance traveled from origin
        this.h = Math.abs(address[0] - target_address[0]) + Math.abs(address[1] - target_address[1]) // heuristic distance to target
        this.f = this.g + this.h // total cost
    }
}

// board = [{'id':id, 'row':row, 'col':col,'terrain':terrain}]

class ABoard {
    constructor(num_rows, num_cols) {
        this.num_rows = num_rows;
        this.num_cols = num_cols;
        this.cells = [];

        for (let r = 0; r < num_rows; r++) {
            for (let c = 0; c < num_cols; c++) { // teehee c++
                this.cells.push(new ACell(r*num_cols+c, r, c, Math.random() > .25, '-'));
                //this.cells.push(new ACell(r*num_cols+c, r, c, true, 0));
            }
        }
    }
}

class ACell {
    constructor(id, row, col, traversable, troops) {
        // console.log(id, row, col)
        this.id = id;
        this.row = row;
        this.col = col;
        this.traversable = traversable;
        this.troops = troops;

    }

    str_version() {//I'm sure there's a more standard way to do this..
        return this.traversable ? this.troops : 'X'; 
    }

}


function test_path_finder() {
    console.log('testing A* path finder')
    let num_rows = 20;
    let num_cols = 25;

    let board = new ABoard(num_rows, num_cols);
    let astar = new AStar(board);
    // console.log(astar.board);
    // console.log(astar.board.cells[35]);
    // console.log(astar.board.cells[35].row, astar.board.cells[15].col);

    astar.print_board();

    let start_address = [1, 1];
    let target_address = [5, 15];

    let path = astar.find_path(start_address, target_address);
    console.log('Final path:');
    console.log(path);

    if(path) { 
        astar.print_board_path(path); 
    } else {
        path = [start_address, target_address]
        astar.print_board_path(path); 

    };
    
}

test_path_finder();
