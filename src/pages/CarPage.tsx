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
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
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
        <article className="relative overflow-hidden rounded-2xl border border-white/45 bg-linear-to-br from-slate-500/75 via-slate-300/70 to-blue-300/55 shadow-2xl shadow-slate-500/30 backdrop-blur-2xl md:col-span-2">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_12%,rgba(255,255,255,.36),transparent_34%),radial-gradient(circle_at_18%_78%,rgba(51,65,85,.38),transparent_44%),radial-gradient(circle_at_88%_74%,rgba(30,64,175,.18),transparent_40%),linear-gradient(180deg,rgba(203,213,225,.22),rgba(100,116,139,.36))]" />
          <div className="pointer-events-none absolute inset-x-8 bottom-12 h-24 rounded-full bg-slate-950/28 blur-3xl" />
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

    const camera = new PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(0, 1.25, 8.2);

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
    controls.minDistance = 5.8;
    controls.target.set(0, 0, 0);

    const ambientLight = new AmbientLight('#cbd5e1', 1.8);
    const keyLight = new DirectionalLight('#ffffff', 3.9);
    keyLight.position.set(3.8, 4.8, 5);
    keyLight.castShadow = true;
    const fillLight = new DirectionalLight('#bfdbfe', 1.35);
    fillLight.position.set(-4, 2.4, 3);
    const rimLight = new DirectionalLight('#cbd5e1', 2.6);
    rimLight.position.set(-3, 3.2, -4);
    scene.add(ambientLight, keyLight, fillLight, rimLight);

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
      className="relative z-10 h-[17rem] w-full sm:h-[22rem] md:h-[calc(100vh-13rem)] md:min-h-[24rem]"
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

function centerModel(model: Group) {
  const bounds = new Box3().setFromObject(model);
  const size = bounds.getSize(new Vector3());
  const center = bounds.getCenter(new Vector3());
  const largestSide = Math.max(size.x, size.y, size.z);
  const scale = largestSide > 0 ? 3.85 / largestSide : 1;
  const pivot = new Group();

  model.scale.setScalar(scale);
  model.position.set(
    -center.x * scale,
    -center.y * scale,
    -center.z * scale,
  );
  pivot.rotation.y = -0.5;
  pivot.add(model);

  return pivot;
}
