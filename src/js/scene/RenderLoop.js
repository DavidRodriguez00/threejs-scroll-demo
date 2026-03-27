import * as THREE from 'three';

export class RenderLoop {
    constructor(renderer, composer, camera, state) {
        this.renderer = renderer;
        this.composer = composer;
        this.camera = camera;
        this.state = state; // Necesitamos acceso al GameState para leer el timeScale

        this.clock = new THREE.Clock();
        this.updateCallback = null;
        
        // Acumulador para el tiempo transcurrido "lógico"
        this.logicalElapsed = 0;
    }

    setUpdateCallback(cb) {
        this.updateCallback = cb;
    }

    start() {
        this.renderer.setAnimationLoop(() => {
            // 1. OBTENER DELTA REAL
            const realDelta = Math.min(this.clock.getDelta(), 0.1);

            // 2. APLICAR ESCALA TEMPORAL (Hitstop / Slow Motion)
            // Si state.timeScale es 1.0, el tiempo corre normal.
            // Si es 0.05, el juego casi se detiene pero el render sigue a 60+ FPS.
            const timeScale = this.state.timeScale || 1.0;
            const scaledDelta = realDelta * timeScale;

            // 3. ACTUALIZAR TIEMPO LÓGICO ACUMULADO
            // Usamos esto en lugar de clock.getElapsedTime() para que las 
            // oscilaciones (senos/cosenos) también se ralenticen.
            this.logicalElapsed += scaledDelta;

            if (this.updateCallback) {
                this.camera.updateWorldMatrix(true, false);
                
                // Pasamos el tiempo lógico y el delta escalado
                this.updateCallback(this.logicalElapsed, scaledDelta, this.camera);
            }

            // 4. RENDERIZADO
            // El renderizado siempre ocurre a máxima velocidad para suavidad visual
            this.composer.render();
        });
    }
}