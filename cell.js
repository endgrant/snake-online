// Cell class
// Cells are used to compose a Snake object


class Cell {
  constructor(position) {
    this.position = position;
  }
  
  
  // Draws the cell for a single frame
  process() {
    fill(255);
    square(this.position.x * cellSize,
           this.position.y * cellSize,
           cellSize, roundness);
  }
}