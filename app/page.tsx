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
  isCustom?: boolean;
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


type InstallmentPlanId =
  | "none"
  | "atome-3"
  | "grabpay-4"
  | "card-12"
  | "in-house-6"
  | "in-house-12";


type InstallmentPlan = {
  id: InstallmentPlanId;
  label: string;
  months: number;
  isInHouse: boolean;
};

type PreferredLanguage = "English" | "Malay" | "Simplified Chinese" | "Tamil";

type LanguageCopy = {
  label: string;
  patientSummary: string;
  acknowledgement: string;
};


const noSubsidy: Subsidy = {
  chasBlue: 0,
  chasOrange: 0,
  merdeka: 0,
  pioneer: 0,
};


const installmentPlans: InstallmentPlan[] = [
  {
    id: "atome-3",
    label: "Atome - 3 months interest-free",
    months: 3,
    isInHouse: false,
  },
  {
    id: "grabpay-4",
    label: "GrabPay - 4 months interest-free",
    months: 4,
    isInHouse: false,
  },
  {
    id: "card-12",
    label: "UOB / OCBC Credit Card - 12 months",
    months: 12,
    isInHouse: false,
  },
  {
    id: "in-house-6",
    label: "In-House Instalment - 6 months",
    months: 6,
    isInHouse: true,
  },
  {
    id: "in-house-12",
    label: "In-House Instalment - 12 months",
    months: 12,
    isInHouse: true,
  },
];

const languageCopy: Record<PreferredLanguage, LanguageCopy> = {
  English: {
    label: "English",
    patientSummary:
      "This quotation explains the proposed treatment, estimated fees, subsidies, Medisave claims, and cash portion payable.",
    acknowledgement:
      "I acknowledge that the proposed treatment, estimated fees, subsidies, Medisave claims, risks and alternative options have been explained clearly to me.",
  },
  Malay: {
    label: "Malay",
    patientSummary:
      "Ringkasan untuk pesakit: Sebut harga ini menerangkan rawatan yang dicadangkan, anggaran bayaran, subsidi, tuntutan Medisave dan jumlah tunai yang perlu dibayar.",
    acknowledgement:
      "Saya mengakui bahawa rawatan yang dicadangkan, anggaran bayaran, subsidi, tuntutan Medisave, risiko dan pilihan rawatan lain telah diterangkan dengan jelas kepada saya.",
  },
  "Simplified Chinese": {
    label: "Simplified Chinese",
    patientSummary:
      "患者摘要：本报价说明建议的治疗、预计费用、补贴、保健储蓄索赔以及需要以现金支付的金额。",
    acknowledgement:
      "我确认牙医已向我清楚说明建议的治疗、预计费用、补贴、保健储蓄索赔、风险以及其他治疗选择。",
  },
  Tamil: {
    label: "Tamil",
    patientSummary:
      "நோயாளர் சுருக்கம்: இந்த மேற்கோள் பரிந்துரைக்கப்பட்ட சிகிச்சை, மதிப்பிடப்பட்ட கட்டணங்கள், மானியங்கள், Medisave கோரிக்கைகள் மற்றும் ரொக்கமாக செலுத்த வேண்டிய தொகையை விளக்குகிறது.",
    acknowledgement:
      "பரிந்துரைக்கப்பட்ட சிகிச்சை, மதிப்பிடப்பட்ட கட்டணங்கள், மானியங்கள், Medisave கோரிக்கைகள், அபாயங்கள் மற்றும் மாற்று சிகிச்சை விருப்பங்கள் எனக்கு தெளிவாக விளக்கப்பட்டுள்ளன என்பதை நான் ஒப்புக்கொள்கிறேன்.",
  },
};

const preferredLanguageOptions = Object.keys(
  languageCopy,
) as PreferredLanguage[];


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
    name: "Blank / Custom Procedure",
    duration: "",
    fee: 0,
    medisave: 0,
    subsidies: noSubsidy,
    isCustom: true,
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
    name: treatment.isCustom ? "" : treatment.name,
    quantity: 1,
    subsidyClaimQty: 1,
    medisaveClaim: treatment.medisave,
    description: "",
  };
}


function getDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}


function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}


function formatDeduction(amount: number) {
  return amount === 0 ? formatCurrency(0) : `-${formatCurrency(amount)}`;
}


function compactClass(isFinalized: boolean, editClass: string, finalClass: string) {
  return isFinalized ? finalClass : editClass;
}


function costLabelClass(isFinalized: boolean) {
  return compactClass(
    isFinalized,
    "flex min-h-10 items-end text-sm font-semibold leading-tight text-gray-700",
    "flex min-h-8 items-end text-xs font-semibold uppercase leading-tight tracking-wide text-gray-600",
  );
}

function displayValue(value: string) {
  return value.trim() || "—";
}

function formatAttendedBy(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return "—";
  }

  if (/^attended by/i.test(trimmed)) {
    return trimmed;
  }

  if (/^dr\.?\s*/i.test(trimmed)) {
    return `Attended by ${trimmed}`;
  }

  return `Attended by Dr ${trimmed}`;
}


export default function Home() {
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const [isFinalized, setIsFinalized] = useState(false);
  const [clinicBranch, setClinicBranch] = useState("");
  const [dentistName, setDentistName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [quotationDate, setQuotationDate] = useState("");
  const [dateSigned, setDateSigned] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("#signature");
  const [subsidyTier, setSubsidyTier] = useState<SubsidyTier>("Private");
  const [preferredLanguage, setPreferredLanguage] =
    useState<PreferredLanguage>("English");
  const [selectedInstallmentPlan, setSelectedInstallmentPlan] =
    useState<InstallmentPlanId>("none");
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
  const selectedLanguageCopy = languageCopy[preferredLanguage];


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


  const printQuotation = () => {
    window.print();
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


  const installmentBreakdown = useMemo(() => {
    const plan = installmentPlans.find(
      (item) => item.id === selectedInstallmentPlan,
    );


    if (!plan) {
      return null;
    }


    const cashPortion = Math.max(totals.payable, 0);
    const medisaveGstCash = plan.isInHouse
      ? Math.min(totals.medisave * GST_RATE, cashPortion)
      : 0;
    const installmentAmount = Math.max(cashPortion - medisaveGstCash, 0);


    return {
      plan,
      medisaveGstCash,
      installmentAmount,
      monthlyAmount: installmentAmount / plan.months,
    };
  }, [selectedInstallmentPlan, totals]);


  return (
    <main
      className={compactClass(
        isFinalized,
        "min-h-screen bg-gray-100 p-3 text-black sm:p-4 lg:p-6 print:bg-white print:p-0",
        "min-h-screen bg-gray-100 p-2 text-black sm:p-3 print:bg-white print:p-0",
      )}
    >
      <div
        className={compactClass(
          isFinalized,
          "print-page mx-auto max-w-7xl overflow-hidden rounded-2xl bg-white shadow-xl sm:rounded-3xl print:max-w-none print:rounded-none print:shadow-none",
          "print-page mx-auto max-w-6xl overflow-hidden rounded-xl bg-white shadow-md print:max-w-none print:rounded-none print:shadow-none",
        )}
      >
        <header
          className={compactClass(
            isFinalized,
            "border-b p-4 sm:p-6 lg:p-8 print:p-4",
            "border-b p-3 sm:p-4 print:p-4",
          )}
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 sm:gap-4">
            <Image
              src="/nofrills-logo.png"
              alt="Nofrills Dental"
              width={120}
              height={120}
              className={compactClass(
                isFinalized,
                "h-16 w-16 rounded-xl sm:h-24 sm:w-24 sm:rounded-2xl lg:h-[120px] lg:w-[120px]",
                "h-14 w-14 rounded-lg sm:h-20 sm:w-20 sm:rounded-xl print:h-16 print:w-16",
              )}
              priority
            />


            <div>
              <h1
                className={compactClass(
                  isFinalized,
                  "text-2xl font-bold sm:text-3xl lg:text-4xl",
                  "text-2xl font-bold sm:text-3xl print:text-2xl",
                )}
              >
                Nofrills Dental
              </h1>
              <p className={compactClass(isFinalized, "mt-2 text-gray-600", "mt-1 text-sm text-gray-600")}>
                Dental Treatment Plan & Quotation
              </p>
            </div>
            </div>


            <div className="no-print flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              <button
                type="button"
                onClick={() => setIsFinalized((current) => !current)}
                className="w-full rounded-xl bg-black px-5 py-3 text-white sm:w-auto sm:py-2"
              >
                {isFinalized ? "Edit Quotation" : "Finalize for Print"}
              </button>


              {isFinalized ? (
                <button
                  type="button"
                  onClick={printQuotation}
                  className="w-full rounded-xl border px-5 py-3 transition hover:bg-gray-100 sm:w-auto sm:py-2"
                >
                  Print
                </button>
              ) : null}
            </div>
          </div>
        </header>


        <div
          className={compactClass(
            isFinalized,
            "grid min-w-0 gap-4 p-3 sm:p-4 md:gap-6 lg:grid-cols-3 lg:gap-8 lg:p-8 print:grid-cols-1 print:gap-4 print:p-4",
            "grid min-w-0 gap-3 p-3 sm:gap-4 sm:p-4 lg:grid-cols-[18rem_minmax(0,1fr)] print:grid-cols-1 print:gap-3 print:p-3",
          )}
        >
          <aside className="min-w-0 space-y-4 lg:col-span-1 lg:col-start-1 lg:row-start-1 print:col-auto print:row-auto print:space-y-3">
            <section
              className={compactClass(
                isFinalized,
                "avoid-break rounded-2xl border p-4 sm:p-6",
                "avoid-break rounded-xl border p-3 sm:p-4 print:p-3",
              )}
            >
              <h2 className={compactClass(isFinalized, "mb-5 text-2xl font-bold", "mb-3 text-xl font-bold")}>
                Patient Information
              </h2>


              {isFinalized ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Clinic Branch
                    </dt>
                    <dd className="mt-1 font-medium">
                      {displayValue(clinicBranch)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Dentist
                    </dt>
                    <dd className="mt-1 font-medium">
                      {formatAttendedBy(dentistName)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Patient Name
                    </dt>
                    <dd className="mt-1 font-medium">
                      {displayValue(patientName)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Patient ID
                    </dt>
                    <dd className="mt-1 font-medium">
                      {displayValue(patientId)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Quotation Date
                    </dt>
                    <dd className="mt-1 font-medium">
                      {displayValue(quotationDate)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Subsidy Tier
                    </dt>
                    <dd className="mt-1 font-medium">{subsidyTier}</dd>
                  </div>

                </dl>
              ) : (
                <div className="space-y-4">
                  <select
                    value={clinicBranch}
                    onChange={(event) => setClinicBranch(event.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    <option value="">Select Clinic Branch</option>
                    <option>Nofrills Dental Marina Square</option>
                    <option>Nofrills Dental Suntec</option>
                    <option>Nofrills Dental Katong</option>
                    <option>Nofrills Dental Beauty World</option>
                  </select>

                  <input
                    type="text"
                    placeholder="Dentist name (e.g. Dr Ben)"
                    value={dentistName}
                    onChange={(event) => setDentistName(event.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  />

                  <input
                    type="text"
                    placeholder="Patient Name"
                    value={patientName}
                    onChange={(event) => setPatientName(event.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  />

                  <input
                    type="text"
                    placeholder="Patient ID"
                    value={patientId}
                    onChange={(event) => setPatientId(event.target.value)}
                    className="w-full rounded-xl border px-4 py-3"
                  />

                  <input
                    type="date"
                    value={quotationDate}
                    onChange={(event) => setQuotationDate(event.target.value)}
                    className="h-12 w-full rounded-xl border px-4 py-3 leading-normal"
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

                  <select
                    value={preferredLanguage}
                    onChange={(event) =>
                      setPreferredLanguage(
                        event.target.value as PreferredLanguage,
                      )
                    }
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    {preferredLanguageOptions.map((language) => (
                      <option key={language} value={language}>
                        Preferred Language: {languageCopy[language].label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </section>


            {!isFinalized ? (
              <>
                <section className="avoid-break rounded-2xl border bg-gray-50 p-4 sm:p-6">
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
                      <p className="font-semibold">
                        UOB / OCBC Credit Card 12 Mths
                      </p>
                      <p>12 months interest-free instalment</p>
                    </div>


                    <div>
                      <p className="font-semibold">In-House Instalment</p>
                      <ul className="mt-2 list-disc space-y-1 pl-5">
                        <li>
                          6/12 months interest-free - depending on treatment
                        </li>
                        <li>Applicant must be SG / PR</li>
                        <li>1x guarantor required (SG / PR)</li>
                        <li>Valid debit card required</li>
                      </ul>
                    </div>
                  </div>
                </section>


                <section className="avoid-break rounded-2xl border bg-white p-4 text-sm leading-relaxed text-gray-700 sm:p-6">
                  <h2 className="mb-4 text-2xl font-bold text-black">
                    Disclaimer
                  </h2>


                  <div className="space-y-4">
                    <p>
                      All treatment fees stated are inclusive of prevailing 9%
                      GST.
                    </p>


                    <p>
                      Treatment fees discussed and agreed upon shall remain valid
                      throughout the planned treatment duration unless unforeseen
                      clinical complications arise.
                    </p>


                    <p>
                      Additional treatment procedures required due to
                      complications, changes in clinical condition or patient
                      requests may incur additional treatment charges.
                    </p>


                    <p>
                      CHAS, Merdeka Generation, Pioneer Generation and Medisave
                      claims remain subject to prevailing MOH regulations and
                      patient eligibility.
                    </p>
                  </div>
                </section>
              </>
            ) : null}
          </aside>


          <section
            className={compactClass(
              isFinalized,
              "min-w-0 space-y-6 lg:col-span-2 lg:col-start-2 lg:row-start-1 print:col-auto print:row-auto",
              "min-w-0 space-y-3 lg:col-span-1 lg:col-start-2 lg:row-start-1 print:col-auto print:row-auto print:space-y-3",
            )}
          >
            <section
              className={compactClass(
                isFinalized,
                "rounded-2xl border p-4 sm:p-6",
                "avoid-break rounded-xl border p-3 sm:p-4 print:p-3",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className={compactClass(isFinalized, "text-2xl font-bold", "text-xl font-bold")}>
                  Treatment Phases
                </h2>


                {!isFinalized ? (
                  <button
                    type="button"
                    onClick={addPhase}
                    className="rounded-xl bg-black px-6 py-3 text-white"
                  >
                    + Add Phase
                  </button>
                ) : null}
              </div>
            </section>


            <section
              className={compactClass(
                isFinalized,
                "avoid-break rounded-2xl border bg-blue-50 p-5 text-sm text-blue-950",
                "avoid-break rounded-xl border bg-blue-50 p-3 text-xs text-blue-950 print:p-2",
              )}
            >
              <h3 className="font-bold">How to read each treatment cost</h3>
              <p className="mt-2 leading-relaxed">
                Quantity is the number of procedures planned. Claim quantity is
                the number submitted for CHAS / Merdeka / Pioneer subsidy. Cash
                payable is calculated as treatment subtotal (unit price x
                quantity) plus GST, less subsidy and Medisave deductions.
              </p>
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
                  className={compactClass(
                    isFinalized,
                    "avoid-break rounded-2xl border bg-white p-4 sm:p-6",
                    "avoid-break rounded-xl border bg-white p-3 sm:p-4 print:p-3",
                  )}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                    <div className={compactClass(isFinalized, "w-full space-y-3 sm:max-w-md", "w-full space-y-1 sm:max-w-md")}>
                      <input
                        type="text"
                        value={phase.title}
                        readOnly={isFinalized}
                        onChange={(event) =>
                          updatePhase(phaseIndex, "title", event.target.value)
                        }
                        className={compactClass(
                          isFinalized,
                          "w-full rounded-xl border px-4 py-3 text-xl font-bold",
                          "w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-lg font-bold",
                        )}
                      />


                      <input
                        type="text"
                        placeholder="Phase Duration"
                        value={phase.duration}
                        readOnly={isFinalized}
                        onChange={(event) =>
                          updatePhase(
                            phaseIndex,
                            "duration",
                            event.target.value,
                          )
                        }
                        className={compactClass(
                          isFinalized,
                          "w-full rounded-xl border px-4 py-3",
                          "w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-sm",
                        )}
                      />
                    </div>


                    <div className="text-left sm:text-right">
                      <p className="text-sm text-gray-500">Phase CASH Total</p>
                      <p className={compactClass(isFinalized, "text-2xl font-bold tabular-nums", "text-xl font-bold tabular-nums")}>
                        ${phaseTotal.toFixed(2)}
                      </p>
                    </div>
                  </div>


                  {!isFinalized ? (
                    <>
                      <div className="mt-6 grid grid-cols-3 gap-2 sm:flex">
                        <button
                          type="button"
                          onClick={() => movePhaseUp(phaseIndex)}
                          className="rounded-lg border px-3 py-2"
                        >
                          ⮝
                        </button>


                        <button
                          type="button"
                          onClick={() => movePhaseDown(phaseIndex)}
                          className="rounded-lg border px-3 py-2"
                        >
                          ⮟
                        </button>


                        <button
                          type="button"
                          onClick={() => deletePhase(phaseIndex)}
                          className="rounded-lg border px-3 py-2 text-red-500"
                        >
                          ✗
                        </button>
                      </div>


                      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
                          className="rounded-xl bg-black px-6 py-3 text-white sm:col-span-2 lg:col-span-1"
                        >
                          Add Procedure
                        </button>
                      </div>
                    </>
                  ) : null}


                  {isFinalized ? (
                    <>
                      <div className="mt-3 space-y-3 lg:hidden print:hidden">
                        {phase.procedures.map((procedure, procedureIndex) => {
                          const subtotal = procedure.fee * procedure.quantity;
                          const gst = subtotal * GST_RATE;
                          const subsidy =
                            getSubsidyAmount(procedure, subsidyTier) *
                            procedure.subsidyClaimQty;
                          const payable =
                            subtotal + gst - subsidy - procedure.medisaveClaim;
                          const hasRemarks =
                            procedure.description.trim().length > 0;

                          return (
                            <article
                              key={`${phase.id}-mobile-${procedureIndex}`}
                              className="avoid-break rounded-xl border bg-gray-50 p-3"
                            >
                              <div>
                                <h3 className="text-base font-bold">
                                  {procedure.name || "Custom Procedure"}
                                </h3>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {procedure.category}
                                </p>
                              </div>

                              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    Quantity
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {procedure.quantity}
                                  </dd>
                                </div>

                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    Claim Qty
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {procedure.subsidyClaimQty}
                                  </dd>
                                </div>

                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    Unit Price
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {formatCurrency(procedure.fee)}
                                  </dd>
                                </div>

                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    GST (9%)
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {formatCurrency(gst)}
                                  </dd>
                                </div>

                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    Subsidy Deducted
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {formatDeduction(subsidy)}
                                  </dd>
                                </div>

                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    Medisave Deducted
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {formatDeduction(procedure.medisaveClaim)}
                                  </dd>
                                </div>

                                <div className="col-span-2 border-t pt-2">
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    Cash Payable
                                  </dt>
                                  <dd className="text-right text-lg font-bold tabular-nums">
                                    {formatCurrency(payable)}
                                  </dd>
                                </div>
                              </dl>

                              {hasRemarks ? (
                                <div className="mt-3 rounded border-l-2 border-blue-300 bg-blue-50 px-2 py-1.5 text-xs leading-snug text-blue-950">
                                  <span className="font-semibold">
                                    Remarks:{" "}
                                  </span>
                                  <span className="whitespace-pre-wrap">
                                    {procedure.description}
                                  </span>
                                </div>
                              ) : null}
                            </article>
                          );
                        })}
                      </div>

                    <div className="mt-3 hidden overflow-x-auto rounded-lg border lg:block print:block">
                      <table className="w-full min-w-[760px] table-fixed border-collapse text-[11px] leading-tight print:min-w-0">
                        <thead className="bg-gray-100 text-gray-700">
                          <tr>
                            <th className="w-[28%] px-2 py-2 text-left font-semibold">
                              Treatment
                            </th>
                            <th className="w-[7%] px-2 py-2 text-right font-semibold tabular-nums">
                              Qty
                            </th>
                            <th className="w-[8%] px-2 py-2 text-right font-semibold tabular-nums">
                              Claim
                            </th>
                            <th className="w-[11%] px-2 py-2 text-right font-semibold tabular-nums">
                              Unit Price
                            </th>
                            <th className="w-[10%] px-2 py-2 text-right font-semibold tabular-nums">
                              GST
                            </th>
                            <th className="w-[12%] px-2 py-2 text-right font-semibold tabular-nums">
                              Subsidy
                              <span className="block text-[9px] font-normal">
                                Deduction
                              </span>
                            </th>
                            <th className="w-[12%] px-2 py-2 text-right font-semibold tabular-nums">
                              Medisave
                              <span className="block text-[9px] font-normal">
                                Deduction
                              </span>
                            </th>
                            <th className="w-[12%] px-2 py-2 text-right font-semibold tabular-nums">
                              Cash Payable
                            </th>
                          </tr>
                        </thead>


                        <tbody>
                          {phase.procedures.map((procedure, procedureIndex) => {
                            const subtotal =
                              procedure.fee * procedure.quantity;
                            const gst = subtotal * GST_RATE;
                            const subsidy =
                              getSubsidyAmount(procedure, subsidyTier) *
                              procedure.subsidyClaimQty;
                            const payable =
                              subtotal + gst - subsidy - procedure.medisaveClaim;
                            const hasRemarks =
                              procedure.description.trim().length > 0;


                            return (
                                <tr
                                  key={`${phase.id}-table-${procedureIndex}`}
                                  className="border-t align-top"
                                >
                                  <td className="px-2 py-2">
                                    <div className="font-semibold">
                                      {procedure.name || "Custom Procedure"}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                      {procedure.category}
                                    </div>
                                    {hasRemarks ? (
                                      <div className="mt-1.5 rounded border-l-2 border-blue-300 bg-blue-50 px-1.5 py-1 text-[10px] leading-snug text-blue-950">
                                        <span className="font-semibold">
                                          Remarks:{" "}
                                        </span>
                                        <span className="whitespace-pre-wrap">
                                          {procedure.description}
                                        </span>
                                      </div>
                                    ) : null}
                                  </td>
                                  <td className="px-2 py-2 text-right tabular-nums">
                                    {procedure.quantity}
                                  </td>
                                  <td className="px-2 py-2 text-right tabular-nums">
                                    {procedure.subsidyClaimQty}
                                  </td>
                                  <td className="px-2 py-2 text-right tabular-nums">
                                    {formatCurrency(procedure.fee)}
                                  </td>
                                  <td className="px-2 py-2 text-right tabular-nums">
                                    {formatCurrency(gst)}
                                  </td>
                                  <td className="px-2 py-2 text-right tabular-nums">
                                    {formatDeduction(subsidy)}
                                  </td>
                                  <td className="px-2 py-2 text-right tabular-nums">
                                    {formatDeduction(procedure.medisaveClaim)}
                                  </td>
                                  <td className="px-2 py-2 text-right font-bold tabular-nums">
                                    {formatCurrency(payable)}
                                  </td>
                                </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    </>
                  ) : (
                    <div className="mt-6 space-y-4">
                    {phase.procedures.map((procedure, procedureIndex) => {
                      const subtotal = procedure.fee * procedure.quantity;
                      const gst = subtotal * GST_RATE;
                      const subsidy =
                        getSubsidyAmount(procedure, subsidyTier) *
                        procedure.subsidyClaimQty;
                      const payable =
                        subtotal + gst - subsidy - procedure.medisaveClaim;
                      const hasRemarks = procedure.description.trim().length > 0;


                      return (
                        <article
                          key={`${phase.id}-edit-${procedureIndex}`}
                          className={compactClass(
                            isFinalized,
                            "avoid-break rounded-2xl border bg-gray-50 p-5",
                            "avoid-break rounded-xl border bg-gray-50 p-3",
                          )}
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div>
                              {procedure.isCustom ? (
                                <input
                                  type="text"
                                  value={procedure.name}
                                  onChange={(event) =>
                                    updateProcedure(
                                      phaseIndex,
                                      procedureIndex,
                                      "name",
                                      event.target.value,
                                    )
                                  }
                                  placeholder="Type custom procedure name"
                                  className="w-full rounded-xl border bg-white px-4 py-3 text-lg font-bold sm:text-xl"
                                />
                              ) : (
                                <h3 className="text-xl font-bold">
                                  {procedure.name}
                                </h3>
                              )}
                              <p className={compactClass(isFinalized, "mt-1 text-sm", "mt-0.5 text-xs")}>
                                {procedure.category}
                              </p>
                            </div>


                            {!isFinalized ? (
                              <button
                                type="button"
                                onClick={() =>
                                  deleteProcedure(phaseIndex, procedureIndex)
                                }
                                className="rounded-lg border px-3 py-2 text-red-500"
                              >
                                Delete
                              </button>
                            ) : null}
                          </div>


                          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-7 lg:gap-4">
                            <div>
                              <label className={costLabelClass(isFinalized)}>
                                Quantity
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={procedure.quantity}
                                readOnly={isFinalized}
                                onChange={(event) =>
                                  updateProcedure(
                                    phaseIndex,
                                    procedureIndex,
                                    "quantity",
                                    Number(event.target.value),
                                  )
                                }
                                className={compactClass(
                                  isFinalized,
                                  "mt-2 w-full rounded-xl border px-4 py-3 text-right tabular-nums",
                                  "mt-1 w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-right tabular-nums",
                                )}
                              />
                            </div>


                            <div>
                              <label className={costLabelClass(isFinalized)}>
                                Subsidy Claim Qty
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={procedure.subsidyClaimQty}
                                readOnly={isFinalized}
                                onChange={(event) =>
                                  updateProcedure(
                                    phaseIndex,
                                    procedureIndex,
                                    "subsidyClaimQty",
                                    Number(event.target.value),
                                  )
                                }
                                className={compactClass(
                                  isFinalized,
                                  "mt-2 w-full rounded-xl border px-4 py-3 text-right tabular-nums",
                                  "mt-1 w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-right tabular-nums",
                                )}
                              />
                            </div>


                            <div>
                              <label className={costLabelClass(isFinalized)}>
                                Unit Price
                              </label>
                              {isFinalized ? (
                                <div className="mt-1 rounded-lg border border-transparent bg-transparent px-0 py-1 text-right tabular-nums">
                                  ${procedure.fee.toFixed(2)}
                                </div>
                              ) : (
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
                                  className="mt-2 w-full rounded-xl border px-4 py-3 text-right tabular-nums"
                                />
                              )}
                            </div>


                            <div>
                              <label className={costLabelClass(isFinalized)}>
                                GST (9%)
                              </label>
                              <div
                                className={compactClass(
                                  isFinalized,
                                  "mt-2 rounded-xl border bg-white px-4 py-3 text-right tabular-nums",
                                  "mt-1 rounded-lg border border-transparent bg-transparent px-0 py-1 text-right tabular-nums",
                                )}
                              >
                                ${gst.toFixed(2)}
                              </div>
                            </div>


                            <div>
                              <label className={costLabelClass(isFinalized)}>
                                Subsidy Deducted
                              </label>
                              <div
                                className={compactClass(
                                  isFinalized,
                                  "mt-2 rounded-xl border bg-white px-4 py-3 text-right tabular-nums",
                                  "mt-1 rounded-lg border border-transparent bg-transparent px-0 py-1 text-right tabular-nums",
                                )}
                              >
                                ${subsidy.toFixed(2)}
                              </div>
                            </div>


                            <div>
                              <label className={costLabelClass(isFinalized)}>
                                Medisave Deducted
                              </label>
                              {isFinalized ? (
                                <div className="mt-1 rounded-lg border border-transparent bg-transparent px-0 py-1 text-right tabular-nums">
                                  ${procedure.medisaveClaim.toFixed(2)}
                                </div>
                              ) : (
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
                                  className="mt-2 w-full rounded-xl border px-4 py-3 text-right tabular-nums"
                                />
                              )}
                            </div>


                            <div>
                              <label className={costLabelClass(isFinalized)}>
                                Cash Payable
                              </label>
                              <div
                                className={compactClass(
                                  isFinalized,
                                  "mt-2 rounded-xl border bg-blue-50 px-4 py-3 text-right font-bold tabular-nums",
                                  "mt-1 rounded-lg border border-transparent bg-transparent px-0 py-1 text-right font-bold tabular-nums",
                                )}
                              >
                                ${payable.toFixed(2)}
                              </div>
                            </div>


                            {!isFinalized || hasRemarks ? (
                              <div className="col-span-2 sm:col-span-3 lg:col-span-7">
                                {isFinalized ? (
                                  <div className="rounded-lg bg-white px-3 py-2 text-xs leading-snug">
                                    <span className="font-semibold">Remarks: </span>
                                    <span className="whitespace-pre-wrap">
                                      {procedure.description}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="rounded-xl border bg-white p-3">
                                    <label className="text-xs font-semibold">
                                      Remarks
                                    </label>
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
                                      placeholder="Clinical notes, tooth number, risks discussed, patient requests, etc."
                                      className="mt-1 min-h-[48px] w-full resize-y rounded-lg border border-gray-300 px-3 py-2 text-sm leading-snug focus:outline-none focus:ring-1 focus:ring-black"
                                    />
                                  </div>
                                )}
                              </div>
                            ) : null}
                          </div>
                        </article>
                      );
                    })}
                    </div>
                  )}
                </section>
              );
            })}


            <section
              className={compactClass(
                isFinalized,
                "avoid-break rounded-2xl border bg-gray-50 p-4 sm:p-6",
                "avoid-break rounded-xl border bg-gray-50 p-3 sm:p-4 print:p-3",
              )}
            >
              <h2 className={compactClass(isFinalized, "mb-5 text-2xl font-bold", "mb-3 text-xl font-bold")}>
                Financial Summary
              </h2>


              <div className={compactClass(isFinalized, "space-y-4", "space-y-2 text-sm")}>
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                  <span className="min-w-0 break-words">Treatment Subtotal</span>
                  <span className="whitespace-nowrap text-right tabular-nums">
                    ${totals.subtotal.toFixed(2)}
                  </span>
                </div>


                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                  <span className="min-w-0 break-words">GST (9%)</span>
                  <span className="whitespace-nowrap text-right tabular-nums">
                    ${totals.gst.toFixed(2)}
                  </span>
                </div>


                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                  <span className="min-w-0 break-words">Total Subsidies USED</span>
                  <span className="whitespace-nowrap text-right tabular-nums">
                    ${totals.subsidy.toFixed(2)}
                  </span>
                </div>


                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                  <span className="min-w-0 break-words">Total Medisave USED</span>
                  <span className="whitespace-nowrap text-right tabular-nums">
                    ${totals.medisave.toFixed(2)}
                  </span>
                </div>


                <div
                  className={compactClass(
                    isFinalized,
                    "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t pt-5 text-2xl font-bold",
                    "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t pt-3 text-xl font-bold",
                  )}
                >
                  <span className="min-w-0 break-words">Cash Portion</span>
                  <span className="whitespace-nowrap text-right tabular-nums">
                    ${totals.payable.toFixed(2)}
                  </span>
                </div>


                {!isFinalized ? (
                  <div className="border-t pt-4">
                    <label className="mb-2 block text-sm font-semibold text-gray-700">
                      Optional Instalment Plan
                    </label>
                    <select
                      value={selectedInstallmentPlan}
                      onChange={(event) =>
                        setSelectedInstallmentPlan(
                          event.target.value as InstallmentPlanId,
                        )
                      }
                      className="w-full rounded-xl border bg-white px-4 py-3"
                    >
                      <option value="none">No instalment plan selected</option>
                      {installmentPlans.map((plan) => (
                        <option key={plan.id} value={plan.id}>
                          {plan.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : null}


                {installmentBreakdown ? (
                  <div className="rounded-xl border bg-white p-3 text-sm sm:p-4">
                    <div className="flex flex-col gap-1 font-semibold sm:flex-row sm:justify-between sm:gap-4">
                      <span>Selected Instalment Plan</span>
                      <span className="sm:text-right">
                        {installmentBreakdown.plan.label}
                      </span>
                    </div>


                    {installmentBreakdown.plan.isInHouse ? (
                      <div className="mt-3 space-y-2">
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                          <span className="min-w-0 break-words">
                            Upfront cash payment (GST on Medisave portion)
                          </span>
                          <span className="whitespace-nowrap text-right tabular-nums">
                            {formatCurrency(
                              installmentBreakdown.medisaveGstCash,
                            )}
                          </span>
                        </div>
                        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                          <span className="min-w-0 break-words">Amount under in-house instalments</span>
                          <span className="whitespace-nowrap text-right tabular-nums">
                            {formatCurrency(
                              installmentBreakdown.installmentAmount,
                            )}
                          </span>
                        </div>
                        <p className="text-xs leading-relaxed text-gray-600">
                          For in-house instalments, the GST amount linked to the
                          Medisave claim is excluded from the instalment amount
                          and collected in cash.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                        <span className="min-w-0 break-words">Amount under instalments</span>
                        <span className="whitespace-nowrap text-right tabular-nums">
                          {formatCurrency(
                            installmentBreakdown.installmentAmount,
                          )}
                        </span>
                      </div>
                    )}


                    <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t pt-3 font-bold">
                      <span className="min-w-0 break-words">
                        Estimated monthly instalment (
                        {installmentBreakdown.plan.months} months)
                      </span>
                      <span className="whitespace-nowrap text-right tabular-nums">
                        {formatCurrency(installmentBreakdown.monthlyAmount)}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>
            </section>


            {isFinalized && preferredLanguage !== "English" ? (
              <section className="avoid-break rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950 print:p-3">
                <h2 className="mb-2 text-lg font-bold">
                  Patient Language Summary ({selectedLanguageCopy.label})
                </h2>
                <p>{selectedLanguageCopy.patientSummary}</p>
                <p className="mt-2 text-xs text-blue-800">
                  The original quotation and treatment names remain in English.
                  This section is provided as a patient-facing language aid.
                </p>
              </section>
            ) : null}


            {isFinalized ? (
              <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
                <section className="avoid-break rounded-xl border bg-gray-50 p-4 text-xs print:p-3">
                  <h2 className="mb-3 text-xl font-bold">
                    Interest-Free Instalments
                  </h2>


                  <div className="space-y-2">
                    <div>
                      <p className="font-semibold">Atome</p>
                      <p>3 months interest-free</p>
                    </div>


                    <div>
                      <p className="font-semibold">GrabPay</p>
                      <p>4 months interest-free</p>
                    </div>


                    <div>
                      <p className="font-semibold">
                        UOB / OCBC Credit Card 12 Mths
                      </p>
                      <p>12 months interest-free instalment</p>
                    </div>


                    <div>
                      <p className="font-semibold">In-House Instalment</p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        <li>
                          6/12 months interest-free - depending on treatment
                        </li>
                        <li>Applicant must be SG / PR</li>
                        <li>1x guarantor required (SG / PR)</li>
                        <li>Valid debit card required</li>
                      </ul>
                    </div>
                  </div>
                </section>


                <section className="avoid-break rounded-xl border bg-white p-4 text-xs leading-relaxed text-gray-700 print:p-3">
                  <h2 className="mb-3 text-xl font-bold text-black">
                    Disclaimer
                  </h2>


                  <div className="space-y-2">
                    <p>
                      All treatment fees stated are inclusive of prevailing 9%
                      GST.
                    </p>


                    <p>
                      Treatment fees discussed and agreed upon shall remain valid
                      throughout the planned treatment duration unless unforeseen
                      clinical complications arise.
                    </p>


                    <p>
                      Additional treatment procedures required due to
                      complications, changes in clinical condition or patient
                      requests may incur additional treatment charges.
                    </p>


                    <p>
                      CHAS, Merdeka Generation, Pioneer Generation and Medisave
                      claims remain subject to prevailing MOH regulations and
                      patient eligibility.
                    </p>
                  </div>
                </section>
              </div>
            ) : null}


            <section
              id="signature"
              className={compactClass(
                isFinalized,
                "avoid-break print-break-before rounded-2xl border bg-white p-4 sm:p-6 lg:p-8",
                "avoid-break print-break-before rounded-xl border bg-white p-3 sm:p-4 print:p-3",
              )}
            >
              <h2 className={compactClass(isFinalized, "mb-6 text-2xl font-bold", "mb-3 text-xl font-bold")}>
                Patient Acknowledgement & Signature
              </h2>


              <div
                className={compactClass(
                  isFinalized,
                  "grid gap-4 lg:grid-cols-3 lg:gap-8",
                  "grid gap-4 lg:grid-cols-3",
                )}
              >
                {!isFinalized ? (
                  <div className="no-print flex flex-col items-center justify-center rounded-2xl border bg-gray-50 p-4 sm:p-6 lg:col-span-1">
                    <QRCode value={signatureUrl} size={150} className="sm:h-[180px] sm:w-[180px]" />


                    <p className="mt-5 text-center text-sm leading-relaxed text-gray-500">
                      Scan QR code to review and digitally sign this treatment
                      quotation on your mobile device.
                    </p>
                  </div>
                ) : null}


                <div className={isFinalized ? "lg:col-span-3" : "lg:col-span-2"}>
                  <div className={compactClass(isFinalized, "rounded-2xl border p-4 sm:p-6", "rounded-xl border p-3 sm:p-4")}>
                    <p
                      className={compactClass(
                        isFinalized,
                        "mb-6 text-sm leading-relaxed text-gray-600",
                        "mb-3 text-xs leading-relaxed text-gray-600",
                      )}
                    >
                      I acknowledge that the proposed treatment, estimated fees,
                      subsidies, Medisave claims, risks and alternative options
                      have been explained clearly to me.
                      {preferredLanguage !== "English" ? (
                        <span className="mt-3 block border-t pt-3 text-blue-950">
                          {selectedLanguageCopy.acknowledgement}
                        </span>
                      ) : null}
                    </p>


                    <div
                      className={compactClass(
                        isFinalized,
                        "overflow-hidden rounded-2xl border-2 border-dashed bg-white",
                        "overflow-hidden rounded-xl border border-dashed bg-white",
                      )}
                    >
                      <SignatureCanvas
                        ref={signatureRef}
                        penColor="black"
                        onEnd={markSignatureComplete}
                        canvasProps={{
                          width: 900,
                          height: isFinalized ? 140 : 220,
                          className: "h-40 w-full bg-white sm:h-56",
                        }}
                      />
                    </div>


                    {!isFinalized ? (
                      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                        <button
                          type="button"
                          onClick={clearSignature}
                          className="rounded-xl border px-5 py-3 transition hover:bg-gray-100 sm:py-2"
                        >
                          Clear Signature
                        </button>
                      </div>
                    ) : null}


                    <div className={compactClass(isFinalized, "mt-6 grid gap-4 sm:mt-8 md:grid-cols-2", "mt-4 grid gap-3 md:grid-cols-2")}>
                      <div>
                        <label className="mb-2 block text-sm text-gray-500">
                          Patient Name
                        </label>
                        <input
                          type="text"
                          placeholder="Full Name"
                          value={patientName}
                          readOnly={isFinalized}
                          onChange={(event) => setPatientName(event.target.value)}
                          className={compactClass(
                            isFinalized,
                            "w-full rounded-xl border px-4 py-3",
                            "w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-sm",
                          )}
                        />
                      </div>


                      <div>
                        <label className="mb-2 block text-sm text-gray-500">
                          Date Signed
                        </label>
                        <input
                          type="date"
                          value={dateSigned}
                          readOnly={isFinalized}
                          onChange={(event) => setDateSigned(event.target.value)}
                          className={compactClass(
                            isFinalized,
                            "h-12 w-full rounded-xl border px-4 py-3 leading-normal",
                            "h-8 w-full rounded-lg border border-transparent bg-transparent px-0 py-1 text-sm leading-normal",
                          )}
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