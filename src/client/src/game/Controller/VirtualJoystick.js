import * as PIXI from 'pixi.js';

export class VirtualJoystick extends PIXI.Container {
    constructor(radius = 60) {
        super();
        this.radius = radius;
        this.dragging = false;
        
        // Draw the outer base
        this.base = new PIXI.Graphics();
        this.base.beginFill(0x888888, 0.5); // Gray, semi-transparent
        this.base.drawCircle(0, 0, this.radius);
        this.base.endFill();
        this.addChild(this.base);
        
        // Draw the inner knob
        this.knob = new PIXI.Graphics();
        this.knob.beginFill(0xffffff, 0.8); // White, semi-transparent
        this.knob.drawCircle(0, 0, this.radius / 2.5);
        this.knob.endFill();
        this.addChild(this.knob);
        
        // Enable touch interactions
        this.interactive = true;
        this.on('pointerdown', this.onDragStart.bind(this))
            .on('pointermove', this.onDragMove.bind(this))
            .on('pointerup', this.onDragEnd.bind(this))
            .on('pointerupoutside', this.onDragEnd.bind(this));
            
        // This will hold values between -1 and 1 for your game logic
        this.axis = { x: 0, y: 0 };
    }

    onDragStart(event) {
        this.dragging = true;
        this.eventData = event.data;
        this.updateKnob();
    }

    onDragMove() {
        if (!this.dragging) return;
        this.updateKnob();
    }

    onDragEnd() {
        this.dragging = false;
        this.eventData = null;
        // Snap back to center when released
        this.knob.position.set(0, 0);
        this.axis = { x: 0, y: 0 };
    }

    updateKnob() {
        // Get touch position relative to the joystick's parent container
        const newPosition = this.eventData.getLocalPosition(this.parent);
        
        // Calculate distance from the center
        const dx = newPosition.x - this.x;
        const dy = newPosition.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= this.radius) {
            // Finger is inside the base, knob follows exactly
            this.knob.position.set(dx, dy);
        } else {
            // Finger is outside the base, clamp knob to the edge using angles
            const angle = Math.atan2(dy, dx);
            this.knob.x = Math.cos(angle) * this.radius;
            this.knob.y = Math.sin(angle) * this.radius;
        }
        
        // Normalize the output to a standard -1.0 to 1.0 range
        this.axis.x = this.knob.x / this.radius;
        this.axis.y = this.knob.y / this.radius;
    }
}