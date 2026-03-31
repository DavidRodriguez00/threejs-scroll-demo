import * as THREE from 'three';

export class EscortSystem {
    constructor(loader) {
        this.loader = loader;
        this.instancedMesh = null;
        this.data = [];
        this._onKill = () => {};
    }

    init(scene) {
        this.scene = scene;
    }

    setOnKill(cb) { 
        this._onKill = cb; 
    }

    async load(group) {
        // ✅ FIX aquí
        const result = await this.loader.loadEscorts(5);

        // 🛡️ Protección anti-crash
        if (!result || !result.mesh) {
            throw new Error('EscortSystem: loadEscorts devolvió undefined');
        }

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
                d.basePos.y + Math.cos(t * 0.7 + d.phase) * d.amplitude,
                d.basePos.z + Math.sin(t * 0.4) * (d.amplitude * 0.3)
            );

            dummy.lookAt(dummy.position.x, dummy.position.y, 10000);
            dummy.scale.setScalar(500);
            dummy.updateMatrix();

            this.instancedMesh.setMatrixAt(i, dummy.matrix);

            // 🔫 Disparo
            d.fireCooldown -= delta;
            if (d.fireCooldown <= 0) {
                const worldPos = new THREE.Vector3();
                worldPos.setFromMatrixPosition(dummy.matrix);
                worldPos.applyMatrix4(this.scene.matrixWorld);

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

            if (this._onKill) {
                this._onKill(this.getWorldPosition(index));
            }
        }
    }
}