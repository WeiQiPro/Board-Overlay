class Canvas {
  constructor(element) {
    this.canvas = document.getElementById(element);
    this.context = this.canvas.getContext('2d');
    this.canvas.width = CONST.CANVAS.WIDTH;
    this.canvas.height = CONST.CANVAS.HEIGHT;
    this.stones_radius = document.getElementById('stonesize').value
    this.stones = [];

    // bind event listeners
    this.canvas.addEventListener('mousedown', this.handle_mouse_down.bind(this));
    this.canvas.addEventListener('contextmenu', this.handle_context_menu.bind(this));
    this.canvas.addEventListener('mousedown', this.handle_clearing_stones.bind(this));
  }

  tick() {
    this.stones_radius = document.getElementById('stonesize').value
    let last_item_index = this.stones.length - 1;
    this.clear_canvas();
    for (const stone of this.stones) {
      this.draw_circle(stone);
    }
    if (this.stones[last_item_index] !== undefined) {
      let stone_to_be_marked = this.stones[last_item_index];
      this.draw_marker(stone_to_be_marked);
    }
  }


  clear_canvas() {
    this.context.clearRect(0, 0, CONST.CANVAS.WIDTH, CONST.CANVAS.HEIGHT);
  }

  draw_circle([mouse_x, mouse_y, stone_color]) {
    let offset = this.stones_radius / 2
    this.context.drawImage(stone_color, mouse_x - offset, mouse_y - offset, this.stones_radius, this.stones_radius)
  }

  draw_marker([mouse_x, mouse_y, stone_color]){
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



  getCanvasCoords(clientX, clientY) {
    let { width, height } = this.canvas.getBoundingClientRect();
    let scaleX = this.canvas.width / width;
    let scaleY = this.canvas.height / height;
    return [clientX * scaleX, clientY * scaleY];
  }
}
