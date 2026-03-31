import * as THREE from 'three';

export class CombatSystem {
    constructor(models, lights, state, sm) {
        this.models = models;
        this.lights = lights;
        this.state = state;
        this.sm = sm;

        this._tempWorldPos = new THREE.Vector3();
        this._tempMatrix = new THREE.Matrix4();
    }

    update(time, delta, camera) {
        // =========================
        // 1. DISPARO DEL JUGADOR
        // =========================
        if (this.state.isMouseDown && time - this.state.lastPlayerFireTime > 0.12) {
            // this.models.spawnPlayerLaser(camera);
            this.models.lasers.spawnPlayerLaser(camera);

            this.lights.triggerCombatFlash(0x00ff00, 2.0);

            if (this.sm.post) {
                this.sm.updateVisuals(this.state.speed, true);
            }

            this.state.lastPlayerFireTime = time;
        }

        // =========================
        // 2. DISPARO ENEMIGO
        // =========================
        if (!this.models.escorts?.instancedMesh) return;

        const chance = this.state.speed > 15 ? 0.2 : 0.08;

        if (Math.random() < chance && time - this.state.lastFireTime > 0.15) {
            const escorts = this.models.escorts.data;

            if (escorts && escorts.length > 0) {
                const idx = Math.floor(Math.random() * escorts.length);
                const data = escorts[idx];

                if (!data.isDead) {
                    this.models.escorts.instancedMesh.getMatrixAt(idx, this._tempMatrix);

                    this._tempWorldPos.setFromMatrixPosition(this._tempMatrix);

                    // ✅ FIX: usar instancedMesh
                    this._tempWorldPos.applyMatrix4(
                        this.models.escorts.instancedMesh.matrixWorld
                    );

                    // 🎯 Predicción de tiro
                    const leadTarget = camera.position.clone();
                    leadTarget.x += this.state.smoothMouse.x * 50;
                    leadTarget.y -= this.state.smoothMouse.y * 50;

                    // this.models.spawnEnemyLaser(this._tempWorldPos, leadTarget);
                    this.models.lasers.spawnEnemyLaser(this._tempWorldPos, leadTarget);

                    if (Math.random() > 0.85) {
                        this.lights.triggerCombatFlash(0xff0000, 1.2);
                        this.sm.updateVisuals(this.state.speed, true);
                    }
                }
            }

            this.state.lastFireTime = time;
        }
    }
}