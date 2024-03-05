// Function to generate the grid HTML given 3 points (4th is optional)
// points = [ [x1,y1], [x2,y2], [x3,y3], [x4,y4]]
// where the points are [(top left), (top right), (bottom left), (bottom right)]
function generateGrid(points) {
  // Generate an empty board 
  const grid = Array.from({ length: 19 }, () => Array.from({ length: 19 }).fill(0));

  width_diff = (points[1][1] - points[0][1]) / 18
  length_diff = (points[2][0] - points[0][0]) / 18

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
