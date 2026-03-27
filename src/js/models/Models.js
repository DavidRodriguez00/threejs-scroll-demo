import * as THREE from 'three';
import { ModelLoader } from './ModelLoader.js';

export class Models {
    constructor() {
        // Jerarquía de transformación: Group padre para movimiento global
        this.targetGroup = new THREE.Group();
        this.escortGroup = new THREE.Group();
        this.targetGroup.add(this.escortGroup);
        this.escoltGroup = new THREE.Group();
        this.targetGroup.add(this.escoltGroup);

        this.loader = new ModelLoader();

        // Lotes de naves (compatibles con CollisionSystem)
        this.escorts = { instancedMesh: null, escortData: [] };
        this.escolts = { instancedMesh: null, escoltData: [] };
        this.interceptors = { instancedMesh: null, escoltData: [] };

        this.deathStar = null;
        this.escortData = [];
        this.instancedEscorts = null;

        // Sistema de Láseres (Pool de Instancias)
        this.enemyLasers = null;
        this.playerLasers = null;
        this.laserData = [];
        this.maxPool = 200;

        // --- SISTEMA DE EXPLOSIONES (PARTÍCULAS) ---
        this.maxParticles = 1000;
        this.particles = null;
        this.particleData = []; // Pool de datos para las partículas

        // Helpers de optimización (GC Friendly)
        this._dummy = new THREE.Object3D();
        this._tempV3 = new THREE.Vector3();
    }

    /**
     * Inicializa materiales, mallas de proyectiles y sistema de partículas
     */
    init(scene) {
        // 1. LÁSERES
        const laserGeom = new THREE.CylinderGeometry(0.8, 0.8, 50, 4);
        laserGeom.rotateX(Math.PI / 2);

        // toneMapped: false es clave para que brillen con tu UnrealBloomPass en PostProcessing.js
        const matRed = new THREE.MeshBasicMaterial({ color: 0xff0000, toneMapped: false });
        const matGreen = new THREE.MeshBasicMaterial({ color: 0x00ff00, toneMapped: false });

        this.enemyLasers = new THREE.InstancedMesh(laserGeom, matRed, this.maxPool);
        this.playerLasers = new THREE.InstancedMesh(laserGeom, matGreen, this.maxPool);

        this.enemyLasers.renderOrder = 999;
        this.playerLasers.renderOrder = 999;
        this.enemyLasers.frustumCulled = false;
        this.playerLasers.frustumCulled = false;

        // 2. PARTÍCULAS DE EXPLOSIÓN
        const pGeom = new THREE.BufferGeometry();
        const pPositions = new Float32Array(this.maxParticles * 3);
        const pColors = new Float32Array(this.maxParticles * 3);
        pGeom.setAttribute('position', new THREE.BufferAttribute(pPositions, 3));
        pGeom.setAttribute('color', new THREE.BufferAttribute(pColors, 3));

        const pMat = new THREE.PointsMaterial({
            size: 15,
            vertexColors: true,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false,
            toneMapped: false
        });

        this.particles = new THREE.Points(pGeom, pMat);
        this.particles.frustumCulled = false;

        scene.add(this.enemyLasers, this.playerLasers, this.particles);
    }

    async loadShip(cockpitGroup) {
        return await this.loader.loadShip(cockpitGroup);
    }

    async loadDeathStar(scene) {
        scene.add(this.targetGroup);
        this.deathStar = await this.loader.loadDeathStar(scene, this.targetGroup);
    }

    async loadEscorts(count = 6) {
        const result = await this.loader.loadEscorts(count);
        if (!result) return;

        this.instancedEscorts = result.mesh;
        this.escortData = result.data;

        this.escorts.instancedMesh = result.mesh;
        this.escorts.escortData = result.data;

        this.escortGroup.add(this.instancedEscorts);
    }

    async loadEscolts(count = 12) {
        const result = await this.loader.loadEscolts(count, 'escolt');
        if (!result) return;

        this.escolts.instancedMesh = result.mesh;
        this.escolts.escoltData = result.data;

        this.instancedEscolts = result.mesh;
        this.escoltData = result.data;

        this.escoltGroup.add(this.escolts.instancedMesh);
    }

    async loadInterceptors(count = 8) {
        const result = await this.loader.loadEscolts(count, 'interceptor');
        if (!result) return;

        this.interceptors.instancedMesh = result.mesh;
        this.interceptors.escoltData = result.data;

        this.escoltGroup.add(this.interceptors.instancedMesh);
    }

    /**
     * Actualización principal llamada desde Game.js
     */
    update(time, delta, playerPos = new THREE.Vector3(0, 0, 0)) {
        this._updateBatch(this.escolts, time, delta, playerPos);
        this._updateBatch(this.interceptors, time, delta, playerPos);
        this._updateEscorts(time, delta, playerPos);
        this._updateEscolts(time, delta, playerPos);
        this._updateLasers(delta);
        this._updateParticles(delta);
    }

    /**
     * Lógica de naves (InstancedMesh)
     */
    _updateBatch(batch, time, delta, playerPos) {
        const mesh = batch.instancedMesh;
        if (!mesh) return;

        const data = batch.escoltData;

        for (let i = 0; i < data.length; i++) {
            const d = data[i];

            if (d.isDead) {
                this._dummy.scale.setScalar(0);
                this._dummy.updateMatrix();
                mesh.setMatrixAt(i, this._dummy.matrix);
                continue;
            }

            const t = time * d.speed;
            const followX = playerPos.x * 0.12;
            const followY = playerPos.y * 0.12;

            const posX = d.basePos.x + Math.sin(t + d.phase) * d.amplitude + followX;
            const posY = d.basePos.y + Math.cos(t * 0.8 + d.phase) * d.amplitude + followY;
            const posZ = d.basePos.z + Math.sin(t * 0.3) * 80;

            this._dummy.position.set(posX, posY, posZ);
            const roll = -Math.cos(t + d.phase) * 0.7;
            const pitch = Math.sin(t * 0.8 + d.phase) * 0.2;
            this._dummy.rotation.set(pitch, 0, roll);

            this._dummy.scale.setScalar(100);
            this._dummy.updateMatrix();
            mesh.setMatrixAt(i, this._dummy.matrix);

            d.fireCooldown -= delta;
            if (d.fireCooldown <= 0) {
                this._tempV3.setFromMatrixPosition(this._dummy.matrix);
                this._tempV3.applyMatrix4(this.escoltGroup.matrixWorld);
                this.spawnEnemyLaser(this._tempV3, playerPos);
                d.fireCooldown = d.fireRate;
            }
        }
        mesh.instanceMatrix.needsUpdate = true;
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


    _updateEscolts(time, delta, playerPos) {
        if (!this.instancedEscolts) return;

        for (let i = 0; i < this.escoltData.length; i++) {
            const data = this.escoltData[i];
            const t = time * data.speed;

            this._dummy.position.set(
                data.basePos.x + Math.sin(t + data.phase) * data.amplitude,
                data.basePos.y + Math.cos(t * 0.7 + data.phase) * data.amplitude,
                data.basePos.z + Math.sin(t * 0.4) * (data.amplitude * 0.3)
            );

            this._dummy.lookAt(this._dummy.position.x, this._dummy.position.y, 10000);

            this._dummy.scale.setScalar(500);
            this._dummy.updateMatrix();
            this.instancedEscolts.setMatrixAt(i, this._dummy.matrix);

            data.fireCooldown -= delta;
            if (data.fireCooldown <= 0) {
                const worldPos = new THREE.Vector3();
                worldPos.setFromMatrixPosition(this._dummy.matrix);
                worldPos.applyMatrix4(this.escoltGroup.matrixWorld);

                this.spawnEnemyLaser(worldPos, playerPos);
                data.fireCooldown = data.fireRate;
            }
        }
        this.instancedEscolts.instanceMatrix.needsUpdate = true;
    }


    /**
     * Genera un estallido de partículas en una posición global
     */
    spawnExplosion(position) {
        const count = 25;
        for (let i = 0; i < count; i++) {
            const vel = new THREE.Vector3(
                (Math.random() - 0.5) * 600,
                (Math.random() - 0.5) * 600,
                (Math.random() - 0.5) * 600
            );

            const p = {
                pos: position.clone(),
                vel: vel,
                life: 1.0,
                color: new THREE.Color().setHSL(0.05 + Math.random() * 0.1, 1, 0.5)
            };

            if (this.particleData.length < this.maxParticles) {
                this.particleData.push(p);
            } else {
                // Reutilización simple
                this.particleData[Math.floor(Math.random() * this.maxParticles)] = p;
            }
        }
    }

    _updateParticles(delta) {
        if (!this.particles) return;

        const posAttr = this.particles.geometry.attributes.position;
        const colAttr = this.particles.geometry.attributes.color;

        for (let i = 0; i < this.maxParticles; i++) {
            const p = this.particleData[i];

            if (p && p.life > 0) {
                p.pos.addScaledVector(p.vel, delta);
                p.vel.multiplyScalar(0.95);
                p.life -= delta;

                posAttr.setXYZ(i, p.pos.x, p.pos.y, p.pos.z);
                const intensity = p.life;
                colAttr.setXYZ(i, p.color.r * intensity, p.color.g * intensity, p.color.b * intensity);
            } else {
                posAttr.setXYZ(i, 0, 0, 0);
            }
        }

        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
    }

    spawnPlayerLaser(camera) {
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        camera.getWorldPosition(pos);
        camera.getWorldDirection(dir);
        pos.addScaledVector(dir, 100);

        this.laserData.push({
            pos: pos.clone(),
            dir: dir.clone(),
            life: 2.0,
            type: 'player',
            speed: 16000
        });
    }

    spawnEnemyLaser(originPos, playerPos) {
        const dir = new THREE.Vector3().subVectors(playerPos, originPos).normalize();
        const accuracy = 0.08;
        dir.x += (Math.random() - 0.5) * accuracy;
        dir.y += (Math.random() - 0.5) * accuracy;
        dir.normalize();

        this.laserData.push({
            pos: originPos.clone(),
            dir: dir,
            life: 3.5,
            type: 'enemy',
            speed: 8000
        });
    }

    _updateLasers(delta) {
        let eIdx = 0, pIdx = 0;
        for (let i = this.laserData.length - 1; i >= 0; i--) {
            const l = this.laserData[i];
            l.pos.addScaledVector(l.dir, l.speed * delta);
            l.life -= delta;

            if (l.life <= 0) {
                this.laserData.splice(i, 1);
                continue;
            }

            this._dummy.position.copy(l.pos);
            this._dummy.lookAt(this._tempV3.copy(l.pos).add(l.dir));
            this._dummy.scale.set(4, 4, 120);
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