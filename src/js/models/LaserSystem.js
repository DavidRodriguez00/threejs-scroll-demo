// src/js/models/LaserSystem.js
import * as THREE from 'three';

export class LaserSystem {
    constructor() {
        this.maxPool = 200;
        this.enemyLasers = null;
        this.playerLasers = null;
        this.laserData = [];
        this._dummy = new THREE.Object3D();
        this._tempV3 = new THREE.Vector3();
    }

    init(scene) {
        const geom = new THREE.CylinderGeometry(0.8, 0.8, 50, 4);
        geom.rotateX(Math.PI / 2);

        const matRed = new THREE.MeshBasicMaterial({ color: 0xff0000, toneMapped: false });
        const matGreen = new THREE.MeshBasicMaterial({ color: 0x00ff00, toneMapped: false });

        this.enemyLasers = new THREE.InstancedMesh(geom, matRed, this.maxPool);
        this.playerLasers = new THREE.InstancedMesh(geom, matGreen, this.maxPool);

        this.enemyLasers.renderOrder = 999;
        this.playerLasers.renderOrder = 999;
        this.enemyLasers.frustumCulled = false;
        this.playerLasers.frustumCulled = false;

        scene.add(this.enemyLasers, this.playerLasers);
    }

    spawnPlayerLaser(camera) {
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        camera.getWorldPosition(pos);
        camera.getWorldDirection(dir);
        pos.addScaledVector(dir, 100);
        this.laserData.push({ pos: pos.clone(), dir: dir.clone(), life: 2, type: 'player', speed: 16000 });
    }

    spawnEnemyLaser(originPos, playerPos) {
        const dir = new THREE.Vector3().subVectors(playerPos, originPos).normalize();
        const accuracy = 0.08;
        dir.x += (Math.random() - 0.5) * accuracy;
        dir.y += (Math.random() - 0.5) * accuracy;
        dir.normalize();
        this.laserData.push({ pos: originPos.clone(), dir, life: 3.5, type: 'enemy', speed: 8000 });
    }

    update(delta) {
        if (!this.enemyLasers || !this.playerLasers) return;

        let eIdx = 0, pIdx = 0;
        const outOfView = new THREE.Vector3(99999, 99999, 99999);

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
            this._dummy.scale.set(10, 10, 300);
            this._dummy.updateMatrix();

            if (l.type === 'enemy' && eIdx < this.maxPool) this.enemyLasers.setMatrixAt(eIdx++, this._dummy.matrix);
            if (l.type === 'player' && pIdx < this.maxPool) this.playerLasers.setMatrixAt(pIdx++, this._dummy.matrix);
        }

        this._dummy.position.copy(outOfView);
        this._dummy.scale.setScalar(0);
        this._dummy.updateMatrix();
        for (let i = eIdx; i < this.maxPool; i++) this.enemyLasers.setMatrixAt(i, this._dummy.matrix);
        for (let i = pIdx; i < this.maxPool; i++) this.playerLasers.setMatrixAt(i, this._dummy.matrix);

        this.enemyLasers.instanceMatrix.needsUpdate = true;
        this.playerLasers.instanceMatrix.needsUpdate = true;
    }
}