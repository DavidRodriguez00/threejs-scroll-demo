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
    /**
     * @param {HTMLCanvasElement} canvas El elemento canvas del DOM
     */
    constructor(canvas) {
        // 1. Crear estado primero (Fuente de verdad global)
        this.state = new GameState(); 

        // 2. SceneManager inicializa el renderizado y necesita el estado para el timeScale
        this.sm = new SceneManager(canvas, this.state); 

        // 3. Componentes visuales y de entorno
        this.stars = new Starfield(this.sm.scene);
        this.models = new Models();
        this.lights = new Lights(this.sm.scene, this.sm.cockpitGroup);

        // 4. Captura de eventos de usuario (Asigna mouse.x/y e isMouseDown)
        this.input = new InputSystem(this.state);

        // 5. Sistemas lógicos (Inyección de dependencias)
        // CombatSystem recibe Models para disparar, Lights para flashes, 
        // State para tiempos/ratón y SM para el post-procesado (Bloom)
        this.combat = new CombatSystem(this.models, this.lights, this.state, this.sm);
        this.cameraSystem = new CameraSystem(this.state);
        this.movement = new MovementSystem(this.models, this.state);
    }

    /**
     * Punto de entrada principal para arrancar el juego
     */
    async start() {
        await this.init();

        // El SceneManager nos provee el tiempo total (logical), el delta y la cámara activa
        this.sm.onUpdate((time, delta, camera) => {
            this.update(time, delta, camera);
        });

        this.sm.start();
    }

    /**
     * Carga de assets y preparación de mallas
     */
    async init() {
        // Prepara el pool de InstancedMesh para láseres y partículas
        this.models.init(this.sm.scene);

        // Carga la cabina del jugador
        await this.models.loadShip(this.sm.cockpitGroup);

        // Carga de la Estrella de la Muerte y naves enemigas en paralelo
        await Promise.all([
            this.models.loadDeathStar(this.sm.scene),
            this.models.loadEscolts(5),      // Flota de escolta (TIE Fighters)
            this.models.loadEscolts(5),      // Flota de escolta (TIE Fighters)
            this.models.loadInterceptors(7)   // Flota de interceptores (TIE Interceptors)
        ]);

        this.state.isLoaded = true;
        document.body.classList.add('loaded');
    }

    /**
     * Bucle lógico ejecutado antes de cada renderizado
     */
    update(time, delta, camera) {
        // Actualiza lerps de suavizado del ratón y lógica de velocidad
        this.state.update(delta);

        if (this.state.isLoaded) {
            // Movimiento orbital de la Estrella de la Muerte y naves enemigas
            this.movement.update(time);

            // Gestión de combate: 
            // - Disparo del jugador con flash verde y pico de Bloom
            // - Disparo IA con predicción de tiro sutil y flash rojo
            this.combat.update(time, delta, camera);

            // Actualización de modelos: Movimiento de naves individuales y partículas (Explosiones)
            // Pasamos la posición de la cámara como objetivo para la IA enemiga
            this.models.update(time, delta, camera.position);
        }

        // Efectos dinámicos de cámara (Banking basado en el movimiento lateral)
        this.cameraSystem.update(camera);
        
        // Elementos atmosféricos y luces dinámicas
        this.stars.update(this.state.speed);
        this.lights.update(time, this.state.speed);

        // Sincronización visual base: El Bloom reacciona a la velocidad constante.
        // Los impactos y disparos fuerzan picos de Bloom pasando 'true' a través de combat.
        this.sm.updateVisuals(this.state.speed, false);
    }
}