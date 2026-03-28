import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();

export class Lights {
    constructor(scene, cockpitGroup, config = {}) {
        if (!scene || !cockpitGroup) {
            throw new Error("Lights requiere 'scene' y 'cockpitGroup'.");
        }

        this.scene = scene;
        this.cockpitGroup = cockpitGroup;

        this.cfg = {
            sunIntensity: 4.5,
            ambientIntensity: 0.4,
            maxFlyByLights: 3,
            ...config
        };

        this._time = 0;
        this.flyByLights = [];

        this._initLights();
    }

    _initLights() {
        this._createSun();
        this._createAmbient();
        this._createCockpitLights();
        this._createEffects();
        this._createFlyByPool();
    }

    // ---------- FLYBY POOL ----------
    _createFlyByPool() {
        const { maxFlyByLights } = this.cfg;

        for (let i = 0; i < maxFlyByLights; i++) {
            const light = new THREE.PointLight(0x00ff00, 0, 30, 2);
            light.position.set(0, 0, 0);
            this.cockpitGroup.add(light);

            this.flyByLights.push({
                light,
                active: false,
                speed: 0
            });
        }
    }

    triggerFlyBy(color = 0x00ff00) {
        const fbl = this.flyByLights.find(l => !l.active);
        if (!fbl) return;

        const rand = Math.random;

        fbl.active = true;
        fbl.light.color.setHex(color);
        fbl.light.intensity = 40 + rand() * 40;

        fbl.light.position.set(
            (rand() - 0.5) * 10,
            (rand() - 0.5) * 8,
            -10
        );

        fbl.speed = 100 + rand() * 50;
    }

    // ---------- LIGHT CREATION ----------

    _createSun() {
        const sun = new THREE.DirectionalLight(0xffffff, this.cfg.sunIntensity);
        sun.position.set(1200, 1600, 1000);
        sun.castShadow = true;
        sun.shadow.mapSize.set(2048, 2048);

        this.scene.add(sun);
        this.sun = sun;
    }

    _createAmbient() {
        const ambient = new THREE.HemisphereLight(0x0a0a15, 0x000000, this.cfg.ambientIntensity);
        this.scene.add(ambient);
        this.ambient = ambient;
    }

    _createCockpitLights() {
        this.bounceLight = new THREE.PointLight(0x44aaff, 0.6, 10);
        this.bounceLight.position.set(0, -0.8, -0.2);

        this.engineGlow = new THREE.PointLight(0x0088ff, 0, 15);
        this.engineGlow.position.set(0, 0, -3);

        this.alarmLeft = new THREE.PointLight(0xff0000, 0, 15);
        this.alarmRight = new THREE.PointLight(0xff0000, 0, 15);

        this.alarmLeft.position.set(-3, 1, 1);
        this.alarmRight.position.set(3, 1, 1);

        this.cockpitGroup.add(
            this.bounceLight,
            this.engineGlow,
            this.alarmLeft,
            this.alarmRight
        );
    }

    _createEffects() {
        this.combatFlash = new THREE.PointLight(0xffffff, 0, 100);
        this.combatFlash.position.set(0, 1.5, 2.0);

        this.shortCircuit = new THREE.PointLight(0xffffff, 0, 8);

        this.cockpitGroup.add(this.combatFlash, this.shortCircuit);
    }

    triggerCombatFlash(color = 0xffffff, power = 60) {
        this.combatFlash.color.setHex(color);
        this.combatFlash.intensity = power;
    }

    // ---------- UPDATE ----------

    update(delta, speed) {
        this._time += delta;

        // Oscilación (sin crear objeto nuevo cada frame)
        this.oscillationX = Math.sin(this._time * 0.8) * 0.015;
        this.oscillationY = Math.cos(this._time * 0.5) * 0.015;
        this.oscillationRoll = Math.sin(this._time * 0.3) * 0.005;

        this._updateCombatFlash(delta);
        this._updateEngine(speed);
        this._updateState(speed);
        this._updateFlyBy(delta);
    }

    _updateFlyBy(delta) {
        for (let i = 0; i < this.flyByLights.length; i++) {
            const fbl = this.flyByLights[i];
            if (!fbl.active) continue;

            const light = fbl.light;

            light.position.z += fbl.speed * delta;
            light.intensity *= 0.92;

            if (light.position.z > 15 || light.intensity < 0.1) {
                fbl.active = false;
                light.intensity = 0;
            }
        }
    }

    _updateCombatFlash(delta) {
        const light = this.combatFlash;
        if (light.intensity <= 0) return;

        light.intensity *= Math.exp(-12 * delta);

        if (light.intensity < 0.05) {
            light.intensity = 0;
        }
    }

    _updateEngine(speed) {
        const target = speed > 10 ? (speed - 10) * 2 : 0.5;

        this.engineGlow.intensity = THREE.MathUtils.lerp(
            this.engineGlow.intensity,
            target,
            0.1
        );
    }

    _updateState(speed) {
        const inCombat = speed > 18;
        const target = inCombat ? 5 : 0;

        this.alarmLeft.intensity = THREE.MathUtils.lerp(this.alarmLeft.intensity, target, 0.1);
        this.alarmRight.intensity = THREE.MathUtils.lerp(this.alarmRight.intensity, target, 0.1);
    }
}