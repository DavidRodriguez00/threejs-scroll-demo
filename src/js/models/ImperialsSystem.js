// src/js/models/ImperialsSystem.js
import * as THREE from 'three';

export class ImperialsSystem {
    constructor(loader) {
        this.loader = loader;
        this.instancedMesh = null;
        this.data = [];
        this._onKill = () => {};
    }

    init(scene) {
        this.scene = scene;
    }

    setOnKill(cb) { this._onKill = cb; }

    async load(group) {
        const result = await this.loader.loadEscorts(6); // Flota imperial
        this.instancedMesh = result.mesh;
        this.data = result.data;
        group.add(this.instancedMesh);
    }

    update(time, delta, playerPos, laserSystem) {
        if (!this.instancedMesh) return;
        const dummy = new THREE.Object3D();

        for (let i = 0; i < this.data.length; i++) {
            const d = this.data[i];
            if (d.isDead) {
                dummy.scale.setScalar(0);
                dummy.updateMatrix();
                this.instancedMesh.setMatrixAt(i, dummy.matrix);
                continue;
            }

            const t = time * d.speed;
            dummy.position.set(
                d.basePos.x + Math.sin(t + d.phase) * d.amplitude,
                d.basePos.y + Math.cos(t * 0.8 + d.phase) * d.amplitude,
                d.basePos.z + Math.sin(t * 0.3) * 80
            );
            dummy.rotation.set(0, 0, 0);
            dummy.scale.setScalar(100);
            dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, dummy.matrix);

            d.fireCooldown -= delta;
            if (d.fireCooldown <= 0) {
                const worldPos = new THREE.Vector3();
                worldPos.setFromMatrixPosition(dummy.matrix);
                laserSystem.spawnEnemyLaser(worldPos, playerPos);
                d.fireCooldown = d.fireRate;
            }
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }

    getWorldPosition(index) {
        if (!this.instancedMesh || !this.data[index]) return null;
        const dummy = new THREE.Object3D();
        this.instancedMesh.getMatrixAt(index, dummy.matrix);
        return new THREE.Vector3().setFromMatrixPosition(dummy.matrix);
    }

    kill(index) {
        if (this.data[index]) {
            this.data[index].isDead = true;
            if (this._onKill) this._onKill(this.getWorldPosition(index));
        }
    }
}