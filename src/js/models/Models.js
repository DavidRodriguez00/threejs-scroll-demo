import * as THREE from 'three';
import { ModelLoader } from './ModelLoader.js';

export class Models {
    constructor() {
        this.targetGroup = new THREE.Group();
        this.escortGroup = new THREE.Group();
        this.targetGroup.add(this.escortGroup);

        this.loader = new ModelLoader();

        this.escorts = { instancedMesh: null, escortData: [] };
        this.deathStar = null;

        this.enemyLasers = null;
        this.playerLasers = null;
        this.laserData = [];
        this.maxPool = 200;

        this._dummy = new THREE.Object3D();
        this._tempV3 = new THREE.Vector3();
        this._tempMatrix = new THREE.Matrix4();
    }

    init(scene) {
        // Geometría: Cilindros ligeramente más anchos para mejorar visibilidad
        const laserGeom = new THREE.CylinderGeometry(0.8, 0.8, 50, 4);
        laserGeom.rotateX(Math.PI / 2);

        // CORRECCIÓN VISIBILIDAD: Usamos MeshBasicMaterial para que el color sea puro y no dependa de luces.
        // toneMapped: false permite que el color supere el rango 1.0 para disparar el Bloom.
        const matRed = new THREE.MeshBasicMaterial({
            color: 0xff0000,
            transparent: true,
            opacity: 0.9,
            toneMapped: false
        });
        const matGreen = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            transparent: true,
            opacity: 0.9,
            toneMapped: false
        });

        this.enemyLasers = new THREE.InstancedMesh(laserGeom, matRed, this.maxPool);
        this.playerLasers = new THREE.InstancedMesh(laserGeom, matGreen, this.maxPool);

        // RenderOrder alto para evitar que se oculten tras efectos de partículas
        this.enemyLasers.renderOrder = 999;
        this.playerLasers.renderOrder = 999;

        scene.add(this.enemyLasers);
        scene.add(this.playerLasers);
    }

    async loadShip(cockpitGroup) {
        return await this.loader.loadShip(cockpitGroup);
    }

    async loadDeathStar(scene) {
        scene.add(this.targetGroup);
        this.deathStar = await this.loader.loadDeathStar(scene, this.targetGroup);
    }

    async loadEscorts(count = 12) {
        const result = await this.loader.loadEscorts(count);
        this.escorts.instancedMesh = result.mesh;
        this.escorts.escortData = result.data;

        for (let i = 0; i < this.escorts.escortData.length; i++) {
            const d = this.escorts.escortData[i];
            this._dummy.position.copy(d.basePos);
            this._dummy.scale.setScalar(100); // Escala aumentada para mejor visibilidad
            this._dummy.updateMatrix();
            this.escorts.instancedMesh.setMatrixAt(i, this._dummy.matrix);
        }

        this.escorts.instancedMesh.instanceMatrix.needsUpdate = true;
        this.escortGroup.add(this.escorts.instancedMesh);
    }

    spawnPlayerLaser(camera) {
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        camera.getWorldPosition(pos);
        camera.getWorldDirection(dir);

        pos.addScaledVector(dir, 40); // Salida del proyectil adelantada

        this.laserData.push({
            pos: pos.clone(),
            dir: dir.clone(),
            life: 1.5,
            type: 'player'
        });
    }

    spawnEnemyLaser(originPos, playerPos) {
        if (!originPos) return;

        const target = playerPos ? playerPos.clone() : new THREE.Vector3(0, 0, 0);
        const origin = originPos.clone();
        const dir = new THREE.Vector3().subVectors(target, origin).normalize();

        const deviation = 0.1; // Dispersión para que no sean 100% precisos
        dir.x += (Math.random() - 0.5) * deviation;
        dir.y += (Math.random() - 0.5) * deviation;
        dir.normalize();

        this.laserData.push({
            pos: origin,
            dir: dir,
            life: 3.5,
            type: 'enemy'
        });
    }

    update(time, delta, playerPos = new THREE.Vector3(0, 0, 0)) {
        if (this.escorts.instancedMesh) {
            for (let i = 0; i < this.escorts.escortData.length; i++) {
                const d = this.escorts.escortData[i];

                if (d.isDead) {
                    this._dummy.scale.setScalar(0);
                    this._dummy.updateMatrix();
                    this.escorts.instancedMesh.setMatrixAt(i, this._dummy.matrix);
                    continue;
                }

                // --- MOVIMIENTO ORGÁNICO CON FOLLOW-LAG ---
                const t = time * d.speed;

                // Persecución sutil de la posición del jugador para dar agresividad
                const followX = playerPos.x * 0.15;
                const followY = playerPos.y * 0.15;

                const wobbleX = Math.sin(t + d.phase) * d.amplitude + followX;
                const wobbleY = Math.cos(t * 0.8 + d.phase) * d.amplitude + followY;

                this._dummy.position.set(
                    d.basePos.x + wobbleX,
                    d.basePos.y + wobbleY,
                    d.basePos.z + Math.sin(t * 0.3) * 50
                );

                // --- BANKING CINEMÁTICO (Inclinación) ---
                const roll = -Math.cos(t + d.phase) * 0.6;
                const pitch = Math.sin(t * 0.8 + d.phase) * 0.2;
                this._dummy.rotation.set(pitch, 0, roll);

                const pulse = 1 + Math.sin(t * 2) * 0.02;
                this._dummy.scale.setScalar(100 * pulse);

                this._dummy.updateMatrix();
                this.escorts.instancedMesh.setMatrixAt(i, this._dummy.matrix);

                // --- LÓGICA DE DISPARO ---
                d.fireCooldown -= delta;
                if (d.fireCooldown <= 0) {
                    const worldPos = new THREE.Vector3();
                    worldPos.setFromMatrixPosition(this._dummy.matrix);
                    worldPos.applyMatrix4(this.escortGroup.matrixWorld);

                    this.spawnEnemyLaser(worldPos, playerPos);
                    d.fireCooldown = d.fireRate + Math.random() * 100;
                }
            }
            this.escorts.instancedMesh.instanceMatrix.needsUpdate = true;
        }
        this._updateLasers(delta);
    }

    _updateLasers(delta) {
        let eIdx = 0, pIdx = 0;
        for (let i = this.laserData.length - 1; i >= 0; i--) {
            const l = this.laserData[i];
            const speed = l.type === 'player' ? 15000 : 9000;

            l.pos.addScaledVector(l.dir, speed * delta);
            l.life -= delta;

            if (l.life <= 0) {
                this.laserData.splice(i, 1);
                continue;
            }

            this._dummy.position.copy(l.pos);
            this._dummy.lookAt(this._tempV3.copy(l.pos).add(l.dir));

            // Estela larga (Z = 120) para dar sensación de velocidad cinematográfica
            this._dummy.scale.set(3, 3, 120);
            this._dummy.updateMatrix();

            if (l.type === 'enemy' && eIdx < this.maxPool) {
                this.enemyLasers.setMatrixAt(eIdx++, this._dummy.matrix);
            } else if (l.type === 'player' && pIdx < this.maxPool) {
                this.playerLasers.setMatrixAt(pIdx++, this._dummy.matrix);
            }
        }

        // Limpieza de instancias sobrantes
        this._dummy.scale.setScalar(0);
        this._dummy.updateMatrix();
        for (let i = eIdx; i < this.maxPool; i++) this.enemyLasers.setMatrixAt(i, this._dummy.matrix);
        for (let i = pIdx; i < this.maxPool; i++) this.playerLasers.setMatrixAt(i, this._dummy.matrix);

        this.enemyLasers.instanceMatrix.needsUpdate = true;
        this.playerLasers.instanceMatrix.needsUpdate = true;
    }
}