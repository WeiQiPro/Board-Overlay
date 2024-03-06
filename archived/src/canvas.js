class Canvas {
  constructor(element) {
    this.canvas = document.getElementById(element);
    this.context = this.canvas.getContext('2d');
    this.canvas.width = CONST.CANVAS.WIDTH;
    this.canvas.height = CONST.CANVAS.HEIGHT;
    this.stones_radius = parseInt(document.getElementById('stonesize').value, 10);
    this.stones = [];
    this.current_grid = null;
    this.points = [];
    this.isGridGenerated = false; // Flag to indicate if the grid has been generated

    // Bind event listeners
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
  }

  tick() {
    // Update stones radius in case it was changed
    this.stones_radius = parseInt(document.getElementById('stonesize').value, 10);

    this.clear_canvas();
    if (this.isGridGenerated && this.current_grid) {
      this.showGrid();
    }
    for (const stone of this.stones) {
      this.draw_circle(stone);
    }
    // Highlight the last placed stone, if any
    let lastItemIndex = this.stones.length - 1;
    if (this.stones[lastItemIndex] !== undefined) {
      let stoneToBeMarked = this.stones[lastItemIndex];
      this.draw_marker(stoneToBeMarked);
    }

  }

  handleMouseDown(event) {
    event.preventDefault();
    let { left, top } = this.canvas.getBoundingClientRect();
    let [x, y] = this.getCanvasCoords(event.clientX - left, event.clientY - top);

    if (!this.isGridGenerated) {
      if (this.points.length < 4) {
        console.log(x, y);
        this.points.push([x, y]);
        if (this.points.length === 4) {
          this.current_grid = this.generateGrid(this.points);
          this.isGridGenerated = true;
        }
      }
    } else {
      if (event.button === 0) { // Left click
        this.stones.push([x, y, STONES.BLACK]);
      } else if (event.button === 2) { // Right click
        this.stones.push([x, y, STONES.WHITE]);
      } else if (event.button === 1) { // Middle click
        this.stones = []; // Clear stones
      }
      this.check_for_overlapping_stones();
    }
  }

  handleContextMenu(event) {
    event.preventDefault(); // Prevent the context menu from appearing
  }


  clear_canvas() {
    this.context.clearRect(0, 0, CONST.CANVAS.WIDTH, CONST.CANVAS.HEIGHT);
  }

  draw_circle([mouse_x, mouse_y, stone_color]) {
    let offset = this.stones_radius / 2
    this.context.drawImage(stone_color, mouse_x - offset, mouse_y - offset, this.stones_radius, this.stones_radius)
  }

  draw_marker([mouse_x, mouse_y, stone_color]) {
    let marker_size = this.stones_radius / 2
    let offset = this.stones_radius / 4
    this.context.drawImage(STONES.MARKER, mouse_x - offset, mouse_y - offset, marker_size, marker_size)
  }

  handle_mouse_down(event) {
    let { left, top } = this.canvas.getBoundingClientRect();
    let [x, y] = this.getCanvasCoords(event.clientX - left, event.clientY - top);

    if (event.button === 0) { // left click
      this.stones.push([x, y, STONES.BLACK]);
    } else if (event.button === 2) { // right click
      this.stones.push([x, y, STONES.WHITE]);
    }

    this.check_for_overlapping_stones()
  }

  handle_context_menu(event) {
    event.preventDefault();
  }

  handle_clearing_stones(event) {
    event.preventDefault()
    if (event.button === 1) { // middle click
      this.stones = [];
    }
  }

  check_for_overlapping_stones() {
    for (let i = 0; i < this.stones.length; i++) {
      for (let j = i + 1; j < this.stones.length; j++) {
        const [stone_position_x1, stone_position_y1, stone_color_1] = this.stones[i];
        const [stone_position_x2, stone_position_y2, stone_color_2] = this.stones[j];
        const distance_between_stones_x = stone_position_x2 - stone_position_x1;
        const distance_between_stones_y = stone_position_y2 - stone_position_y1;
        const total_distance = Math.sqrt(distance_between_stones_x * distance_between_stones_x + distance_between_stones_y * distance_between_stones_y);
        if (total_distance < 45) {
          this.stones.splice(i, 1);
          i--;
          break;
        }
      }
    }
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

  showGrid() {
    if (this.current_grid) {
      for (let i = 0; i < this.current_grid.length; i++) {
        for (let j = 0; j < this.current_grid[i].length; j++) {
          const point = this.current_grid[i][j];
          this.context.fillStyle = 'white'; // Adjust color as needed
          this.context.fillRect(point[0] - 5, point[1] - 5, 10, 10); // Adjust size as needed
        }
      }
    }
  }


  getCanvasCoords(clientX, clientY) {
    let { width, height } = this.canvas.getBoundingClientRect();
    let scaleX = this.canvas.width / width;
    let scaleY = this.canvas.height / height;
    return [clientX * scaleX, clientY * scaleY];
  }
}
