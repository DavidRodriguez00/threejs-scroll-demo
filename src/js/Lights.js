import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

// Inicialización de la librería para luces de área (reflejos físicos PBR)
try {
    RectAreaLightUniformsLib.init();
} catch (e) {
    console.warn("RectAreaLightUniformsLib ya estaba inicializada o falló.");
}

/**
 * Clase Lights: Motor de iluminación física e hiperrealista.
 */
export class Lights {
    constructor(scene, cockpitGroup) {
        if (!scene || !cockpitGroup) {
            console.error("Lights requiere 'scene' y 'cockpitGroup' válidos.");
            return;
        }

        // --- 1. EL SOL (Luz Direccional Cruda) ---
        this.sun = new THREE.DirectionalLight(0xffffff, 4);
        this.sun.position.set(1200, 1600, 1000);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(4096, 4096);
        this.sun.shadow.camera.near = 10;
        this.sun.shadow.camera.far = 10000;
        this.sun.shadow.bias = -0.00002;
        this.sun.shadow.normalBias = 0.02;
        scene.add(this.sun);

        // --- 2. LUZ AMBIENTAL (Radiación de Fondo) ---
        this.ambient = new THREE.HemisphereLight(0x050508, 0x000000, 0.2);
        scene.add(this.ambient);

        // --- 3. REBOTE INTERIOR (Indirect Lighting) ---
        this.bounceLight = new THREE.PointLight(0xffffff, 0.4, 8);
        this.bounceLight.position.set(0, -1, -0.5);
        cockpitGroup.add(this.bounceLight);

        // --- 4. REFLEJOS ÓPTICOS EN EL CRISTAL ---
        this.lensGlintL = new THREE.PointLight(0xffffff, 0, 4);
        this.lensGlintR = new THREE.PointLight(0xffffff, 0, 4);
        this.lensGlintL.position.set(-1.8, 2.2, 1.0);
        this.lensGlintR.position.set(1.8, 2.2, 1.0);
        cockpitGroup.add(this.lensGlintL, this.lensGlintR);

        // --- 5. FLASH DE DISPARO (Efecto Xenón / Flash de Móvil) ---
        this.combatFlash = new THREE.PointLight(0xeef5ff, 0, 60);
        this.combatFlash.position.set(0, 1.8, 1.5);
        cockpitGroup.add(this.combatFlash);

        // --- 6. INSTRUMENTACIÓN FÍSICA ---
        this.hudAccent = new THREE.PointLight(0x00ffff, 0.15, 2);
        this.hudAccent.position.set(0, -0.5, 0.8);
        cockpitGroup.add(this.hudAccent);

        // --- 7. ALARMAS DE ESTRÉS ESTRUCTURAL ---
        this.alarmLeft = new THREE.PointLight(0xff1100, 0, 12);
        this.alarmRight = new THREE.PointLight(0xff1100, 0, 12);
        this.alarmLeft.position.set(-2.8, 0.8, 1.5);
        this.alarmRight.position.set(2.8, 0.8, 1.5);
        cockpitGroup.add(this.alarmLeft, this.alarmRight);

        this._lastTime = 0;
    }

    /**
     * Dispara un destello de luz crudo.
     */
    triggerCombatFlash(color = 0xffffff, power = 40.0) {
        if (!this.combatFlash) return;
        this.combatFlash.color.setHex(color);
        this.combatFlash.intensity = power;
    }

    /**
     * Actualiza la dinámica de luces.
     */
    update(time, speed) {
        const delta = time - this._lastTime;
        this._lastTime = time;

        if (this.combatFlash && this.combatFlash.intensity > 0) {
            this.combatFlash.intensity *= Math.pow(0.001, delta);
            if (this.combatFlash.intensity < 0.1) this.combatFlash.intensity = 0;
        }

        const glintWave = Math.sin(time * 0.2);
        const glintBase = 0.05 + (glintWave > 0.8 ? (glintWave - 0.8) * 2 : 0);
        this.lensGlintL.intensity = glintBase + (Math.random() * 0.02);
        this.lensGlintR.intensity = glintBase + (Math.random() * 0.02);

        if (speed > 18) {
            const strobe = Math.sin(time * 40) > 0.8 ? 1 : 0;
            this.alarmLeft.intensity = strobe * (speed * 0.5);
            this.alarmRight.intensity = strobe * (speed * 0.5);
            this.bounceLight.intensity = 0.4 + (Math.random() * 0.3);
            this.hudAccent.intensity = 0.3 + (Math.random() * 0.5);
        } else {
            this.alarmLeft.intensity = THREE.MathUtils.lerp(this.alarmLeft.intensity, 0, 0.1);
            this.alarmRight.intensity = THREE.MathUtils.lerp(this.alarmRight.intensity, 0, 0.1);
            this.bounceLight.intensity = 0.4;
            this.hudAccent.intensity = 0.15;
        }
    }
}