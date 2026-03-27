import * as THREE from 'three';

export class RendererSystem {
    constructor(canvas) {
        this.renderer = new THREE.WebGLRenderer({
            canvas,
            antialias: false,
            powerPreference: "high-performance",
            logarithmicDepthBuffer: true,
            stencil: false,
            depth: true
        });

        this.configure();
    }

    configure() {
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;

        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    setSize(w, h) {
        this.renderer.setSize(w, h);
    }
}