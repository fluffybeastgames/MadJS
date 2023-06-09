
<!-- ABOUT THE PROJECT -->
## About MadJS

What is MadJS?
* A browser game written in Javascript where the goal is to capture all of the enemy admirals without losing your own
* A WIP. This game is not finished nor ready for widespread testing
* Open source! See the license for more
* Made for the love of coding, gaming, and learning

<!-- GETTING STARTED -->
## Getting Started

The game is currently a simple html page and a client-side javascript, and as such it should be able to run locally in any modern desktop browser. In the future, this will change to using (most likely) an express server with socket.io handling client-server communication.

### Prerequisites
A modern desktop browser and a mouse, ideally with middle click and scroll wheel capabilities.

### Installation
Clone this repo and try opening index.html!

<!-- How to Play -->
## How to Play

You control the green fleet. The goal is to eliminate the other fleets' admirals.
	Upwards Arrow	24

Controls
* Left Click - Select a cell
* Middle Click (or double left click) - Select a cell and switch to 'Move All' mode
* Right Click (or triple left click) - Select a cell and set it to 'Split in half' mode
* W or ↑ Key - Up
* A or ← Key - Left
* S or ↓ Key - Down
* D or → Key - Right
* E - Undo the last queued move
* Q - Remove entire queue
* Scroll Wheel - Zoom
* Drag and Drop - move canvas

There are three options when it comes to moving around the board:
 * Left click on a green cell to select it, then use the WASD keys to move, leaving a trail of cells behind. These cells will grow in size over time, to your benefit.
* You can also split a cell in half by right clicking it and then pressing a WASD key. The cell will be highlighted in yellow while waiting to split. This mode can also be selected by double (left) clicking on a cell.
* You may instead move all of your troops by middle clicking on a cell and then moving it about with the WASD keys. The active cell will be highlighted in red instead of white to indicate the intended behavior. Move All mode can also be activated by triple (left) clicking.

Mountains (grey cells) cannot be crossed. Currently there is no logic to prevent them from spawning all around you. Refresh the page if you are stuck behind mountains.

Zoom in and out by using the scroll wheel while hovering over the game canvas. The canvas can also be dragged and dropped by moving the mouse while the left button is depressed.


<!-- LICENSE -->
## License

Distributed under the GNU GENERAL PUBLIC LICENSE VERSION 3. See `LICENSE.txt` for more information.


<!-- ACKNOWLEDGMENTS -->
## Acknowledgments

* [generals.io](https://generals.io)
* [Readme Template](https://github.com/othneildrew/Best-README-Template)
* You, for reading this far! I hope you enjoy the game!


<!-- CONTACT -->
## Contact

Fluffy Beast - [fluffybeast.io](https://fluffybeast.io/mad/) - contact@fluffybeast.io

Project Link: [https://github.com/fluffybeastgames/MadJS](https://github.com/fluffybeastgames/MadJS)


<!-- MARKDOWN LINKS & IMAGES -->

[product-screenshot]: images/mad.png
