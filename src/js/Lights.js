import * as THREE from 'three';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();

export class Lights {
    constructor(scene, cockpitGroup, config = {}) {
        if (!scene || !cockpitGroup) throw new Error("Lights requiere 'scene' y 'cockpitGroup'.");

        this.scene = scene;
        this.cockpitGroup = cockpitGroup;

        this.cfg = {
            sunIntensity: 4.5,
            ambientIntensity: 0.4,
            maxFlyByLights: 3, // Máximo de disparos iluminando simultáneamente
            ...config
        };

        this._time = 0;
        this.flyByLights = []; // Pool de luces para disparos externos

        this._initLights();
    }

    _initLights() {
        this._createSun();
        this._createAmbient();
        this._createCockpitLights();
        this._createEffects();
        this._createFlyByPool(); // Inicializar luces de ráfaga
    }

    // --- NUEVO: POOL DE LUCES PARA DISPAROS EXTERNOS ---
    _createFlyByPool() {
        for (let i = 0; i < this.cfg.maxFlyByLights; i++) {
            const light = new THREE.PointLight(0x00ff00, 0, 30, 2);
            // Las posicionamos detrás de la cabina inicialmente
            light.position.set(0, 0, 0);
            this.cockpitGroup.add(light);

            this.flyByLights.push({
                light: light,
                active: false,
                speed: 0,
                color: new THREE.Color()
            });
        }
    }

    /**
     * Activa una luz que recorre la cabina de atrás hacia adelante
     * @param {number} color - Hexadecimal (0x00ff00 verde, 0x00aaff azul)
     */
    triggerFlyBy(color = 0x00ff00) {
        const fbl = this.flyByLights.find(l => !l.active);
        if (!fbl) return;

        fbl.active = true;
        fbl.light.color.setHex(color);
        fbl.light.intensity = 40 + Math.random() * 40; // Destello HDR

        // Aparece detrás en una posición X/Y aleatoria cerca del fuselaje
        fbl.light.position.set(
            (Math.random() - 0.5) * 10,
            (Math.random() - 0.5) * 8,
            -10
        );
        fbl.speed = 100 + Math.random() * 50; // Velocidad del proyectil
    }

    // --- MÉTODOS EXISTENTES (Actualizados) ---

    _createSun() {
        this.sun = new THREE.DirectionalLight(0xffffff, this.cfg.sunIntensity);
        this.sun.position.set(1200, 1600, 1000);
        this.sun.castShadow = true;
        this.sun.shadow.mapSize.set(2048, 2048); // Balance rendimiento/calidad
        this.scene.add(this.sun);
    }

    _createAmbient() {
        this.ambient = new THREE.HemisphereLight(0x0a0a15, 0x000000, this.cfg.ambientIntensity);
        this.scene.add(this.ambient);
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

        this.cockpitGroup.add(this.bounceLight, this.engineGlow, this.alarmLeft, this.alarmRight);
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

    update(delta, speed) {
        this._time += delta;

        // Generamos valores de oscilación sutil
        // Usamos frecuencias distintas (0.8 y 0.5) para que el movimiento sea irregular (natural)
        this.oscillation = {
            x: Math.sin(this._time * 0.8) * 0.015,
            y: Math.cos(this._time * 0.5) * 0.015,
            roll: Math.sin(this._time * 0.3) * 0.005
        };

        this._updateCombatFlash(delta);
        this._updateEngine(speed);
        this._updateState(speed);
        this._updateFlyBy(delta); // Actualizar los disparos que pasan
    }

    _updateFlyBy(delta) {
        this.flyByLights.forEach(fbl => {
            if (!fbl.active) return;

            // Mover la luz de atrás hacia adelante (Z aumenta)
            fbl.light.position.z += fbl.speed * delta;

            // Decaimiento natural de intensidad
            fbl.light.intensity *= 0.92;

            // Desactivar cuando ya pasó la cabina o se apagó
            if (fbl.light.position.z > 15 || fbl.light.intensity < 0.1) {
                fbl.active = false;
                fbl.light.intensity = 0;
            }
        });
    }

    _updateCombatFlash(delta) {
        if (this.combatFlash.intensity <= 0) return;
        this.combatFlash.intensity *= Math.exp(-12 * delta);
        if (this.combatFlash.intensity < 0.05) this.combatFlash.intensity = 0;
    }

    _updateEngine(speed) {
        const target = speed > 10 ? (speed - 10) * 2 : 0.5;
        this.engineGlow.intensity = THREE.MathUtils.lerp(this.engineGlow.intensity, target, 0.1);
    }

    _updateState(speed) {
        // Lógica de alarmas simplificada para enfoque en disparos
        const inCombat = speed > 18;
        this.alarmLeft.intensity = THREE.MathUtils.lerp(this.alarmLeft.intensity, inCombat ? 5 : 0, 0.1);
        this.alarmRight.intensity = THREE.MathUtils.lerp(this.alarmRight.intensity, inCombat ? 5 : 0, 0.1);
    }
}