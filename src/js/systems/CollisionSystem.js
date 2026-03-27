import * as THREE from 'three';

export class CollisionSystem {
    /**
     * @param {Models} models Referencia al gestor de mallas e instancias
     * @param {GameState} state Estado global para manipular velocidad y efectos
     * @param {SceneManager} sm Manager de escena para disparar efectos visuales
     */
    constructor(models, state, sm) {
        this.models = models;
        this.state = state; 
        this.sm = sm;       

        // Variables reutilizables para evitar la creación constante de objetos (GC Friendly)
        this._worldPos = new THREE.Vector3();
        this._tempMatrix = new THREE.Matrix4();
    }

    /**
     * Bucle de actualización del sistema de colisiones.
     * Chequea láseres del jugador contra grupos de enemigos.
     */
    update() {
        const lasers = this.models.laserData;
        if (!lasers || lasers.length === 0) return;

        // Lotes de enemigos vulnerables definidos en Models.js
        const batches = [this.models.escolts, this.models.interceptors];

        // Iteramos los láseres (hacia atrás para eliminar del array de forma segura)
        for (let i = lasers.length - 1; i >= 0; i--) {
            const l = lasers[i];

            // Solo los láseres del jugador chequean colisión contra enemigos
            if (l.type !== 'player') continue;

            let hitSomething = false;

            for (const batch of batches) {
                if (!batch || !batch.instancedMesh) continue;

                const data = batch.escortData;
                for (let j = 0; j < data.length; j++) {
                    const enemy = data[j];
                    
                    if (enemy.isDead) continue;

                    // 1. Obtener matriz de la instancia
                    batch.instancedMesh.getMatrixAt(j, this._tempMatrix);

                    // 2. Extraer posición mundial real
                    this._worldPos.setFromMatrixPosition(this._tempMatrix);
                    this._worldPos.applyMatrix4(this.models.escortGroup.matrixWorld);

                    // 3. Chequeo de distancia (Esfera de colisión)
                    const dist = l.pos.distanceTo(this._worldPos);

                    // Radio de 100: Ajustado al escalado visual de las naves
                    if (dist < 100) {
                        this.handleHit(enemy, this._worldPos, i);
                        hitSomething = true;
                        break; 
                    }
                }
                
                if (hitSomething) break;
            }
        }
    }

    /**
     * Gestiona las consecuencias de un impacto.
     */
    handleHit(enemy, position, laserIndex) {
        // Marcamos la nave como muerta (Models.update se encargará de escalarla a 0)
        enemy.isDead = true;
        
        // Eliminamos el láser
        this.models.laserData.splice(laserIndex, 1);

        // --- FEEDBACK VISUAL ---
        
        // 1. Disparar explosión de partículas (ahora en Models.js)
        this.models.spawnExplosion(position);

        // 2. Efecto Hitstop (Ralentización)
        // Si tu GameState tiene timeScale (usado en RenderLoop.js)
        if (this.state && typeof this.state.timeScale !== 'undefined') {
            const originalScale = this.state.timeScale;
            this.state.timeScale = 0.05; 
            
            setTimeout(() => { 
                this.state.timeScale = originalScale; 
            }, 80); 
        }

        // 3. Sacudida de cámara (Camera Shake)
        // Se procesa en SceneManager._applyCameraShake
        if (this.state && typeof this.state.cameraShake !== 'undefined') {
            this.state.cameraShake = 2.5; 
        }

        // 4. Flash de Bloom / Post-procesado
        // Utilizamos el método updateVisuals que existe en SceneManager.js
        if (this.sm && this.sm.updateVisuals) {
            // El segundo parámetro 'true' activa el pico de brillo (fireImpact) en PostProcessing.js
            this.sm.updateVisuals(this.state.speed || 1.0, true); 
        }
    }
}