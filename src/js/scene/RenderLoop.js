import * as THREE from 'three';

export class RenderLoop {
    constructor(renderer, composer, camera, state) {
        this.renderer = renderer;
        this.composer = composer;
        this.camera = camera;
        this.state = state;

        this.clock = new THREE.Clock();
        this.updateCallback = null;
        
        // Tiempo lógico acumulado (afectado por el timeScale)
        this.logicalElapsed = 0;
    }

    setUpdateCallback(cb) {
        this.updateCallback = cb;
    }

    start() {
        this.renderer.setAnimationLoop(() => {
            // 1. OBTENER DELTA REAL (Tiempo de CPU entre frames)
            let realDelta = this.clock.getDelta();
            
            // Capar el delta para evitar saltos enormes si hay lag o cambio de pestaña
            if (realDelta > 0.1) realDelta = 0.1;

            // 2. APLICAR ESCALA TEMPORAL (Multiplicador de velocidad del juego)
            // Aseguramos que nunca sea undefined o negativo
            const timeScale = (this.state.timeScale !== undefined) ? this.state.timeScale : 1.0;
            
            // El Delta Escalado es lo que moverá las balas y naves
            const scaledDelta = realDelta * timeScale;

            // 3. ACTUALIZAR TIEMPO LÓGICO
            // Es vital usar esto en Models.js para que Math.sin(logicalElapsed) 
            // se ralentice junto con el juego.
            this.logicalElapsed += scaledDelta;

            if (this.updateCallback) {
                // Forzar actualización de matrices de cámara antes del frame
                this.camera.updateMatrixWorld();
                
                // IMPORTANTE: Pasamos logicalElapsed para las funciones seno/coseno
                // y scaledDelta para las velocidades (pos.addScaledVector)
                this.updateCallback(this.logicalElapsed, scaledDelta, this.camera);
            }

            // 4. RENDERIZADO
            // El render siempre va a 60fps/144fps reales, independientemente del timeScale
            this.composer.render();
        });
    }
}