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
     * Carga escoltas con lógica de movimiento individualizada para el EscortSystem.
     */
    async loadEscorts(count = 12) {
        const gltf = await this.loader.loadAsync('caza.glb');

        let sourceMesh;
        gltf.scene.traverse(n => { if (n.isMesh && !sourceMesh) sourceMesh = n; });
        if (!sourceMesh) throw new Error("No se encontró mesh en caza.glb");

        // Material PBR balanceado para que reaccione bien a las luces pero mantenga identidad
        const realisticMaterial = sourceMesh.material.clone();
        realisticMaterial.roughness = 0.2;
        realisticMaterial.metalness = 0.8;
        realisticMaterial.envMapIntensity = 2.5;

        const instanced = new THREE.InstancedMesh(sourceMesh.geometry, realisticMaterial, count);

        const data = [];
        for (let i = 0; i < count; i++) {
            // Distribución espacial en un frustum simulado delante de la Death Star
            const x = (Math.random() - 0.5) * 2500;
            const y = (Math.random() - 0.5) * 1500;
            // Posicionamiento escalonado en profundidad
            const z = -2000 - (Math.random() * 2000);

            data.push({
                basePos: new THREE.Vector3(x, y, z),
                // Parámetros de movimiento orgánico:
                phase: Math.random() * Math.PI * 2,
                speed: 0.8 + Math.random() * 1.5, // Velocidades variadas para romper la monotonía
                amplitude: 150 + Math.random() * 150, // Radio de patrulla individual

                // Lógica de combate desincronizada
                fireCooldown: Math.random() * 2,
                fireRate: 1.5 + Math.random() * 2,
                isDead: false
            });
        }

        // Importante: habilitar sombras en las instancias si el hardware lo permite
        instanced.castShadow = true;
        instanced.receiveShadow = true;

        return { mesh: instanced, data };
    }
}