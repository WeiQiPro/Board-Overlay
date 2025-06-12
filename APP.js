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
        "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; camera; microphone",
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
            case 'LETTER':
                this.context.strokeStyle = 'black';
                this.context.lineWidth = 3;
                this.context.strokeText(text, x - 8, y + 8);
                this.context.fillText(text, x - 8, y + 8);
                break;
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
        this.initializeCanvas();
        this.stones = []; // For black and white stones (variations)
        this.boardStones = []; // For board stones (empty positions)
        this.grid = [];
        this.points = [];
        this.isGridSet = false;
        this.currentColor = "BLACK";
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
        document.addEventListener("keydown", (event) => {
            if (event.code === "Space") {
                if (window.drawingLayer) {
                    drawingLayer.clearCanvas();
                }
                event.preventDefault();
            }
            this.handleKeyDown(event);
        });
    }

    updateGridButtonState() {
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
        if (this.grid && this.show) {
            for (let i = 0; i < this.grid.length; i++) {
                for (let j = 0; j < this.grid[i].length; j++) {
                    const point = this.grid[i][j];
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
            console.log(cx, cy);
            this.points.push([cx, cy]);
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
                const text = currentTool === 'LETTER' ? document.getElementById('letterSelect').value : '';
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

                grid[i][j] = bilinearInterpolation(
                    xFraction,
                    yFraction,
                    points,
                );
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

        // Handle chat parameters
        if (params.has('chat_platform') && params.has('chat_id')) {
            const platform = params.get('chat_platform');
            const channelId = params.get('chat_id');
            this.setChatUrl(platform, channelId);
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

    setUrl(element, url) {
        if (!this.iframes[element]) {
            console.error(`Invalid iframe element: ${element}`);
            return;
        }

        this.iframes[element].src = url;
        this.iframes[element].allow = CONST.ALLOW;
        this.iframes[element].muted = CONST.TRUE;
        this.iframes[element].frameborder = CONST.ZERO;
        this.iframes[element].allowfullscreen = CONST.TRUE;
        this.iframes[element].style.border = CONST.NONE;
        this.iframes[element].style.boxShadow = "10px 10px 10px 10px rgba(0, 0, 0, 0.6)";

        const vdoLinkElement = document.getElementById("vdo_link");
        if (element === 'feed' && vdoLinkElement) {
            vdoLinkElement.innerText = url;
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

    setChatUrl(platform, channelId) {
        if (!channelId) {
            document.querySelector('.SidePanel').style.display = 'none';
            return;
        }
        
        let url;
        console.log("setChatUrl called with platform:", platform, "and channelId:", channelId);
        
        switch (platform.toLowerCase()) {
            case 'twitch':
                startTwitchChat(channelId);
                break;
            case 'youtube':
                url = `https://www.youtube.com/live_chat?v=${channelId}&embed_domain=${window.location.hostname}`;
                this.setUrl('chat', url);
                document.querySelector('.SidePanel').style.display = 'flex';
                break;
            default:
                console.error(`Unsupported chat platform: ${platform}`);
                return;
        }
    }

    generateShareableUrl(roomId, chatPlatform = null, chatId = null, isCommentator = false) {
        const params = new URLSearchParams();
        console.log("generateShareableUrl called with roomId:", roomId, "chatPlatform:", chatPlatform, "chatId:", chatId, "isCommentator:", isCommentator);
        if (roomId) {
            if (isCommentator) {
                params.append('commentator', 'true');
                params.append('room', roomId);
            } else {
                params.append('vdo_link', `${this.vdoNinjaBase}view=${roomId}${CONST.APPEND.CONTROLS}`);
            }
        }
        
        if (chatPlatform && chatId) {
            params.append('chat_platform', chatPlatform);
            params.append('chat_id', chatId);
        }
        
        return `${window.location.origin}${window.location.pathname}?${params.toString()}`;
    }
}

class Video {
    constructor(source, iframe, link = false) {
        console.log("Video Constructor called with source:", source);
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
        const url = this.iframeManager.generateShareableUrl(
            document.getElementById('VideoURL').value,
            this.chatPlatform.value,
            this.chatChannelId.value,
            !!this.commentatorRoom.value
        );
        this.shareUrl.value = url;
    }
}

class UIManager {
    constructor(iframeManager) {
        this.iframeManager = iframeManager;
        this.reviewPanel = document.getElementById('reviewPanel');
        this.settingsPanel = document.getElementById('settingsPanel');
        this.toggleReview = document.getElementById('toggleReview');
        this.toggleSettings = document.getElementById('toggleSettings');
        this.gridElement = document.getElementById('GridElement');
        
        // Chat inputs
        this.twitchId = document.getElementById('twitchId');
        this.youtubeId = document.getElementById('youtubeId');
        this.setTwitchBtn = document.getElementById('setTwitchBtn');
        this.setYoutubeBtn = document.getElementById('setYoutubeBtn');
        
        this.bindEventListeners();
    }

    bindEventListeners() {
        // Toggle panels
        this.toggleReview.addEventListener('click', () => {
            this.togglePanel('review');
        });

        this.toggleSettings.addEventListener('click', () => {
            this.togglePanel('settings');
        });

        // Grid toggle
        const gridBtn = document.getElementById('GridElement');
        if (gridBtn) {
            gridBtn.addEventListener('click', () => {
                overlay.show = !overlay.show;
                overlay.updateGridButtonState();
            });
        }

        // Chat settings
        this.setTwitchBtn.addEventListener('click', () => {
            if (this.twitchId.value) {
                this.iframeManager.setChatUrl('twitch', this.twitchId.value);
            }
        });

        this.setYoutubeBtn.addEventListener('click', () => {
            if (this.youtubeId.value) {
                this.iframeManager.setChatUrl('youtube', this.youtubeId.value);
            }
        });

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
        document.getElementById('StoneSize').addEventListener('change', (e) => {
            if (overlay) {
                overlay.stones_radius = e.target.value;
            }
        });

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
            });
        }

        // Update shareable URL on input changes
        ['VideoURL', 'twitchId', 'youtubeId', 'StoneSize'].forEach(id => {
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
        const isReview = type === 'review';
        const targetPanel = isReview ? this.reviewPanel : this.settingsPanel;
        const otherPanel = isReview ? this.settingsPanel : this.reviewPanel;
        const targetBtn = isReview ? this.toggleReview : this.toggleSettings;
        const otherBtn = isReview ? this.toggleSettings : this.toggleReview;

        if (targetPanel.classList.contains('hidden')) {
            otherPanel.classList.add('hidden');
            otherBtn.classList.remove('active');
            targetPanel.classList.remove('hidden');
            targetBtn.classList.add('active');
        } else {
            targetPanel.classList.add('hidden');
            targetBtn.classList.remove('active');
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

        // 5. Start animation loop
    let overlayLoop = () => {
        requestAnimationFrame(overlayLoop);
        overlay.tick();
    };
    overlayLoop();
    };
}

// Helper to get channel from URL (?ttv=channelname)
function getTwitchChannelFromURL() {
  const params = new URLSearchParams(window.location.search);
  return params.get('ttv');
}

let twitchClient = null;

// Track the current connected channel and WebSocket globally
let currentTwitchChannel = null;
let currentTwitchWs = null;

function connectTwitchChat(channel) {
  if (typeof tmi === 'undefined') {
    console.error('tmi.js is not loaded! Twitch chat will not work.');
    return;
  }
  if (twitchClient) {
    twitchClient.disconnect();
  }
  twitchClient = new tmi.Client({
    channels: [channel]
  });
  twitchClient.connect();

  const chatMessages = document.getElementById('twitch-chat-messages');
  chatMessages.innerHTML = '';

  twitchClient.on('message', (channel, tags, message, self) => {
    const msgDiv = document.createElement('div');
    msgDiv.innerHTML = `<span style="color:#a970ff;font-weight:bold;">${tags['display-name'] || tags.username}:</span> <span>${message}</span>`;
    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// On page load, connect if ttv param is present
const urlChannel = getTwitchChannelFromURL();
if (urlChannel && urlChannel.trim() !== '') {
  document.getElementById('twitchId').value = urlChannel;
  startTwitchChat(urlChannel);
}

// Allow user to join a channel via input
document.getElementById('setTwitchBtn').addEventListener('click', () => {
  const channel = document.getElementById('twitchId').value.trim();
  if (channel) {
    startTwitchChat(channel);
  }
});

function updateShareableUrl() {
    const params = new URLSearchParams();

    // All params except vdo/obs
    const ttv = document.getElementById('twitchId').value;
    if (ttv) params.set('ttv', ttv);

    const ytb = document.getElementById('youtubeId').value;
    if (ytb) params.set('ytb', ytb);

    const stoneSize = document.getElementById('StoneSize').value;
    if (stoneSize) params.set('stone', stoneSize);

    if (overlay && overlay.points && overlay.points.length === 4) {
        params.set('grid', overlay.points.map(pt => pt.join(',')).join(';'));
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
    let url = `${window.location.pathname}?${params.toString()}`;
    window.history.replaceState({}, '', url);
}

function loadConfigFromUrl() {
    const params = new URLSearchParams(window.location.search);
    console.log("loadConfigFromUrl called with params:", params);

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

    // Twitch
    const ttv = params.get('ttv');
    if (ttv) document.getElementById('twitchId').value = ttv;

    // YouTube
    const ytb = params.get('ytb');
    if (ytb) document.getElementById('youtubeId').value = ytb;

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
}

window.addEventListener('DOMContentLoaded', () => {
    // Attach updateShareableUrl to relevant inputs
    ['VideoURL', 'twitchId', 'youtubeId', 'StoneSize'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', updateShareableUrl);
    });
    // Copy to clipboard
    const copyBtn = document.getElementById('copyShareUrl');
    if (copyBtn) {
        copyBtn.addEventListener('click', () => {
            navigator.clipboard.writeText(window.location.href);
            alert('Shareable URL copied!');
        });
    }
    // Video connect button: set feed src directly from input
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
    // Start Twitch chat
    autoStartTwitchChat();
    // Add event listener for ObsVdoButton
    const obsBtn = document.getElementById('ObsVdoButton');
    if (obsBtn) {
        obsBtn.addEventListener('click', () => {
            const obsLink = document.getElementById('ObsVdoUrl').value.trim();
            if (obsLink) {
                document.getElementById('obs').src = obsLink;
                updateShareableUrl();
            }
        });
    }
});

main();

function startTwitchChat(channel) {
    if (!channel) return;
    // Prevent double connection to the same channel
    if (currentTwitchChannel === channel && currentTwitchWs) return;
    currentTwitchChannel = channel;
    
    // Clear existing chat
    const chatContainer = document.getElementById('twitch-chat-panel');
    chatContainer.innerHTML = '';
    
    // Close previous WebSocket if open
    if (currentTwitchWs) {
        try { currentTwitchWs.close(); } catch (e) {}
        currentTwitchWs = null;
    }
    
    let ws = null;
    const stoneColors = ['black', 'white', 'red', 'blue', 'green', 'yellow', 'purple'];
    const userStones = new Map();
    
    // Show side panel when chat is active
    document.querySelector('.SidePanel').style.display = 'flex';

    function connect() {
        try {
            ws = new WebSocket('wss://irc-ws.chat.twitch.tv:443');
            currentTwitchWs = ws;
            ws.onopen = () => {
                ws.send('PASS SCHMOOPIIE');
                ws.send('NICK justinfan12345');
                ws.send(`JOIN #${channel}`);
            };
            ws.onmessage = (event) => handleMessage(event.data);
            ws.onclose = () => {
                addMessage('System', 'Disconnected from chat. Attempting to reconnect...', 'error');
                setTimeout(connect, 5000);
            };
            ws.onerror = (error) => {
                addMessage('System', 'Connection error. Retrying...', 'error');
            };
        } catch (error) {
            addMessage('System', 'Failed to connect to Twitch chat. Retrying...', 'error');
            setTimeout(connect, 5000);
        }
    }

    function handleMessage(rawMessage) {
        const lines = rawMessage.split('\r\n');
        for (const line of lines) {
            if (!line) continue;
            if (line.startsWith('PING')) {
                ws.send('PONG :tmi.twitch.tv');
                continue;
            }
            if (line.includes('Welcome, GLHF!')) {
                addMessage('System', `Connected to ${channel}'s chat!`);
                continue;
            }
            const privmsgMatch = line.match(/:(\w+)!\w+@\w+\.tmi\.twitch\.tv PRIVMSG #\w+ :(.+)/);
            if (privmsgMatch) {
                const [, username, message] = privmsgMatch;
                addMessage(username, message);
            }
        }
    }

    function addMessage(username, message, type = 'normal') {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message';
        if (type === 'error') {
            messageDiv.style.borderLeftColor = '#ff6b6b';
        }
        let stoneColor = 'black';
        if (username !== 'System') {
            if (!userStones.has(username)) {
                stoneColor = stoneColors[Math.floor(Math.random() * stoneColors.length)];
                userStones.set(username, stoneColor);
            } else {
                stoneColor = userStones.get(username);
            }
        }
        const stoneDiv = document.createElement('div');
        stoneDiv.className = `go-stone ${stoneColor}`;
        const contentDiv = document.createElement('div');
        contentDiv.className = 'message-content';
        const usernameSpan = document.createElement('span');
        usernameSpan.className = 'username';
        usernameSpan.textContent = username + ':';
        const messageSpan = document.createElement('span');
        messageSpan.className = type === 'error' ? 'message-text error' : 'message-text';
        messageSpan.textContent = message;
        const timestampSpan = document.createElement('span');
        timestampSpan.className = 'timestamp';
        timestampSpan.textContent = new Date().toLocaleTimeString();
        contentDiv.appendChild(usernameSpan);
        contentDiv.appendChild(messageSpan);
        contentDiv.appendChild(timestampSpan);
        messageDiv.appendChild(stoneDiv);
        messageDiv.appendChild(contentDiv);
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
        const messages = chatContainer.querySelectorAll('.message');
        if (messages.length > 100) {
            messages[0].remove();
        }
    }

    connect();
}

// Start chat with channel from input or URL param
function autoStartTwitchChat() {
    let channel = getTwitchChannelFromURL();
    if (!channel) {
        const input = document.getElementById('twitchId');
        if (input && input.value) {
            channel = input.value;
        }
    }
    if (channel) {
        startTwitchChat(channel);
    } else {
        // Hide side panel if no chat is active
        document.querySelector('.SidePanel').style.display = 'none';
    }
}