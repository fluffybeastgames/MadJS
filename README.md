
<!-- ABOUT THE PROJECT -->
## About MadJS

What is MadJS?
* A browser game written in Javascript 
* Based on an unreleased Python game, Madmirals. Both owe a debt of inspiration to generals.io
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

Controls
* Left click - Select a cell
* Right click - Select a cell and switch to 'Move All' mode
* Right click - Select a cell and set it to 'Split in half' mode
* W - Up
* A - Left
* S - Down
* D - Right
* E - Undo the last queued move
* Q - Remove entire queue
* Scroll Wheel - Zoom
* Drag and drop - move canvas

There are three options when it comes to moving around the board:
 * Left click on a green cell to select it, then use the WASD keys to move, leaving a trail of cells behind. These cells will grow in size over time, to your benefit.
 * Yo may instead move all of your troops by middle clicking on a cell and then moving it about with the WASD keys. The active cell will be highlighted in red instead of white to indicate the intended behavior.
* Finally, you may split a cell in half by right clicking it and then pressing a WASD key. The cell will be highlighted in yellow while waiting to split.

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
