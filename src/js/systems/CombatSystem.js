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
        // 1. DISPARO DEL JUGADOR
        if (this.state.isMouseDown && time - this.state.lastPlayerFireTime > 0.12) {
            this.models.spawnPlayerLaser(camera);

            // EFECTO BRUTAL: Disparo = Flash de luz + Pico de Bloom
            this.lights.triggerCombatFlash(0x00ff00, 2.0);
            
            // Accedemos al SceneManager para forzar un pico de brillo en el PostProcessing
            if (this.sm.post) {
                this.sm.updateVisuals(this.state.speed, true); 
            }

            this.state.lastPlayerFireTime = time;
        }

        // 2. DISPARO ENEMIGO (IA AGRESIVA)
        const chance = this.state.speed > 15 ? 0.2 : 0.08;

        if (Math.random() < chance && time - this.state.lastFireTime > 0.15) {
            const escorts = this.models.escorts.escortData;

            if (escorts && escorts.length > 0) {
                const idx = Math.floor(Math.random() * escorts.length);
                const data = escorts[idx];

                if (!data.isDead) {
                    this.models.escorts.instancedMesh.getMatrixAt(idx, this._tempMatrix);
                    this._tempWorldPos.setFromMatrixPosition(this._tempMatrix);
                    this._tempWorldPos.applyMatrix4(this.models.escortGroup.matrixWorld);

                    // MEJORA: Predicción de tiro sutil
                    // En lugar de disparar a donde ESTÁ el jugador, disparan a donde ESTARÁ
                    // basándose en el movimiento lateral de la cámara.
                    const leadTarget = camera.position.clone();
                    leadTarget.x += this.state.smoothMouse.x * 50; 
                    leadTarget.y -= this.state.smoothMouse.y * 50;

                    this.models.spawnEnemyLaser(this._tempWorldPos, leadTarget);

                    if (Math.random() > 0.85) {
                        this.lights.triggerCombatFlash(0xff0000, 1.2);
                        // El flash rojo del enemigo también afecta al Bloom de forma sutil
                        this.sm.updateVisuals(this.state.speed, true);
                    }
                }
            }
            this.state.lastFireTime = time;
        }
    }
}