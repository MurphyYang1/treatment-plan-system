"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import SignatureCanvas from "react-signature-canvas";

const GST_RATE = 0.09;

type SubsidyTier =
  | "Private"
  | "CHAS Blue"
  | "CHAS Orange"
  | "Merdeka"
  | "Pioneer";

type Subsidy = {
  chasBlue: number;
  chasOrange: number;
  merdeka: number;
  pioneer: number;
};

type Treatment = {
  category: string;
  name: string;
  duration: string;
  fee: number;
  medisave: number;
  subsidies: Subsidy;
};

type Procedure = Treatment & {
  quantity: number;
  subsidyClaimQty: number;
  medisaveClaim: number;
  description: string;
};

type Phase = {
  id: number;
  title: string;
  duration: string;
  procedures: Procedure[];
};

const noSubsidy: Subsidy = {
  chasBlue: 0,
  chasOrange: 0,
  merdeka: 0,
  pioneer: 0,
};

const availableTreatments: Treatment[] = [
  {
    category: "General Treatment",
    name: "Consultation",
    duration: "1 Visit",
    fee: 50,
    medisave: 0,
    subsidies: {
      chasBlue: 20.5,
      chasOrange: 13.5,
      merdeka: 25.5,
      pioneer: 30.5,
    },
  },
  {
    category: "General Treatment",
    name: "Scaling & Polishing",
    duration: "1 Visit",
    fee: 100,
    medisave: 0,
    subsidies: {
      chasBlue: 50.5,
      chasOrange: 33.5,
      merdeka: 60.5,
      pioneer: 70.5,
    },
  },
  {
    category: "General Treatment",
    name: "Topical Fluoride",
    duration: "1 Visit",
    fee: 30,
    medisave: 0,
    subsidies: {
      chasBlue: 20.5,
      chasOrange: 13.5,
      merdeka: 25.5,
      pioneer: 30.5,
    },
  },
  {
    category: "General Treatment",
    name: "X-Ray",
    duration: "1 Visit",
    fee: 30,
    medisave: 0,
    subsidies: {
      chasBlue: 11,
      chasOrange: 7.5,
      merdeka: 16,
      pioneer: 21,
    },
  },
  {
    category: "General Treatment",
    name: "Extraction, Anterior",
    duration: "1 Visit",
    fee: 120,
    medisave: 0,
    subsidies: {
      chasBlue: 28.5,
      chasOrange: 19,
      merdeka: 33.5,
      pioneer: 38.5,
    },
  },
  {
    category: "General Treatment",
    name: "Extraction, Posterior",
    duration: "1 Visit",
    fee: 150,
    medisave: 0,
    subsidies: {
      chasBlue: 68.5,
      chasOrange: 45.5,
      merdeka: 73.5,
      pioneer: 78.5,
    },
  },
  {
    category: "General Treatment",
    name: "Filing, Simple (Class I, V or VI)",
    duration: "1 Visit",
    fee: 120,
    medisave: 0,
    subsidies: {
      chasBlue: 30,
      chasOrange: 20,
      merdeka: 35,
      pioneer: 40,
    },
  },
  {
    category: "General Treatment",
    name: "Filing, Complex (Class II, III or IV)",
    duration: "1 Visit",
    fee: 120,
    medisave: 0,
    subsidies: {
      chasBlue: 50,
      chasOrange: 33.5,
      merdeka: 55,
      pioneer: 60,
    },
  },
  {
    category: "General Treatment",
    name: "Re-cementation",
    duration: "1 Visit",
    fee: 0,
    medisave: 0,
    subsidies: {
      chasBlue: 35,
      chasOrange: 23.5,
      merdeka: 40,
      pioneer: 45,
    },
  },
  {
    category: "General Treatment",
    name: "Denture Reline/Repair (Upper or Lower)",
    duration: "1 Visit",
    fee: 150,
    medisave: 0,
    subsidies: {
      chasBlue: 75,
      chasOrange: 50,
      merdeka: 80,
      pioneer: 85,
    },
  },
  {
    category: "General Treatment",
    name: "Permanent Crown (PFM)",
    duration: "2 Visits",
    fee: 950,
    medisave: 0,
    subsidies: {
      chasBlue: 615,
      chasOrange: 410,
      merdeka: 620,
      pioneer: 625,
    },
  },
  {
    category: "General Treatment",
    name: "Permanent Crown (Zirconia)",
    duration: "2 Visits",
    fee: 1200,
    medisave: 0,
    subsidies: {
      chasBlue: 615,
      chasOrange: 410,
      merdeka: 620,
      pioneer: 625,
    },
  },
  {
    category: "General Treatment",
    name: "ARCYLIC Removable Denture, Complete (Upper or Lower)",
    duration: "2 Visits",
    fee: 1000,
    medisave: 0,
    subsidies: {
      chasBlue: 408.5,
      chasOrange: 272.5,
      merdeka: 413.5,
      pioneer: 418.5,
    },
  },
  {
    category: "General Treatment",
    name: "CHROME METAL Removable Denture, Complete (Upper or Lower)",
    duration: "2 Visits",
    fee: 2000,
    medisave: 0,
    subsidies: {
      chasBlue: 408.5,
      chasOrange: 272.5,
      merdeka: 413.5,
      pioneer: 418.5,
    },
  },
  {
    category: "General Treatment",
    name: "Simple Partial Acrylic Removable Denture (< 6 Teeth)",
    duration: "2 Visits",
    fee: 370,
    medisave: 0,
    subsidies: {
      chasBlue: 304,
      chasOrange: 202.5,
      merdeka: 309,
      pioneer: 314,
    },
  },
  {
    category: "General Treatment",
    name: "Simple Partial Valplast Flexible Denture (< 6 Teeth)",
    duration: "2 Visits",
    fee: 620,
    medisave: 0,
    subsidies: {
      chasBlue: 304,
      chasOrange: 202.5,
      merdeka: 309,
      pioneer: 314,
    },
  },
  {
    category: "General Treatment",
    name: "Simple Partial Chrome Metal Denture (< 6 Teeth)",
    duration: "2 Visits",
    fee: 820,
    medisave: 0,
    subsidies: {
      chasBlue: 304,
      chasOrange: 202.5,
      merdeka: 309,
      pioneer: 314,
    },
  },
  {
    category: "General Treatment",
    name: "Complex Partial Acrylic Denture (6+ Teeth)",
    duration: "2 Visits",
    fee: 470,
    medisave: 0,
    subsidies: {
      chasBlue: 385.5,
      chasOrange: 257,
      merdeka: 390.5,
      pioneer: 395.5,
    },
  },
  {
    category: "General Treatment",
    name: "Complex Partial Valplast Flexible Denture (6+ Teeth)",
    duration: "2 Visits",
    fee: 720,
    medisave: 0,
    subsidies: {
      chasBlue: 385.5,
      chasOrange: 257,
      merdeka: 390.5,
      pioneer: 395.5,
    },
  },
  {
    category: "General Treatment",
    name: "Complex Partial Chrome Metal Denture (6+ Teeth)",
    duration: "2 Visits",
    fee: 920,
    medisave: 0,
    subsidies: {
      chasBlue: 385.5,
      chasOrange: 257,
      merdeka: 390.5,
      pioneer: 395.5,
    },
  },
  {
    category: "General Treatment",
    name: "Root Canal Treatment (Anterior)",
    duration: "2 Visits",
    fee: 675,
    medisave: 0,
    subsidies: {
      chasBlue: 326,
      chasOrange: 217.5,
      merdeka: 331,
      pioneer: 336,
    },
  },
  {
    category: "General Treatment",
    name: "Root Canal Treatment (Pre-Molar)",
    duration: "2 Visits",
    fee: 800,
    medisave: 0,
    subsidies: {
      chasBlue: 462.5,
      chasOrange: 308.5,
      merdeka: 467.5,
      pioneer: 472.5,
    },
  },
  {
    category: "General Treatment",
    name: "Root Canal Treatment (Molar)",
    duration: "2 Visits",
    fee: 1300,
    medisave: 0,
    subsidies: {
      chasBlue: 584.5,
      chasOrange: 389.5,
      merdeka: 589.5,
      pioneer: 594.5,
    },
  },
  {
    category: "Implant Treatment",
    name: "Implant surgery (2 implants)",
    duration: "",
    fee: 3070,
    medisave: 3070,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Implant surgery (3 implants)",
    duration: "",
    fee: 4190,
    medisave: 4190,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Implant surgery (4 implants)",
    duration: "",
    fee: 5310,
    medisave: 5310,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Implant surgery (5 implants)",
    duration: "",
    fee: 6120,
    medisave: 6120,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Single Implant with PFM crown",
    duration: "",
    fee: 1950,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Single Implant with ZIRCONIA crown",
    duration: "",
    fee: 2500,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Single Implant (Straumann) with PFM crown",
    duration: "",
    fee: 3000,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Single Implant (Straumann) with ZIRCONIA crown",
    duration: "",
    fee: 3500,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Single Implant with Crestal Sinus lift",
    duration: "",
    fee: 2450,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Single Pterygoid Implant",
    duration: "",
    fee: 3800,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Single Zygomatic Implant",
    duration: "",
    fee: 8440,
    medisave: 3440,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "All-On-X (Temporary Phase - Standard)",
    duration: "",
    fee: 18000,
    medisave: 6120,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "All-On-X (Temporary Phase - Pterygoid)",
    duration: "",
    fee: 35000,
    medisave: 6120,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "All-On-X (Temporary Phase - Zygomatic)",
    duration: "",
    fee: 45000,
    medisave: 6120,
    subsidies: noSubsidy,
  },
  {
    category: "Orthodontic / Cosmetic Treatment",
    name: "Metal Braces",
    duration: "",
    fee: 3500,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Orthodontic / Cosmetic Treatment",
    name: "Invisalign",
    duration: "",
    fee: 6000,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Orthodontic / Cosmetic Treatment",
    name: "Retainers",
    duration: "",
    fee: 400,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Orthodontic / Cosmetic Treatment",
    name: "NightGuard",
    duration: "",
    fee: 700,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Orthodontic / Cosmetic Treatment",
    name: "Take-home whitening kit",
    duration: "",
    fee: 600,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Orthodontic / Cosmetic Treatment",
    name: "In-house ZOOM whitening",
    duration: "",
    fee: 980,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Final prosthesis for Dental implants",
    name: "PFM Crown / Pontic",
    duration: "",
    fee: 950,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Final prosthesis for Dental implants",
    name: "Zirconia Crown / Pontic",
    duration: "",
    fee: 1200,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Final prosthesis for Dental implants",
    name: "PFM Bridge",
    duration: "",
    fee: 1780,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Final prosthesis for Dental implants",
    name: "Zirconia Bridge",
    duration: "",
    fee: 3130,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Orthodontic / Cosmetic Treatment",
    name: "MouthGuard",
    duration: "",
    fee: 575,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Orthodontic / Cosmetic Treatment",
    name: "Composite Veneers (per unit) EMAX",
    duration: "",
    fee: 850,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Orthodontic / Cosmetic Treatment",
    name: "Porcelain Veneers (per unit) ZIRCONIA",
    duration: "",
    fee: 1200,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Apicoectomy (single-rooted) SF708T 2C",
    duration: "",
    fee: 2450,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Apicoectomy (Multi-rooted) SF818T 3A",
    duration: "",
    fee: 2720,
    medisave: 2220,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Unilateral Window Sinus Lift SB802M 3A",
    duration: "",
    fee: 2720,
    medisave: 2220,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Bilateral Sinus Lift SB814M 4A",
    duration: "",
    fee: 3710,
    medisave: 3210,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Simple Alveoloplasty/Bone Regenerative Procedure (GBR) SB803M 2C",
    duration: "",
    fee: 1950,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Alveolectomy (per quadrant) SB813M 2C",
    duration: "",
    fee: 1950,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Other Treatment",
    name: "Temporary Denture (Interim) per full arch",
    duration: "",
    fee: 1000,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Other Treatment",
    name: "Temporary Denture (Interim) per partial arch",
    duration: "",
    fee: 500,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Other Treatment",
    name: "Socket Preservation",
    duration: "",
    fee: 500,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Other Treatment",
    name: "Simultaneous Bone Graft",
    duration: "",
    fee: 500,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Final prosthesis for Dental implants",
    name: "Removable COMPLETE Locator Overdentures supported by implants (per arch)",
    duration: "",
    fee: 2500,
    medisave: 0,
    subsidies: {
      chasBlue: 408.5,
      chasOrange: 272.5,
      merdeka: 413.5,
      pioneer: 418.5,
    },
  },
  {
    category: "Final prosthesis for Dental implants",
    name: "Removable SIMPLE partial Locator Overdentures supported by implants (per arch)",
    duration: "",
    fee: 2500,
    medisave: 0,
    subsidies: {
      chasBlue: 304,
      chasOrange: 202.5,
      merdeka: 309,
      pioneer: 314,
    },
  },
  {
    category: "Final prosthesis for Dental implants",
    name: "Removable COMPLEX partial Locator Overdentures supported by implants (per arch)",
    duration: "",
    fee: 2500,
    medisave: 0,
    subsidies: {
      chasBlue: 385.5,
      chasOrange: 257,
      merdeka: 390.5,
      pioneer: 395.5,
    },
  },
  {
    category: "Final prosthesis for Dental implants",
    name: "Removable COMPLETE Hader-bar Overdentures supported by implants (per arch)",
    duration: "",
    fee: 3400,
    medisave: 0,
    subsidies: {
      chasBlue: 408.5,
      chasOrange: 272.5,
      merdeka: 413.5,
      pioneer: 418.5,
    },
  },
  {
    category: "Final prosthesis for Dental implants",
    name: "PFM Bridge (Full Arch - per side)",
    duration: "",
    fee: 8000,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Final prosthesis for Dental implants",
    name: "Zirconia Bridge (Full Arch - per side)",
    duration: "",
    fee: 10000,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Explant (Trephine Removal) SB702M 1C",
    duration: "",
    fee: 1320,
    medisave: 1320,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "U/L Exicision of Bony protuberance SB701M 1B",
    duration: "",
    fee: 1250,
    medisave: 1250,
    subsidies: noSubsidy,
  },
  {
    category: "Implant Treatment",
    name: "Insertion of Endosseous Dental Implant (single) SB816M 2C",
    duration: "",
    fee: 1950,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Excision with removal of bone and tooth division for Impacted Teeth (2 to 3) SF800T 3C",
    duration: "",
    fee: 2750,
    medisave: 2750,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Excision with removal of bone and w/o tooth division for Impacted Teeth (2 to 3) SF801T 3B",
    duration: "",
    fee: 2750,
    medisave: 2750,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Excision with removal of bone and tooth division for Impacted Teeth (4 or more) SF802T 4B",
    duration: "",
    fee: 3270,
    medisave: 3270,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Excision with removal of bone and w/o tooth division for Impacted Teeth (4 or more) SF803T 4A",
    duration: "",
    fee: 3210,
    medisave: 3210,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Excision with removal of bone and tooth division (deep, i.e. completely buried in bone) SF810T 3A",
    duration: "",
    fee: 2220,
    medisave: 2220,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Excision with removal of bone (without tooth division) for Superficial, Unerupted/Partially Erupted/Impacted tooth SF812T 1B",
    duration: "",
    fee: 1250,
    medisave: 1250,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Excision with removal of bone and tooth division for Superficial, Unerupted/Partially Erupted/Impacted tooth SF813T 2C",
    duration: "",
    fee: 1950,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Tooth, Simple Unerupted/Partially erupted/Impacted/Fractured, Removal of Multiple Roots SF816T 2C",
    duration: "",
    fee: 1950,
    medisave: 1950,
    subsidies: noSubsidy,
  },
  {
    category: "Surgical Treatment",
    name: "Excision with Release of Neurovascular Bundle for Unerupted/Partially Erupted/Impacted tooth SF817T 4A",
    duration: "",
    fee: 3210,
    medisave: 3210,
    subsidies: noSubsidy,
  },
];

const treatmentCategories = Array.from(
  new Set(availableTreatments.map((item) => item.category)),
);

function getSubsidyAmount(treatment: Procedure, subsidyTier: SubsidyTier) {
  switch (subsidyTier) {
    case "CHAS Blue":
      return treatment.subsidies.chasBlue;
    case "CHAS Orange":
      return treatment.subsidies.chasOrange;
    case "Merdeka":
      return treatment.subsidies.merdeka;
    case "Pioneer":
      return treatment.subsidies.pioneer;
    case "Private":
      return 0;
  }
}

function createProcedure(treatment: Treatment): Procedure {
  return {
    ...treatment,
    quantity: 1,
    subsidyClaimQty: 1,
    medisaveClaim: treatment.medisave,
    description: "",
  };
}

function getDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function Home() {
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const [dateSigned, setDateSigned] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("#signature");
  const [subsidyTier, setSubsidyTier] = useState<SubsidyTier>("Private");
  const [selectedCategory, setSelectedCategory] = useState(
    treatmentCategories[0] ?? "",
  );
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [phases, setPhases] = useState<Phase[]>([
    {
      id: 1,
      title: "Treatment Phase 1",
      duration: "",
      procedures: [],
    },
  ]);

  const filteredTreatments = availableTreatments.filter(
    (item) => item.category === selectedCategory,
  );

  useEffect(() => {
    const nextSignatureUrl = `${window.location.origin}${window.location.pathname}#signature`;
    const animationFrame = window.requestAnimationFrame(() => {
      setSignatureUrl(nextSignatureUrl);
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);

  const markSignatureComplete = () => {
    setDateSigned(getDateInputValue(new Date()));
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    setDateSigned("");
  };

  const addPhase = () => {
    setPhases((currentPhases) => [
      ...currentPhases,
      {
        id: Date.now(),
        title: `Treatment Phase ${currentPhases.length + 1}`,
        duration: "",
        procedures: [],
      },
    ]);
  };

  const deletePhase = (phaseIndex: number) => {
    setPhases((currentPhases) =>
      currentPhases.filter((_, index) => index !== phaseIndex),
    );
  };

  const movePhaseUp = (phaseIndex: number) => {
    if (phaseIndex === 0) {
      return;
    }

    setPhases((currentPhases) => {
      const updated = [...currentPhases];
      [updated[phaseIndex - 1], updated[phaseIndex]] = [
        updated[phaseIndex],
        updated[phaseIndex - 1],
      ];
      return updated;
    });
  };

  const movePhaseDown = (phaseIndex: number) => {
    setPhases((currentPhases) => {
      if (phaseIndex === currentPhases.length - 1) {
        return currentPhases;
      }

      const updated = [...currentPhases];
      [updated[phaseIndex + 1], updated[phaseIndex]] = [
        updated[phaseIndex],
        updated[phaseIndex + 1],
      ];
      return updated;
    });
  };

  const addProcedure = (phaseIndex: number) => {
    if (!selectedTreatment) {
      return;
    }

    const found = availableTreatments.find(
      (item) => item.name === selectedTreatment,
    );

    if (!found) {
      return;
    }

    setPhases((currentPhases) =>
      currentPhases.map((phase, index) =>
        index === phaseIndex
          ? {
              ...phase,
              procedures: [...phase.procedures, createProcedure(found)],
            }
          : phase,
      ),
    );
  };

  const deleteProcedure = (phaseIndex: number, procedureIndex: number) => {
    setPhases((currentPhases) =>
      currentPhases.map((phase, index) =>
        index === phaseIndex
          ? {
              ...phase,
              procedures: phase.procedures.filter(
                (_, currentIndex) => currentIndex !== procedureIndex,
              ),
            }
          : phase,
      ),
    );
  };

  const updatePhase = (
    phaseIndex: number,
    field: "title" | "duration",
    value: string,
  ) => {
    setPhases((currentPhases) =>
      currentPhases.map((phase, index) =>
        index === phaseIndex ? { ...phase, [field]: value } : phase,
      ),
    );
  };

  const updateProcedure = <K extends keyof Procedure>(
    phaseIndex: number,
    procedureIndex: number,
    field: K,
    value: Procedure[K],
  ) => {
    setPhases((currentPhases) =>
      currentPhases.map((phase, index) =>
        index === phaseIndex
          ? {
              ...phase,
              procedures: phase.procedures.map((procedure, currentIndex) =>
                currentIndex === procedureIndex
                  ? { ...procedure, [field]: value }
                  : procedure,
              ),
            }
          : phase,
      ),
    );
  };

  const totals = useMemo(() => {
    let subtotal = 0;
    let gst = 0;
    let subsidy = 0;
    let medisave = 0;

    phases.forEach((phase) => {
      phase.procedures.forEach((procedure) => {
        const rowSubtotal = procedure.fee * procedure.quantity;

        subtotal += rowSubtotal;
        gst += rowSubtotal * GST_RATE;
        subsidy +=
          getSubsidyAmount(procedure, subsidyTier) *
          procedure.subsidyClaimQty;
        medisave += procedure.medisaveClaim;
      });
    });

    return {
      subtotal,
      gst,
      subsidy,
      medisave,
      payable: subtotal + gst - subsidy - medisave,
    };
  }, [phases, subsidyTier]);

  return (
    <main className="min-h-screen bg-gray-100 p-6 text-black">
      <div className="mx-auto max-w-7xl overflow-hidden rounded-3xl bg-white shadow-xl">
        <header className="border-b p-8">
          <div className="flex flex-wrap items-center gap-6">
            <Image
              src="/nofrills-logo.svg"
              alt="Nofrills Dental"
              width={120}
              height={120}
              className="rounded-2xl"
              priority
            />

            <div>
              <h1 className="text-4xl font-bold">Nofrills Dental</h1>
              <p className="mt-2 text-gray-600">
                Dental Treatment Plan & Quotation
              </p>
            </div>
          </div>
        </header>

        <div className="grid gap-8 p-8 lg:grid-cols-3">
          <aside className="space-y-6 lg:col-span-1 lg:col-start-1 lg:row-start-1">
            <section className="rounded-2xl border p-6">
              <h2 className="mb-5 text-2xl font-bold">Patient Information</h2>

              <div className="space-y-4">
                <select className="w-full rounded-xl border px-4 py-3">
                  <option value="">Select Clinic Branch</option>
                  <option>Nofrills Dental Marina Square</option>
                  <option>Nofrills Dental Suntec</option>
                  <option>Nofrills Dental Katong</option>
                  <option>Nofrills Dental Beauty World</option>
                </select>

                <input
                  type="text"
                  placeholder="Dentist Name"
                  className="w-full rounded-xl border px-4 py-3"
                />

                <input
                  type="text"
                  placeholder="Patient Name"
                  className="w-full rounded-xl border px-4 py-3"
                />

                <input
                  type="text"
                  placeholder="Patient ID"
                  className="w-full rounded-xl border px-4 py-3"
                />

                <input
                  type="date"
                  className="w-full rounded-xl border px-4 py-3"
                />

                <select
                  value={subsidyTier}
                  onChange={(event) =>
                    setSubsidyTier(event.target.value as SubsidyTier)
                  }
                  className="w-full rounded-xl border px-4 py-3"
                >
                  <option>Private</option>
                  <option>CHAS Blue</option>
                  <option>CHAS Orange</option>
                  <option>Merdeka</option>
                  <option>Pioneer</option>
                </select>
              </div>
            </section>

            <section className="rounded-2xl border bg-gray-50 p-6">
              <h2 className="mb-5 text-2xl font-bold">
                Interest-Free Instalments
              </h2>

              <div className="space-y-4 text-sm">
                <div>
                  <p className="font-semibold">Atome</p>
                  <p>3 months interest-free</p>
                </div>

                <div>
                  <p className="font-semibold">GrabPay</p>
                  <p>4 months interest-free</p>
                </div>

                <div>
                  <p className="font-semibold">UOB / OCBC Credit Card 12 Mths</p>
                  <p>12 months interest-free instalment</p>
                </div>

                <div>
                  <p className="font-semibold">In-House Instalment</p>
                  <ul className="mt-2 list-disc space-y-1 pl-5">
                    <li>6/12 months interest-free - depending on treatment</li>
                    <li>Applicant must be SG / PR</li>
                    <li>1x guarantor required (SG / PR)</li>
                    <li>Valid debit card required</li>
                  </ul>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border bg-white p-6 text-sm leading-relaxed text-gray-700">
              <h2 className="mb-4 text-2xl font-bold text-black">Disclaimer</h2>

              <div className="space-y-4">
                <p>All treatment fees stated are inclusive of prevailing 9% GST.</p>

                <p>
                  Treatment fees discussed and agreed upon shall remain valid
                  throughout the planned treatment duration unless unforeseen
                  clinical complications arise.
                </p>

                <p>
                  Additional treatment procedures required due to complications,
                  changes in clinical condition or patient requests may incur
                  additional treatment charges.
                </p>

                <p>
                  CHAS, Merdeka Generation, Pioneer Generation and Medisave
                  claims remain subject to prevailing MOH regulations and patient
                  eligibility.
                </p>
              </div>
            </section>
          </aside>

          <section className="space-y-6 lg:col-span-2 lg:col-start-2 lg:row-start-1">
            <section className="rounded-2xl border p-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className="text-2xl font-bold">Treatment Phases</h2>

                <button
                  type="button"
                  onClick={addPhase}
                  className="rounded-xl bg-black px-6 py-3 text-white"
                >
                  + Add Phase
                </button>
              </div>
            </section>

            {phases.map((phase, phaseIndex) => {
              const phaseTotal = phase.procedures.reduce(
                (total, procedure) => {
                  const subtotal = procedure.fee * procedure.quantity;
                  const gst = subtotal * GST_RATE;
                  const subsidy =
                    getSubsidyAmount(procedure, subsidyTier) *
                    procedure.subsidyClaimQty;

                  return (
                    total +
                    subtotal +
                    gst -
                    subsidy -
                    procedure.medisaveClaim
                  );
                },
                0,
              );

              return (
                <section
                  key={phase.id}
                  className="rounded-2xl border bg-white p-6"
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="w-full max-w-md space-y-3">
                      <input
                        type="text"
                        value={phase.title}
                        onChange={(event) =>
                          updatePhase(phaseIndex, "title", event.target.value)
                        }
                        className="w-full rounded-xl border px-4 py-3 text-xl font-bold"
                      />

                      <input
                        type="text"
                        placeholder="Phase Duration"
                        value={phase.duration}
                        onChange={(event) =>
                          updatePhase(
                            phaseIndex,
                            "duration",
                            event.target.value,
                          )
                        }
                        className="w-full rounded-xl border px-4 py-3"
                      />
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-500">Phase CASH Total</p>
                      <p className="text-2xl font-bold">
                        ${phaseTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex gap-2">
                    <button
                      type="button"
                      onClick={() => movePhaseUp(phaseIndex)}
                      className="rounded-lg border px-3 py-2"
                    >
                      Up
                    </button>

                    <button
                      type="button"
                      onClick={() => movePhaseDown(phaseIndex)}
                      className="rounded-lg border px-3 py-2"
                    >
                      Down
                    </button>

                    <button
                      type="button"
                      onClick={() => deletePhase(phaseIndex)}
                      className="rounded-lg border px-3 py-2 text-red-500"
                    >
                      Delete
                    </button>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-3">
                    <select
                      value={selectedCategory}
                      onChange={(event) => {
                        setSelectedCategory(event.target.value);
                        setSelectedTreatment("");
                      }}
                      className="rounded-xl border px-4 py-3"
                    >
                      {treatmentCategories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>

                    <select
                      value={selectedTreatment}
                      onChange={(event) =>
                        setSelectedTreatment(event.target.value)
                      }
                      className="rounded-xl border px-4 py-3"
                    >
                      <option value="">Select Procedure</option>
                      {filteredTreatments.map((item) => (
                        <option key={item.name} value={item.name}>
                          {item.name}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => addProcedure(phaseIndex)}
                      className="rounded-xl bg-black px-6 py-3 text-white"
                    >
                      Add Procedure
                    </button>
                  </div>

                  <div className="mt-6 space-y-4">
                    {phase.procedures.map((procedure, procedureIndex) => {
                      const subtotal = procedure.fee * procedure.quantity;
                      const gst = subtotal * GST_RATE;
                      const subsidy =
                        getSubsidyAmount(procedure, subsidyTier) *
                        procedure.subsidyClaimQty;
                      const payable =
                        subtotal + gst - subsidy - procedure.medisaveClaim;

                      return (
                        <article
                          key={`${procedure.name}-${procedureIndex}`}
                          className="rounded-2xl border bg-gray-50 p-5"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              <h3 className="text-xl font-bold">
                                {procedure.name}
                              </h3>
                              <p className="mt-1 text-sm">
                                {procedure.category}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                deleteProcedure(phaseIndex, procedureIndex)
                              }
                              className="rounded-lg border px-3 py-2 text-red-500"
                            >
                              Delete
                            </button>
                          </div>

                          <div className="mt-6 grid gap-4 md:grid-cols-7">
                            <div>
                              <label className="text-sm">Qty</label>
                              <input
                                type="number"
                                min="1"
                                value={procedure.quantity}
                                onChange={(event) =>
                                  updateProcedure(
                                    phaseIndex,
                                    procedureIndex,
                                    "quantity",
                                    Number(event.target.value),
                                  )
                                }
                                className="mt-2 w-full rounded-xl border px-4 py-3"
                              />
                            </div>

                            <div>
                              <label className="text-sm">Claim Qty</label>
                              <input
                                type="number"
                                min="0"
                                value={procedure.subsidyClaimQty}
                                onChange={(event) =>
                                  updateProcedure(
                                    phaseIndex,
                                    procedureIndex,
                                    "subsidyClaimQty",
                                    Number(event.target.value),
                                  )
                                }
                                className="mt-2 w-full rounded-xl border px-4 py-3"
                              />
                            </div>

                            <div>
                              <label className="text-sm">PRICE</label>
                              <input
                                type="number"
                                value={procedure.fee}
                                onChange={(event) =>
                                  updateProcedure(
                                    phaseIndex,
                                    procedureIndex,
                                    "fee",
                                    Number(event.target.value),
                                  )
                                }
                                className="mt-2 w-full rounded-xl border px-4 py-3"
                              />
                            </div>

                            <div>
                              <label className="text-sm">GST</label>
                              <div className="mt-2 rounded-xl border bg-white px-4 py-3">
                                ${gst.toFixed(2)}
                              </div>
                            </div>

                            <div>
                              <label className="text-sm">Subsidy</label>
                              <div className="mt-2 rounded-xl border bg-white px-4 py-3">
                                ${subsidy.toFixed(2)}
                              </div>
                            </div>

                            <div>
                              <label className="text-sm">Medisave</label>
                              <input
                                type="number"
                                value={procedure.medisaveClaim}
                                onChange={(event) =>
                                  updateProcedure(
                                    phaseIndex,
                                    procedureIndex,
                                    "medisaveClaim",
                                    Number(event.target.value),
                                  )
                                }
                                className="mt-2 w-full rounded-xl border px-4 py-3"
                              />
                            </div>

                            <div>
                              <label className="text-sm">Payable</label>
                              <div className="mt-2 rounded-xl border bg-blue-50 px-4 py-3 font-bold">
                                ${payable.toFixed(2)}
                              </div>
                            </div>

                            <div className="md:col-span-7">
                              <div className="rounded-2xl border bg-white p-4">
                                <label className="text-sm">Remarks</label>
                                <textarea
                                  value={procedure.description}
                                  onChange={(event) =>
                                    updateProcedure(
                                      phaseIndex,
                                      procedureIndex,
                                      "description",
                                      event.target.value,
                                    )
                                  }
                                  rows={2}
                                  placeholder="Add clinical notes, tooth number, treatment explanation, risks discussed, patient requests, etc."
                                  className="mt-2 min-h-[70px] w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-base leading-normal focus:outline-none focus:ring-1 focus:ring-black"
                                />
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            <section className="rounded-2xl border bg-gray-50 p-6">
              <h2 className="mb-5 text-2xl font-bold">Financial Summary</h2>

              <div className="space-y-4">
                <div className="flex justify-between">
                  <span>Treatment Subtotal</span>
                  <span>${totals.subtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>GST (9%)</span>
                  <span>${totals.gst.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Total Subsidies USED</span>
                  <span>${totals.subsidy.toFixed(2)}</span>
                </div>

                <div className="flex justify-between">
                  <span>Total Medisave USED</span>
                  <span>${totals.medisave.toFixed(2)}</span>
                </div>

                <div className="flex justify-between border-t pt-5 text-2xl font-bold">
                  <span>Cash Portion</span>
                  <span>${totals.payable.toFixed(2)}</span>
                </div>
              </div>
            </section>

            <section id="signature" className="rounded-2xl border bg-white p-8">
              <h2 className="mb-6 text-2xl font-bold">
                Patient Acknowledgement & Signature
              </h2>

              <div className="grid gap-8 lg:grid-cols-3">
                <div className="flex flex-col items-center justify-center rounded-2xl border bg-gray-50 p-6 lg:col-span-1">
                  <QRCode value={signatureUrl} size={180} />

                  <p className="mt-5 text-center text-sm leading-relaxed text-gray-500">
                    Scan QR code to review and digitally sign this treatment
                    quotation on your mobile device.
                  </p>
                </div>

                <div className="lg:col-span-2">
                  <div className="rounded-2xl border p-6">
                    <p className="mb-6 text-sm leading-relaxed text-gray-600">
                      I acknowledge that the proposed treatment, estimated fees,
                      subsidies, Medisave claims, risks and alternative options
                      have been explained clearly to me.
                    </p>

                    <div className="overflow-hidden rounded-2xl border-2 border-dashed bg-white">
                      <SignatureCanvas
                        ref={signatureRef}
                        penColor="black"
                        onEnd={markSignatureComplete}
                        canvasProps={{
                          width: 900,
                          height: 220,
                          className: "w-full bg-white",
                        }}
                      />
                    </div>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={clearSignature}
                        className="rounded-xl border px-5 py-2 transition hover:bg-gray-100"
                      >
                        Clear Signature
                      </button>
                    </div>

                    <div className="mt-8 grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm text-gray-500">
                          Patient Name
                        </label>
                        <input
                          type="text"
                          placeholder="Full Name"
                          className="w-full rounded-xl border px-4 py-3"
                        />
                      </div>

                      <div>
                        <label className="mb-2 block text-sm text-gray-500">
                          Date Signed
                        </label>
                        <input
                          type="date"
                          value={dateSigned}
                          onChange={(event) => setDateSigned(event.target.value)}
                          className="w-full rounded-xl border px-4 py-3"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </section>
        </div>
      </div>
    </main>
  );
}
