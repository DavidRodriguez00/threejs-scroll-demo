import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export class ModelLoader {
    constructor() {
        this.loader = new GLTFLoader().setPath('assets/models/');
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
     * Carga un lote de naves con parámetros de comportamiento específicos.
     * @param {number} count Cantidad de naves.
     * @param {string} type 'escort' o 'interceptor'.
     */
    async loadEscolts(count = 12, type = 'escort') {
        const gltf = await this.loader.loadAsync('caza.glb');

        let sourceMesh;
        gltf.scene.traverse(n => { if (n.isMesh && !sourceMesh) sourceMesh = n; });

        const realisticMaterial = sourceMesh.material.clone();

        // Diferenciación visual: Interceptores con un toque más oscuro y motores rojos
        if (type === 'interceptor') {
            // realisticMaterial.color.setHex(0x888888);
            realisticMaterial.emissive.setHex(0xff0000);
            realisticMaterial.emissiveIntensity = 2;
        }

        const instanced = new THREE.InstancedMesh(sourceMesh.geometry, realisticMaterial, count);
        const data = [];

        for (let i = 0; i < count; i++) {
            // Configuración por defecto (Escoltas)
            let config = {
                spread: { x: 3500, y: 2500, z: 3000 },
                speed: [0.8, 1.5],
                fireRate: [1.5, 3.5]
            };

            // Configuración de Interceptores (Más lejos, más rápidos, más agresivos)
            if (type === 'interceptor') {
                config = {
                    spread: { x: 200, y: 100, z: 1000 },
                    speed: [2.5, 4.0],
                    fireRate: [0.5, 1.2]
                };
            }

            const x = (Math.random() - 0.5) * config.spread.x;
            const y = (Math.random() - 0.5) * config.spread.y;
            const z = config.spread.z - (Math.random() * 2000);

            data.push({
                basePos: new THREE.Vector3(x, y, z),
                phase: Math.random() * Math.PI * 2,
                speed: config.speed[0] + Math.random() * config.speed[1],
                amplitude: 150 + Math.random() * 200,
                fireCooldown: Math.random() * 2,
                fireRate: config.fireRate[0] + Math.random() * config.fireRate[1],
                isDead: false,
                type: type
            });
        }

        instanced.castShadow = true;
        return { mesh: instanced, data };
    }
}