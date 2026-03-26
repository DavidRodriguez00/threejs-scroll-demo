import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * SceneManager: Orquestador del motor gráfico.
 * Gestiona la escena, cámara, renderizado HDR y efectos de post-procesamiento.
 */
export class SceneManager {
    constructor(canvas) {
        // 1. CONFIGURACIÓN DE LA ESCENA
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000105); // Azul profundo casi negro

        // 2. CÁMARA PERSPECTIVA
        this.camera = new THREE.PerspectiveCamera(
            60,
            window.innerWidth / window.innerHeight,
            0.1,
            60000 // Rango extendido para naves lejanas y la Estrella de la Muerte
        );

        // 3. RENDERIZADOR WEBGL2 CON SOPORTE PARA SOMBRAS HDR
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false, // Desactivado para favorecer el Post-processing
            powerPreference: "high-performance",
            logarithmicDepthBuffer: true, // Crucial para evitar parpadeos en escalas espaciales
            stencil: false,
            depth: true
        });

        this.configureRenderer();
        this.setupPostProcessing();

        // 4. JERARQUÍA DE OBJETOS (Cabina + Cámara)
        // El cockpitGroup es donde la clase Lights añade las luces interiores (alarmas, flashes)
        this.cockpitGroup = new THREE.Group();
        this.scene.add(this.cockpitGroup);
        this.cockpitGroup.add(this.camera);

        // 5. RELOJ Y BUCLE
        this.clock = new THREE.Clock();
        this.updateCallback = null;

        this.initLoop();
        window.addEventListener('resize', () => this.updateSize());
    }

    /**
     * Configuración técnica para fidelidad cromática y sombras.
     */
    configureRenderer() {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        
        // Espacio de color estándar para flujos de trabajo modernos
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        
        // Mapeo de tonos ACES Filmic para un look cinematográfico
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        // Soporte para sombras físicas (necesario para la luz del sol en Lights.js)
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    /**
     * Configuración de la cadena de post-procesamiento HDR.
     */
    setupPostProcessing() {
        const size = this.renderer.getDrawingBufferSize(new THREE.Vector2());

        // Target de coma flotante para permitir intensidades lumínicas > 1.0 (Láseres/Flashes)
        const renderTarget = new THREE.WebGLRenderTarget(size.x, size.y, {
            type: THREE.HalfFloatType,
            format: THREE.RGBAFormat,
            colorSpace: THREE.SRGBColorSpace
        });

        this.composer = new EffectComposer(this.renderer, renderTarget);
        
        // Pase 1: Renderizado de la escena
        this.composer.addPass(new RenderPass(this.scene, this.camera));

        // Pase 2: Bloom (Resplandor de motores, láseres y alarmas)
        this.bloomPass = new UnrealBloomPass(
            new THREE.Vector2(window.innerWidth, window.innerHeight),
            0.8,   // Fuerza: Resplandor equilibrado
            0.4,   // Radio: Difusión de la luz
            0.85   // Umbral: Solo brillan los elementos emisivos puros
        );
        this.composer.addPass(this.bloomPass);

        // Pase 3: Salida final y corrección de gamma
        this.composer.addPass(new OutputPass());
    }

    /**
     * Carga un mapa de entorno para reflejos en el metal de la nave.
     */
    setEnvironment(texturePath) {
        const loader = new THREE.TextureLoader();
        loader.load(texturePath, (texture) => {
            texture.mapping = THREE.EquirectangularReflectionMapping;
            texture.colorSpace = THREE.SRGBColorSpace;
            this.scene.environment = texture;
        });
    }

    /**
     * Bucle de renderizado principal.
     */
    initLoop() {
        this.renderer.setAnimationLoop(() => {
            const delta = Math.min(this.clock.getDelta(), 0.1);
            const elapsed = this.clock.getElapsedTime();

            if (this.updateCallback) {
                // Sincronización de matrices de cámara para evitar lag en el cockpit
                this.camera.updateWorldMatrix(true, false);
                this.updateCallback(elapsed, delta, this.camera);
            }

            // El compositor gestiona el renderizado final con efectos
            this.composer.render();
        });
    }

    /**
     * Reactividad visual al modo Turbo y combate.
     * Ajusta el post-proceso dinámicamente según la velocidad proporcionada por main.js.
     */
    updateVisuals(speed) {
        // El bloom aumenta agresivamente al superar los 15 unidades de velocidad
        const bloomBoost = speed > 15 ? (speed - 15) * 0.025 : 0;
        this.bloomPass.strength = 0.8 + bloomBoost;

        // La exposición baja ligeramente al ir rápido para dar peso visual a las luces de alarma
        const exposureTarget = speed > 20 ? 0.85 : 1.1;
        this.renderer.toneMappingExposure = THREE.MathUtils.lerp(
            this.renderer.toneMappingExposure,
            exposureTarget,
            0.05
        );
    }

    /**
     * Suscripción al loop de actualización desde el exterior.
     */
    onUpdate(callback) {
        this.updateCallback = callback;
    }

    /**
     * Gestión del redimensionamiento de ventana.
     */
    updateSize() {
        const w = window.innerWidth;
        const h = window.innerHeight;

        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(w, h);
        this.composer.setSize(w, h);
        this.bloomPass.resolution.set(w, h);
    }
}