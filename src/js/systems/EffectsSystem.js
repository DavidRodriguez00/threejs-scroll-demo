import * as THREE from 'three';

export class EffectsSystem {
    constructor(scene) {
        this.scene = scene;
        this.effects = [];

        this.geometry = new THREE.SphereGeometry(20, 8, 8);
        this.material = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
    }

    spawnExplosion(position) {
        const mesh = new THREE.Mesh(this.geometry, this.material.clone());
        mesh.position.copy(position);

        this.scene.add(mesh);

        this.effects.push({
            mesh,
            life: 1.0
        });
    }

    update(delta) {
        for (let i = this.effects.length - 1; i >= 0; i--) {
            const e = this.effects[i];

            e.life -= delta;

            e.mesh.scale.multiplyScalar(1.1);
            e.mesh.material.opacity = e.life;
            e.mesh.material.transparent = true;

            if (e.life <= 0) {
                this.scene.remove(e.mesh);
                this.effects.splice(i, 1);
            }
        }
    }
}