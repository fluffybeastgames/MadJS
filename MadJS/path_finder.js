"use strict"

class AStar {
    constructor(board) {
        this.board = board;

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
            console.log('TODO update node')
        }
        let open_set = [];
        let closed_set = [];

        open_set.push(new AStarNode(null, start_address, target_address));

        let target_found = false;
        let current_node;

        let check_counter = 0;
        while (open_set.length > 0 && !target_found) {
            check_counter++;
            // console.log(`${check_counter} Checking open set with a length of ${open_set.length}`)
            open_set.sort((a, b) => (a.f > b.f) ? 1 : -1);
            
            current_node = open_set.shift();
            closed_set.push(current_node);

            // console.log(current_node)
            if (current_node.address[0] == target_address[0] && current_node.address[1] == target_address[1]) {
                target_found = true;
            } else{
                
                if (current_node.address[0] > 0) { // check above
                    // TODO also check if it's traversable
                    let new_node = new AStarNode(current_node, [current_node.address[0]-1, current_node.address[1]], target_address);
                    
                    if (!closed_set.includes(new_node)) { //TODO stopping here for now -- of course new_node never equals open or closed - it's a new object w/ new ref - need to check its values not its ref.. sheesh
                        if (!open_set.includes(new_node)) {
                            console.log('push new node up')
                            open_set.push(new_node);
                        }
                        else {
                            update_node(new_node, open_set)
                        };
                    } else {
                        console.log('Already in closed_set')

                    }
                };

                // if (current_node.address[0] < this.board.num_rows -1) { // check below
                //     // TODO also check if it's traversable
                //     let new_node = new AStarNode(current_node, [current_node.address[0]+1, current_node.address[1]], target_address);

                //     if (!closed_set.includes(new_node)) {
                //         if (!open_set.includes(new_node)) {
                //             open_set.push(new_node);
                //         }
                //         else {
                //             update_node(new_node, open_set)
                //         };
                //     }
                // };

                if (current_node.address[1] > 0) { // check left
                    // TODO also check if it's traversable
                    let new_node = new AStarNode(current_node, [current_node.address[0], current_node.address[1]-1], target_address);

                    if (!closed_set.includes(new_node)) {
                        if (!open_set.includes(new_node)) {
                            open_set.push(new_node);
                        }
                        else {
                            update_node(new_node, open_set)
                        };
                    }
                }
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
        this.target_address = target_address;

        this.g = (this.parent_node == null) ? 0 : this.parent_node.g + 1; // distance traveled from origin
        this.h = Math.abs(address[0] - target_address[0]) + Math.abs(address[1] - target_address[1]) // TODO get heuristic distance to target
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
                this.cells.push(new ACell(r*num_cols+c, r, c, Math.random() > .1, '-'));
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

    let start_address = [15, 15];
    let target_address = [10, 10];

    let path = astar.find_path(start_address, target_address);
    console.log('Final path:');
    console.log(path);

    if(path) { astar.print_board_path(path); }
    
}

test_path_finder();
