import * as THREE from 'three';
import { RendererSystem } from './RendererSystem.js';
import { PostProcessing } from './PostProcessing.js';
import { RenderLoop } from './RenderLoop.js';

export class SceneManager {
    constructor(canvas, state) { // Ahora recibe el estado global
        this.state = state;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000105);

        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            60000
        );

        this.rendererSystem = new RendererSystem(canvas);

        // Post-procesado avanzado (Bloom + RGB Shift)
        this.post = new PostProcessing(
            this.rendererSystem.renderer,
            this.scene,
            this.camera
        );

        this.cockpitGroup = new THREE.Group();
        this.scene.add(this.cockpitGroup);
        // La cámara vive dentro del cockpit para heredar movimientos de la nave
        this.cockpitGroup.add(this.camera);

        // El loop ahora es consciente del tiempo lógico (TimeScale)
        this.loop = new RenderLoop(
            this.rendererSystem.renderer,
            this.post.composer,
            this.camera,
            this.state
        );

        window.addEventListener('resize', () => this.updateSize());
    }

    onUpdate(cb) {
        this.loop.setUpdateCallback((time, delta, camera) => {
            // Aplicamos sacudida de cámara (Camera Shake) antes de cualquier otra cosa
            this._applyCameraShake(delta);
            cb(time, delta, camera);
        });
    }

    /**
     * Gestiona el temblor de la cámara por impactos o velocidad.
     */
    _applyCameraShake(delta) {
        if (this.state.cameraShake > 0.01) {
            const s = this.state.cameraShake;
            // Desplazamiento aleatorio basado en la intensidad actual
            this.camera.position.x += (Math.random() - 0.5) * s;
            this.camera.position.y += (Math.random() - 0.5) * s;

            // Reducción gradual del temblor (amortiguación)
            this.state.cameraShake = THREE.MathUtils.lerp(this.state.cameraShake, 0, 0.1);
        }
    }

    start() {
        this.loop.start();
    }

    /**
     * Sincroniza la estética visual con la acción del juego.
     */
    updateVisuals(speed, isFiring = false) {
        // Pasamos el renderer que vive en rendererSystem
        this.post.updateVisuals(speed, this.rendererSystem.renderer, isFiring);
    }

    setEnvironment(path) {
        const loader = new THREE.TextureLoader();
        loader.load(path, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            this.scene.environment = texture;
        });
    }

    updateSize() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.rendererSystem.setSize(w, h);
        this.post.setSize(w, h);
    }
}