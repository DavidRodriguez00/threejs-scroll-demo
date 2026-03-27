import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader().setPath('assets/models/');
    }

    // Generador determinista: misma semilla = misma posición siempre
    _seededRandom(seed) {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
    }

    async loadShip(group) {
        const gltf = await this.loader.loadAsync('aeronave.glb');
        gltf.scene.rotation.y = Math.PI;
        gltf.scene.traverse(n => {
            if (n.isMesh) {
                n.material.envMapIntensity = 1.5;
                n.castShadow = true;
                n.receiveShadow = true;
            }
        });
        group.add(gltf.scene);
        return gltf.scene;
    }

    async loadDeathStar(scene, targetGroup) {
        scene.add(targetGroup);
        const gltf = await this.loader.loadAsync('death_star.glb');
        const ds = gltf.scene;
        ds.scale.setScalar(30);
        ds.position.set(0, 0, -5000);
        ds.traverse(n => {
            if (n.isMesh) {
                n.material.roughness = 0.8;
                n.material.metalness = 0.2;
            }
        });
        targetGroup.add(ds);
        return ds;
    }

    /**
     * Naves IMPERIALES: Aparecen DETRÁS de los cazas (Retaguardia)
     */
    async loadEscorts(count = 12, type = 'escort') {
        const gltf = await this.loader.loadAsync('imperial.glb');
        let sourceMesh;
        gltf.scene.traverse(n => { if (n.isMesh && !sourceMesh) sourceMesh = n; });

        const instanced = new THREE.InstancedMesh(sourceMesh.geometry, sourceMesh.material.clone(), count);
        const data = [];
        instanced.scale.setScalar(1.5); // Escala más pequeña para los escoltas

        for (let i = 0; i < count; i++) {
            const sX = i + 0.1;
            const sY = i + 0.2;
            const sZ = i + 0.3;

            const x = (this._seededRandom(sX) - 0.5) * 4000;
            const y = (this._seededRandom(sY) - 0.5) * 2000;
            // Profundidad máxima: entre 5000 y 7000
            const z = 1000;

            data.push({
                basePos: new THREE.Vector3(x, y, z),
                phase: this._seededRandom(i) * Math.PI * 2,
                speed: 0.1,
                amplitude: 100, // Movimiento más pesado
                fireCooldown: 5 + (this._seededRandom(i) * 50),
                fireRate: 40
            });
        }
        return { mesh: instanced, data };
    }

    /**
     * CAZAS e INTERCEPTORES: Vanguardia y centro
     */
    async loadEscolts(count = 12, type = 'escort') {
        const gltf = await this.loader.loadAsync('caza.glb');
        let sourceMesh;
        gltf.scene.traverse(n => { if (n.isMesh && !sourceMesh) sourceMesh = n; });

        const material = sourceMesh.material.clone();
        if (type === 'interceptor') {
            material.emissive.setHex(0xff0000);
            material.emissiveIntensity = 2;
        }

        const instanced = new THREE.InstancedMesh(sourceMesh.geometry, material, count);
        const data = [];

        instanced.scale.setScalar(0.5); // Cazas más pequeños que los escoltas

        for (let i = 0; i < count; i++) {
            const sX = i + 1.5;
            const sY = i + 2.5;
            const sZ = i + 3.5;

            const x = (this._seededRandom(sX) - 0.5) * 2500;
            const y = (this._seededRandom(sY) - 0.5) * 3500;
            let z = 0 + (this._seededRandom(sZ) * 4000); // Entre 1500 y 4500
            
            if (type === 'interceptor') {
                // INTERCEPTORES: Rango medio (detrás de los escoltas)
                
                z = 2500 + (this._seededRandom(sZ) * 10000);
            } 

            data.push({
                basePos: new THREE.Vector3(x, y, z),
                phase: this._seededRandom(i) * Math.PI * 2,
                speed: type === 'interceptor' ? 2.5 : 0.8,
                amplitude: 150,
                fireCooldown: this._seededRandom(i) * 50,
                fireRate: type === 'interceptor' ? 20 : 30,
                isDead: false,
                type: type
            });
        }

        instanced.castShadow = true;
        return { mesh: instanced, data };
    }
}