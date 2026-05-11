import * as PIXI from 'pixi.js';

export class VirtualJoystick extends PIXI.Container {
    // Notice we now pass the 'app' so we know the screen dimensions
    constructor(app, radius = 60) {
        super();
        this.radius = radius;
        this.dragging = false;

        // 1. Create an invisible touch zone that covers the whole screen
        this.touchZone = new PIXI.Graphics();
        this.touchZone.beginFill(0x000000, 0.001); // 0.001 alpha makes it invisible but clickable
        this.touchZone.drawRect(0, 0, app.screen.width, app.screen.height);
        this.touchZone.endFill();
        this.touchZone.interactive = true;
        this.addChild(this.touchZone);

        // 2. Create a container just for the visible UI (Base + Knob)
        this.ui = new PIXI.Container();
        this.addChild(this.ui);

        this.base = new PIXI.Graphics();
        this.base.beginFill(0x888888, 0.5); 
        this.base.drawCircle(0, 0, this.radius);
        this.base.endFill();
        this.ui.addChild(this.base);
        
        this.knob = new PIXI.Graphics();
        this.knob.beginFill(0xffffff, 0.8); 
        this.knob.drawCircle(0, 0, this.radius / 2.5);
        this.knob.endFill();
        this.ui.addChild(this.knob);
        
        // Hide the joystick UI until the screen is touched
        this.ui.visible = false; 
            
        this.axis = { x: 0, y: 0 };

        // 3. Attach touch events to the massive invisible zone, not the small base
        this.touchZone.on('pointerdown', this.onDragStart.bind(this))
                      .on('pointermove', this.onDragMove.bind(this))
                      .on('pointerup', this.onDragEnd.bind(this))
                      .on('pointerupoutside', this.onDragEnd.bind(this));
    }

    onDragStart(event) {
        this.dragging = true;
        this.eventData = event.data;

        // Snap the UI container to where the touch happened
        const newPosition = this.eventData.getLocalPosition(this);
        this.ui.position.copyFrom(newPosition);
        
        // Make the joystick visible
        this.ui.visible = true;

        this.updateKnob();
    }

    onDragMove() {
        if (!this.dragging) return;
        this.updateKnob();
    }

    onDragEnd() {
        this.dragging = false;
        this.eventData = null;
        
        // Reset knob to center and axis to 0
        this.knob.position.set(0, 0);
        this.axis = { x: 0, y: 0 };

        // Hide the joystick again when the user lets go
        this.ui.visible = false; 
    }

    updateKnob() {
        // Calculate movement relative to the UI container's center
        const newPosition = this.eventData.getLocalPosition(this.ui);
        
        const dx = newPosition.x;
        const dy = newPosition.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Clamp the knob inside the base circle
        if (distance <= this.radius) {
            this.knob.position.set(dx, dy);
        } else {
            const angle = Math.atan2(dy, dx);
            this.knob.x = Math.cos(angle) * this.radius;
            this.knob.y = Math.sin(angle) * this.radius;
        }
        
        this.axis.x = this.knob.x / this.radius;
        this.axis.y = this.knob.y / this.radius;
    }
}