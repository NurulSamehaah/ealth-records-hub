import { createFileRoute, Link } from "@tanstack/react-router";
import { FileText, ShieldCheck, Users, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import hero from "@/assets/hospital-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MediVault — Hospital Patient Document Management" },
      {
        name: "description",
        content:
          "Securely upload, organise and share patient records. Staff manage every chart; patients view their own documents in a private portal.",
      },
      { property: "og:title", content: "MediVault — Hospital Patient Document Management" },
      {
        property: "og:description",
        content:
          "Securely upload, organise and share patient records with a staff workspace and a private patient portal.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  {
    icon: UploadCloud,
    title: "Upload in seconds",
    body: "Drop lab reports, scans, prescriptions or consent forms straight onto a patient chart.",
  },
  {
    icon: Users,
    title: "Patient portal",
    body: "Patients sign in and see only their own records — no phone calls, no paper copies.",
  },
  {
    icon: ShieldCheck,
    title: "Private by default",
    body: "Every file is stored privately and opened through short-lived, permission-checked links.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-2 font-display text-lg font-semibold">
            <FileText className="size-5 text-primary" />
            MediVault
          </div>
          <Button asChild size="sm">
            <Link to="/auth">Sign in</Link>
          </Button>
        </div>
      </header>

      <main>
        <section className="mx-auto grid max-w-6xl items-center gap-10 px-6 py-16 lg:grid-cols-2 lg:py-24">
          <div>
            <span className="inline-flex items-center rounded-full bg-accent px-3 py-1 text-xs font-medium tracking-wide text-accent-foreground uppercase">
              Hospital records
            </span>
            <h1 className="mt-5 text-4xl leading-tight font-semibold text-foreground sm:text-5xl">
              Patient documents, organised and always at hand
            </h1>
            <p className="mt-5 max-w-xl text-base text-muted-foreground">
              MediVault gives your clinical team one calm place to upload and retrieve patient
              paperwork, and gives patients a private window into their own file.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link to="/auth">Open the workspace</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link to="/auth">Create an account</Link>
              </Button>
            </div>
          </div>
          <div className="clinical-panel overflow-hidden p-2">
            <img
              src={hero}
              width={1600}
              height={1008}
              alt="Clinician reviewing patient records on a tablet beside shelves of medical files"
              className="h-full w-full rounded-lg object-cover"
            />
          </div>
        </section>

        <section className="border-t border-border bg-surface">
          <div className="mx-auto grid max-w-6xl gap-6 px-6 py-16 md:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="clinical-panel p-6">
                <f.icon className="size-6 text-primary" />
                <h2 className="mt-4 text-lg font-semibold">{f.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-8 text-center text-sm text-muted-foreground">
        MediVault · internal document management for hospital teams
      </footer>
    </div>
  );
}
