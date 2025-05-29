const vlink = "https://vdo.ninja/?view="

const FEED = document.getElementById("feed");
const CANVAS = document.getElementById("overlay");
const CONTEXT = CANVAS.getContext("2d");
const VIDEO = document.getElementById("VideoButton")
const URL = document.getElementById("VideoURL")
const STYLE = document.getElementById("StyleButton");
const RESET = document.getElementById("ResetGrid");
const GRIDSIZE = 2;

const CONST = {
    ABSOLUTE: "absolute",
    ALLOW: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",
    APPEND: {
        CONTROLS: "&autoplay=1&controls=0&noaudio"
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
        this.style = document.getElementById("StyleButton");
        this.reset = document.getElementById("ResetGrid");
        this.gridElement = document.getElementById("GridElement");
        this.show = true;
        this.initializeCanvas();
        this.stones = [];
        this.grid = [];
        this.points = [];
        this.isGridSet = false;
        this.controlStyle = 0;
        this.currentColor = "BLACK";
        this.bindEventListeners();
    }

    initializeCanvas() {
        this.canvas.width = CONST.CANVAS.WIDTH;
        this.canvas.height = CONST.CANVAS.HEIGHT;
    }

    bindEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        document.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.style.addEventListener("click", () => {
            console.log("clicked");
            console.log((this.style.innerText == "Control: Simple"))
            this.style.innerText = (this.style.innerText == "Control: Simple") ? "Control: Alternate" : "Control: Simple";
            this.controlStyle = (this.controlStyle == 0) ? 1 : 0;
        });
        
        this.gridElement.addEventListener("click", () => {
            this.show = !this.show; // Now correctly modifies class variable
            this.gridElement.innerText = this.show ? "Grid: Yes" : "Grid: No";
            this.gridElement.dataset.show = this.show.toString();
        });

        this.reset.addEventListener("click", () => {
            this.isGridSet = false;
            this.grid = [];
            this.points = [];
            this.stones = [];
        })
    }


    tick() {
        this.updateStonesRadius();
        this.clearCanvas();
        this.drawGrid();
        this.drawStones();
        this.markLastStone();
    }

    drawGrid() {
        if (this.grid && this.show) {
            for (let i = 0; i < this.grid.length; i++) {
                for (let j = 0; j < this.grid[i].length; j++) {
                    const point = this.grid[i][j];
                    this.context.fillStyle = 'white'; // Adjust color as needed
                    this.context.fillRect(point[0] - GRIDSIZE / 2, point[1] - GRIDSIZE / 2, GRIDSIZE, GRIDSIZE); // Adjust size as needed
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
        this.stones.forEach((stone, index) => this.drawMarker(stone, index));
    }

    drawCircle([mouse_x, mouse_y, stone_color]) {
        let offset = this.stones_radius / 2;
        this.context.drawImage(stone_color, mouse_x - offset, mouse_y - offset, this.stones_radius, this.stones_radius);
    }

    drawMarker([mouse_x, mouse_y, stone_color], index) {
        // Determine marker color based on the stone's color
        this.context.fillStyle = (stone_color === STONES.BLACK) ? 'white' : 'black';
    
        this.context.font = `${this.stones_radius / 2}px Arial`;
        this.context.textAlign = 'center';
        this.context.textBaseline = 'middle';
        
        // Draw the marker number
        this.context.fillText(index + 1, mouse_x, mouse_y);
    }

    handleMouseDown(event) {

        switch (this.controlStyle) {
            case 0:
                this.handleMouseDownBTV(event);
                break;
            case 1:
                this.handleMouseDownOGS(event);
                break;
        }

    }

    handleMouseDownBTV(event) {
        event.preventDefault();
        let { left, top } = this.canvas.getBoundingClientRect();
        let [cx, cy] = this.getCanvasCoords(event.clientX - left, event.clientY - top);

        // Assuming this.isGridSet is true when the grid is ready
        if (this.points.length < 4) {
            console.log(cx, cy);
            this.points.push([cx, cy]);
            if (this.points.length === 4) {
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

    handleMouseDownOGS(event) {
        event.preventDefault();
        let { left, top } = this.canvas.getBoundingClientRect();
        let [cx, cy] = this.getCanvasCoords(event.clientX - left, event.clientY - top);

        if (this.points.length < 4) {
            console.log(cx, cy);
            this.points.push([cx, cy]);
            if (this.points.length === 4) {
                this.grid = this.generateGrid(this.points);
                this.isGridSet = true;
            }
        } else if (this.isGridSet) {
            let point = this.findClosestPoint(cx, cy, this.grid);
            let existingStoneIndex = this.stones.findIndex(([x, y, color]) => x === point[0] && y === point[1]);

            // Decide the color of the stone to be placed
            let stoneColor = this.currentColor; // Default to current color
            if (event.shiftKey) {
                // If Shift is pressed, temporarily switch to the opposite color for this placement only
                stoneColor = this.currentColor === "BLACK" ? "WHITE" : "BLACK";
            }

            if (event.button === 1) {
                this.stones.splice(existingStoneIndex, 1);
                return;
            }

            if (existingStoneIndex >= 0) {
                // Logic for replacing or removing an existing stone
                if (this.stones[existingStoneIndex][2] !== STONES[stoneColor]) {
                    this.stones[existingStoneIndex][2] = STONES[stoneColor];
                } else {
                    this.stones.splice(existingStoneIndex, 1);
                }
            } else {
                // Place a new stone without affecting the normal alternation
                this.stones.push([point[0], point[1], STONES[stoneColor]]);

                // Only alternate the current color on a normal left-click without Shift
                if (!event.shiftKey) {
                    this.currentColor = this.currentColor === "BLACK" ? "WHITE" : "BLACK";
                }
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

    generateGrid(rawPoints) {
        // Sort points by y-coordinate (ascending), then split into top and bottom pairs
        const sortedByY = rawPoints.slice().sort((a, b) => a[1] - b[1]);
        const topPoints = sortedByY.slice(0, 2).sort((a, b) => a[0] - b[0]); // Sort by x-coordinate to get TL and TR
        const bottomPoints = sortedByY.slice(2, 4).sort((a, b) => a[0] - b[0]); // Sort by x-coordinate to get BL and BR

        // Merge sorted points back into the correct TL, TR, BL, BR order
        const points = [topPoints[0], topPoints[1], bottomPoints[0], bottomPoints[1]];

        // Now, points are ordered as TL, TR, BL, BR

        // Generate an empty board
        const grid = Array.from({ length: 19 }, () => Array.from({ length: 19 }, () => [0, 0]));

        // Bilinear interpolation function
        function bilinearInterpolation(x, y, points) {
            const [topLeft, topRight, bottomLeft, bottomRight] = points;

            // Interpolate horizontally
            const top = [topLeft[0] * (1 - x) + topRight[0] * x, topLeft[1] * (1 - x) + topRight[1] * x];
            const bottom = [bottomLeft[0] * (1 - x) + bottomRight[0] * x, bottomLeft[1] * (1 - x) + bottomRight[1] * x];

            // Interpolate vertically
            return [top[0] * (1 - y) + bottom[0] * y, top[1] * (1 - y) + bottom[1] * y];
        }

        // Calculate grid points
        for (let i = 0; i < 19; i++) {
            for (let j = 0; j < 19; j++) {
                const xFraction = j / 18; // Horizontal interpolation fraction
                const yFraction = i / 18; // Vertical interpolation fraction

                grid[i][j] = bilinearInterpolation(xFraction, yFraction, points);
            }
        }

        return grid;
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
            document.title = URL.value;


            if (FEED.audioContext.state === 'suspended') {
                audioContext.resume();
            }
        });

        URL.addEventListener("keydown", (e) => {
            if (e.key == "Enter") {
                new Video(URL.value, "feed");
                document.title = URL.value;


                if (FEED.audioContext.state === 'suspended') {
                    audioContext.resume();
                }
            }
        })

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
