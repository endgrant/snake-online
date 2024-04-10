// Snake class


class Snake {
  constructor(id, startingPos) {
    this.id = id;
    this.direction = createVector(0, 1);
    this.queuedDirection = createVector(0, 1);
    this.cells = [];
    this.dead = false;
    
    if (startingPos) {
      this.cells = [new Cell(startingPos)];
    }
  }
  
  
  // Adds a new cell to the front of the snake
  appendCell(cell) {
    this.cells.push(cell);
  }
  
  
  // Adds a single cell to the front of the snake
  grow(position) {
    this.cells.unshift(new Cell(position));
  }
  
  
  // Draws the entire snake for a frame
  process() {
    for (let i = 0; i < this.cells.length; i++) {
      this.cells[i].process();
    }
  }
  
  
  // Moves the snake forward one space
  march() {
    // Update direction
    this.direction = this.queuedDirection;
    
    let frontPosition = this.cells[0].position.copy().add(this.direction);
    let collectedApple = false;
    
    // Check space in front
    for (let i = 0; i < snakes.length; i++) {
      let cells = snakes[i].cells;
      for (let j = 0; j < cells.length; j++) {
        if (frontPosition.equals(cells[j].position)) {
          // Space occupied by a snake
          this.die();
          return;
        }
      }
    }
    for (let i = 0; i < apples.length; i++) {
      if (frontPosition.equals(apples[i].position)) {
        // Space is an apple
        this.grow(apples[i].position);
        collectedApple = true;
        appleCollected(apples[i]);
      }
    }
    
    if (collectedApple) {
      return;
    }
    
    // Trail snake from back to front
    if (this.cells.length > 1) {
      for (let i = this.cells.length-1; i > 0; i--) {
        this.cells[i].position = this.cells[i-1].position;
      }
    }
    
    // Advance head appropriately
    this.cells[0].position = frontPosition;
  }
  
  
  // The snake collided with a lethal object
  die() {
    this.dead = true;
  }
}