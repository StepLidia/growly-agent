import { useEffect, useRef, useState } from 'react';
import {
  ACESFilmicToneMapping,
  AmbientLight,
  Box3,
  Color,
  DirectionalLight,
  Group,
  Material,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PerspectiveCamera,
  RectAreaLight,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';

const CAR_MODEL_PATH = '/models/McLaren.optimized.glb';

export function CarPage() {
  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
          Car financing
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          Compare Leasing vs Credit
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-5">
        <article className="relative overflow-hidden rounded-2xl border border-white/65 bg-linear-to-br from-slate-100 via-slate-200 to-slate-50 shadow-2xl shadow-slate-400/25 backdrop-blur-2xl md:col-span-2">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_58%,rgba(15,23,42,.34),transparent_36%),radial-gradient(ellipse_at_48%_54%,rgba(100,116,139,.24),transparent_58%),radial-gradient(circle_at_50%_0%,rgba(255,255,255,.88),transparent_34%),linear-gradient(180deg,rgba(248,250,252,.72),rgba(203,213,225,.42)_52%,rgba(241,245,249,.72))]" />
          <div className="pointer-events-none absolute inset-x-10 bottom-9 h-16 rounded-full bg-slate-950/22 blur-3xl" />
          <CarModelViewer />
        </article>
      </div>
    </section>
  );
}

function CarModelViewer() {
  const canvasHostRef = useRef<HTMLDivElement>(null);
  const [modelState, setModelState] = useState<'loading' | 'ready' | 'error'>('loading');

  useEffect(() => {
    const canvasHost = canvasHostRef.current;

    if (!canvasHost) {
      return;
    }

    const scene = new Scene();
    scene.background = null;
    RectAreaLightUniformsLib.init();

    const camera = new PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 0.95, 7);

    const renderer = new WebGLRenderer({ antialias: true, alpha: true });
    renderer.setClearColor(new Color('#000000'), 0);
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.32;
    renderer.shadowMap.enabled = true;
    canvasHost.append(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.7;
    controls.enableDamping = true;
    controls.enablePan = false;
    controls.maxDistance = 9.5;
    controls.minDistance = 5.4;
    controls.target.set(0, 0, 0);

    const ambientLight = new AmbientLight('#cbd5e1', 1.8);
    const keyLight = new DirectionalLight('#ffffff', 3.9);
    keyLight.position.set(3.8, 4.8, 5);
    keyLight.castShadow = true;
    const fillLight = new DirectionalLight('#f8fafc', 1.25);
    fillLight.position.set(-4, 2.4, 3);
    const rimLight = new DirectionalLight('#e5e7eb', 2.2);
    rimLight.position.set(-3, 3.2, -4);
    const studioLights = createStudioLights();
    scene.add(ambientLight, keyLight, fillLight, rimLight, studioLights);

    let animationFrameId = 0;
    let isMounted = true;
    let loadedModel: Group | null = null;

    const resizeObserver = new ResizeObserver(() => {
      const { clientHeight, clientWidth } = canvasHost;

      if (!clientWidth || !clientHeight) {
        return;
      }

      camera.aspect = clientWidth / clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(clientWidth, clientHeight, false);
    });
    resizeObserver.observe(canvasHost);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loader.load(
      CAR_MODEL_PATH,
      (gltf) => {
        if (!isMounted) {
          return;
        }

        polishCarMaterials(gltf.scene);
        loadedModel = centerModel(gltf.scene);
        scene.add(loadedModel);
        setModelState('ready');
      },
      undefined,
      () => {
        if (isMounted) {
          console.error(`Could not load 3D model from ${CAR_MODEL_PATH}.`);
          setModelState('error');
        }
      },
    );

    const renderFrame = () => {
      const elapsedSeconds = performance.now() * 0.001;

      studioLights.rotation.y = Math.sin(elapsedSeconds * 0.35) * 0.22;
      controls.update();
      renderer.render(scene, camera);
      animationFrameId = window.requestAnimationFrame(renderFrame);
    };
    renderFrame();

    return () => {
      isMounted = false;
      window.cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      controls.dispose();
      loadedModel?.traverse((child) => {
        if (child instanceof Mesh) {
          child.geometry.dispose();
          disposeMaterial(child.material);
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <div
      ref={canvasHostRef}
      className="relative z-10 h-[15rem] w-full sm:h-[19rem] md:h-[28rem]"
    >
      {modelState !== 'ready' && (
        <div className="absolute inset-0 z-10 grid place-items-center">
          <p className="rounded-lg border border-slate-200/80 bg-white/85 px-4 py-3 text-sm font-bold text-slate-600 shadow-lg">
            {modelState === 'loading' ? 'Loading model...' : 'Model could not load.'}
          </p>
        </div>
      )}
    </div>
  );
}

function disposeMaterial(material: Material | Material[]) {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }

  material.dispose();
}

function createStudioLights() {
  const lightRig = new Group();
  const leftSoftbox = new RectAreaLight('#ffffff', 5.2, 4.8, 2.2);
  const topSoftbox = new RectAreaLight('#f8fafc', 4.4, 4.4, 1.4);
  const edgeSoftbox = new RectAreaLight('#f1f5f9', 2.5, 2.4, 2.6);

  leftSoftbox.position.set(-3.8, 2.4, 2.8);
  leftSoftbox.lookAt(0, 0, 0);
  topSoftbox.position.set(0.5, 4.3, 1.5);
  topSoftbox.lookAt(0, 0, 0);
  edgeSoftbox.position.set(4.2, 1.8, -2.5);
  edgeSoftbox.lookAt(0, 0, 0);
  lightRig.add(leftSoftbox, topSoftbox, edgeSoftbox);

  return lightRig;
}

function polishCarMaterials(model: Group) {
  model.traverse((child) => {
    if (!(child instanceof Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    polishMaterial(child.material);
  });
}

function polishMaterial(material: Material | Material[]) {
  if (Array.isArray(material)) {
    material.forEach(polishMaterial);
    return;
  }

  if (material instanceof MeshPhysicalMaterial) {
    material.roughness = Math.min(material.roughness, 0.28);
    material.metalness = Math.max(material.metalness, 0.08);
    material.clearcoat = Math.max(material.clearcoat, 0.72);
    material.clearcoatRoughness = Math.min(material.clearcoatRoughness, 0.18);
    material.needsUpdate = true;
    return;
  }

  if (material instanceof MeshStandardMaterial) {
    material.roughness = Math.min(material.roughness, 0.32);
    material.metalness = Math.max(material.metalness, 0.06);
    material.needsUpdate = true;
  }
}

function centerModel(model: Group) {
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const largestSide = Math.max(size.x, size.y, size.z);
  const scale = largestSide > 0 ? 4.55 / largestSide : 1;
  const pivot = new Group();

  model.scale.setScalar(scale);
  model.position.set(
    -center.x * scale,
    -center.y * scale - size.y * scale * 0.03,
    -center.z * scale,
  );
  pivot.rotation.y = -0.5;
  pivot.add(model);

  return pivot;
}
