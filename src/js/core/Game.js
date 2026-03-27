import * as THREE from 'three';
import { SceneManager } from '../scene/SceneManager.js';
import { Starfield } from '../Starfield.js';
import { Models } from '../models/Models.js';
import { Lights } from '../Lights.js';

import { GameState } from './GameState.js';
import { InputSystem } from './InputSystem.js';
import { CombatSystem } from '../systems/CombatSystem.js';
import { CameraSystem } from '../systems/CameraSystem.js';
import { MovementSystem } from '../systems/MovementSystem.js';

export class Game {
    // En Game.js
    constructor(canvas) {
        this.state = new GameState(); // 1. Crear estado primero
        this.sm = new SceneManager(canvas, this.state); // 2. Pasarlo al Manager
        // ... resto de inicializaciones

        this.stars = new Starfield(this.sm.scene);
        this.models = new Models();
        this.lights = new Lights(this.sm.scene, this.sm.cockpitGroup);

        this.input = new InputSystem(this.state);

        this.combat = new CombatSystem(this.models, this.lights, this.state, this.sm);
        this.cameraSystem = new CameraSystem(this.state);
        this.movement = new MovementSystem(this.models, this.state);
    }

    async start() {
        await this.init();

        // SceneManager nos provee el tiempo total, el delta (tiempo entre frames) y la cámara activa
        this.sm.onUpdate((time, delta, camera) => {
            this.update(time, delta, camera);
        });

        this.sm.start();
    }

    async init() {
        this.models.init(this.sm.scene);

        await this.models.loadShip(this.sm.cockpitGroup);

        await Promise.all([
            this.models.loadDeathStar(this.sm.scene),
            this.models.loadEscorts(12) // Aumentado a 12 para una batalla más épica
        ]);

        this.state.isLoaded = true;
        document.body.classList.add('loaded');
    }

    update(time, delta, camera) {
        this.state.update(delta);

        if (this.state.isLoaded) {
            this.movement.update(time);

            // CORRECCIÓN: Ahora pasamos delta y camera en el orden correcto
            // Esto soluciona el "Cannot read properties of undefined (reading 'position')"
            this.combat.update(time, delta, camera);

            // Pasamos la posición de la cámara para que los escoltas sepan a dónde disparar
            this.models.update(time, delta, camera.position);
        }

        this.cameraSystem.update(camera);
        this.stars.update(this.state.speed);
        this.lights.update(time, this.state.speed);
        this.sm.updateVisuals(this.state.speed);
    }
}