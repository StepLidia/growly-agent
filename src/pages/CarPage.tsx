import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
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
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import {
  calculateCreditSummary,
  calculateLeasingSummary,
  parseCarMoneyInput,
  type CarFinancingSummary as CalculatedCarFinancingSummary,
} from '../calculations/carFinancingCalculations';
import { getPercent } from '../calculations/percent';
import { CarFinancingCharts } from '../components/CarFinancingCharts';
import { tooltipClasses } from '../constants/tooltipStyles';
import { currency } from '../finance';

const CAR_MODEL_PATH = '/models/McLaren.optimized.glb';
const CAR_INPUTS_STORAGE_KEY = 'growly-car-inputs-v1';

type CarFormValues = Record<string, string | boolean>;

type SavedCarInputs = {
  formValues?: Partial<CarFormValues>;
  planningHorizon?: number;
};

const initialCarFormValues: CarFormValues = {
  leasingVehiclePrice: '52,500',
  leasingDownPayment: '2,500',
  leasingDuration: '36',
  leasingRate: '5.49',
  leasingResidualValue: '26,250',
  leasingAnnualMileage: '12,000',
  leasingBuyoutOption: true,
  leasingExpectedResaleValue: '26,250',
  creditVehiclePrice: '52,500',
  creditDownPayment: '5,250',
  creditInterestRate: '5.49',
  creditDuration: '60',
  creditEstimatedTaxAdvantage: '0',
  creditExpectedResaleValue: '26,250',
};

export function CarPage() {
  const savedCarInputs = useRef(readSavedCarInputs()).current;
  const [formValues, setFormValues] = useState<CarFormValues>(() => mergeSavedCarFormValues(savedCarInputs.formValues));
  const [planningHorizon, setPlanningHorizon] = useState(() => getSavedCarPlanningHorizon(savedCarInputs.planningHorizon));
  const leasingRate = parseCarMoneyInput(formValues.leasingRate);
  const creditInterestRate = parseCarMoneyInput(formValues.creditInterestRate);
  const leasingSummary = calculateLeasingSummary({
    annualInterestRate: leasingRate,
    downPayment: parseCarMoneyInput(formValues.leasingDownPayment),
    durationMonths: parseCarMoneyInput(formValues.leasingDuration),
    residualValue: parseCarMoneyInput(formValues.leasingResidualValue),
    vehiclePrice: parseCarMoneyInput(formValues.leasingVehiclePrice),
  });
  const creditSummary = calculateCreditSummary({
    annualInterestRate: creditInterestRate,
    downPayment: parseCarMoneyInput(formValues.creditDownPayment),
    durationMonths: parseCarMoneyInput(formValues.creditDuration),
    vehiclePrice: parseCarMoneyInput(formValues.creditVehiclePrice),
  });

  function updateField(id: string, value: string | boolean) {
    setFormValues((currentValues) => ({
      ...currentValues,
      [id]: value,
    }));
  }

  useEffect(() => {
    saveCarInputs({ formValues, planningHorizon });
  }, [formValues, planningHorizon]);

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-3xl font-semibold tracking-normal text-slate-950">
          Car financing
        </h1>
        <p className="mt-2 text-sm text-slate-700">
          Compare Leasing vs Credit (In progress)
        </p>
      </header>

      <div className="grid gap-5 xl:grid-cols-5">
        <div className="flex h-full min-h-0 flex-col gap-3 xl:col-span-2">
          <article className="flex min-h-0 flex-1 rounded-2xl bg-linear-to-b from-slate-100/70 via-slate-300/50 to-slate-400/70 p-px shadow-2xl shadow-slate-400/85">
            <div className="relative h-full w-full overflow-hidden rounded-2xl bg-linear-to-b from-slate-100/70 via-slate-300/50 to-slate-400/70 backdrop-blur-2xl">
              <CarModelViewer />
              <CarModelCredit />
            </div>
          </article>
          <CarPlanningHorizonSlider
            value={planningHorizon}
            onChange={setPlanningHorizon}
          />
        </div>
        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:col-span-3">
          <CarFinancingCard
            icon={Car}
            iconClassName="bg-blue-500/10 text-blue-600"
            summary={<CarSummaryBadge summary={leasingSummary} tone="blue" />}
            title="Leasing"
          >
            <CarTextField id="leasingVehiclePrice" label="Vehicle price" suffix="CHF" value={formValues.leasingVehiclePrice} onChange={updateField} />
            <CarTextField id="leasingDownPayment" label="Down payment" suffix="CHF" value={formValues.leasingDownPayment} onChange={updateField} />
            <CarTextField id="leasingDuration" label="Lease duration" suffix="months" value={formValues.leasingDuration} onChange={updateField} />
            <CarTextField id="leasingRate" label="Lease rate" suffix="%" value={formValues.leasingRate} onChange={updateField} />
            <CarTextField id="leasingAnnualMileage" label="Annual mileage" suffix="km" value={formValues.leasingAnnualMileage} onChange={updateField} />
            <CarTextField id="leasingResidualValue" label="Residual value" suffix="CHF" value={formValues.leasingResidualValue} onChange={updateField} />
            <CarToggleField
              id="leasingBuyoutOption"
              label="Buyout option at the end"
              value={formValues.leasingBuyoutOption === true}
              onChange={updateField}
            />
            {formValues.leasingBuyoutOption === true && (
              <CarTextField
                id="leasingExpectedResaleValue"
                label={(
                  <>
                    Est. resale value after{' '}
                    <span className="font-bold text-slate-950">
                      {planningHorizon} {planningHorizon === 1 ? 'year' : 'years'}
                    </span>
                  </>
                )}
                suffix="CHF"
                value={formValues.leasingExpectedResaleValue}
                onChange={updateField}
              />
            )}
          </CarFinancingCard>
          <CarFinancingCard
            icon={Banknote}
            iconClassName="bg-emerald-500/10 text-emerald-600"
            summary={<CarSummaryBadge summary={creditSummary} tone="emerald" />}
            title="Credit"
          >
            <CarTextField id="creditVehiclePrice" label="Vehicle price" suffix="CHF" value={formValues.creditVehiclePrice} onChange={updateField} />
            <CarTextField id="creditDownPayment" label="Down payment" suffix="CHF" value={formValues.creditDownPayment} onChange={updateField} />
            <CarTextField id="creditDuration" label="Loan duration" suffix="months" value={formValues.creditDuration} onChange={updateField} />
            <CarTextField id="creditInterestRate" label="Interest rate" suffix="%" value={formValues.creditInterestRate} onChange={updateField} />
            <CarTextField
              id="creditEstimatedTaxAdvantage"
              label="Est. tax advantage per year"
              suffix="CHF"
              value={formValues.creditEstimatedTaxAdvantage}
              onChange={updateField}
            />
            <CarTextField
              id="creditExpectedResaleValue"
              label={(
                <>
                  Est. resale value after{' '}
                  <span className="font-bold text-slate-950">
                    {planningHorizon} {planningHorizon === 1 ? 'year' : 'years'}
                  </span>
                </>
              )}
              suffix="CHF"
              value={formValues.creditExpectedResaleValue}
              onChange={updateField}
            />
          </CarFinancingCard>
        </div>
      </div>
      <CarFinancingCharts
        creditAnnualInterestRate={creditInterestRate}
        creditAnnualTaxAdvantage={parseCarMoneyInput(formValues.creditEstimatedTaxAdvantage)}
        creditDownPayment={parseCarMoneyInput(formValues.creditDownPayment)}
        creditExpectedResaleValue={parseCarMoneyInput(formValues.creditExpectedResaleValue)}
        creditVehiclePrice={parseCarMoneyInput(formValues.creditVehiclePrice)}
        creditSummary={creditSummary}
        horizonYears={planningHorizon}
        leasingAnnualInterestRate={leasingRate}
        leasingBuyoutOption={formValues.leasingBuyoutOption === true}
        leasingDownPayment={parseCarMoneyInput(formValues.leasingDownPayment)}
        leasingExpectedResaleValue={parseCarMoneyInput(formValues.leasingExpectedResaleValue)}
        leasingResidualValue={parseCarMoneyInput(formValues.leasingResidualValue)}
        leasingVehiclePrice={parseCarMoneyInput(formValues.leasingVehiclePrice)}
        leasingSummary={leasingSummary}
      />
    </section>
  );
}

function readSavedCarInputs(): SavedCarInputs {
  try {
    const savedValue = window.localStorage.getItem(CAR_INPUTS_STORAGE_KEY);
    const parsedValue: unknown = savedValue ? JSON.parse(savedValue) : {};

    return isSavedCarInputs(parsedValue) ? parsedValue : {};
  } catch {
    return {};
  }
}

function saveCarInputs(inputs: Required<SavedCarInputs>) {
  try {
    window.localStorage.setItem(CAR_INPUTS_STORAGE_KEY, JSON.stringify(inputs));
  } catch {
    // Ignore storage failures so the calculator remains usable in private or restricted browser modes.
  }
}

function mergeSavedCarFormValues(savedFormValues: SavedCarInputs['formValues']) {
  return Object.fromEntries(
    Object.entries(initialCarFormValues).map(([key, fallback]) => {
      const savedValue = savedFormValues?.[key];
      const isMatchingType = typeof savedValue === typeof fallback;

      return [key, isMatchingType ? savedValue : fallback];
    }),
  ) as CarFormValues;
}

function getSavedCarPlanningHorizon(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(Math.max(Math.round(value), 0), 20) : 5;
}

function isSavedCarInputs(value: unknown): value is SavedCarInputs {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const inputs = value as SavedCarInputs;

  return (
    (inputs.planningHorizon === undefined || typeof inputs.planningHorizon === 'number') &&
    (inputs.formValues === undefined || (typeof inputs.formValues === 'object' && inputs.formValues !== null))
  );
}

function CarPlanningHorizonSlider({
  onChange,
  value,
}: {
  onChange: (value: number) => void;
  value: number;
}) {
  const percent = getPercent(value, 20);

  return (
    <section className="glass-panel px-5 py-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-32 items-baseline justify-between gap-3 sm:block">
          <p className="text-sm font-bold text-slate-900">Horizon</p>
          <p className="mt-1 text-sm text-slate-600">
            <span className="font-extrabold text-slate-950">{value}</span> years
          </p>
        </div>
        <div className="flex flex-1 items-center gap-4">
          <span className="text-sm font-bold text-slate-500">0</span>
          <input
            aria-label="Planning horizon"
            className="years-slider"
            max={20}
            min={0}
            step={1}
            style={{ '--slider-progress': `${percent}%` } as CSSProperties}
            type="range"
            value={value}
            onChange={(event) => onChange(Number(event.currentTarget.value))}
          />
          <span className="text-sm font-bold text-slate-500">20</span>
        </div>
      </div>
    </section>
  );
}

function CarFinancingCard({
  children,
  icon: Icon,
  iconClassName,
  summary,
  title,
}: {
  children: ReactNode;
  icon: LucideIcon;
  iconClassName: string;
  summary?: ReactNode;
  title: string;
}) {
  return (
    <section className="glass-panel flex min-w-0 flex-col p-4">
      <div className="flex min-w-0 items-center gap-3">
        <div className={`grid h-10 w-10 place-items-center rounded-2xl ${iconClassName}`}>
          <Icon className="h-5 w-5" />
        </div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
      </div>
      <div className="mt-4 space-y-2.5 text-sm">
        {children}
      </div>
      {summary && <div className="mt-auto pt-4">{summary}</div>}
    </section>
  );
}

function CarSummaryBadge({
  summary,
  tone,
}: {
  summary: CalculatedCarFinancingSummary;
  tone: 'blue' | 'emerald';
}) {
  const toneClasses = tone === 'blue'
    ? {
      border: 'border-blue-300/50',
      bg: 'bg-blue-500/10',
      label: 'text-blue-700',
      value: 'text-blue-700',
    }
    : {
      border: 'border-emerald-300/50',
      bg: 'bg-emerald-500/10',
      label: 'text-emerald-700',
      value: 'text-emerald-700',
    };

  return (
    <div className={`grid gap-3 rounded-lg border px-3 py-3 sm:grid-cols-2 ${toneClasses.bg} ${toneClasses.border}`}>
      <div className="min-w-0">
        <p className={`text-sm font-semibold ${toneClasses.label}`}>Est. Monthly Payment</p>
        <p className={`mt-1 text-2xl font-bold leading-none ${toneClasses.value}`}>
          {currency(summary.monthlyPayment)}
          <span className="ml-1 text-sm font-medium text-slate-700">CHF/mo</span>
        </p>
      </div>
      <div className="min-w-0 sm:text-right">
        <p className="text-sm font-semibold text-slate-600">
          Total Interest ({formatCarDuration(summary.durationYears)})
        </p>
        <p className="mt-2 text-lg font-bold leading-none text-slate-950">
          {currency(summary.totalInterestCost)} CHF
        </p>
      </div>
    </div>
  );
}

function formatCarDuration(durationYears: number) {
  if (!Number.isFinite(durationYears) || durationYears <= 0) {
    return '0 years';
  }

  const roundedYears = Math.round(durationYears * 10) / 10;

  return `${roundedYears} ${roundedYears === 1 ? 'year' : 'years'}`;
}

function CarTextField({
  id,
  label,
  onChange,
  suffix,
  value,
}: {
  id: string;
  label: ReactNode;
  onChange: (id: string, value: string) => void;
  suffix?: string;
  value: string | boolean;
}) {
  return (
    <label className="grid min-w-0 grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_9rem] sm:gap-3">
      <span className="truncate text-sm font-medium text-slate-800">{label}</span>
      <span className="glass-input grid w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 py-2 text-sm">
        <input
          aria-label={getCarFieldAriaLabel(label)}
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

function getCarFieldAriaLabel(label: ReactNode) {
  return typeof label === 'string' ? label : 'Estimated resale value';
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
        <span className="font-medium text-slate-950">{value ? 'Yes' : 'No'}</span>
        <span className="relative inline-flex h-6 w-11 items-center">
          <input
            aria-label={label}
            checked={value}
            className="peer sr-only"
            type="checkbox"
            onChange={(event) => onChange(id, event.currentTarget.checked)}
          />
          <span className="h-6 w-11 rounded-full bg-slate-300 transition peer-checked:bg-blue-500/35" />
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
        aria-describedby="car-model-credit-tooltip"
        className="grid h-4 w-4 place-items-center text-slate-600/80 transition hover:text-slate-900 focus:outline-none"
        type="button"
      >
        <Info className="h-3 w-3" />
      </button>
      <span
        id="car-model-credit-tooltip"
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
    const topLight = new DirectionalLight('#ffffff', 1.7);
    topLight.position.set(0, 5, 1);
    const sideLight = new DirectionalLight('#f8fafc', 1.1);
    sideLight.position.set(4, 1.8, -2.5);
    scene.add(ambientLight, keyLight, fillLight, rimLight, topLight, sideLight);

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
      className="relative z-10 h-full min-h-60 w-full sm:min-h-76 md:min-h-112"
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
