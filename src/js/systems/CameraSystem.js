import * as THREE from 'three';

export class CameraSystem {
    constructor(state) {
        this.state = state;
    }

    update(camera) {
        camera.position.x = this.state.smoothMouse.x * 0.15;
        camera.position.y = -this.state.smoothMouse.y * 0.05;

        const roll = -this.state.smoothMouse.x * 0.15;
        camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, roll, 0.06);

        if (this.state.speed > 10) {
            const shake = Math.pow((this.state.speed - 10) / 15, 2) * 0.07;
            camera.position.x += (Math.random() - 0.5) * shake;
            camera.position.y += (Math.random() - 0.5) * shake;
        }

        const targetFOV = 70 + (this.state.speed * 1.2);
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.08);
        camera.updateProjectionMatrix();
    }
}