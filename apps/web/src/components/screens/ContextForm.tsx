"use client";
import { useState } from "react";
import { PageTabs } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { ReferenceLibrary, SdrKit } from "../ReferenceLibrary";
import { BrandBook, type BrandProposal } from "../brand-company/BrandBook";
import { Messaging } from "../brand-company/Messaging";
import { WorkspaceSetup } from "../brand-company/WorkspaceSetup";
import type { SectionId } from "../brand-company/sections";
import "../../styles/pages/brand.css";

type OnboardOutput = {
  proposedDescription?: string;
  website?: string;
  brand?: BrandProposal;
}[];

// Brand & company: brand book, messaging, references, SDR kit and the v3.2 workspace setup.
// Internal view id stays "Company context" (assistant tools rely on it).
export function ContextForm() {
  const { data } = useWorkspace();
  const { t } = usePrefs();
  const [section, setSection] = useState<SectionId>("brand");
  const [description, setDescription] = useState(
    data.workspace.company.description,
  );
  const onboarding = data.runs.find(
    (r) => r.tool === "onboard" && r.state === "succeeded",
  )?.output as OnboardOutput | undefined;
  const proposal = onboarding?.[0];
  return (
    <div className="bc-page" data-ai-target="brand-company">
      <PageTabs
        label={t("Brand and company sections")}
        value={section}
        onChange={setSection}
        tabs={[
          { id: "brand", label: t("Brand book") },
          { id: "messaging", label: t("Messaging") },
          { id: "references", label: t("References") },
          { id: "sdr", label: t("SDR kit") },
          { id: "setup", label: t("Workspace setup") },
        ]}
      />
      {section === "brand" && (
        <BrandBook
          proposal={proposal?.brand}
          onMessaging={() => setSection("messaging")}
        />
      )}
      {section === "messaging" && (
        <Messaging
          description={description}
          onDescription={setDescription}
          proposedDescription={proposal?.proposedDescription}
          proposalSource={proposal?.website}
        />
      )}
      {section === "references" && <ReferenceLibrary />}
      {section === "sdr" && <SdrKit />}
      {section === "setup" && <WorkspaceSetup onSection={setSection} />}
    </div>
  );
}
