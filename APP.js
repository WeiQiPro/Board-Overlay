// Simple debugger class
class Debugger {
    constructor() {
        this.enabled = false; // Default off
    }
    
    log(...args) {
        if (this.enabled) {
            debug.log(...args);
        }
    }
    
    error(...args) {
        if (this.enabled) {
            debug.error(...args);
        }
    }
    
    warn(...args) {
        if (this.enabled) {
            debug.warn(...args);
        }
    }
}

// Global debugger instance
const debug = new Debugger();

const FEED = document.getElementById("feed");
const CANVAS = document.getElementById("overlay");
const CONTEXT = CANVAS.getContext("2d");
const VIDEO = document.getElementById("VideoButton");
const URL = document.getElementById("VideoURL");
const STYLE = document.getElementById("StyleButton");
const RESET = document.getElementById("ResetGrid");
const VDO_LINK = document.getElementById("vdo_link");
const GRIDSIZE = 2;

const CONST = {
    ABSOLUTE: "absolute",
    ALLOW:
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone; display-capture",
    CANVAS: {
        HEIGHT: 1080,
        WIDTH: 1920,
    },
    ID: "id",
    NONE: "none",
    REVIEW: "Review",
    SOLID: "solid",
    TAG: "tag",
    TRUE: true,
    ZERO: "0",
};

const STONES = {
    BLACK: new Image(),
    WHITE: new Image(),
    BOARD: new Image(),
    MARKER: new Image(),
};

STONES.BLACK.src = "./img/black.png";
STONES.WHITE.src = "./img/white.png";
STONES.MARKER.src = "./img/marker.png";
STONES.BOARD.src = "./img/board.png";

class DrawingLayer {
    constructor(element) {
        this.canvas = document.getElementById(element);
        this.context = this.canvas.getContext("2d");
        this.isDrawing = false;
        this.marks = [];
        this.paths = [];  // Store drawing paths
        this.currentPath = null;
        this.initializeCanvas();
        this.bindEventListeners();
    }

    initializeCanvas() {
        this.canvas.width = CONST.CANVAS.WIDTH;
        this.canvas.height = CONST.CANVAS.HEIGHT;
        
        // Make canvas focusable for keyboard shortcuts
        this.canvas.tabIndex = 0;
        this.canvas.style.outline = 'none'; // Remove focus outline
        this.context.strokeStyle = this.getPenColor();
        this.context.lineWidth = 2;
        this.context.font = '24px Arial';
    }

    getPenColor() {
        const colorInput = document.getElementById('markupColor');
        return colorInput ? colorInput.value : 'red';
    }

    bindEventListeners() {
        this.canvas.addEventListener('mousedown', this.startDrawing.bind(this));
        this.canvas.addEventListener('mousemove', this.draw.bind(this));
        this.canvas.addEventListener('mouseup', this.stopDrawing.bind(this));
        this.canvas.addEventListener('mouseout', this.stopDrawing.bind(this));
        
        // Ensure canvas gets focus when clicked for keyboard shortcuts
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Delete') {
                this.clearCanvas();
            }
        });
        // Listen for color changes
        const colorInput = document.getElementById('markupColor');
        if (colorInput) {
            colorInput.addEventListener('input', () => {
                this.context.strokeStyle = this.getPenColor();
            });
        }
    }

    startDrawing(e) {
        if (currentTool !== 'PEN') return;
        this.isDrawing = true;
        const [x, y] = this.getCanvasCoords(e.offsetX, e.offsetY);
        this.currentPath = {
            points: [[x, y]],
            type: 'path',
            color: this.getPenColor()
        };
        this.context.beginPath();
        this.context.strokeStyle = this.getPenColor();
        this.context.moveTo(x, y);
    }

    draw(e) {
        if (!this.isDrawing || currentTool !== 'PEN') return;
        const [x, y] = this.getCanvasCoords(e.offsetX, e.offsetY);
        if (this.currentPath) {
            this.currentPath.points.push([x, y]);
        }
        this.context.lineTo(x, y);
        this.context.strokeStyle = this.getPenColor();
        this.context.stroke();
    }

    stopDrawing() {
        if (this.isDrawing && this.currentPath) {
            this.paths.push(this.currentPath);
            this.currentPath = null;
        }
        this.isDrawing = false;
    }

    clearCanvas() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.marks = [];
        this.paths = [];
        this.currentPath = null;
    }

    addMark(type, x, y, text = '') {
        const mark = { type, x, y, text };
        this.marks.push(mark);
        this.drawMark(mark);
    }

    redrawAll() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        // Redraw all paths
        this.paths.forEach(path => {
            if (path.points.length > 0) {
                this.context.beginPath();
                this.context.strokeStyle = path.color || this.getPenColor();
                this.context.moveTo(path.points[0][0], path.points[0][1]);
                path.points.slice(1).forEach(point => {
                    this.context.lineTo(point[0], point[1]);
                });
                this.context.stroke();
            }
        });
        // Redraw all marks
        this.marks.forEach(mark => this.drawMark(mark));
    }

    drawMark({ type, x, y, text }) {
        const colorInput = document.getElementById('markupColor');
        const fillColor = colorInput ? colorInput.value : 'white';
        this.context.save();
        this.context.strokeStyle = 'black'; // Default outline
        this.context.fillStyle = fillColor;
        this.context.lineWidth = 2;

        switch (type) {
            case 'TRIANGLE':
                this.drawTriangle(x, y);
                break;
            case 'CIRCLE':
                this.drawCircle(x, y);
                break;
            case 'SQUARE':
                this.drawSquare(x, y);
                break;
            case 'LETTER': {
                // Always use white fill and black outline for letters
                this.context.strokeStyle = 'black';
                this.context.fillStyle = 'white';
                this.context.lineWidth = 3;
                this.context.strokeText(text, x - 8, y + 8);
                this.context.fillText(text, x - 8, y + 8);
                break;
            }
        }

        this.context.restore();
    }

    drawTriangle(x, y) {
        const size = 20;
        this.context.beginPath();
        this.context.moveTo(x, y - size);
        this.context.lineTo(x + size, y + size);
        this.context.lineTo(x - size, y + size);
        this.context.closePath();
        this.context.stroke();
    }

    drawCircle(x, y) {
        const radius = 15;
        this.context.beginPath();
        this.context.arc(x, y, radius, 0, Math.PI * 2);
        this.context.stroke();
    }

    drawSquare(x, y) {
        const size = 20;
        this.context.strokeRect(x - size/2, y - size/2, size, size);
    }

    getCanvasCoords(offsetX, offsetY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        return [offsetX * scaleX, offsetY * scaleY];
    }
}

let currentTool = 'BLACK';

class Canvas {
    constructor(element) {
        this.canvas = document.getElementById(element);
        this.context = this.canvas.getContext("2d");
        this.gridElement = document.getElementById("GridElement");
        this.show = true;
        this.showCoordinates = true;
        this.initializeCanvas();
        this.stones = []; // For black and white stones (variations)
        this.boardStones = []; // For board stones (empty positions)
        this.grid = [];
        this.points = [];
        this.isGridSet = false;
        this.currentColor = "BLACK";
        this.LetterToolList = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        this.LetterToolListIndex = 0;
        
        // Initialize letter stack from A to ZZ in alphabetical order
        this.letterStack = [];
        // Single letters A-Z
        for (let i = 65; i <= 90; i++) {
            this.letterStack.push(String.fromCharCode(i));
        }
        // Double letters AA-ZZ
        for (let i = 65; i <= 90; i++) {
            for (let j = 65; j <= 90; j++) {
                this.letterStack.push(String.fromCharCode(i) + String.fromCharCode(j));
            }
        }
        
        // All stones should be 100x100
        this.stoneSizes = {
            BLACK: 100,
            WHITE: 100,
            BOARD: 100
        };
        this.bindEventListeners();
        this.setupToolbar();
        this.updateGridButtonState();
    }

    setupToolbar() {
        const tools = {
            'BlackStoneBtn': 'BLACK',
            'WhiteStoneBtn': 'WHITE',
            'PenBtn': 'PEN',
            'TriangleBtn': 'TRIANGLE',
            'CircleBtn': 'CIRCLE',
            'SquareBtn': 'SQUARE',
            'LetterBtn': 'LETTER'
        };

        const drawingLayerElement = document.getElementById('drawingLayer');

        Object.entries(tools).forEach(([btnId, toolType]) => {
            const btn = document.getElementById(btnId);
            if (btn) {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    currentTool = toolType;
                    
                    // Toggle drawing layer interaction based on pen tool
                    if (toolType === 'PEN') {
                        drawingLayerElement.classList.add('pen-active');
                    } else {
                        drawingLayerElement.classList.remove('pen-active');
                    }
                });
            }
        });
    }

    initializeCanvas() {
        this.canvas.width = CONST.CANVAS.WIDTH;
        this.canvas.height = CONST.CANVAS.HEIGHT;
        
        // Make canvas focusable for keyboard shortcuts
        this.canvas.tabIndex = 0;
        this.canvas.style.outline = 'none'; // Remove focus outline
    }

    bindEventListeners() {
        this.canvas.addEventListener(
            "mousedown",
            this.handleMouseDown.bind(this),
        );
        this.canvas.addEventListener(
            "contextmenu",
            this.handleContextMenu.bind(this),
        );
        
        // Ensure canvas gets focus when clicked for keyboard shortcuts
        this.canvas.addEventListener('click', () => {
            this.canvas.focus();
        });
        
        document.addEventListener("keydown", (event) => {
            // Don't trigger shortcuts if user is typing in any input field
            const activeElement = document.activeElement;
            const isInputField = activeElement && (
                activeElement.tagName === 'INPUT' || 
                activeElement.tagName === 'TEXTAREA' || 
                activeElement.tagName === 'SELECT' ||
                activeElement.contentEditable === 'true' ||
                activeElement.contentEditable === 'plaintext-only' ||
                activeElement.role === 'textbox' ||
                activeElement.role === 'searchbox' ||
                activeElement.role === 'combobox'
            );
            
            if (isInputField) {
                return; // Don't trigger shortcuts when typing in inputs
            }
            
            if (event.code === "Space") {
                if (window.drawingLayer) {
                    drawingLayer.clearCanvas();
                    this.boardStones = [];
                }
                event.preventDefault();
            }
            this.handleKeyDown(event);
        });

        // Add event listeners for GridBtn and CoordBtn
        const gridBtn = document.getElementById("GridBtn");
        if (gridBtn) {
            gridBtn.addEventListener("click", () => {
                this.show = !this.show;
                this.updateGridButtonState();
            });
        }
        const coordBtn = document.getElementById("CoordBtn");
        if (coordBtn) {
            coordBtn.addEventListener("click", () => {
                this.showCoordinates = !this.showCoordinates;
            });
        }
    }

    updateGridButtonState() {
        if (!this.gridElement) return; // Ensure gridElement is not null
        // Use SVG icons for grid on/off
        const gridOnIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="16" height="16" rx="2" stroke="white" stroke-width="2"/><path d="M2 7H18" stroke="white" stroke-width="2"/><path d="M2 13H18" stroke="white" stroke-width="2"/><path d="M7 2V18" stroke="white" stroke-width="2"/><path d="M13 2V18" stroke="white" stroke-width="2"/></svg>`;
        const gridOffIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="2" y="2" width="16" height="16" rx="2" stroke="#666" stroke-width="2"/><path d="M2 7H18" stroke="#666" stroke-width="2"/><path d="M2 13H18" stroke="#666" stroke-width="2"/><path d="M7 2V18" stroke="#666" stroke-width="2"/><path d="M13 2V18" stroke="#666" stroke-width="2"/></svg>`;
        if (this.show) {
            this.gridElement.classList.add('active');
            this.gridElement.innerHTML = gridOnIcon;
        } else {
            this.gridElement.classList.remove('active');
            this.gridElement.innerHTML = gridOffIcon;
        }
        this.gridElement.dataset.show = this.show.toString();
    }

    tick() {
        if (this.showTimer >= 0) {
            this.showTimer = this.showTimer - 0.016;
            if (this.showTimer < 0) this.show = false;
        }
        this.updateStonesRadius();
        this.clearCanvas();
        this.drawGrid();
        // Draw board stones first (as background)
        this.boardStones.forEach(stone => this.drawCircle(stone));
        // Then draw variation stones and their markers
        this.stones.forEach((stone, index) => {
            this.drawCircle(stone);
            this.drawMarker(stone, index);
        });
    }

    drawGrid() {
        if (this.grid && this.grid.length > 0) {
            // Draw grid points only if show is true
            if (this.show) {
                for (let i = 0; i < this.grid.length; i++) {
                    for (let j = 0; j < this.grid[i].length; j++) {
                        const point = this.grid[i][j];
                        if (point && point.length >= 2) {
                            this.context.fillStyle = "white"; // Adjust color as needed
                            this.context.fillRect(
                                point[0] - GRIDSIZE / 2,
                                point[1] - GRIDSIZE / 2,
                                GRIDSIZE,
                                GRIDSIZE,
                            ); // Adjust size as needed
                        }
                    }
                }
            }

            // Draw coordinates (top: A-T, left: 1-19) only if showCoordinates is true
            if (this.showCoordinates && this.grid.length > 0 && this.grid[0].length > 0) {
                const colLabels = [
                    'A','B','C','D','E','F','G','H','J','K','L','M','N','O','P','Q','R','S','T'
                ]; // Go skips 'I'
                this.context.save();
                this.context.font = '24px Arial';
                this.context.fillStyle = 'white';
                this.context.textAlign = 'center';
                this.context.textBaseline = 'middle';

                // Top labels (columns)
                for (let j = 0; j < Math.min(19, this.grid[0].length); j++) {
                    const pt = this.grid[0][j];
                    if (pt && pt.length >= 2) {
                        // Place label above the first row
                        this.context.fillText(colLabels[j], pt[0], pt[1] - 32);
                    }
                }
                // Left labels (rows)
                for (let i = 0; i < Math.min(19, this.grid.length); i++) {
                    const pt = this.grid[i][0];
                    if (pt && pt.length >= 2) {
                        // Place label to the left of the first column
                        this.context.textAlign = 'right';
                        this.context.fillText((i+1).toString(), pt[0] - 24, pt[1]);
                        this.context.textAlign = 'center'; // Reset for columns
                    }
                }
                this.context.restore();
            }
        }
    }

    updateStonesRadius() {
        // Set default to 125 if not set
        const stoneSizeInput = document.getElementById("StoneSize");
        if (!stoneSizeInput.value || stoneSizeInput.value === "") {
            stoneSizeInput.value = 125;
        }
        this.stones_radius = stoneSizeInput.value;
        // Track if user has changed the value
        if (typeof this.userChangedStoneSize === 'undefined') {
            this.userChangedStoneSize = false;
            stoneSizeInput.addEventListener('input', () => {
                this.userChangedStoneSize = true;
            }, { once: true });
        }
    }

    clearCanvas() {
        this.context.clearRect(0, 0, CONST.CANVAS.WIDTH, CONST.CANVAS.HEIGHT);
    }

    drawStones() {
        this.stones.forEach((stone) => this.drawCircle(stone));
    }

    markLastStone() {
        this.stones.forEach((stone, index) => this.drawMarker(stone, index));
    }

    drawCircle([mouse_x, mouse_y, stone_color]) {
        if (!this.isGridSet || !this.grid.length) {
            return;
        }

        // Get base size based on stone type
        const baseSize = this.stoneSizes[stone_color === STONES.BLACK ? 'BLACK' : 
                                      stone_color === STONES.WHITE ? 'WHITE' : 'BOARD'];
        // Calculate interpolated stone size
        let stoneSize = this.interpolateStoneSize(mouse_x, mouse_y, baseSize);

        // If black or white, scale up by 1.25 to compensate for image padding
        let scale = 1;
        if (stone_color === STONES.BLACK || stone_color === STONES.WHITE) {
            scale = 1.25;
        }
        const drawSize = stoneSize * scale;
        const offset = drawSize / 2;

        this.context.drawImage(
            stone_color,
            mouse_x - offset,
            mouse_y - offset,
            drawSize,
            drawSize,
        );
    }

    drawMarker([mouse_x, mouse_y, stone_color], index) {
        if (!this.isGridSet || !this.grid.length) {
            return;
        }

        // Use the stone's base size for marker scaling
        const baseSize = this.stoneSizes[stone_color === STONES.BLACK ? 'BLACK' : 
                                      stone_color === STONES.WHITE ? 'WHITE' : 'BOARD'];
        const stoneSize = this.interpolateStoneSize(mouse_x, mouse_y, baseSize);
        
        this.context.fillStyle = (stone_color === STONES.BLACK)
            ? "white"
            : "black";

        this.context.font = `${stoneSize / 3}px Arial`;
        this.context.textAlign = "center";
        this.context.textBaseline = "middle";

        this.context.fillText(index + 1, mouse_x, mouse_y);
    }

    interpolateStoneSize(x, y, baseSize) {
        if (!this.isGridSet || !this.grid.length) {
            return baseSize;
        }

        // Find the closest grid point (i, j)
        let closestI = 0, closestJ = 0;
        let minDist = Infinity;
        for (let i = 0; i < this.grid.length; i++) {
            for (let j = 0; j < this.grid[i].length; j++) {
                const pt = this.grid[i][j];
                const dist = Math.hypot(x - pt[0], y - pt[1]);
                if (dist < minDist) {
                    minDist = dist;
                    closestI = i;
                    closestJ = j;
                }
            }
        }

        // Find the closest neighbor (up, down, left, right)
        const neighbors = [];
        if (closestI > 0) neighbors.push(this.grid[closestI - 1][closestJ]);
        if (closestI < this.grid.length - 1) neighbors.push(this.grid[closestI + 1][closestJ]);
        if (closestJ > 0) neighbors.push(this.grid[closestI][closestJ - 1]);
        if (closestJ < this.grid[closestI].length - 1) neighbors.push(this.grid[closestI][closestJ + 1]);

        let minNeighborDist = Infinity;
        const centerPt = this.grid[closestI][closestJ];
        neighbors.forEach(pt => {
            const dist = Math.hypot(centerPt[0] - pt[0], centerPt[1] - pt[1]);
            if (dist < minNeighborDist) minNeighborDist = dist;
        });

        // Fallback if no neighbor (shouldn't happen on a 19x19 grid)
        if (!isFinite(minNeighborDist) || minNeighborDist <= 0) {
            minNeighborDist = baseSize;
        }

        // The stone's diameter should be the grid spacing minus a margin
        const margin = 2; // px, tweak as needed
        let diameter = minNeighborDist - margin;

        // Only apply user size preference if changed from default
        const stoneSizeInput = document.getElementById("StoneSize");
        if (this.userChangedStoneSize && stoneSizeInput.value) {
            diameter = diameter * (parseInt(stoneSizeInput.value, 10) / 125);
        }
        return Math.round(diameter);
    }

    handleMouseDown(event) {
        event.preventDefault();
        let rect = this.canvas.getBoundingClientRect();
        let x = event.clientX - rect.left;
        let y = event.clientY - rect.top;
        let [cx, cy] = this.getCanvasCoords(x, y);

        if (this.points.length < 4) {
            debug.log(cx, cy);
            this.points.push([Number(cx.toFixed(0)), Number(cy.toFixed(0))]);
            if (this.points.length === 4) {
                this.grid = this.generateGrid(this.points);
                this.isGridSet = true;
                this.showTimer = 3;
                updateShareableUrl();
            }
        } else if (this.isGridSet) {
            let point = this.findClosestPoint(cx, cy, this.grid);

            // Handle shape/letter tools
            if (['TRIANGLE', 'CIRCLE', 'SQUARE', 'LETTER'].includes(currentTool)) {
                let text = '';
                if (currentTool === 'LETTER') {
                    const letterBtn = document.getElementById('LetterBtn');
                    if (letterBtn) {
                        // Check if there's already a letter at this position
                        const existingLetter = drawingLayer.marks.find(mark => 
                            mark.type === 'LETTER' && 
                            Math.sqrt((mark.x - point[0]) ** 2 + (mark.y - point[1]) ** 2) <= 20
                        );
                        
                        if (existingLetter) {
                            // Remove the existing letter
                            drawingLayer.marks = drawingLayer.marks.filter(mark => mark !== existingLetter);
                            drawingLayer.redrawAll();
                            
                            // Insert the removed letter back into its proper alphabetical position
                            const removedLetter = existingLetter.text;
                            let insertIndex = 0;
                            
                            // Find the correct position to maintain alphabetical order
                            for (let i = 0; i < this.letterStack.length; i++) {
                                if (this.letterStack[i] > removedLetter) {
                                    insertIndex = i;
                                    break;
                                }
                                insertIndex = i + 1;
                            }
                            
                            this.letterStack.splice(insertIndex, 0, removedLetter);
                            letterBtn.textContent = this.letterStack[0];
                            return;
                        } else {
                            // Get the next letter from the stack
                            if (this.letterStack.length > 0) {
                                text = this.letterStack.shift(); // Remove and get the first letter
                                letterBtn.textContent = this.letterStack.length > 0 ? this.letterStack[0] : 'A';
                            } else {
                                text = 'A'; // Fallback if stack is empty
                                letterBtn.textContent = 'A';
                            }
                        }
                    } else {
                        text = 'A';
                    }
                }
                drawingLayer.addMark(currentTool, point[0], point[1], text);
                return;
            }

            if (event.button === 2) { // Right click - handle board stones
                let existingBoardStoneIndex = this.boardStones.findIndex(([x, y]) =>
                    x === point[0] && y === point[1]
                );
                if (existingBoardStoneIndex >= 0) {
                    this.boardStones.splice(existingBoardStoneIndex, 1);
                } else {
                    // Remove any variation stone at this position
                    let existingStoneIndex = this.stones.findIndex(([x, y]) =>
                        x === point[0] && y === point[1]
                    );
                    if (existingStoneIndex >= 0) {
                        this.stones.splice(existingStoneIndex, 1);
                    }
                    this.boardStones.push([point[0], point[1], STONES.BOARD]);
                }
            } else if (event.button === 0) { // Left click - handle variation stones
                let existingStoneIndex = this.stones.findIndex(([x, y]) =>
                    x === point[0] && y === point[1]
                );
                if (existingStoneIndex >= 0) {
                    this.stones.splice(existingStoneIndex, 1);
                } else {
                    // Remove any board stone at this position
                    let existingBoardStoneIndex = this.boardStones.findIndex(([x, y]) =>
                        x === point[0] && y === point[1]
                    );
                    if (existingBoardStoneIndex >= 0) {
                        this.boardStones.splice(existingBoardStoneIndex, 1);
                    }
                    this.stones.push([point[0], point[1], STONES[this.currentColor]]);
                }
                if (!event.shiftKey) {
                    this.currentColor = this.currentColor === "BLACK" ? "WHITE" : "BLACK";
                    document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
                    document.getElementById(this.currentColor === 'BLACK' ? 'BlackStoneBtn' : 'WhiteStoneBtn').classList.add('active');
                    currentTool = this.currentColor;
                }
            }
        }
    }

    handleContextMenu(event) {
        event.preventDefault();
    }

    handleKeyDown(event) {
        if (event.code === "Space") {
            this.clearStones();
            // Letter stack is already reset in clearStones()
            event.preventDefault();
        }
        if (event.code === "KeyR") {
            this.resetGrid();
            event.preventDefault();
        }
    }

    clearStones() {
        this.stones = [];
        this.clearCanvas();
        
        // Reset letter stack
        this.letterStack = [];
        // Single letters A-Z
        for (let i = 65; i <= 90; i++) {
            this.letterStack.push(String.fromCharCode(i));
        }
        // Double letters AA-ZZ
        for (let i = 65; i <= 90; i++) {
            for (let j = 65; j <= 90; j++) {
                this.letterStack.push(String.fromCharCode(i) + String.fromCharCode(j));
            }
        }
        
        // Update letter button
        const letterBtn = document.getElementById('LetterBtn');
        if (letterBtn) {
            letterBtn.textContent = this.letterStack[0];
        }
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
        const points = [
            topPoints[0],
            topPoints[1],
            bottomPoints[0],
            bottomPoints[1],
        ];

        // Now, points are ordered as TL, TR, BL, BR

        // Generate an empty board
        const grid = Array.from(
            { length: 19 },
            () => Array.from({ length: 19 }, () => [0, 0]),
        );

        // Bilinear interpolation function
        function bilinearInterpolation(x, y, points) {
            const [topLeft, topRight, bottomLeft, bottomRight] = points;

            // Interpolate horizontally
            const top = [
                topLeft[0] * (1 - x) + topRight[0] * x,
                topLeft[1] * (1 - x) + topRight[1] * x,
            ];
            const bottom = [
                bottomLeft[0] * (1 - x) + bottomRight[0] * x,
                bottomLeft[1] * (1 - x) + bottomRight[1] * x,
            ];

            // Interpolate vertically
            return [
                top[0] * (1 - y) + bottom[0] * y,
                top[1] * (1 - y) + bottom[1] * y,
            ];
        }

        // Calculate grid points
        for (let i = 0; i < 19; i++) {
            for (let j = 0; j < 19; j++) {
                const xFraction = j / 18; // Horizontal interpolation fraction
                const yFraction = i / 18; // Vertical interpolation fraction

                let [x, y] = bilinearInterpolation(
                    xFraction,
                    yFraction,
                    points,
                );
                // Floor the coordinates to integers
                x = Math.floor(x);
                y = Math.floor(y);
                grid[i][j] = [x, y];
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
        grid.forEach((row) => {
            row.forEach((point) => {
                const dist = this.distance(x, y, point[0], point[1]);
                // Update closest point if distance is smaller
                if (dist < minDistance) {
                    minDistance = dist;
                    closestPoint = point;
                }
            });
        });
        return closestPoint;
    }

    resetGrid() {
        this.isGridSet = false;
        this.grid = [];
        this.points = [];
        this.stones = [];
        this.boardStones = [];
        this.updateGridButtonState();
        updateShareableUrl();
    }
}

class IframeManager {
    constructor() {
        this.iframes = {
            feed: document.getElementById("feed"),
            obs: document.getElementById("obs"),
            chat: document.getElementById("chat")
        };
        this.vdoNinjaBase = "https://vdo.ninja/?";
        this.parseUrlParams();
        updateSidePanelVisibility();
    }

    parseUrlParams() {
        const params = new URLSearchParams(window.location.search);
        // Handle VDO.Ninja view link
        if (params.has('vdo_link')) {
            const vdoLink = params.get('vdo_link');
            if (vdoLink) {
                this.setUrl('feed', vdoLink);
                document.title = vdoLink;
            }
        }
        // Handle chat URL
        if (params.has('chat_url')) {
            const chatUrl = decodeURIComponent(params.get('chat_url'));
            document.getElementById('ChatUrl').value = chatUrl;
            this.setUrl('chat', chatUrl);
        }
        // Handle commentator view
        if (params.has('commentator') && params.get('commentator') === 'true') {
            if (params.has('room')) {
                this.setCommentatorUrl(params.get('room'));
            }
        }
        // Handle VDO Ninja link
        const vdoLink = params.get('vdo');
        if (vdoLink) {
            let decodedVdoLink = decodeURIComponent(vdoLink);
            // If still contains % signs, decode again
            if (decodedVdoLink.includes('%')) {
                decodedVdoLink = decodeURIComponent(decodedVdoLink);
            }
            document.getElementById('VideoURL').value = decodedVdoLink;
            document.getElementById('feed').src = decodedVdoLink;
        }
    }

    setVdoNinjaUrl(element, params) {
        const url = new URLSearchParams(params).toString();
        this.setUrl(element, url);
    }

    setUrl(type, url) {
        if (this.iframes[type]) {
            this.iframes[type].src = url;
            updateSidePanelVisibility();
        }
    }

    setViewerUrl(roomId) {
        this.setVdoNinjaUrl('feed', {
            view: roomId,
            autoplay: '1',
            controls: '0',
            mute: '1',
            noaudio: ''
        });
    }

    setCommentatorUrl(roomId) {
        // Special commentator URL with additional features
        this.setVdoNinjaUrl('obs', {
            room: roomId,
            director: '1',
            scene: '1',
            bitrate: '8000',
            quality: '2',
            stereo: '1',
            codec: 'h264',
            label: 'Commentator View',
            cleanoutput: '1',
            broadcast: '1'
        });

        // Set up a broadcast view for the feed as well
        this.setVdoNinjaUrl('feed', {
            view: roomId,
            scene: '1',
            cleanish: '1',
            noaudio: '1',
            muted: '1',
            autoplay: '1'
        });
    }

    generateShareableUrl() {
        const params = new URLSearchParams();
        const vdoLink = document.getElementById('VideoURL').value;
        if (vdoLink) params.append('vdo_link', encodeURIComponent(vdoLink));
        const chatUrl = document.getElementById('ChatUrl').value;
        if (chatUrl) params.append('chat_url', encodeURIComponent(chatUrl));
        // ... add other params as needed ...
        if (overlay && overlay.points && overlay.points.length === 4) {
            params.set('grid', overlay.points.map(pt => pt.map(Number).map(n => Math.round(n)).join(',')).join(';'));
        }
        // Add obs_ws param last
        const obsWebSocket = document.getElementById('ObsWebSocket').value;
        if (obsWebSocket) {
            // Use the original WebSocket URL without modification
            let formattedUrl = obsWebSocket;
            
            // Only add scenes parameter if we're in restricted control mode
            if (window.obsController && window.obsController.allowedScenes && window.obsController.allowedScenes.length > 0) {
                // Add scenes parameter for restricted control
                debug.log('Adding scenes parameter to shareable URL (restricted control):', window.obsController.allowedScenes);
                formattedUrl += `&scenes=${encodeURIComponent(JSON.stringify(window.obsController.allowedScenes))}`;
            } else {
                debug.log('No scenes parameter added to shareable URL (full control mode)');
            }
            
            // Note: We don't include the password in the shareable URL for security
            // The password should be entered manually by the user
            
            params.set('obs_ws', encodeURIComponent(encodeURIComponent(formattedUrl)));
        }
        return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    }
}

class Video {
    constructor(source, iframe, link = false) {
        debug.log("Video Constructor called with source:", source);
        this.iframeManager = new IframeManager();
        if (!link) {
            this.iframeManager.setViewerUrl(source);
        } else {
            this.iframeManager.setUrl('feed', source);
        }
    }
}

let isEventSet = false;
let overlay = null;

class ConfigManager {
    constructor(iframeManager) {
        this.iframeManager = iframeManager;
        this.configPanel = document.getElementById('configPanel');
        this.toggleBtn = document.getElementById('ToggleConfig');
        this.chatPlatform = document.getElementById('chatPlatform');
        this.chatChannelId = document.getElementById('chatChannelId');
        this.setChatBtn = document.getElementById('setChatBtn');
        this.commentatorRoom = document.getElementById('commentatorRoom');
        this.setCommentatorBtn = document.getElementById('setCommentatorBtn');
        this.shareUrl = document.getElementById('shareUrl');
        this.copyShareUrl = document.getElementById('copyShareUrl');
        
        this.bindEventListeners();
    }

    bindEventListeners() {
        // Toggle configuration panel
        this.toggleBtn.addEventListener('click', () => {
            this.configPanel.classList.toggle('hidden');
        });

        // Set chat
        this.setChatBtn.addEventListener('click', () => {
            const platform = this.chatPlatform.value;
            const channelId = this.chatChannelId.value;
            if (channelId) {
                this.iframeManager.setChatUrl(platform, channelId);
                this.updateShareUrl();
            }
        });

        // Set commentator mode
        this.setCommentatorBtn.addEventListener('click', () => {
            const roomId = this.commentatorRoom.value;
            if (roomId) {
                this.iframeManager.setCommentatorUrl(roomId);
                this.updateShareUrl();
            }
        });

        // Copy share URL
        this.copyShareUrl.addEventListener('click', () => {
            this.shareUrl.select();
            document.execCommand('copy');
        });
    }

    updateShareUrl() {
        const url = this.iframeManager.generateShareableUrl();
        this.shareUrl.value = url;
    }
}

class UIManager {
    constructor(iframeManager) {
        this.iframeManager = iframeManager;
        this.reviewPanel = document.getElementById('reviewPanel');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.obsControlPanel = document.getElementById('obsControlPanel');
        this.toggleReview = document.getElementById('toggleReview');
        this.toggleSettings = document.getElementById('toggleSettings');
        this.toggleObsControl = document.getElementById('toggleObsControl');
        this.gridElement = document.getElementById('GridElement');
        
        this.bindEventListeners();
    }

    bindEventListeners() {
        // Toggle panels
        if (this.toggleReview) {
            this.toggleReview.addEventListener('click', () => {
                this.togglePanel('review');
            });
        }

        if (this.toggleSettings) {
            this.toggleSettings.addEventListener('click', () => {
                this.togglePanel('settings');
            });
        }

        if (this.toggleObsControl) {
            this.toggleObsControl.addEventListener('click', () => {
                this.togglePanel('obsControl');
            });
        }

        // Grid toggle
        const gridBtn = document.getElementById('GridElement');
        if (gridBtn) {
            gridBtn.addEventListener('click', () => {
                overlay.show = !overlay.show;
                overlay.updateGridButtonState();
            });
        }

        // Video connection
        const videoBtn = document.getElementById('VideoButton');
        if (videoBtn) {
            videoBtn.addEventListener('click', () => {
                const vdoLink = document.getElementById('VideoURL').value.trim();
                if (vdoLink) {
                    document.getElementById('feed').src = vdoLink;
                    updateShareableUrl();
                }
            });
        }

        // Stone size
        const stoneSizeInput = document.getElementById('StoneSize');
        if (stoneSizeInput) {
            stoneSizeInput.addEventListener('change', (e) => {
                if (overlay) {
                    overlay.stones_radius = e.target.value;
                }
            });
        }

        // Reset grid
        this.resetBtn = document.getElementById('ResetGrid');
        if (this.resetBtn) {
            this.resetBtn.addEventListener('click', () => {
                overlay.isGridSet = false;
                overlay.grid = [];
                overlay.points = [];
                overlay.stones = [];
                overlay.boardStones = [];
                overlay.updateGridButtonState();
                updateShareableUrl();
            });
        }

        // Update shareable URL on input changes
        ['VideoURL', 'StoneSize', 'ObsWebSocket', 'ObsVdoUrl'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('input', updateShareableUrl);
        });

        // Copy share URL
        const copyBtn = document.getElementById('copyShareUrl');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(window.location.href);
                alert('Shareable URL copied!');
            });
        }
    }

    togglePanel(type) {
        const panels = {
            'review': this.reviewPanel,
            'settings': this.settingsPanel,
            'obsControl': this.obsControlPanel
        };
        const buttons = {
            'review': this.toggleReview,
            'settings': this.toggleSettings,
            'obsControl': this.toggleObsControl
        };

        const targetPanel = panels[type];
        const targetBtn = buttons[type];

        if (targetPanel.classList.contains('hidden')) {
            // Hide all other panels
            Object.values(panels).forEach(panel => {
                if (panel && panel !== targetPanel) {
                    panel.classList.add('hidden');
                }
            });
            Object.values(buttons).forEach(btn => {
                if (btn && btn !== targetBtn) {
                    btn.classList.remove('active');
                }
            });
            
            // Show target panel
            targetPanel.classList.remove('hidden');
            targetBtn.classList.add('active');
        } else {
            // Hide target panel
            targetPanel.classList.add('hidden');
            targetBtn.classList.remove('active');
        }
    }
}

class OBSController {
    constructor() {
        this.obs = new OBSWebSocket();
        this.connected = false;
        this.scenes = [];
        this.allowedScenes = []; // Scenes allowed from URL parameters
        this.currentScene = '';
        this.streaming = false;
        this.maxSceneButtons = 4; // Maximum number of scene buttons before switching to dropdown
        
        this.connectionStatus = document.getElementById('obsConnectionStatus');
        this.sceneButtonsContainer = document.getElementById('obsSceneButtons');
        this.sceneDropdownContainer = document.getElementById('obsSceneDropdown');
        this.sceneSelect = document.getElementById('obsSceneSelect');
        this.streamToggleBtn = document.getElementById('obsStreamToggle');
        
        this.bindEventListeners();
        this.bindOBSEvents();
        this.loadConfigFromUrl();
    }

    bindEventListeners() {
        // OBS WebSocket input
        const obsWebSocketInput = document.getElementById('ObsWebSocket');
        if (obsWebSocketInput) {
            obsWebSocketInput.addEventListener('input', (e) => {
                this.parseWebSocketUrl(e.target.value);
                updateShareableUrl();
            });
        }

        // Scene selection
        if (this.sceneSelect) {
            this.sceneSelect.addEventListener('change', (e) => {
                this.switchScene(e.target.value);
            });
        }

        // Stream controls
        if (this.streamToggleBtn) {
            this.streamToggleBtn.addEventListener('click', () => {
                this.toggleStream();
            });
        }
    }

    bindOBSEvents() {
        // Connection events
        this.obs.on('ConnectionOpened', () => {
            debug.log('OBS WebSocket connection opened');
            this.updateStatus('connecting');
        });

        this.obs.on('ConnectionClosed', (error) => {
            debug.log('OBS WebSocket connection closed:', error);
            this.updateStatus('disconnected');
            this.connected = false;
            this.stopStreamingStatusRefresh();
        });

        this.obs.on('ConnectionError', (error) => {
            debug.error('OBS WebSocket connection error:', error);
            this.updateStatus('disconnected');
            this.stopStreamingStatusRefresh();
        });

        this.obs.on('Identified', (data) => {
            debug.log('OBS WebSocket identified:', data);
            this.updateStatus('connected');
            this.connected = true;
            this.getScenes();
            this.getStreamingStatus();
            
            // Test available methods to help debug
            setTimeout(() => {
                this.testOBSMethods();
            }, 2000);
            
            // Set up periodic streaming status refresh
            this.startStreamingStatusRefresh();
        });

        // OBS events
        this.obs.on('SceneListChanged', (data) => {
            debug.log('Scene list changed:', data);
            this.scenes = data.scenes || [];
            this.updateSceneSelect();
        });

        this.obs.on('CurrentProgramSceneChanged', (data) => {
            debug.log('Current scene changed:', data);
            this.currentScene = data.sceneName;
            this.updateSceneSelect(); // Refresh buttons to show active state
        });

        this.obs.on('StreamStateChanged', (data) => {
            debug.log('Stream state changed:', data);
            // Handle different OBS WebSocket versions
            if (data.outputState) {
                this.streaming = data.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED';
            } else if (data.streaming !== undefined) {
                this.streaming = data.streaming;
            } else if (data.active !== undefined) {
                this.streaming = data.active;
            }
            this.updateStreamButtons();
        });

        // Also listen for the older event name
        this.obs.on('SwitchScenes', (data) => {
            debug.log('Scene switched (old event):', data);
            this.currentScene = data.sceneName;
            this.updateSceneSelect(); // Refresh buttons to show active state
        });

        // Also listen for the older streaming event names
        this.obs.on('StreamStarting', () => {
            debug.log('Stream starting event received');
            this.streaming = true;
            this.updateStreamButtons();
        });

        this.obs.on('StreamStarted', () => {
            debug.log('Stream started event received');
            this.streaming = true;
            this.updateStreamButtons();
        });

        this.obs.on('StreamStopping', () => {
            debug.log('Stream stopping event received');
            this.streaming = false;
            this.updateStreamButtons();
        });

        this.obs.on('StreamStopped', () => {
            debug.log('Stream stopped event received');
            this.streaming = false;
            this.updateStreamButtons();
        });
    }

    parseWebSocketUrl(url) {
        if (!url) return;

        debug.log('Parsing OBS WebSocket URL:', url);

        try {
            let wsUrl = url;
            let password = null;
            let scenes = [];
            
            // Check if URL contains query parameters
            if (url.includes('?') || url.includes('&')) {
                const urlParts = url.split('?');
                wsUrl = urlParts[0];
                const queryString = urlParts[1] || '';
                
                debug.log('Base WebSocket URL:', wsUrl);
                debug.log('Query string:', queryString);
                
                // Parse all query parameters first
                const params = {};
                if (queryString) {
                    const paramPairs = queryString.split('&');
                    paramPairs.forEach(param => {
                const [key, value] = param.split('=');
                        debug.log('Processing parameter:', key, '=', value);
                        
                if (key === 'scenes') {
                            try {
                                // Handle empty or missing scenes parameter
                                if (!value || value.trim() === '' || value === '[]') {
                                    // No scenes specified - allow full control
                                    scenes = [];
                                    debug.log('No scenes specified - allowing full control');
                                } else {
                                    const sceneNames = JSON.parse(decodeURIComponent(value));
                                    // Check if the parsed result is empty or invalid
                                    if (!Array.isArray(sceneNames) || sceneNames.length === 0) {
                                        // Empty array or invalid data - allow full control
                                        scenes = [];
                                        debug.log('Empty or invalid scenes array - allowing full control');
                                    } else {
                                        // Valid scenes specified - store them for filtering
                                        scenes = sceneNames.filter(name => name !== null);
                                        debug.log('Scenes specified for restricted control:', scenes);
                                    }
                                }
                            } catch (e) {
                                debug.error('Error parsing scenes:', e);
                                // On parsing error, allow full control
                                scenes = [];
                                debug.log('Scene parsing error - allowing full control');
                            }
                } else if (key === 'pass') {
                            password = value;
                            debug.log('Parsed password:', password ? '***' : 'none');
                        }
                    });
                }
            }

            // Convert to WebSocket URL if needed
            if (!wsUrl.startsWith('ws://') && !wsUrl.startsWith('wss://')) {
                if (wsUrl.startsWith('http://')) {
                    wsUrl = wsUrl.replace('http://', 'ws://');
                } else if (wsUrl.startsWith('https://')) {
                    wsUrl = wsUrl.replace('https://', 'wss://');
                } else {
                    wsUrl = 'wss://' + wsUrl;
                }
                debug.log('Converted WebSocket URL:', wsUrl);
            }

            // Store the parsed components
            this.allowedScenes = scenes;
            
            debug.log('Final connection parameters:', {
                url: wsUrl,
                hasPassword: !!password,
                sceneCount: scenes.length,
                allowFullControl: scenes.length === 0
            });

            // Connect using the parsed WebSocket URL and password
            this.connect(wsUrl, password);
        } catch (error) {
            debug.error('Error parsing OBS WebSocket URL:', error);
        }
    }

    async connect(url, password) {
        debug.log('Attempting to connect to OBS WebSocket:', url);
        
        if (this.obs.identified) {
            debug.log('Closing existing OBS WebSocket connection');
            await this.obs.disconnect();
        }

        this.updateStatus('connecting');
        this.updateSceneSelect();

        try {
            debug.log('Creating new OBS WebSocket connection to:', url);
            
            const result = await this.obs.connect(url, password, {
                rpcVersion: 1
            });
            
            debug.log('OBS WebSocket connected successfully:', result);
            
        } catch (error) {
            debug.error('Error connecting to OBS WebSocket:', error);
            this.updateStatus('disconnected');
        }
    }

    async getScenes() {
        try {
            const result = await this.obs.call('GetSceneList');
            const allScenes = result.scenes || [];
            
            debug.log('All available scenes from OBS:', allScenes.map(s => s.sceneName));
            debug.log('Allowed scenes filter:', this.allowedScenes);
            
            // Filter scenes to only include those in the allowedScenes array
            if (this.allowedScenes.length > 0) {
                this.scenes = allScenes.filter(scene => 
                    this.allowedScenes.includes(scene.sceneName)
                );
                debug.log('Filtered scenes (restricted control):', this.scenes.map(s => s.sceneName));
            } else {
                // If no allowed scenes specified, use all scenes (full control)
                this.scenes = allScenes;
                debug.log('Using all scenes (full control):', this.scenes.map(s => s.sceneName));
            }
            
            // Get current scene
            try {
                const currentSceneResult = await this.obs.call('GetCurrentProgramScene');
                this.currentScene = currentSceneResult.currentProgramSceneName;
                debug.log('Current scene retrieved:', this.currentScene);
            } catch (error) {
                debug.log('Could not get current scene, using first scene as default');
                this.currentScene = this.scenes.length > 0 ? this.scenes[0].sceneName : '';
            }
            
            // Update the scene display with current scene information
            this.updateSceneSelect();
            debug.log('Scenes loaded with current scene:', this.currentScene);
            debug.log('Control mode:', this.allowedScenes.length > 0 ? 'Restricted' : 'Full');
            
            // Log detailed control mode information
            this.logControlMode();
        } catch (error) {
            debug.error('Error getting scenes:', error);
        }
    }

    async getStreamingStatus() {
        try {
            debug.log('Getting streaming status...');
            
            // Try different methods to get streaming status
            let result;
            try {
                result = await this.obs.call('GetStreamingStatus');
                debug.log('GetStreamingStatus result:', result);
            } catch (error) {
                debug.log('GetStreamingStatus failed, trying GetStreamStatus...');
                try {
                    result = await this.obs.call('GetStreamStatus');
                    debug.log('GetStreamStatus result:', result);
                } catch (error2) {
                    debug.log('GetStreamStatus failed, trying GetOutputStatus...');
                    result = await this.obs.call('GetOutputStatus', { outputName: 'default_stream' });
                    debug.log('GetOutputStatus result:', result);
                }
            }
            
            // Handle different response formats
            if (result.outputActive !== undefined) {
                this.streaming = result.outputActive;
            } else if (result.streaming !== undefined) {
                this.streaming = result.streaming;
            } else if (result.active !== undefined) {
                this.streaming = result.active;
            } else if (result.outputState) {
                this.streaming = result.outputState === 'OBS_WEBSOCKET_OUTPUT_STARTED';
            } else {
                debug.log('Unknown streaming status format:', result);
                this.streaming = false;
            }
            
            this.updateStreamButtons();
            debug.log('Streaming status updated:', this.streaming);
            
        } catch (error) {
            debug.error('Error getting streaming status:', error);
            // Set to false if we can't get the status
            this.streaming = false;
            this.updateStreamButtons();
        }
    }

    async switchScene(sceneName) {
        if (!this.connected || !sceneName) return;

        try {
            await this.obs.call('SetCurrentProgramScene', { sceneName });
            this.currentScene = sceneName;
            debug.log('Switched to scene:', sceneName);
            
            // Update the display to reflect the new current scene
            this.updateSceneSelect();
        } catch (error) {
            debug.error('Error switching scene:', error);
        }
    }

    async toggleStream() {
        if (!this.connected) {
            debug.log('Cannot toggle stream: not connected');
            return;
        }

        try {
            debug.log('Toggling stream...');
            
            if (this.streaming) {
                await this.stopStream();
            } else {
                await this.startStream();
            }
            
        } catch (error) {
            debug.error('Error toggling stream:', error);
            this.updateStreamButtons();
        }
    }

    async startStream() {
        // Update button to show "Starting..."
        if (this.streamToggleBtn) {
            this.streamToggleBtn.textContent = 'Starting...';
            this.streamToggleBtn.disabled = true;
        }

        try {
            debug.log('Starting stream...');
            
            // Try different methods for starting stream
            try {
                await this.obs.call('StartStreaming');
                debug.log('StartStreaming command sent successfully');
            } catch (error) {
                debug.log('StartStreaming failed, trying StartStream...');
                try {
                    await this.obs.call('StartStream');
                    debug.log('StartStream command sent successfully');
                } catch (error2) {
                    debug.log('StartStream failed, trying StartOutput...');
                    await this.obs.call('StartOutput', { outputName: 'default_stream' });
                    debug.log('StartOutput command sent successfully');
                }
            }
            
            // Force update streaming status after a short delay
            setTimeout(() => {
                this.getStreamingStatus();
            }, 1000);
            
        } catch (error) {
            debug.error('Error starting stream:', error);
            // Reset button on error
            this.updateStreamButtons();
        }
    }

    async stopStream() {
        // Update button to show "Stopping..."
        if (this.streamToggleBtn) {
            this.streamToggleBtn.textContent = 'Stopping...';
            this.streamToggleBtn.disabled = true;
        }

        try {
            debug.log('Stopping stream...');
            
            // Try different methods for stopping stream
            try {
                await this.obs.call('StopStreaming');
                debug.log('StopStreaming command sent successfully');
            } catch (error) {
                debug.log('StopStreaming failed, trying StopStream...');
                try {
                    await this.obs.call('StopStream');
                    debug.log('StopStream command sent successfully');
                } catch (error2) {
                    debug.log('StopStream failed, trying StopOutput...');
                    await this.obs.call('StopOutput', { outputName: 'default_stream' });
                    debug.log('StopOutput command sent successfully');
                }
            }
            
            // Force update streaming status after a short delay
            setTimeout(() => {
                this.getStreamingStatus();
            }, 1000);
            
        } catch (error) {
            debug.error('Error stopping stream:', error);
            // Reset button on error
            this.updateStreamButtons();
        }
    }

    updateStatus(status) {
        if (this.connectionStatus) {
            this.connectionStatus.textContent = status.charAt(0).toUpperCase() + status.slice(1);
            this.connectionStatus.className = `status-indicator ${status}`;
        }
    }

    updateSceneSelect() {
        if (!this.sceneButtonsContainer || !this.sceneDropdownContainer) return;

        debug.log('Updating scene select with current scene:', this.currentScene);
        debug.log('Control mode:', this.allowedScenes.length > 0 ? 'Restricted' : 'Full');

        // Clear existing buttons and dropdown
        this.sceneButtonsContainer.innerHTML = '';
        this.sceneSelect.innerHTML = '';

        const isConnected = this.connected && this.scenes.length > 0;
        const useButtons = this.scenes.length <= this.maxSceneButtons;

        if (useButtons) {
            // Show buttons, hide dropdown
            this.sceneButtonsContainer.style.display = 'flex';
            this.sceneDropdownContainer.classList.remove('show');

            if (this.scenes.length === 0) {
                const noScenesMsg = document.createElement('div');
                noScenesMsg.textContent = 'No scenes available';
                noScenesMsg.style.color = '#666';
                noScenesMsg.style.fontSize = '12px';
                this.sceneButtonsContainer.appendChild(noScenesMsg);
            } else {
                this.scenes.forEach(scene => {
                    const button = document.createElement('button');
                    button.className = 'scene-btn';
                    button.textContent = scene.sceneName;
                    button.disabled = !isConnected;
                    
                    // Mark current scene as active
                    if (scene.sceneName === this.currentScene) {
                        button.classList.add('active');
                        debug.log('Marking scene as active:', scene.sceneName);
                    }
                    
                    button.addEventListener('click', () => {
                        this.switchScene(scene.sceneName);
                    });
                    
                    this.sceneButtonsContainer.appendChild(button);
                });
            }
        } else {
            // Show dropdown, hide buttons
            this.sceneButtonsContainer.style.display = 'none';
            this.sceneDropdownContainer.classList.add('show');

        if (this.scenes.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No scenes available';
            this.sceneSelect.appendChild(option);
        } else {
            this.scenes.forEach(scene => {
                const option = document.createElement('option');
                option.value = scene.sceneName;
                option.textContent = scene.sceneName;
                    if (scene.sceneName === this.currentScene) {
                        option.selected = true;
                        debug.log('Marking dropdown option as selected:', scene.sceneName);
                    }
                this.sceneSelect.appendChild(option);
            });
            }
            
            this.sceneSelect.disabled = !isConnected;
        }
    }

    updateStreamButtons() {
        const toggleBtn = this.streamToggleBtn;
        
        if (toggleBtn) {
            const toggleDisabled = !this.connected;
            toggleBtn.disabled = toggleDisabled;
            
            if (this.streaming) {
                toggleBtn.textContent = 'Stop Stream';
            } else {
                toggleBtn.textContent = 'Start Stream';
            }
        }
        
        debug.log('Stream toggle updated:', {
            connected: this.connected,
            streaming: this.streaming,
            toggleDisabled: !this.connected,
            toggleBtnExists: !!toggleBtn
        });
    }

    loadConfigFromUrl() {
        // Skip loading if we're currently updating the URL
        if (window._updatingUrl) {
            debug.log('Skipping loadConfigFromUrl - URL is being updated');
            return;
        }
        
        const params = new URLSearchParams(window.location.search);
        debug.log("loadConfigFromUrl called with params:", params);

        // VDO Ninja link (double decode)
        const vdoLink = params.get('vdo');
        if (vdoLink) {
            let decodedVdoLink = decodeURIComponent(vdoLink);
            if (decodedVdoLink.includes('%')) {
                decodedVdoLink = decodeURIComponent(decodedVdoLink);
            }
            document.getElementById('VideoURL').value = decodedVdoLink;
            document.getElementById('feed').src = decodedVdoLink;
        }

        // OBS VDO Ninja link (double decode)
        const obsLink = params.get('obs');
        if (obsLink) {
            let decodedObsLink = decodeURIComponent(obsLink);
            if (decodedObsLink.includes('%')) {
                decodedObsLink = decodeURIComponent(decodedObsLink);
            }
            document.getElementById('ObsVdoUrl').value = decodedObsLink;
            document.getElementById('obs').src = decodedObsLink;
        }

        // Chat URL
        const chatUrl = params.get('chat_url');
        if (chatUrl) {
            const decodedChatUrl = decodeURIComponent(chatUrl);
            document.getElementById('ChatUrl').value = decodedChatUrl;
            document.getElementById('chat').src = decodedChatUrl;
        }

        // Stone size
        const stoneSize = params.get('stone');
        if (stoneSize) document.getElementById('StoneSize').value = stoneSize;

        // Grid corners
        const grid = params.get('grid');
        if (grid && overlay) {
            overlay.points = grid.split(';').map(pt => pt.split(',').map(Number));
            if (overlay.points.length === 4) {
                overlay.grid = overlay.generateGrid(overlay.points);
                overlay.isGridSet = true;
            }
        }

        // Set grid to show for 3 seconds, then hide
        if (window.overlay) {
            overlay.show = true;
            overlay.updateGridButtonState();
            setTimeout(() => {
                overlay.show = false;
                overlay.updateGridButtonState();
            }, 3000);
        } else {
            // If overlay isn't ready yet, set a flag to do this after overlay is created
            window._pendingGridAutoHide = true;
        }

        // OBS WebSocket
        const obsWebSocket = params.get('obs_ws');
        if (obsWebSocket) {
            let decodedWebSocket = decodeURIComponent(obsWebSocket);
            if (decodedWebSocket.includes('%')) {
                decodedWebSocket = decodeURIComponent(decodedWebSocket);
            }
            
            // Only update the input field if it's empty or different from the current value
            // This prevents the input from being modified when the user is actively editing it
            const currentInput = document.getElementById('ObsWebSocket');
            if (currentInput && (currentInput.value === '' || currentInput.value !== decodedWebSocket)) {
                currentInput.value = decodedWebSocket;
            }
            
            // Trigger OBS connection if the controller is available
            if (window.obsController) {
                debug.log('Triggering OBS connection from URL parameter');
                window.obsController.parseWebSocketUrl(decodedWebSocket);
            } else {
                // If controller isn't ready yet, set a flag to connect after initialization
                window._pendingObsConnection = decodedWebSocket;
            }
        }
    }

    logControlMode() {
        debug.log('=== OBS CONTROL MODE ===');
        debug.log('Allowed scenes:', this.allowedScenes);
        debug.log('Total scenes available:', this.scenes.length);
        debug.log('Current scene:', this.currentScene);
        debug.log('Control mode:', this.allowedScenes.length > 0 ? 'Restricted' : 'Full');
        
        if (this.allowedScenes.length > 0) {
            debug.log('Restricted control - only these scenes are accessible:');
            this.allowedScenes.forEach(scene => {
                const isAvailable = this.scenes.some(s => s.sceneName === scene);
                debug.log(`  ${scene}: ${isAvailable ? 'AVAILABLE' : 'NOT FOUND'}`);
            });
        } else {
            debug.log('Full control - all scenes are accessible');
        }
        debug.log('=== END CONTROL MODE ===');
    }

    async testOBSMethods() {
        debug.log('Testing OBS WebSocket methods...');
        
        try {
            // Test getting version info
            const version = await this.obs.call('GetVersion');
            debug.log('OBS Version:', version);
            
            // Test getting stats
            const stats = await this.obs.call('GetStats');
            debug.log('OBS Stats:', stats);
            
        } catch (error) {
            debug.error('Error testing OBS methods:', error);
        }
    }

    startStreamingStatusRefresh() {
        debug.log('Starting streaming status refresh...');
        this.stopStreamingStatusRefresh(); // Clear any existing interval
        
        this.streamingStatusInterval = setInterval(() => {
            if (this.connected) {
                this.getStreamingStatus();
            }
        }, 5000); // Check every 5 seconds
    }

    stopStreamingStatusRefresh() {
        if (this.streamingStatusInterval) {
            debug.log('Stopping streaming status refresh...');
            clearInterval(this.streamingStatusInterval);
            this.streamingStatusInterval = null;
        }
    }
}

function main() {
    window.onload = () => {
        // 1. Create overlay and drawingLayer first!
        if (!isEventSet) {
        overlay = new Canvas("overlay");
            drawingLayer = new DrawingLayer("drawingLayer");
        isEventSet = true;
    }

        // 2. Now load config from URL (overlay is defined)
        loadConfigFromUrl();

        // 3. If grid auto-hide was pending, do it now
        if (window._pendingGridAutoHide) {
            overlay.show = true;
            overlay.updateGridButtonState();
            setTimeout(() => {
                overlay.show = false;
                overlay.updateGridButtonState();
            }, 3000);
            window._pendingGridAutoHide = false;
        }

        // 4. Set up UIManager, IframeManager, etc.
        const iframeManager = new IframeManager();
        const uiManager = new UIManager(iframeManager);
        const obsController = new OBSController();
        
        // Make OBS controller globally accessible for URL generation
        window.obsController = obsController;

        // Handle any pending OBS connection from URL parameters
        if (window._pendingObsConnection) {
            debug.log('Processing pending OBS connection');
            obsController.parseWebSocketUrl(window._pendingObsConnection);
            window._pendingObsConnection = null;
        }

        // 5. Start animation loop
    let overlayLoop = () => {
        requestAnimationFrame(overlayLoop);
        overlay.tick();
    };
    overlayLoop();
    updateSidePanelVisibility();
    };
}

function updateShareableUrl() {
    // Set a flag to prevent loadConfigFromUrl from being called during URL updates
    window._updatingUrl = true;
    
    const params = new URLSearchParams();

    // Only chat_url param for chat
    const chatUrl = document.getElementById('ChatUrl').value;
    if (chatUrl) params.set('chat_url', encodeURIComponent(chatUrl));

    if (overlay && overlay.points && overlay.points.length === 4) {
        params.set('grid', overlay.points.map(pt => pt.map(Number).map(n => Math.round(n)).join(',')).join(';'));
    }

    // Add vdo param last
    const vdoLink = document.getElementById('VideoURL').value;
    if (vdoLink) {
        params.set('vdo', encodeURIComponent(encodeURIComponent(vdoLink)));
    }
    // Add obs param last
    const obsLink = document.getElementById('ObsVdoUrl').value;
    if (obsLink) {
        params.set('obs', encodeURIComponent(encodeURIComponent(obsLink)));
    }
    // Add obs_ws param last
    const obsWebSocket = document.getElementById('ObsWebSocket').value;
    if (obsWebSocket) {
        // Use the original WebSocket URL without modification
        let formattedUrl = obsWebSocket;
        
        // Only add scenes parameter if we're in restricted control mode
        if (window.obsController && window.obsController.allowedScenes && window.obsController.allowedScenes.length > 0) {
            const scenesParam = encodeURIComponent(JSON.stringify(window.obsController.allowedScenes));
            formattedUrl += `&scenes=${scenesParam}`;
            debug.log('Adding scenes parameter to shareable URL (restricted control):', window.obsController.allowedScenes);
        } else {
            debug.log('No scenes parameter added to shareable URL (full control mode)');
        }
        
        // Note: We don't include the password in the shareable URL for security
        // The password should be entered manually by the user
        
        params.set('obs_ws', encodeURIComponent(encodeURIComponent(formattedUrl)));
    }
    let url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', url);
    
    // Clear the flag after a short delay to allow normal URL loading
    setTimeout(() => {
        window._updatingUrl = false;
    }, 100);
}

function loadConfigFromUrl() {
    // Skip loading if we're currently updating the URL
    if (window._updatingUrl) {
        debug.log('Skipping loadConfigFromUrl - URL is being updated');
        return;
    }
    
    const params = new URLSearchParams(window.location.search);
    debug.log("loadConfigFromUrl called with params:", params);

    // VDO Ninja link (double decode)
    const vdoLink = params.get('vdo');
    if (vdoLink) {
        let decodedVdoLink = decodeURIComponent(vdoLink);
        if (decodedVdoLink.includes('%')) {
            decodedVdoLink = decodeURIComponent(decodedVdoLink);
        }
        document.getElementById('VideoURL').value = decodedVdoLink;
        document.getElementById('feed').src = decodedVdoLink;
    }

    // OBS VDO Ninja link (double decode)
    const obsLink = params.get('obs');
    if (obsLink) {
        let decodedObsLink = decodeURIComponent(obsLink);
        if (decodedObsLink.includes('%')) {
            decodedObsLink = decodeURIComponent(decodedObsLink);
        }
        document.getElementById('ObsVdoUrl').value = decodedObsLink;
        document.getElementById('obs').src = decodedObsLink;
    }

    // Chat URL
    const chatUrl = params.get('chat_url');
    if (chatUrl) {
        const decodedChatUrl = decodeURIComponent(chatUrl);
        document.getElementById('ChatUrl').value = decodedChatUrl;
        document.getElementById('chat').src = decodedChatUrl;
    }

    // Stone size
    const stoneSize = params.get('stone');
    if (stoneSize) document.getElementById('StoneSize').value = stoneSize;

    // Grid corners
    const grid = params.get('grid');
    if (grid && overlay) {
        overlay.points = grid.split(';').map(pt => pt.split(',').map(Number));
        if (overlay.points.length === 4) {
            overlay.grid = overlay.generateGrid(overlay.points);
            overlay.isGridSet = true;
        }
    }

    // Set grid to show for 3 seconds, then hide
    if (window.overlay) {
        overlay.show = true;
        overlay.updateGridButtonState();
        setTimeout(() => {
            overlay.show = false;
            overlay.updateGridButtonState();
        }, 3000);
    } else {
        // If overlay isn't ready yet, set a flag to do this after overlay is created
        window._pendingGridAutoHide = true;
    }

    // OBS WebSocket
    const obsWebSocket = params.get('obs_ws');
    if (obsWebSocket) {
        let decodedWebSocket = decodeURIComponent(obsWebSocket);
        if (decodedWebSocket.includes('%')) {
            decodedWebSocket = decodeURIComponent(decodedWebSocket);
        }
        
        // Only update the input field if it's empty or different from the current value
        // This prevents the input from being modified when the user is actively editing it
        const currentInput = document.getElementById('ObsWebSocket');
        if (currentInput && (currentInput.value === '' || currentInput.value !== decodedWebSocket)) {
            currentInput.value = decodedWebSocket;
        }
        
        // Trigger OBS connection if the controller is available
        if (window.obsController) {
            debug.log('Triggering OBS connection from URL parameter');
            window.obsController.parseWebSocketUrl(decodedWebSocket);
        } else {
            // If controller isn't ready yet, set a flag to connect after initialization
            window._pendingObsConnection = decodedWebSocket;
        }
    }
}

window.addEventListener('DOMContentLoaded', () => {
    // Attach updateShareableUrl to relevant inputs
    ['VideoURL', 'ChatUrl', 'StoneSize', 'ObsWebSocket', 'ObsVdoUrl'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateShareableUrl);
    });
    // Chat URL input updates chat iframe
    const chatInput = document.getElementById('ChatUrl');
    if (chatInput) {
        chatInput.addEventListener('input', (e) => {
            document.getElementById('chat').src = e.target.value;
            updateSidePanelVisibility();
        });
    }
    // Video URL input updates feed iframe
    const videoInput = document.getElementById('VideoURL');
    if (videoInput) {
        videoInput.addEventListener('input', (e) => {
            document.getElementById('feed').src = e.target.value;
            updateSidePanelVisibility();
        });
    }
    // OBS URL input updates OBS iframe
    const obsInput = document.getElementById('ObsVdoUrl');
    if (obsInput) {
        obsInput.addEventListener('input', (e) => {
            document.getElementById('obs').src = e.target.value;
            updateSidePanelVisibility();
        });
    }
    // Keybindings
    document.addEventListener('keydown', (e) => {
        // Don't trigger shortcuts if user is typing in any input field
        const activeElement = document.activeElement;
        
        // Debug logging for input field detection
        debug.log('=== KEYBOARD DEBUG ===');
        debug.log('Key pressed:', e.key);
        debug.log('Active element:', activeElement);
        debug.log('Active element tagName:', activeElement ? activeElement.tagName : 'null');
        debug.log('Active element type:', activeElement ? activeElement.type : 'null');
        debug.log('Active element contentEditable:', activeElement ? activeElement.contentEditable : 'null');
        
        // Check if we're in any kind of input field
        const isInputField = activeElement && (
            activeElement.tagName === 'INPUT' || 
            activeElement.tagName === 'TEXTAREA' || 
            activeElement.tagName === 'SELECT' ||
            activeElement.contentEditable === 'true' ||
            activeElement.contentEditable === 'plaintext-only' ||
            activeElement.role === 'textbox' ||
            activeElement.role === 'searchbox' ||
            activeElement.role === 'combobox'
        );
        
        debug.log('Is input field:', isInputField);
        
        if (isInputField) {
            debug.log('BLOCKING shortcut - user is typing in input field');
            return; // Don't trigger shortcuts when typing in inputs - allow normal typing
        }
        
        // Check if we're focused on the canvas/overlay or main feed area
        const mainFeedGroup = document.querySelector('.MainFeed');
        const overlayCanvas = document.getElementById('overlay');
        const drawingLayer = document.getElementById('drawingLayer');
        
        const isCanvasFocused = activeElement === overlayCanvas || 
                               activeElement === drawingLayer ||
                               (mainFeedGroup && mainFeedGroup.contains(activeElement));
        
        debug.log('Is canvas focused:', isCanvasFocused);
        
        if (!isCanvasFocused) {
            debug.log('BLOCKING shortcut - not focused on canvas');
            return; // Don't trigger shortcuts when not focused on canvas/overlay
        }
        
        debug.log('ALLOWING shortcut');
        
        // Only handle specific shortcuts and prevent default only for those
        if (e.key === 's') {
            debug.log('Toggling grid visibility');
            e.preventDefault(); // Prevent default only for handled shortcuts
            overlay.show = !overlay.show;
            overlay.updateGridButtonState();
        } else if (e.key === 'r') {
            debug.log('Resetting grid');
            e.preventDefault(); // Prevent default only for handled shortcuts
            overlay.resetGrid();
        }
        
        debug.log('=== END KEYBOARD DEBUG ===');
    });

    // Initialize LetterBtn with 'A' instead of emoji
    const letterBtn = document.getElementById('LetterBtn');
    if (letterBtn) {
        letterBtn.textContent = 'A';
    }
});

function updateSidePanelVisibility() {
    const obsIframe = document.getElementById('obs');
    const chatIframe = document.getElementById('chat');
    const obsControls = document.querySelector('.OBS_Controls');
    const chatDiv = document.querySelector('.Chat');
    const sidePanel = document.querySelector('.SidePanel');
    let obsVisible = !!(obsIframe && obsIframe.src && obsIframe.src.trim());
    let chatVisible = !!(chatIframe && chatIframe.src && chatIframe.src.trim());
    if (obsControls) obsControls.style.display = obsVisible ? '' : 'none';
    if (chatDiv) chatDiv.style.display = chatVisible ? '' : 'none';
    if (sidePanel) sidePanel.style.display = (obsVisible || chatVisible) ? '' : 'none';
}

main();