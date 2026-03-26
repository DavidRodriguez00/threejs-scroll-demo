import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

/**
 * Clase Models: Gestiona la carga de activos y el sistema de combate.
 * Actualizado: Se ha reducido la densidad de láseres para evitar la saturación visual.
 */
export class Models {
    constructor() {
        this.loader = new GLTFLoader().setPath('assets/models/');

        // Jerarquía
        this.targetGroup = new THREE.Group();
        this.escortGroup = new THREE.Group();
        this.targetGroup.add(this.escortGroup);

        this.deathStar = null;
        this.escortData = [];
        this.instancedEscorts = null;

        // Sistema de Láseres Dual
        this.enemyLasers = null;   // Rojos
        this.playerLasers = null;  // Verdes
        this.laserData = [];       
        this.maxPool = 200; // Reducido para optimizar y limpiar la vista       

        // Helpers
        this._dummy = new THREE.Object3D();
        this._tempV3 = new THREE.Vector3();
        this._tempV3B = new THREE.Vector3();
        this._tempMatrix = new THREE.Matrix4();
    }

    /**
     * Inicializa las mallas instanciadas para los proyectiles.
     */
    initLasers(scene) {
        const geometry = new THREE.CylinderGeometry(0.4, 0.4, 40, 4);
        geometry.rotateX(Math.PI / 2);

        const matRed = new THREE.MeshStandardMaterial({
            color: 0xff0000,
            emissive: 0xff0000,
            emissiveIntensity: 25,
            toneMapped: false
        });

        const matGreen = new THREE.MeshStandardMaterial({
            color: 0x00ff00,
            emissive: 0x00ff00,
            emissiveIntensity: 25,
            toneMapped: false
        });

        this.enemyLasers = new THREE.InstancedMesh(geometry, matRed, this.maxPool);
        this.playerLasers = new THREE.InstancedMesh(geometry, matGreen, this.maxPool);

        scene.add(this.enemyLasers);
        scene.add(this.playerLasers);
    }

    /**
     * Disparo desde la cabina del jugador.
     */
    spawnPlayerLaser(camera) {
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        camera.getWorldPosition(pos);
        camera.getWorldDirection(dir);
        pos.addScaledVector(dir, 15); 

        this.laserData.push({
            pos: pos.clone(),
            dir: dir.clone(),
            life: 1.0,
            type: 'player'
        });
    }

    /**
     * Disparo enemigo optimizado.
     * Ajustado: Menor probabilidad de disparo dirigido y mayor dispersión.
     */
    spawnEnemyLaser(originOrIndex = null, targetPos = null) {
        const pos = new THREE.Vector3();
        let target = new THREE.Vector3();

        // Determinar si es un disparo dirigido (15% de probabilidad ahora, antes 30%)
        const isTargeted = Math.random() < 0.15;

        if (isTargeted && targetPos) {
            target.copy(targetPos);
        } else {
            // Disparo de ambiente hacia el horizonte
            target.set(
                (Math.random() - 0.5) * 6000,
                (Math.random() - 0.5) * 6000,
                15000 
            );
        }

        if (typeof originOrIndex === 'number' && this.instancedEscorts) {
            const idx = originOrIndex % this.escortData.length; 
            this.instancedEscorts.getMatrixAt(idx, this._tempMatrix);
            pos.setFromMatrixPosition(this._tempMatrix);
            pos.applyMatrix4(this.escortGroup.matrixWorld);
        } 
        else if (originOrIndex instanceof THREE.Vector3) {
            pos.copy(originOrIndex);
        }
        else if (this.deathStar) {
            pos.set(
                (Math.random() - 0.5) * 800,
                (Math.random() - 0.5) * 800,
                this.targetGroup.position.z + 400
            );
        } else {
            return;
        }

        const dir = new THREE.Vector3().subVectors(target, pos).normalize();
        
        // Dispersión para que no parezca que todos saben dónde estamos
        const deviation = isTargeted ? 0.04 : 0.25;
        dir.x += (Math.random() - 0.5) * deviation;
        dir.y += (Math.random() - 0.5) * deviation;
        dir.normalize();

        this.laserData.push({
            pos: pos.clone(),
            dir: dir,
            life: isTargeted ? 2.0 : 3.5, 
            type: 'enemy'
        });
    }

    async loadShip(cockpitGroup) {
        try {
            const gltf = await this.loader.loadAsync('aeronave.glb');
            const ship = gltf.scene;
            ship.rotation.y = Math.PI;
            cockpitGroup.add(ship);
            return ship;
        } catch (e) { console.error("Error cargando nave principal:", e); }
    }

    async loadDeathStar(scene) {
        scene.add(this.targetGroup);
        try {
            const gltf = await this.loader.loadAsync('death_star.glb');
            this.deathStar = gltf.scene;
            this.deathStar.scale.setScalar(30);
            this.deathStar.position.set(0, 0, -5000);
            this.targetGroup.add(this.deathStar);
        } catch (e) { console.error("Error cargando Estrella de la Muerte:", e); }
    }

    async loadEscorts(count = 5) {
        try {
            const gltf = await this.loader.loadAsync('caza.glb');
            let sourceMesh;
            gltf.scene.traverse(n => { if (n.isMesh && !sourceMesh) sourceMesh = n; });

            this.instancedEscorts = new THREE.InstancedMesh(sourceMesh.geometry, sourceMesh.material, count);

            for (let i = 0; i < count; i++) {
                const dist = 1200 + Math.random() * 500;
                const phi = Math.acos(-1 + (2 * i) / count);
                const theta = Math.sqrt(count * Math.PI) * phi;

                const x = dist * Math.cos(theta) * Math.sin(phi);
                const y = dist * Math.sin(theta) * Math.sin(phi);
                const z = dist * Math.cos(phi);

                this.escortData.push({
                    basePos: new THREE.Vector3(x, y, z),
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.15 + Math.random() * 0.2,
                    amplitude: 150 + Math.random() * 100,
                    fireCooldown: 2 + Math.random() * 5, 
                    fireRate: 4 + Math.random() * 4 // Cadencia mucho más lenta (antes 1.5 - 3.5)
                });
            }
            this.escortGroup.add(this.instancedEscorts);
        } catch (e) { console.error("Error cargando escoltas:", e); }
    }

    update(time, delta, playerPos = new THREE.Vector3(0,0,0)) {
        this._updateEscorts(time, delta, playerPos);
        this._updateLasers(delta);
    }

    _updateEscorts(time, delta, playerPos) {
        if (!this.instancedEscorts) return;

        for (let i = 0; i < this.escortData.length; i++) {
            const data = this.escortData[i];
            const t = time * data.speed;
            
            this._dummy.position.set(
                data.basePos.x + Math.sin(t + data.phase) * data.amplitude,
                data.basePos.y + Math.cos(t * 0.7 + data.phase) * data.amplitude,
                data.basePos.z + Math.sin(t * 0.4) * (data.amplitude * 0.3)
            );
            
            this._dummy.lookAt(this._dummy.position.x, this._dummy.position.y, 10000); 
            
            this._dummy.scale.setScalar(500);
            this._dummy.updateMatrix();
            this.instancedEscorts.setMatrixAt(i, this._dummy.matrix);

            data.fireCooldown -= delta;
            if (data.fireCooldown <= 0) {
                const worldPos = new THREE.Vector3();
                worldPos.setFromMatrixPosition(this._dummy.matrix);
                worldPos.applyMatrix4(this.escortGroup.matrixWorld);
                
                this.spawnEnemyLaser(worldPos, playerPos);
                data.fireCooldown = data.fireRate;
            }
        }
        this.instancedEscorts.instanceMatrix.needsUpdate = true;
    }

    _updateLasers(delta) {
        if (!this.enemyLasers || !this.playerLasers) return;

        let eIdx = 0, pIdx = 0;

        for (let i = this.laserData.length - 1; i >= 0; i--) {
            const l = this.laserData[i];
            const speed = l.type === 'player' ? 9500 : 7000; 

            l.pos.addScaledVector(l.dir, speed * delta);
            l.life -= delta * 0.8;

            if (l.life <= 0) {
                this.laserData.splice(i, 1);
                continue;
            }

            this._dummy.position.copy(l.pos);
            this._dummy.lookAt(this._tempV3.copy(l.pos).add(l.dir));
            this._dummy.scale.set(1.5, 1.5, 45); 
            this._dummy.updateMatrix();

            if (l.type === 'enemy' && eIdx < this.maxPool) {
                this.enemyLasers.setMatrixAt(eIdx++, this._dummy.matrix);
            } else if (l.type === 'player' && pIdx < this.maxPool) {
                this.playerLasers.setMatrixAt(pIdx++, this._dummy.matrix);
            }
        }

        this._dummy.scale.setScalar(0);
        this._dummy.updateMatrix();
        for (let i = eIdx; i < this.maxPool; i++) this.enemyLasers.setMatrixAt(i, this._dummy.matrix);
        for (let i = pIdx; i < this.maxPool; i++) this.playerLasers.setMatrixAt(i, this._dummy.matrix);

        this.enemyLasers.instanceMatrix.needsUpdate = true;
        this.playerLasers.instanceMatrix.needsUpdate = true;
    }
}