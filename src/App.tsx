import { ApiKeyForm } from './components/ApiKeyForm';
import { CatalogList } from './components/CatalogList';
import { MigrationConfig } from './components/MigrationConfig';
import { MigrationProgress } from './components/MigrationProgress';
import { Stepper } from './components/Stepper';
import { useMigrationContext } from './context/MigrationContext';

function AppInner() {
  const { step, setStep, migrationRunning } = useMigrationContext();

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Iterable catalog copier
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Copy catalogs and items between projects using the{' '}
            <a
              className="text-sky-600 underline hover:text-sky-800"
              href="https://api.iterable.com/api/docs#catalogs_listCatalogs"
              target="_blank"
              rel="noreferrer"
            >
              Catalogs API
            </a>
            . Run locally with <code className="rounded bg-slate-100 px-1">npm run dev</code> so
            the Vite proxy can reach Iterable.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        <Stepper
          current={step}
          onStepClick={
            migrationRunning && step === 3
              ? undefined
              : (i) => {
                  if (i <= step) setStep(i);
                }
          }
        />

        {step === 0 && <ApiKeyForm />}
        {step === 1 && <CatalogList />}
        {step === 2 && <MigrationConfig />}
        {step === 3 && <MigrationProgress />}
      </main>
    </div>
  );
}

export function App() {
  return <AppInner />;
}
