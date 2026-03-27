import * as THREE from 'three';

export class GameState {
    constructor() {
        this.mouse = new THREE.Vector2();
        this.smoothMouse = new THREE.Vector2();

        this.speed = 1.0;
        this.targetSpeed = 5.0;

        // --- NUEVAS VARIABLES DE CONTROL ---
        this.timeScale = 1.0;    // Controla el Slow Motion (Hitstop)
        this.cameraShake = 0;    // Intensidad del temblor de cámara
        // -----------------------------------

        this.isLoaded = false;
        this.lastFireTime = 0;
        this.lastPlayerFireTime = 0;
        this.isMouseDown = false;
    }

    update(delta) {
        // La velocidad física del juego
        this.speed = THREE.MathUtils.lerp(this.speed, this.targetSpeed, 0.05);
        this.smoothMouse.lerp(this.mouse, 0.07);

        // El cameraShake se amortigua automáticamente en SceneManager.js
    }
}