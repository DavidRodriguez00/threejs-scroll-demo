import * as THREE from 'three';

export class EscoltSystem {
    constructor(group, laserSystem) {
        this.group = group;
        this.lasers = laserSystem;
        this.instancedMesh = null;
        this.escoltData = [];
        this._dummy = new THREE.Object3D();
        this._worldPos = new THREE.Vector3();

        // Vectores para cálculos de inercia sin crear objetos nuevos (GC Friendly)
        this._currentPos = new THREE.Vector3();
        this._lastPos = []; // Guardaremos la posición anterior de cada escolta
    }

    init({ mesh, data }) {
        this.instancedMesh = mesh;
        this.escoltData = data;
        this.instancedMesh.frustumCulled = false;

        // Inicializar histórico de posiciones para el cálculo de velocidad/rotación
        this._lastPos = data.map(d => d.basePos.clone());

        this.group.add(this.instancedMesh);
    }

    update(time, delta, playerPos = new THREE.Vector3(0, 0, 0)) {
        if (!this.instancedMesh) return;

        // Dentro del bucle de actualización de EscoltSystem.js
        for (let i = 0; i < this.escoltData.length; i++) {
            const d = this.escoltData[i];
            const t = time * d.speed;

            // 1. Posición con "Lag" elástico (te siguen con inercia)
            const targetX = d.basePos.x + Math.sin(t + d.phase) * d.amplitude + (playerPos.x * 0.15);
            const targetY = d.basePos.y + Math.cos(t * 0.8 + d.phase) * d.amplitude + (playerPos.y * 0.15);

            // 2. Calculamos la dirección del movimiento para el Banking
            const nextPos = new THREE.Vector3(targetX, targetY, d.basePos.z + Math.sin(t * 0.5) * 100);
            const movementDir = nextPos.clone().sub(this._dummy.position);

            this._dummy.position.copy(nextPos);

            // 3. BANKING BRUTAL: Roll basado en velocidad lateral
            const roll = -movementDir.x * 0.05;
            const pitch = movementDir.y * 0.02;

            this._dummy.rotation.set(pitch, 0, roll);

            // 4. Micro-vibración de motores
            const shake = Math.sin(time * 20 + d.phase) * 0.5;
            this._dummy.position.x += shake;

            this._dummy.scale.setScalar(100);
            this._dummy.updateMatrix();
            this.instancedMesh.setMatrixAt(i, this._dummy.matrix);

            // ... resto de lógica de disparo


            // 4. DISPARO INTELIGENTE
            d.fireCooldown -= delta;
            if (d.fireCooldown <= 0) {
                this._worldPos.setFromMatrixPosition(this._dummy.matrix);
                this._worldPos.applyMatrix4(this.group.matrixWorld);
                this.lasers.spawnEnemyLaser(this._worldPos, playerPos);
                d.fireCooldown = d.fireRate + Math.random() * 0.5;
            }
        }
        this.instancedMesh.instanceMatrix.needsUpdate = true;
    }
}