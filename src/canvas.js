class Canvas {
  constructor(element) {
    this.canvas = document.getElementById(element);
    this.context = this.canvas.getContext('2d');
    this.initializeCanvas();
    this.stones = [];
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
    this.drawStones();
    this.markLastStone();
  }

  updateStonesRadius() {
    this.stones_radius = document.getElementById('stonesize').value;
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
    let { left, top } = this.canvas.getBoundingClientRect();
    let [x, y] = this.getCanvasCoords(event.clientX - left, event.clientY - top);

    if (event.button === 0) { // Left click
      this.stones.push([x, y, STONES.BLACK]);
    } else if (event.button === 2) { // Right click
      this.stones.push([x, y, STONES.WHITE]);
    }

    this.checkForOverlappingStones();
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
    return distance < this.stones_radius; // Assuming radius as the criterion for overlap
  }

  getCanvasCoords(clientX, clientY) {
    let { width, height } = this.canvas.getBoundingClientRect();
    let scaleX = this.canvas.width / width;
    let scaleY = this.canvas.height / height;
    return [clientX * scaleX, clientY * scaleY];
  }
}
