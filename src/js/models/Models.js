// src/js/models/Models.js
import * as THREE from 'three';
import { ModelLoader } from './ModelLoader.js';
import { ImperialsSystem } from './ImperialsSystem.js';
import { EscortSystem } from './EscortSystem.js';
import { EffectsSystem } from './EffectsSystem.js';
import { LaserSystem } from './LaserSystem.js';

export class Models {
    constructor() {
        this.sceneGroup = new THREE.Group();
        this.loader = new ModelLoader();

        // Sistemas
        this.imperials = new ImperialsSystem(this.loader);
        this.escorts = new EscortSystem(this.loader);
        this.effects = new EffectsSystem();
        this.lasers = new LaserSystem();

        this._playerPos = new THREE.Vector3();
    }

    init(scene) {
        scene.add(this.sceneGroup);

        // Inicializa los sistemas que requieren referencia a la escena
        this.effects.init(scene);
        this.lasers.init(scene);
        this.escorts.init(scene);
        this.imperials.init(scene);

        this._wireSystems();
    }

    _wireSystems() {
        const onEnemyKilled = (position) => {
            this.effects.spawnExplosion(position);
        };

        this.imperials.setOnKill(onEnemyKilled);
        this.escorts.setOnKill(onEnemyKilled);
    }

    async load(cockpitGroup) {
        await this.loader.loadShip(cockpitGroup); // nave del jugador
        const [imperials, escorts] = await Promise.all([
            this.imperials.load(this.sceneGroup),
            this.escorts.load(this.sceneGroup)
        ]);
    }

    update(time, delta, playerPos) {
        this._playerPos.copy(playerPos);
        this.imperials.update(time, delta, this._playerPos, this.lasers);
        this.escorts.update(time, delta, this._playerPos, this.lasers);
        this.lasers.update(delta);
        this.effects.update(delta);
    }

    spawnPlayerLaser(camera) {
        this.lasers.spawnPlayerLaser(camera);
    }

    spawnExplosion(position) {
        this.effects.spawnExplosion(position);
    }

    killEscort(index, type = 'escort') {
        const pos = this.escorts.getWorldPosition(index, type);
        if (pos) this.effects.spawnExplosion(pos);
        this.escorts.kill(index, type);
    }

    killImperial(index) {
        const pos = this.imperials.getWorldPosition(index);
        if (pos) this.effects.spawnExplosion(pos);
        this.imperials.kill(index);
    }
}