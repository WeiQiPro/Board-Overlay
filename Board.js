// Function to generate the grid HTML given 3 points (4th is optional)
// points = [ [x1,y1], [x2,y2], [x3,y3], [x4,y4]]
// where the points are [(top left), (top right), (bottom left), (bottom right)]
function generateGrid(points) {
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

function distance(x1, y1, x2, y2) {
    return Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);
}

// Function to find the closest point on the grid given an x and y coordinate, returns that coordinate.
function findClosestPoint(x, y, grid) {
    let closestPoint = grid[0][0];
    let minDistance = distance(x, y, closestPoint[0], closestPoint[1]);

    // Iterate through each point in the grid
    grid.forEach(row => {
        row.forEach(point => {
            const dist = distance(x, y, point[0], point[1]);
            // Update closest point if distance is smaller
            if (dist < minDistance) {
                minDistance = dist;
                closestPoint = point;
            }
        });
    });
    return closestPoint;
}

