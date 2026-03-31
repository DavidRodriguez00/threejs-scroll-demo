import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader().setPath('/assets/models/');
    }

    async loadGLTF(file) {
        return await this.loader.loadAsync(file);
    }

    /**
     * =========================
     * PLAYER SHIP
     * =========================
     */
    async loadShip(cockpitGroup) {
        const gltf = await this.loadGLTF('playerShip.glb');

        const ship = gltf.scene;

        ship.scale.setScalar(1);
        ship.position.set(0, -50, -200);

        cockpitGroup.add(ship);

        return ship;
    }

    /**
     * =========================
     * BASE MESH HELPERS
     * =========================
     */
    async getFirstMesh(gltf) {
        let mesh;

        gltf.scene.traverse(n => {
            if (n.isMesh && !mesh) mesh = n;
        });

        if (!mesh) {
            throw new Error('No mesh found in GLTF');
        }

        return mesh;
    }

    async getFighterMesh() {
        const gltf = await this.loadGLTF('caza.glb');
        return await this.getFirstMesh(gltf);
    }

    async getImperialMesh() {
        const gltf = await this.loadGLTF('imperial.glb');
        return await this.getFirstMesh(gltf);
    }

    /**
     * =========================
     * ESCORTS (Instanced)
     * =========================
     */
    async loadEscorts(count = 5) {
        const baseMesh = await this.getFighterMesh();

        const instanced = new THREE.InstancedMesh(
            baseMesh.geometry,
            material,
            count
        );

        const data = [];

        for (let i = 0; i < count; i++) {
            data.push({
                basePos: new THREE.Vector3(
                    (Math.random() - 0.5) * 5000,
                    (Math.random() - 0.5) * 2000,
                    -Math.random() * 8000
                ),
                phase: Math.random() * Math.PI * 2,
                amplitude: 200 + Math.random() * 300,
                speed: 0.5 + Math.random(),
                fireCooldown: Math.random() * 2,
                fireRate: 1 + Math.random() * 2,
                isDead: false
            });
        }

        return { mesh: instanced, data };
    }

    /**
     * =========================
     * IMPERIALS (Instanced)
     * =========================
     */
    async loadImperials(count = 6) {
        const baseMesh = await this.getImperialMesh();

        const instanced = new THREE.InstancedMesh(
            baseMesh.geometry,
            baseMesh.material,
            count
        );

        const data = [];

        for (let i = 0; i < count; i++) {
            data.push({
                basePos: new THREE.Vector3(
                    (Math.random() - 0.5) * 8000,
                    (Math.random() - 0.5) * 3000,
                    -Math.random() * 12000
                ),
                phase: Math.random() * Math.PI * 2,
                amplitude: 300 + Math.random() * 400,
                speed: 0.3 + Math.random() * 0.7,
                fireCooldown: Math.random() * 3,
                fireRate: 2 + Math.random() * 2,
                isDead: false
            });
        }

        return { mesh: instanced, data };
    }
}