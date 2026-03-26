import * as THREE from 'three';
import { SceneManager } from './SceneManager.js';
import { Starfield } from './Starfield.js';
import { Models } from './Models.js';
import { Lights } from './Lights.js';

// 1. INICIALIZACIÓN DEL NÚCLEO
const canvas = document.querySelector('#bg');
const sm = new SceneManager(canvas);
const stars = new Starfield(sm.scene);
const models = new Models();
const lights = new Lights(sm.scene, sm.cockpitGroup);

// 2. ESTADO GLOBAL DE LA SIMULACIÓN
const state = { 
    mouse: new THREE.Vector2(),        
    smoothMouse: new THREE.Vector2(),  
    speed: 1.0,                        
    targetSpeed: 5.0,                  
    isLoaded: false,
    lastFireTime: 0,
    lastPlayerFireTime: 0,
    isMouseDown: false 
};

/**
 * SECUENCIA DE INICIO (CARGA DINÁMICA)
 */
(async () => {
    try {
        console.log("🚀 Iniciando secuencia de pre-vuelo...");
        
        // Inicializamos el sistema de partículas láser en la escena
        models.initLasers(sm.scene);
        
        // Carga de activos en paralelo para optimizar tiempos
        await models.loadShip(sm.cockpitGroup);
        await Promise.all([
            models.loadDeathStar(sm.scene),
            models.loadEscorts(5) 
        ]);
        
        state.isLoaded = true;
        document.body.classList.add('loaded'); 
        console.log("✅ Sistemas de Combate: Online");
    } catch (err) {
        console.error("❌ Fallo crítico en el despliegue:", err);
    }
})();

/**
 * GESTIÓN DE ENTRADA (INPUT)
 */
window.addEventListener('mousemove', (e) => {
    state.mouse.x = (e.clientX / window.innerWidth) - 0.5;
    state.mouse.y = (e.clientY / window.innerHeight) - 0.5;
}, { passive: true });

// Turbo y control de disparo continuo
window.addEventListener('mousedown', () => {
    state.targetSpeed = 25.0; 
    state.isMouseDown = true;
});

window.addEventListener('mouseup', () => {
    state.targetSpeed = 5.0;
    state.isMouseDown = false;
});

/**
 * LOOP DE ACTUALIZACIÓN PRINCIPAL
 */
sm.onUpdate((time, delta, camera) => {
    
    // 1. FÍSICA VISUAL E INERCIA
    state.speed = THREE.MathUtils.lerp(state.speed, state.targetSpeed, 0.05);
    state.smoothMouse.lerp(state.mouse, 0.07);

    if (state.isLoaded) {
        
        // 2. PARALAJE Y POSICIONAMIENTO DEL ESCENARIO
        const zBase = 1800;
        const speedOffset = state.speed * 20;
        
        const targetX = -state.smoothMouse.x * 700;
        const targetY = state.smoothMouse.y * 400;

        models.targetGroup.position.x = THREE.MathUtils.lerp(models.targetGroup.position.x, targetX, 0.03);
        models.targetGroup.position.y = THREE.MathUtils.lerp(models.targetGroup.position.y, targetY, 0.03);
        models.targetGroup.position.z = -(zBase + speedOffset);

        // 3. INERCIA ROTACIONAL DEL ENTORNO (Tilt)
        const tiltX = state.smoothMouse.y * 0.12;
        const tiltZ = -state.smoothMouse.x * 0.20;
        models.targetGroup.rotation.x = THREE.MathUtils.lerp(models.targetGroup.rotation.x, tiltX, 0.02);
        models.targetGroup.rotation.z = THREE.MathUtils.lerp(models.targetGroup.rotation.z, tiltZ, 0.02);

        if (models.deathStar) models.deathStar.rotation.y += 0.0002;

        // 4. LÓGICA DE COMBATE
        
        // Disparo CONTINUO del Jugador (Verde)
        if (state.isMouseDown && time - state.lastPlayerFireTime > 0.12) {
            models.spawnPlayerLaser(sm.camera);
            lights.triggerCombatFlash(0x00ff00); 
            state.lastPlayerFireTime = time;
        }

        // IA Enemiga (Rojo) - Ahora incluye escoltas disparando
        const enemyFireChance = state.speed > 15 ? 0.12 : 0.06;
        if (Math.random() < enemyFireChance && time - state.lastFireTime > 0.10) {
            
            // Decidimos si dispara un escolta (80% de probabilidad) o la Estrella de la Muerte
            const isEscortShot = Math.random() > 0.2;
            
            if (isEscortShot) {
                // Elegimos un caza de escolta al azar (0 a 23)
                const escortIndex = Math.floor(Math.random() * 24);
                models.spawnEnemyLaser(escortIndex);
            } else {
                // Disparo desde la Estrella de la Muerte (posicionamiento aleatorio en su radio)
                models.spawnEnemyLaser(null);
            }
            
            // Destello rojo en cabina para impacto visual
            if (Math.random() > 0.7) {
                lights.triggerCombatFlash(0xff0000); 
            }
            state.lastFireTime = time;
        }

        // 5. ACTUALIZACIÓN DE MODELOS (Naves y Proyectiles)
        models.update(time, delta); 
    }

    // 6. SUBSISTEMAS VISUALES
    stars.update(state.speed);
    lights.update(time, state.speed);
    sm.updateVisuals(state.speed); // Actualización de Bloom y Post-proceso según velocidad

    // 7. DINÁMICA DE CÁMARA
    camera.position.x = state.smoothMouse.x * 0.15;
    camera.position.y = -state.smoothMouse.y * 0.05;
    
    const cameraRoll = -state.smoothMouse.x * 0.15;
    camera.rotation.z = THREE.MathUtils.lerp(camera.rotation.z, cameraRoll, 0.06);

    // 8. VIBRACIÓN Y FOV
    if (state.speed > 10) {
        const shake = Math.pow((state.speed - 10) / 15, 2) * 0.07;
        camera.position.x += (Math.random() - 0.5) * shake;
        camera.position.y += (Math.random() - 0.5) * shake;
    }

    const targetFOV = 70 + (state.speed * 1.2);
    if (Math.abs(camera.fov - targetFOV) > 0.1) {
        camera.fov = THREE.MathUtils.lerp(camera.fov, targetFOV, 0.08);
        camera.updateProjectionMatrix();
    }
});