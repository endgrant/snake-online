// Apple class


class Apple {
  constructor(position) {
    this.position = position;
  }
  
  
  // Draws the apple for a frame
  process() {
    fill(color(255, 0, 0));
    square(this.position.x * cellSize,
           this.position.y * cellSize,
           cellSize, roundness);
  }
}