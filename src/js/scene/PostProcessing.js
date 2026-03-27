import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { RGBShiftShader } from 'three/addons/shaders/RGBShiftShader.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

export class PostProcessing {
    constructor(renderer, scene, camera) {
        const size = renderer.getDrawingBufferSize(new THREE.Vector2());

        const target = new THREE.WebGLRenderTarget(size.x, size.y, {
            type: THREE.HalfFloatType,
            format: THREE.RGBAFormat,
            colorSpace: THREE.SRGBColorSpace
        });

        this.composer = new EffectComposer(renderer, target);
        this.composer.addPass(new RenderPass(scene, camera));

        // 1. BLOOM: Configuración para resaltar el neón de los láseres
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(size.x, size.y),
            1.5,  // Fuerza inicial
            0.4,  // Radio
            0.85  // Threshold (solo brilla lo muy intenso)
        );
        this.composer.addPass(this.bloomPass);

        // 2. DISTORSIÓN (RGB Shift): Para simular velocidad extrema
        this.distortPass = new ShaderPass(RGBShiftShader);
        this.distortPass.uniforms['amount'].value = 0.002;
        this.composer.addPass(this.distortPass);

        this.composer.addPass(new OutputPass());

        // Estado interno para animaciones suaves
        this._currentBloom = 0.8;
    }

    /**
     * @param {number} speed Velocidad actual del juego
     * @param {THREE.WebGLRenderer} renderer 
     * @param {boolean} isFiring Si el jugador acaba de disparar
     */
    updateVisuals(speed, renderer, isFiring) {
        // --- LÓGICA DE BLOOM (Brillo) ---
        const speedFactor = Math.max(0, speed - 15) * 0.05;
        const fireImpact = isFiring ? 1.2 : 0; // Pico de brillo masivo al disparar

        const targetBloom = 0.8 + speedFactor + fireImpact;

        // Suavizamos la transición (Lerp): el brillo sube rápido y baja lento
        this._currentBloom = THREE.MathUtils.lerp(this._currentBloom, targetBloom, isFiring ? 0.5 : 0.1);
        this.bloomPass.strength = this._currentBloom;

        // --- LÓGICA DE DISTORSIÓN (RGB Shift) ---
        // A más velocidad, más se "separan" los colores en los bordes
        const distortionAmount = Math.max(0, speed - 10) * 0.0005;
        this.distortPass.uniforms['amount'].value = 0.001 + distortionAmount;

        // --- LÓGICA DE EXPOSICIÓN ---
        const exposureTarget = speed > 25 ? 0.7 : 1.1;
        renderer.toneMappingExposure = THREE.MathUtils.lerp(
            renderer.toneMappingExposure,
            exposureTarget,
            0.05
        );
    }

    setSize(w, h) {
        this.composer.setSize(w, h);
        this.bloomPass.resolution.set(w, h);
    }
}