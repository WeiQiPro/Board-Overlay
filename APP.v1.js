//constants
const WIDTH = 1920;
const HEIGHT = 1080;
//elements
const Elements = {
    canvas: "overlay",
    control: "StyleButton",
    video: "VideoButton",
    url: "VideoURL",
    feed: "feed"
}
//utils
//classes
//Controller
class MouseController { 
    constructor(){}
}

//*Stones
class Stone {
 constructor(){}
 static BLACK = (()=>{let img = new Image; img.src = './img/black.png'; return img})();
 static WHITE = (()=>{let img = new Image; img.src = './img/white.png'; return img})();
 static MARKER = (()=>{let img = new Image; img.src = './img/marker.png'; return img})();
 static EMPTY = (()=>{let img = new Image; img.src = './img/empty.png'; return img})();
}
//*Canvas
class Canvas { }
//*Render
class Render { }
//*Overlay
class Overlay { }
//*Video
class Video { }
//*Phase
class Phase { }
//*Board
class Board {
    constructor(rawPoints) {
        this.points = this.sortRawPoints(rawPoints);
        this.grid = this.createGrid(this.points);
    }

    sortRawPoints(rawPoints) {
        const sortedByY = rawPoints.slice().sort((a, b) => a[1] - b[1]);
        const topPoints = sortedByY.slice(0, 2).sort((a, b) => a[0] - b[0]);
        const bottomPoints = sortedByY.slice(2, 4).sort((a, b) => a[0] - b[0]);
        return [topPoints[0], topPoints[1], bottomPoints[0], bottomPoints[1]];
    }

    createGrid(points) {
        const grid = Array.from({ length: 19 }, () => Array.from({ length: 19 }, () => [0, 0]));
        for (let i = 0; i < 19; i++) {
            for (let j = 0; j < 19; j++) {
                const xFraction = j / 18;
                const yFraction = i / 18;
                grid[i][j] = this.bilinearInterpolation(xFraction, yFraction, points);
            }
        }
        return grid;
    }

    interpolation(p1, p2, fraction) {
        return [
            p1[0] + (p2[0] - p1[0]) * fraction,
            p1[1] + (p2[1] - p1[1]) * fraction,
        ];
    }

    bilinearInterpolation(x, y, points) {
        const [topLeft, topRight, bottomLeft, bottomRight] = points;

        const top = this.interpolation(topLeft, topRight, x);
        const bottom = this.interpolation(bottomLeft, bottomRight, x);

        return this.interpolation(top, bottom, y);
    }
}

//*Game
class Game {
    constructor(){
        this.video;
        this.board;
        this.info;
    }
}

//*Library
class Library { }
//main
function main() { }