const COLOR = {
  BLACK: "black",
  LIGHTPINK: "lightpink"
}

const CONST = {
  ABSOLUTE: "absolute",
  ALLOW: "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
  APPEND: {
    CONTROLS: "?autoplay=1&controls=0&mute=1"
  },
  CANVAS: {
    HEIGHT: 1440,
    WIDTH: 2560
  },
  CLASS: "class",
  COLUMN: "column",
  DISPLAY: {
    HEIGHT: 160,
    WIDTH: 320
  },
  FLEX: "flex",
  ID: "id",
  NONE: "none",
  REVIEW: "Review",
  SOLID: "solid",
  TAG: "tag",
  TRUE: true,
  ZERO: "0"
}

const ELEMENT = {
  CLASS: {
    MINILIVEFEEDDISPLAY: 'miniLiveFeedDisplay',
    REVIEWTHISMINIDISPLAY: 'review_this_mini_display'
  },
  ID: {}
}

const STONES = {
  BLACK: new Image(),
  WHITE: new Image(),
  MARKER: new Image(),
}

STONES.BLACK.src = './img/black_stone.png'
STONES.WHITE.src = './img/white_stone.png'
STONES.MARKER.src = './img/stone_marker.png'

const NUMBERS = {
  PI: 2 * Math.PI
}
