import * as THREE from 'three';

export class MovementSystem {
    constructor(models, state) {
        this.models = models;
        this.state = state;
    }

    update(time) {
        const group = this.models.targetGroup;

        // 🛡️ Protección clave
        if (!group) return;

        const zBase = 4800;
        const speedOffset = this.state.speed * 20;

        const targetX = -this.state.smoothMouse.x * 700;
        const targetY = this.state.smoothMouse.y * 400;

        group.position.x = THREE.MathUtils.lerp(group.position.x, targetX, 0.03);
        group.position.y = THREE.MathUtils.lerp(group.position.y, targetY, 0.03);
        group.position.z = -(zBase + speedOffset);

        // 🎯 Rotación (tilt)
        const tiltX = this.state.smoothMouse.y * 0.12;
        const tiltZ = -this.state.smoothMouse.x * 0.20;

        group.rotation.x = THREE.MathUtils.lerp(group.rotation.x, tiltX, 0.02);
        group.rotation.z = THREE.MathUtils.lerp(group.rotation.z, tiltZ, 0.02);

        // 🌑 Death Star opcional
        if (this.models.deathStar) {
            this.models.deathStar.rotation.y += 0.0002;
        }
    }
}