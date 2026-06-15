import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Banknote, Car, Info, type LucideIcon } from 'lucide-react';
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
import { tooltipClasses } from '../constants/tooltipStyles';

const CAR_MODEL_PATH = '/models/McLaren.optimized.glb';

type CarFormValues = Record<string, string | boolean>;

const initialCarFormValues: CarFormValues = {
  leasingVehiclePrice: '52,500',
  leasingDownPayment: '2,500',
  leasingDuration: '36',
  leasingRate: '5.49',
  leasingResidualValue: '50',
  leasingAnnualMileage: '12,000',
  leasingBuyoutOption: true,
  creditVehiclePrice: '52,500',
  creditDownPayment: '5,250',
  creditLoanAmount: '47,250',
  creditInterestRate: '5.49',
  creditDuration: '60',
  creditExpectedResaleValue: '26,250',
};

export function CarPage() {
  const [formValues, setFormValues] = useState<CarFormValues>(initialCarFormValues);

  function updateField(id: string, value: string | boolean) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [id]: value,
    }));
  }

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
        <article className="rounded-2xl bg-linear-to-b from-slate-100/70 via-slate-300/50 to-slate-400/70 p-px shadow-2xl shadow-slate-400/85 md:col-span-2">
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-b from-slate-100/70 via-slate-300/50 to-slate-400/70 backdrop-blur-2xl">
            <CarModelViewer />
            <CarModelCredit />
          </div>
        </article>
        <div className="grid min-w-0 gap-3 md:col-span-3 xl:grid-cols-2">
          <CarFinancingCard
            icon={Car}
            iconClassName="bg-blue-500/10 text-blue-600"
            title="Leasing"
          >
            <CarTextField id="leasingVehiclePrice" label="Vehicle price" prefix="CHF" value={formValues.leasingVehiclePrice} onChange={updateField} />
            <CarTextField id="leasingDownPayment" label="Down payment" prefix="CHF" value={formValues.leasingDownPayment} onChange={updateField} />
            <CarTextField id="leasingDuration" label="Lease duration" suffix="months" value={formValues.leasingDuration} onChange={updateField} />
            <CarTextField id="leasingRate" label="Lease rate" suffix="%" value={formValues.leasingRate} onChange={updateField} />
            <CarTextField id="leasingResidualValue" label="Residual value" suffix="%" value={formValues.leasingResidualValue} onChange={updateField} />
            <CarTextField id="leasingAnnualMileage" label="Annual mileage" suffix="km" value={formValues.leasingAnnualMileage} onChange={updateField} />
            <CarToggleField
              id="leasingBuyoutOption"
              label="Buyout option at end"
              value={formValues.leasingBuyoutOption === true}
              onChange={updateField}
            />
          </CarFinancingCard>
          <CarFinancingCard
            icon={Banknote}
            iconClassName="bg-emerald-500/10 text-emerald-600"
            title="Credit"
          >
            <CarTextField id="creditVehiclePrice" label="Vehicle price" prefix="CHF" value={formValues.creditVehiclePrice} onChange={updateField} />
            <CarTextField id="creditDownPayment" label="Down payment" prefix="CHF" value={formValues.creditDownPayment} onChange={updateField} />
            <CarTextField id="creditLoanAmount" label="Loan amount" prefix="CHF" value={formValues.creditLoanAmount} onChange={updateField} />
            <CarTextField id="creditInterestRate" label="Interest rate" suffix="%" value={formValues.creditInterestRate} onChange={updateField} />
            <CarTextField id="creditDuration" label="Loan duration" suffix="months" value={formValues.creditDuration} onChange={updateField} />
            <CarTextField
              id="creditExpectedResaleValue"
              label="Expected resale value after X years"
              prefix="CHF"
              value={formValues.creditExpectedResaleValue}
              onChange={updateField}
            />
          </CarFinancingCard>
        </div>
      </div>
    </section>
  );
}

function CarFinancingCard({
  children,
  icon: Icon,
  iconClassName,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  iconClassName: string;
  title: string;
}) {
  return (
    <section className="glass-panel min-w-0 p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-2xl ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-sm font-bold text-slate-950">{title}</h2>
      </div>
      <div className="mt-4 space-y-2.5 text-sm">
        {children}
      </div>
    </section>
  );
}

function CarTextField({
  id,
  label,
  onChange,
  prefix,
  suffix,
  value,
}: {
  id: string;
  label: string;
  onChange: (id: string, value: string) => void;
  prefix?: string;
  suffix?: string;
  value: string | boolean;
}) {
  return (
    <label className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_9rem] sm:gap-3">
      <span className="truncate text-sm font-medium text-slate-800">{label}</span>
      <span className="glass-input grid w-full min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 py-2 text-sm">
        {prefix && <span className="text-sm font-normal text-slate-600">{prefix}</span>}
        <input
          aria-label={label}
          className="w-full min-w-0 bg-transparent text-right font-black text-slate-950 outline-none"
          inputMode="decimal"
          type="text"
          value={typeof value === 'string' ? value : ''}
          onChange={(event) => onChange(id, event.currentTarget.value)}
        />
        {suffix && <span className="whitespace-nowrap text-sm font-normal text-slate-600">{suffix}</span>}
      </span>
    </label>
  );
}

function CarToggleField({
  id,
  label,
  onChange,
  value,
}: {
  id: string;
  label: string;
  onChange: (id: string, value: boolean) => void;
  value: boolean;
}) {
  return (
    <label className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_9rem] sm:gap-3">
      <span className="truncate text-sm font-medium text-slate-800">{label}</span>
      <span className="glass-input flex w-full min-w-0 items-center justify-between py-2 text-sm">
        <span className="font-bold text-slate-950">{value ? 'Yes' : 'No'}</span>
        <span className="relative inline-flex h-6 w-11 items-center">
          <input
            aria-label={label}
            checked={value}
            className="peer sr-only"
            type="checkbox"
            onChange={(event) => onChange(id, event.currentTarget.checked)}
          />
          <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-600" />
          <span className="absolute left-1 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
        </span>
      </span>
    </label>
  );
}

function CarModelCredit() {
  return (
    <div className="group absolute bottom-2 left-2 z-20">
      <button
        aria-label="Show car model credit"
        className="grid h-4 w-4 place-items-center text-slate-600/80 transition hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-700/20"
        type="button"
      >
        <Info className="h-3 w-3" />
      </button>
      <span
        role="tooltip"
        className={tooltipClasses('bottom-5 left-0 w-72 px-3 py-2 text-left leading-5')}
      >
        &quot;Mc Laren&quot; (https://skfb.ly/6RDNn) by Kingman257 is licensed under Creative Commons Attribution (http://creativecommons.org/licenses/by/4.0/).
      </span>
    </div>
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
      className="relative z-10 h-60 w-full sm:h-76 md:h-112"
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
