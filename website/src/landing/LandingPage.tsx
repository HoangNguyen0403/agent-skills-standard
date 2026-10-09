import React from "react";
import { MotionObserver } from "./MotionObserver.client";
import { Header } from "./sections/Header";
import { HeroSection } from "./sections/HeroSection";
import { CompatibilitySection } from "./sections/CompatibilitySection";
import { ProblemSection } from "./sections/ProblemSection";
import { SetupSection } from "./sections/SetupSection";
import { SpecimenSection } from "./sections/SpecimenSection";
import { WorkflowSection } from "./sections/WorkflowSection";
import { CustomizationSection } from "./sections/CustomizationSection";
import { EvidenceSection } from "./sections/EvidenceSection";
import { QuickStartSection } from "./sections/QuickStartSection";
import { FaqSection } from "./sections/FaqSection";
import { CommunitySection } from "./sections/CommunitySection";
import { Footer } from "./sections/Footer";
import styles from "./landing.module.css";

export function LandingPage(): React.JSX.Element {
  return (
    <>
      {/* MotionObserver mounts once, managing bounded one-shot decorative motion */}
      <MotionObserver />

      {/* Semantic header outside main */}
      <Header />

      {/* Main content containing 11 narrative regions */}
      <main id="main-content" className={styles.main} tabIndex={-1}>
        <HeroSection />
        <CompatibilitySection />
        <ProblemSection />
        <SetupSection />
        <SpecimenSection />
        <WorkflowSection />
        <CustomizationSection />
        <EvidenceSection />
        <QuickStartSection />
        <FaqSection />
        <CommunitySection />
      </main>

      {/* Semantic footer outside main */}
      <Footer />
    </>
  );
}
