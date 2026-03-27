import * as THREE from 'three';

export class GameState {
    constructor() {
        this.mouse = new THREE.Vector2();
        this.smoothMouse = new THREE.Vector2();

        this.speed = 1.0;
        this.targetSpeed = 5.0;

        this.isLoaded = false;

        this.lastFireTime = 0;
        this.lastPlayerFireTime = 0;

        this.isMouseDown = false;
    }

    update(delta) {
        this.speed = THREE.MathUtils.lerp(this.speed, this.targetSpeed, 0.05);
        this.smoothMouse.lerp(this.mouse, 0.07);
    }
}