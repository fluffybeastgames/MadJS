"use strict"

class AStar {
    constructor(board) {
        this.board = board;

    }

    node_is_traversable(node_address, target_address) {
        if (node_address[0] >= 0 && node_address[0] <= this.board.num_rows - 1 && node_address[1] >= 0 && node_address[1] <= this.board.num_cols - 1) {
            let target_id = node_address[0]*this.board.num_cols + node_address[1]
            if (this.board.cells[target_id].traversable) {
                // console.log('traversable')
                return true; // valid target and no obstacles in the way
            } else if (node_address[0] == target_address[0] && node_address[1] == target_address[1])  {
                // console.log('exception for target')
                return true; // there is an obstacle in the way but it's on the origin or target cell so it's ok (otherwise we could never aim for the barriers)
            } else { 
                // console.log('obstacle')
                return false //obstacle in the way
            };
        } else {
            return false; // out of bounds
        };
    }

    print_board(path) {
        let str_out = '';
        for (let r = 0; r < this.board.num_rows; r++) {
            for (let c = 0; c < this.board.num_cols; c++) {
                let path_found = false
                
                let path_ct = 0;
                path.forEach(cell => {
                    path_ct++;
                    if (cell[0] == r && cell[1] == c) {
                        str_out += ' O';
                        path_found = true;
                    };
                });
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

        function node_in_closed_set(new_node, closed_set) {
            let node_found = false;
            closed_set.forEach(c_node => {
                if (c_node.address[0] == new_node.address[0] && c_node.address[1] == new_node.address[1]) {
                    // console.log('already in closed set')
                    node_found= true;
                }
                else {
                    // console.log('not in closed set');
                }
            } );
            return node_found;
        }

        function node_in_open_set(new_node, open_set) {
            let node_found = false;
            open_set.forEach(o_node => {
                if (o_node.address[0] == new_node.address[0] && o_node.address[1] == new_node.address[1]) {
                    // console.log('already in open set')
                    node_found = true;
                }
            } );
            return node_found;
        }

        let open_set = [];
        let closed_set = [];
        let target_found = false;
        let current_node;
    
        // Create the starting node at the start_address

        // console.log(start_address, target_address)
        open_set.push(new AStarNode(null, start_address, target_address));
        

        // while (open_set.length > 0 && !target_found && closed_set.length < this.board.num_rows*this.board.num_cols) {
        while (open_set.length > 0 && !target_found) {            
            open_set.sort((a, b) => (a.f > b.f) ? 1 : -1); //sort the open nodes by their F value, ascending, in order to optimize search/final path
            
            current_node = open_set.shift();
            closed_set.push(current_node);
            
            // console.log(`Open set length: ${open_set.length}\tClosed set: ${closed_set.length}. current_node address ${current_node.address}. node f/g/h = ${current_node.f} ${current_node.g} ${current_node.h}`)
            if (current_node.address[0] == target_address[0] && current_node.address[1] == target_address[1]) {
                target_found = true;
            } else{
                //for i in up, down, left, right
                    //new node(i)
                    //if new_node in closed set, 
                        //ignore
                    //else
                        //add to closed set
                        //if new_node in open set
                            //update
                        // else if new_node is traversable
                            //add to open set
                
                let nodes_to_check = [];
                nodes_to_check.push(new AStarNode(current_node, [current_node.address[0]-1, current_node.address[1]], target_address));
                nodes_to_check.push(new AStarNode(current_node, [current_node.address[0]+1, current_node.address[1]], target_address));
                nodes_to_check.push(new AStarNode(current_node, [current_node.address[0], current_node.address[1]-1], target_address));
                nodes_to_check.push(new AStarNode(current_node, [current_node.address[0], current_node.address[1]+1], target_address));

                nodes_to_check.forEach(node => { 
                    if (!node_in_closed_set(node, closed_set)) {
                        if (node_in_open_set(node, open_set)) {
                            // console.log('Node already in open set, so call update_node please')
                            update_node(node, open_set);
                        } else {
                            if (this.node_is_traversable(node.address, target_address)) {
                                open_set.push(node);
                            }
                            else {
                                // closed_set.push(node);
                            };
                        };
                    }
                } );
            };
        };

        if (target_found) {
            // console.log('target found')

            let final_path = [];
            let path_node = current_node;
            while(path_node != null) {
                final_path.push(path_node.address);
                path_node = path_node.parent_node;                
            };
            
            final_path.reverse(); // reverse the list so that the steps are in order of origin to destination
            return final_path;

        } else {
            // console.log('target not found')
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


class ABoard {
    constructor(num_rows, num_cols, rand_obstacle_rate) {
        this.num_rows = num_rows;
        this.num_cols = num_cols;
        this.cells = [];

        for (let r = 0; r < num_rows; r++) {
            for (let c = 0; c < num_cols; c++) { // teehee c++
                this.cells.push(new ACell(r*num_cols+c, r, c, Math.random() > rand_obstacle_rate, '-'));
                //this.cells.push(new ACell(r*num_cols+c, r, c, true, 0));
            };
        };
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
    let num_rows = 50;
    let num_cols = 25;
    let rand_obstacle_rate = .25

    let board = new ABoard(num_rows, num_cols, rand_obstacle_rate);
    let astar = new AStar(board);
    
    let start_address = [Math.floor(Math.random()*num_rows), Math.floor(Math.random()*num_cols)];
    let target_address = [Math.floor(Math.random()*num_rows), Math.floor(Math.random()*num_cols)];

    astar.print_board([start_address, target_address]);

    let path = astar.find_path(start_address, target_address);
    console.log('Final path:');
    console.log(path);

    if(path) { 
        astar.print_board(path); 
    } else {
        astar.print_board([start_address, target_address]); 

    };
    
}

// test_path_finder();
