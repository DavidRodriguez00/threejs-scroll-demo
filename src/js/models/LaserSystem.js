import * as THREE from 'three';

export class LaserSystem {
    constructor(maxPool = 200) {
        this.maxPool = maxPool;
        this.enemyLasers = null;
        this.playerLasers = null;
        this.laserData = [];
        this._dummy = new THREE.Object3D();
        this._tempV3 = new THREE.Vector3();
    }

    init(scene) {
        // Geometría afilada: más fina en la punta para efecto de proyectil
        const geometry = new THREE.CylinderGeometry(0.2, 0.8, 1, 4); 
        geometry.rotateX(Math.PI / 2);

        // MATERIAL BRUTAL: Combinación de Aditivo y No-Iluminación
        const createLaserMat = (color) => new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 1,
            blending: THREE.AdditiveBlending, // Suma colores: el cruce de láseres brilla más
            depthWrite: false, // Optimiza render y evita bordes negros
            toneMapped: false
        });

        this.enemyLasers = new THREE.InstancedMesh(geometry, createLaserMat(0xff2222), this.maxPool);
        this.playerLasers = new THREE.InstancedMesh(geometry, createLaserMat(0x22ff22), this.maxPool);

        // Prioridad de render máxima
        this.enemyLasers.renderOrder = 2000;
        this.playerLasers.renderOrder = 2000;

        scene.add(this.enemyLasers, this.playerLasers);
    }

    spawnPlayerLaser(camera) {
        const pos = new THREE.Vector3();
        const dir = new THREE.Vector3();
        camera.getWorldPosition(pos);
        camera.getWorldDirection(dir);
        pos.addScaledVector(dir, 45);

        this.laserData.push({ pos: pos.clone(), dir: dir.clone(), life: 1.5, type: 'player' });
    }

    spawnEnemyLaser(originPos, playerPos) {
        if (!originPos) return;
        const origin = originPos.clone();
        const target = playerPos ? playerPos.clone() : new THREE.Vector3(0, 0, 0);
        const dir = new THREE.Vector3().subVectors(target, origin).normalize();

        // Dispersión sutil
        const deviation = 0.03;
        dir.x += (Math.random() - 0.5) * deviation;
        dir.y += (Math.random() - 0.5) * deviation;
        dir.normalize();

        this.laserData.push({ pos: origin, dir: dir, life: 3.5, type: 'enemy' });
    }

    update(delta) {
        let eIdx = 0, pIdx = 0;
        for (let i = this.laserData.length - 1; i >= 0; i--) {
            const l = this.laserData[i];
            const speed = l.type === 'player' ? 18000 : 11000;

            l.pos.addScaledVector(l.dir, speed * delta);
            l.life -= delta;

            if (l.life <= 0) {
                this.laserData.splice(i, 1);
                continue;
            }

            this._dummy.position.copy(l.pos);
            this._dummy.lookAt(this._tempV3.copy(l.pos).add(l.dir));
            
            // LONGITUD DINÁMICA: El láser se estira proporcionalmente a su velocidad
            // Esto crea un "Motion Blur" natural que se ve increíble en movimiento
            const stretch = speed * delta * 1.5; 
            this._dummy.scale.set(4, 4, Math.max(100, stretch)); 
            this._dummy.updateMatrix();

            if (l.type === 'enemy' && eIdx < this.maxPool) {
                this.enemyLasers.setMatrixAt(eIdx++, this._dummy.matrix);
            } else if (l.type === 'player' && pIdx < this.maxPool) {
                this.playerLasers.setMatrixAt(pIdx++, this._dummy.matrix);
            }
        }

        this._dummy.scale.setScalar(0);
        this._dummy.updateMatrix();
        for (let i = eIdx; i < this.maxPool; i++) this.enemyLasers.setMatrixAt(i, this._dummy.matrix);
        for (let i = pIdx; i < this.maxPool; i++) this.playerLasers.setMatrixAt(i, this._dummy.matrix);

        this.enemyLasers.instanceMatrix.needsUpdate = true;
        this.playerLasers.instanceMatrix.needsUpdate = true;
    }
}