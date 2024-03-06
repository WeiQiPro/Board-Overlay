const vlink = "https://vdo.ninja/?view="

const FEED = document.getElementById("feed");
const CANVAS = document.getElementById("overlay");
const CONTEXT = CANVAS.getContext("2d");
const VIDEO = document.getElementById("VideoButton")
const URL = document.getElementById("VideoURL")
const GRIDSIZE = 2;

const CONST = {
    ABSOLUTE: "absolute",
    ALLOW: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    APPEND: {
        CONTROLS: "?autoplay=1&controls=0&mute=1"
    },
    CANVAS: {
        HEIGHT: 1440,
        WIDTH: 2560
    },
    ID: "id",
    NONE: "none",
    REVIEW: "Review",
    SOLID: "solid",
    TAG: "tag",
    TRUE: true,
    ZERO: "0"
}

const STONES = {
    BLACK: new Image,
    WHITE: new Image,
    MARKER: new Image,
}


STONES.BLACK.src = './img/black.png';
STONES.WHITE.src = './img/white.png';
STONES.MARKER.src = './img/marker.png';


class Canvas {
    constructor(element) {
        this.canvas = document.getElementById(element);
        this.context = this.canvas.getContext('2d');
        this.initializeCanvas();
        this.stones = [];
        this.grid = [];
        this.points = [];
        this.isGridSet = false;
        this.bindEventListeners();
    }

    initializeCanvas() {
        this.canvas.width = CONST.CANVAS.WIDTH;
        this.canvas.height = CONST.CANVAS.HEIGHT;
    }

    bindEventListeners() {
        // Binding mouse and custom event listeners
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
    }

    tick() {
        this.updateStonesRadius();
        this.clearCanvas();
        this.drawGrid();
        this.drawStones();
        this.markLastStone();
    }

    drawGrid() {
        if (this.grid) {
            for (let i = 0; i < this.grid.length; i++) {
                for (let j = 0; j < this.grid[i].length; j++) {
                    const point = this.grid[i][j];
                    this.context.fillStyle = 'white'; // Adjust color as needed
                    this.context.fillRect(point[0] - GRIDSIZE/2, point[1] - GRIDSIZE/2, GRIDSIZE, GRIDSIZE); // Adjust size as needed
                }
            }
        }
    }

    updateStonesRadius() {
        this.stones_radius = document.getElementById('StoneSize').value;
    }

    clearCanvas() {
        this.context.clearRect(0, 0, CONST.CANVAS.WIDTH, CONST.CANVAS.HEIGHT);
    }

    drawStones() {
        this.stones.forEach(stone => this.drawCircle(stone));
    }

    markLastStone() {
        if (this.stones.length > 0) {
            const lastStone = this.stones[this.stones.length - 1];
            this.drawMarker(lastStone);
        }
    }

    drawCircle([mouse_x, mouse_y, stone_color]) {
        let offset = this.stones_radius / 2;
        this.context.drawImage(stone_color, mouse_x - offset, mouse_y - offset, this.stones_radius, this.stones_radius);
    }

    drawMarker([mouse_x, mouse_y, stone_color]) {
        let marker_size = this.stones_radius / 2;
        let offset = this.stones_radius / 4;
        this.context.drawImage(STONES.MARKER, mouse_x - offset, mouse_y - offset, marker_size, marker_size);
    }

    handleMouseDown(event) {
        event.preventDefault();
        let { left, top } = this.canvas.getBoundingClientRect();
        let [cx, cy] = this.getCanvasCoords(event.clientX - left, event.clientY - top);

        // Assuming this.isGridSet is true when the grid is ready
        if (this.points.length < 3) {
            console.log(cx, cy);
            this.points.push([cx, cy]);
            if (this.points.length === 3) {
                this.grid = this.generateGrid(this.points);
                this.isGridSet = true;
            }
        } else if (this.isGridSet) {
            let point = this.findClosestPoint(cx, cy, this.grid);
            let stoneColor = event.button === 0 ? 'BLACK' : 'WHITE';
            let existingStoneIndex = this.stones.findIndex(([x, y, color]) => x === point[0] && y === point[1]);

            if (existingStoneIndex >= 0) {
                // Check if the existing stone's color is the same as the intended color
                if (this.stones[existingStoneIndex][2] !== STONES[stoneColor]) {
                    // If not, replace the stone's color with the new color
                    this.stones[existingStoneIndex][2] = STONES[stoneColor];
                } else {
                    // If the color is the same, remove the stone (toggle off)
                    this.stones.splice(existingStoneIndex, 1);
                }
            } else {
                // No stone exists at the point, add a new stone
                this.stones.push([point[0], point[1], STONES[stoneColor]]);
            }
        }
    }


    handleContextMenu(event) {
        event.preventDefault();
    }

    handleKeyDown(event) {
        if (event.code === 'Space') {
            this.clearStones();
            event.preventDefault();
        }
    }

    clearStones() {
        this.stones = [];
        this.clearCanvas();
    }

    checkForOverlappingStones() {
        // Checking for overlapping stones and removing overlaps
        this.stones = this.stones.filter((stone, i) => {
            for (let j = i + 1; j < this.stones.length; j++) {
                if (this.isOverlapping(stone, this.stones[j])) {
                    return false;
                }
            }
            return true;
        });
    }

    isOverlapping([x1, y1], [x2, y2]) {
        const distance = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
        return distance < this.stones_radius + 10; // Assuming radius as the criterion for overlap
    }

    getCanvasCoords(clientX, clientY) {
        let { width, height } = this.canvas.getBoundingClientRect();
        let scaleX = this.canvas.width / width;
        let scaleY = this.canvas.height / height;
        return [clientX * scaleX, clientY * scaleY];
    }

    generateGrid(points) {
        // Generate an empty board 
        const grid = Array.from({ length: 19 }, () => Array.from({ length: 19 }).fill(0));
        const width_diff = (points[1][1] - points[0][1]) / 18
        const length_diff = (points[2][0] - points[0][0]) / 18

        //Fill the rest of the board using the differences
        for (let i = 0; i < 19; i++) {
            for (let j = 0; j < 19; j++) {
                const x = points[0][0] + i * length_diff;
                const y = points[0][1] + j * width_diff;
                grid[i][j] = [x, y];
            }
        }

        return grid
    }

    distance(x1, y1, x2, y2) {
        return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
    }

    // Function to find the closest point on the grid given an x and y coordinate, returns that coordinate.
    findClosestPoint(x, y, grid) {
        let closestPoint = grid[0][0];
        let minDistance = this.distance(x, y, closestPoint[0], closestPoint[1]);

        // Iterate through each point in the grid
        grid.forEach(row => {
            row.forEach(point => {
                const dist = this.distance(x, y, point[0], point[1]);
                // Update closest point if distance is smaller
                if (dist < minDistance) {
                    minDistance = dist;
                    closestPoint = point;
                }
            });
        });
        return closestPoint
    }
}


class Video {
    constructor(source, iframe) {
        this.iframe = document.getElementById(iframe)
        this.source = vlink + source
        this.push_source_to_element()
    }

    push_source_to_element() {

        this.iframe.src = this.source;
        this.iframe.allow = CONST.ALLOW
        this.iframe.muted = CONST.TRUE
        this.iframe.frameborder = CONST.ZERO
        this.iframe.allowfullscreen = CONST.TRUE
        this.iframe.style.border = CONST.NONE
        this.iframe.style.boxShadow = "10px 10px 10px 10px rgba(0, 0, 0, 0.6)";

    }

}

let isEventSet = false;
let overlay = null;
function main() {
    if (!isEventSet) {

        VIDEO.addEventListener("click", () => {
            new Video(URL.value, "feed");
            document.title = "URL.value";


            if (FEED.audioContext.state === 'suspended') {
                audioContext.resume();
            }
        });

        overlay = new Canvas("overlay");

        isEventSet = true;
    }

    let overlayLoop = () => {
        requestAnimationFrame(overlayLoop);
        overlay.tick();
    }

    overlayLoop();
}
main();
