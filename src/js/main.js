import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';


init();

function init() {

    // Setup
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.setZ(30);
    camera.position.setX(-3);

    const renderer = new THREE.WebGLRenderer({
        canvas: document.querySelector('#bg'),
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);

    render();


    // Lights
    const pointLight = new THREE.PointLight(0xffffff);
    pointLight.position.set(1000, 500, 500);

    const pointLight2 = new THREE.PointLight(0xffffff);
    pointLight2.position.set(100, 50, 50);

    const ambientLight = new THREE.AmbientLight(0xFDECD2);
    scene.add(pointLight, pointLight2, ambientLight);


    // Stars
    function addStar() {
        const geometry = new THREE.SphereGeometry(0.06, 24, 24);
        const material = new THREE.MeshStandardMaterial({ color: 0xffffff });

        const star = new THREE.Mesh(geometry, material);

        let [x, y, z] = Array(3)
            .fill()
            .map(() => THREE.MathUtils.randFloatSpread(190));

        star.position.set(x, y, z);
        scene.add(star);
    }
    Array(3000).fill().forEach(addStar);


    // Model
    const container = document.createElement('div');
    document.body.appendChild(container);

    container.appendChild(renderer.domElement);

    const ktx2Loader = new KTX2Loader()
        .setTranscoderPath('js/libs/basis/')
        .detectSupport(renderer);

    const loader = new GLTFLoader().setPath('assets/models/');
    loader.setKTX2Loader(ktx2Loader);
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load('aeronave.glb', function (gltf) {

        const model = gltf.scene;
        model.scale.set(2.1, 2.1, 1.9);
        model.position.x = -200;
        model.position.y = -90;
        model.position.z = -150;
        model.rotation.y = 0.2;
        model.rotation.x = 0.8;

        scene.add(model);

        render();
    });


    // Tierra
    const TierraTexture = new THREE.TextureLoader().load('assets/images/tierra.jpeg');
    const normalTierraTexture = new THREE.TextureLoader().load('assets/images/normal.jpg');
    const tierra = new THREE.Mesh(
        new THREE.SphereGeometry(17, 50, 50),
        new THREE.MeshStandardMaterial({
            map: TierraTexture,
            normalMap: normalTierraTexture,
        })
    );

    scene.add(tierra);


    // Moon
    const moonTexture = new THREE.TextureLoader().load('assets/images/moon.jpg');
    const normalTexture = new THREE.TextureLoader().load('assets/images/normal.jpg');

    const moon = new THREE.Mesh(
        new THREE.SphereGeometry(2, 32, 32),
        new THREE.MeshStandardMaterial({
            map: moonTexture,
            normalMap: normalTexture,
        })
    );

    scene.add(moon);

    moon.position.z = 35;
    moon.position.setX(-10);


    // Scroll Animation
    function moveCamera() {
        const t = document.body.getBoundingClientRect().top;
        moon.rotation.x += 0.003;
        moon.rotation.y += 0.009;

        tierra.rotation.x += 0.0008;
        tierra.rotation.y += 0.0025;

        camera.position.z = t * -0.01;
        camera.position.x = t * -0.0002;
        camera.rotation.y = t * -0.0002;
    }

    document.body.onscroll = moveCamera;
    moveCamera();


    // Animation Loop
    function animate() {
        requestAnimationFrame(animate);

        tierra.rotation.x += 0.0001;
        tierra.rotation.y += 0.0007;

        moon.rotation.x += 0.001;
        moon.rotation.y += 0.005;

        // controls.update();
        render();
    }

    animate();

    window.addEventListener('resize', onWindowResize);


    function render() {
        renderer.render(scene, camera);
    }


    function onWindowResize() {

        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();

        renderer.setSize(window.innerWidth, window.innerHeight);

        render();
    }
}
