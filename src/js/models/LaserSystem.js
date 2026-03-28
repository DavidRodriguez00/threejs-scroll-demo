import * as THREE from 'three';

export class LaserSystem {
    constructor(maxPool = 300) { // Subimos el pool para batallas masivas
        this.maxPool = maxPool;
        this.enemyLasers = null;
        this.playerLasers = null;
        this.laserData = [];
        this._dummy = new THREE.Object3D();
        this._tempV3 = new THREE.Vector3();
        
        // Posición de "reposo" para instancias no usadas
        this._deadPos = new THREE.Vector3(0, 0, -99999);
    }

    init(scene) {
        // Geometría low-poly para rendimiento extremo
        const geometry = new THREE.CylinderGeometry(0.2, 0.8, 1, 4); 
        geometry.rotateX(Math.PI / 2);

        const createLaserMat = (color) => new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            toneMapped: false // Permite que el Bloom lo haga brillar
        });

        this.enemyLasers = new THREE.InstancedMesh(geometry, createLaserMat(0xff2222), this.maxPool);
        this.playerLasers = new THREE.InstancedMesh(geometry, createLaserMat(0x22ff22), this.maxPool);

        // Aseguramos que se vean por encima de casi todo
        this.enemyLasers.renderOrder = 2000;
        this.playerLasers.renderOrder = 2000;
        
        // Evitamos que Three.js los oculte si el origen del mesh (0,0,0) sale de cámara
        this.enemyLasers.frustumCulled = false;
        this.playerLasers.frustumCulled = false;

        scene.add(this.enemyLasers, this.playerLasers);
    }

    spawnPlayerLaser(camera) {
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        camera.getWorldPosition(pos);
        camera.getWorldDirection(dir);
        
        // Salida ligeramente adelantada al cockpit
        pos.addScaledVector(dir, 50);

        this.laserData.push({ 
            pos: pos.clone(), 
            dir: dir.clone(), 
            life: 2.0, 
            type: 'player',
            speed: 18000 
        });
    }

    spawnEnemyLaser(originPos, playerPos) {
        if (!originPos) return;
        
        const dir = new THREE.Vector3().subVectors(playerPos, originPos).normalize();

        // Dispersión sutil fija (determinista si quisieras, pero aquí es aleatoria)
        const deviation = 0.04;
        dir.x += (Math.random() - 0.5) * deviation;
        dir.y += (Math.random() - 0.5) * deviation;
        dir.normalize();

        this.laserData.push({ 
            pos: originPos.clone(), 
            dir: dir, 
            life: 4.0, 
            type: 'enemy',
            speed: 9500 
        });
    }

    /**
     * @param {number} delta - Debe ser el scaledDelta de tu RenderLoop
     */
    update(delta) {
        let eIdx = 0, pIdx = 0;

        for (let i = this.laserData.length - 1; i >= 0; i--) {
            const l = this.laserData[i];
            
            // Movimiento basado en tiempo lógico
            l.pos.addScaledVector(l.dir, l.speed * delta);
            l.life -= delta;

            if (l.life <= 0) {
                this.laserData.splice(i, 1);
                continue;
            }

            this._dummy.position.copy(l.pos);
            this._dummy.lookAt(this._tempV3.copy(l.pos).add(l.dir));
            
            // EFECTO VISUAL: El estiramiento debe ignorar el delta del slow-mo
            // para que los láseres no se vean "cortos" cuando el tiempo se ralentiza.
            // Usamos un valor base + una escala visual constante.
            const visualLength = l.type === 'player' ? 350 : 200;
            this._dummy.scale.set(5, 5, visualLength); 
            this._dummy.updateMatrix();

            if (l.type === 'enemy' && eIdx < this.maxPool) {
                this.enemyLasers.setMatrixAt(eIdx++, this._dummy.matrix);
            } else if (l.type === 'player' && pIdx < this.maxPool) {
                this.playerLasers.setMatrixAt(pIdx++, this._dummy.matrix);
            }
        }

        // LIMPIEZA DE MATRICES (Instancias inactivas)
        this._dummy.position.copy(this._deadPos);
        this._dummy.scale.setScalar(0);
        this._dummy.updateMatrix();

        for (let i = eIdx; i < this.maxPool; i++) this.enemyLasers.setMatrixAt(i, this._dummy.matrix);
        for (let i = pIdx; i < this.maxPool; i++) this.playerLasers.setMatrixAt(i, this._dummy.matrix);

        this.enemyLasers.instanceMatrix.needsUpdate = true;
        this.playerLasers.instanceMatrix.needsUpdate = true;
    }
}