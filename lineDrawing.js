class AnimatedLine {
    constructor(start, end) {
        this.start = createVector(start.x, start.y);
        this.end = createVector(end.x, end.y);
        this.vertexArray = [];
        this.angle = 0;
        this.complete = false;
        this.canRemove = false;
        this.canDraw = false;
    }

    draw() {
        if (this.canDraw === true) {
            this.drawLine();
        }
    }

    update() {
        if (this.canDraw === true) {

            if (this.canRemove == true) {
                this.complete = this.checkAllComplete();
            }

            for (let i = 0; i < this.vertexArray.length; i++) {
                if (this.vertexArray[i].complete == false) {
                    this.vertexArray[i].update();
                }
            }

            this.animateLine();
        }
    }

    drawLine() {
        for (let i = 0; i < this.vertexArray.length; i++) {
            this.vertexArray[i].draw();
        }
    }

    animateLine() {
        let tempX = map(this.angle, 0, 100, this.start.x, this.end.x, 1);
        let tempY = map(this.angle, 0, 100, this.start.y, this.end.y, 1);

        if (this.vertexArray.length > 1 && tempX == this.vertexArray[this.vertexArray.length - 1].pos.x && tempY == this.vertexArray[this.vertexArray.length - 1].pos.y) {
            this.canRemove = true;
        }
        else {

            this.vertexArray.push(new FadingPoint(createVector(tempX, tempY)));
            this.angle += LINE_SPEED;
        }
    }

    checkAllComplete() {
        let allComplete = true;

        for (let i = 0; i < this.vertexArray.length; i++) {
            if (this.vertexArray[i].complete == false) {
                allComplete = false;
                return;
            }
        }

        return allComplete;
    }
}

class FadingPoint {
    constructor(pos) {
        this.pos = pos;
        this.dots = [];
        this.bgCol = color(0,255,0);
        this.width = LINE_THICKNESS;
        this.complete = false;
    }

    update() {
        let newPos = this.getRandomPosInThis();

        this.dots.push(new Dot(newPos));

        if (this.dots.length > DOT_CUTOFF) {
            this.complete = true;
        }
    }

    draw() {
        if (this.complete == false) {

            push();
            noStroke();

            fill(this.bgCol);
            ellipse(this.pos.x, this.pos.y, this.width);

            for (let i = 0; i < this.dots.length; i++) {
                this.dots[i].draw();
            }

            pop();
        }
    }

    getRandomPosInThis() {
        let x = this.pos.x + random(-this.width / 2, this.width / 2);
        let y = this.pos.y + random(-this.width / 2, this.width / 2);

        return (createVector(x, y));
    }
}

class Dot {
    constructor(pos) {
        this.x = pos.x;
        this.y = pos.y;
        this.width = DOT_SIZE;
        this.color = color(0,255,0);
    }

    draw() {
        push();
        noStroke();
        fill(this.color);

        ellipse(this.x, this.y, this.width);

        pop();
    }
}