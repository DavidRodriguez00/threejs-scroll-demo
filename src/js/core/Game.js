// src/js/core/Game.js
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
    constructor(canvas) {
        // Estado global
        this.state = new GameState(); 

        // Render y escena
        this.sm = new SceneManager(canvas, this.state); 

        // Visual
        this.stars = new Starfield(this.sm.scene);
        this.models = new Models();
        this.lights = new Lights(this.sm.scene, this.sm.cockpitGroup);

        // Input
        this.input = new InputSystem(this.state);

        // Sistemas
        this.combat = new CombatSystem(this.models, this.lights, this.state, this.sm);
        this.cameraSystem = new CameraSystem(this.state);
        this.movement = new MovementSystem(this.models, this.state);
    }

    async start() {
        await this.init();

        this.sm.onUpdate((time, delta, camera) => {
            this.update(time, delta, camera);
        });

        this.sm.start();
    }

    async init() {
        // Inicializa sistemas que necesitan escena
        this.models.init(this.sm.scene);

        // Carga centralizada de assets
        await this.models.load(this.sm.cockpitGroup);

        this.state.isLoaded = true;
        document.body.classList.add('loaded');
    }

    update(time, delta, camera) {
        this.state.update(delta);

        if (this.state.isLoaded) {
            // Movimiento global
            this.movement.update(time);

            // Combate
            this.combat.update(time, delta, camera);

            // Actualiza modelos (enemigos, láseres, partículas)
            this.models.update(time, delta, camera.position);
        }

        // Cámara
        this.cameraSystem.update(camera);

        // Ambiente
        this.stars.update(this.state.speed);
        this.lights.update(time, this.state.speed);

        // PostFX
        this.sm.updateVisuals(this.state.speed, false);
    }
}