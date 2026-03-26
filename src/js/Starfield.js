import * as THREE from 'three';

export class Starfield {
    constructor(scene) {
        this.count = 8000;
        this.geometry = new THREE.BufferGeometry();
        this.initAttributes();

        this.material = new THREE.ShaderMaterial({
            uniforms: {
                uTime: { value: 0 },
                uSpeed: { value: 1.0 },
                uColor: { value: new THREE.Color(0xffffff) },
                uTurboColor: { value: new THREE.Color(0x88ccff) } // Azul para el turbo
            },
            vertexShader: `
                attribute float size;
                attribute float velocity;
                uniform float uTime;
                uniform float uSpeed;
                varying float vSpeedFactor;

                void main() {
                    vec3 pos = position;
                    float range = 4000.0;
                    
                    // Movimiento continuo
                    float zMove = uTime * velocity * uSpeed * 0.5;
                    pos.z = mod(pos.z + zMove, range) - 3500.0;

                    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);

                    // --- EFECTO STRETCH (Estiramiento de velocidad) ---
                    // A mayor velocidad, las estrellas se vuelven líneas
                    float stretch = clamp(uSpeed * 0.15, 1.0, 8.0);
                    
                    // Solo estiramos en el eje visual si nos movemos rápido
                    gl_PointSize = size * (500.0 / -mvPosition.z);
                    gl_PointSize *= (uSpeed > 10.0) ? stretch : 1.0;

                    vSpeedFactor = clamp((uSpeed - 5.0) / 20.0, 0.0, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                }
            `,
            fragmentShader: `
                uniform vec3 uColor;
                uniform vec3 uTurboColor;
                varying float vSpeedFactor;

                void main() {
                    // Dibujamos un punto con forma elíptica si hay estiramiento
                    vec2 cxy = 2.0 * gl_PointCoord - 1.0;
                    float r = dot(cxy, cxy);
                    if (r > 1.0) discard;

                    // Mezclamos el color base con el color de turbo según la velocidad
                    vec3 finalColor = mix(uColor, uTurboColor, vSpeedFactor);
                    
                    float alpha = 1.0 - r;
                    gl_FragColor = vec4(finalColor, alpha);
                }
            `,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        this.points = new THREE.Points(this.geometry, this.material);
        this.points.frustumCulled = false;
        scene.add(this.points);
    }

    initAttributes() {
        const pos = new Float32Array(this.count * 3);
        const vel = new Float32Array(this.count);
        const size = new Float32Array(this.count);

        for (let i = 0; i < this.count; i++) {
            // Dispersión esférica para evitar "huecos" en los giros de cámara
            const radius = 2500 + Math.random() * 2500;
            const theta = Math.random() * Math.PI * 2;
            const phi = Math.acos(2 * Math.random() - 1);

            pos[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
            pos[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
            pos[i * 3 + 2] = Math.random() * -4000;
            
            vel[i] = 15.0 + Math.random() * 45.0; 
            size[i] = 0.5 + Math.random() * 1.5;
        }

        this.geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        this.geometry.setAttribute('velocity', new THREE.BufferAttribute(vel, 1));
        this.geometry.setAttribute('size', new THREE.BufferAttribute(size, 1));
    }

    update(speedMultiplier) {
        // Incremento de tiempo basado en la velocidad para que el flujo sea coherente
        this.material.uniforms.uTime.value += 0.01;
        
        this.material.uniforms.uSpeed.value = THREE.MathUtils.lerp(
            this.material.uniforms.uSpeed.value, 
            speedMultiplier, 
            0.05
        );
    }
}