import * as THREE from 'three';

export class CollisionSystem {
    constructor(models, effects, state, sm) {
        this.models = models;
        this.effects = effects;
        this.state = state; // Para el Hitstop
        this.sm = sm;       // Para el Bloom y sacudida de cámara

        this._worldPos = new THREE.Vector3();
        this._tempMatrix = new THREE.Matrix4();
    }

    update() {
        const lasers = this.models.laserData;
        const escorts = this.models.escorts.escortData;
        const instancedMesh = this.models.escorts.instancedMesh;

        if (!instancedMesh || lasers.length === 0) return;

        // Iteramos láseres (atrás hacia adelante para seguridad al eliminar)
        for (let i = lasers.length - 1; i >= 0; i--) {
            const l = lasers[i];

            // Solo los láseres del jugador tienen colisión activa contra enemigos
            if (l.type !== 'player') continue;

            for (let j = 0; j < escorts.length; j++) {
                const escort = escorts[j];
                if (escort.isDead) continue;

                // 1. LEER LA VERDAD DE LA GPU
                // En lugar de calcular senos y cosenos, pedimos la matriz exacta 
                // que el EscortSystem acaba de escribir para ese frame.
                instancedMesh.getMatrixAt(j, this._tempMatrix);

                // 2. EXTRAER POSICIÓN MUNDIAL REAL
                this._worldPos.setFromMatrixPosition(this._tempMatrix);
                this._worldPos.applyMatrix4(this.models.escortGroup.matrixWorld);

                // 3. CÁLCULO DE DISTANCIA
                const dist = l.pos.distanceTo(this._worldPos);

                // Radio ajustado: 45 es un balance perfecto para las naves caza
                if (dist < 45) {
                    this.handleHit(escort, j, this._worldPos, i);
                    break; 
                }
            }
        }
    }

    handleHit(escort, index, position, laserIndex) {
        // A. Marcamos muerte
        escort.isDead = true;

        // B. Eliminamos el láser impactado
        this.models.laserData.splice(laserIndex, 1);

        // C. EFECTO HITSTOP (Brutalidad técnica)
        // Congelamos el avance del tiempo un instante para enfatizar el impacto
        this.state.timeScale = 0.05; 
        setTimeout(() => { this.state.timeScale = 1.0; }, 80); 

        // D. FEEDBACK VISUAL
        this.effects.spawnExplosion(position);
        
        // Disparamos un pico de luz masivo en el post-procesado
        if (this.sm.post) {
            this.sm.updateVisuals(this.state.speed, true); 
        }

        // E. SACUDIDA DE CÁMARA (Impulso por explosión)
        // Esto añade una sensación física de que algo ha explotado cerca
        this.state.cameraShake = 1.5; 
    }
}