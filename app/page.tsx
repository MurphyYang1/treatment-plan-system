"use client";


import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import SignatureCanvas from "react-signature-canvas";
import { onSnapshot } from "firebase/firestore";
import { isFirebaseConfigured } from "../lib/firebase";
import {
  createDraftQuotation,
  createSigningSession,
  getDraftQuotation,
  getSigningSessionRef,
  SIGNED_QUOTATION_RETENTION_DAYS,
  submitSignedQuotation,
  updateDraftQuotation,
  updateSigningSessionQuotation,
  type DraftQuotationState,
  type SigningQuotationSnapshot,
  type SigningSessionRecord,
} from "../lib/signingSessions";


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
  subsidyAmount: number;
  discountPercent: number;
  medisaveClaim: number;
  description: string;
  gstApplicable: boolean;
};


type Phase = {
  id: number;
  title: string;
  duration: string;
  procedures: Procedure[];
};

type TreatmentOption = {
  id: number;
  title: string;
  description: string;
  estimatedDuration: string;
  phases: Phase[];
};

type PatientEducationTopic = {
  id: string;
  title: string;
  descriptions: Record<PreferredLanguage, string>;
  imageSrc: string;
  matches: (treatment: Pick<Treatment, "category" | "name">) => boolean;
};


type InstallmentPlanId =
  | "none"
  | "atome-3"
  | "grabpay-4"
  | "card-12"
  | "in-house-3"
  | "in-house-6"
  | "in-house-9"
  | "in-house-12";


type InstallmentPlan = {
  id: InstallmentPlanId;
  label: string;
  months: number;
  isInHouse: boolean;
};

type PreferredLanguage = "English" | "Malay" | "Simplified Chinese" | "Tamil";
type PrintLanguageMode = "english" | "bilingual";
type QuotationStatus = "draft" | "estimated" | "final";
type FinancialSummaryDisplayMode = "full" | "cashOnly" | "hidden";

type LanguageCopy = {
  label: string;
  documentTitle: string;
  patientInformation: string;
  clinicBranch: string;
  dentist: string;
  patientName: string;
  patientId: string;
  quotationDate: string;
  subsidyTier: string;
  treatmentPhases: string;
  treatment: string;
  quantity: string;
  claimQty: string;
  unitPrice: string;
  gst: string;
  subsidy: string;
  deduction: string;
  medisave: string;
  cashPayable: string;
  customProcedure: string;
  remarks: string;
  howToReadCosts: string;
  howToReadCostsText: string;
  phaseCashTotal: string;
  financialSummary: string;
  treatmentSubtotal: string;
  totalSubsidiesUsed: string;
  totalMedisaveUsed: string;
  cashPortion: string;
  selectedInstallmentPlan: string;
  months: string;
  ifApplicable: string;
  upfrontMedisaveGstCash: string;
  amountUnderInHouse: string;
  amountUnderInstallments: string;
  estimatedMonthlyInstallment: string;
  inHouseInstallmentNote: string;
  interestFreeInstallments: string;
  patientSummaryHeading: string;
  patientSummaryIntro: string;
  treatmentCostBeforeDeductions: string;
  lessGovernmentSubsidy: string;
  lessMedisave: string;
  estimatedCashPayable: string;
  patientCostExplanationHeading: string;
  patientCostExplanationText: string;
  patientPaysAfterDeductions: string;
  recommended: string;
  recommendedByDentist: string;
  recommendedOption: string;
  patientSelectedBadge: string;
  treatmentOptionsComparison: string;
  treatmentOptionsComparisonIntro: string;
  option: string;
  descriptionLabel: string;
  estimatedDuration: string;
  patientSelectedOption: string;
  patientSelectedOptionIntro: string;
  needMoreTime: string;
  smokingStatus: string;
  patientSmokes: string;
  smokingHealingHeading: string;
  smokingHealingNote: string;
  viewDetailedPhases: string;
  atomePlan: string;
  grabPayPlan: string;
  cardPlan: string;
  inHouseInstallment: string;
  inHouseSixTwelve: string;
  applicantRequirement: string;
  guarantorRequirement: string;
  debitCardRequirement: string;
  disclaimer: string;
  disclaimerItems: string[];
  signatureHeading: string;
  dateSigned: string;
  scanQrText: string;
  patientSummary: string;
  acknowledgement: string;
  quotationStatus: string;
  draftStatus: string;
  estimatedStatus: string;
  finalStatus: string;
  draftStatusMessage: string;
  estimatedStatusMessage: string;
  finalStatusMessage: string;
  draftAcknowledgement: string;
  estimatedAcknowledgement: string;
  finalAcknowledgement: string;
  financialSummaryDisplay: string;
  fullFinancialSummary: string;
  cashPayableOnly: string;
  hideFinancialSummary: string;
  englishClinicalNote: string;
  categoryTranslations: Record<string, string>;
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
    id: "in-house-3",
    label: "In-House Instalment - 3 months",
    months: 3,
    isInHouse: true,
  },
  {
    id: "in-house-6",
    label: "In-House Instalment - 6 months",
    months: 6,
    isInHouse: true,
  },
  {
    id: "in-house-9",
    label: "In-House Instalment - 9 months",
    months: 9,
    isInHouse: true,
  },
  {
    id: "in-house-12",
    label: "In-House Instalment - 12 months",
    months: 12,
    isInHouse: true,
  },
];

function isPatientEducationExcluded(
  treatment: Pick<Treatment, "category" | "name">,
) {
  return (
    /final prosthesis.*dental implants|orthodontic \/ cosmetic treatment/i.test(
      treatment.category,
    ) ||
    /single pterygoid implant|single zygomatic implant|explant|bony protuberance/i.test(
      treatment.name,
    )
  );
}

const patientEducationTopics: PatientEducationTopic[] = [
  {
    id: "root-canal-treatment",
    title: "Root Canal Treatment (RCT)",
    descriptions: {
      English: "Explains how an infected tooth is cleaned, filled and restored.",
      Malay:
        "Menerangkan bagaimana gigi yang dijangkiti dibersihkan, diisi dan dipulihkan.",
      "Simplified Chinese": "说明受感染牙齿如何被清洁、填充和修复。",
      Tamil:
        "பாதிக்கப்பட்ட பல் எவ்வாறு சுத்தம் செய்யப்படுகிறது, நிரப்பப்படுகிறது மற்றும் மீளமைக்கப்படுகிறது என்பதை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/root-canal-treatment.jpg",
    matches: ({ name }) => /root canal|\brct\b/i.test(name),
  },
  {
    id: "periodontal-probing",
    title: "Periodontal Probing",
    descriptions: {
      English:
        "Explains how gum pocket measurements help detect and monitor gum disease.",
      Malay:
        "Menerangkan bagaimana ukuran poket gusi membantu mengesan dan memantau penyakit gusi.",
      "Simplified Chinese": "说明牙周探诊如何通过测量牙龈袋来发现和监测牙周病。",
      Tamil:
        "ஈறு pocket அளவீடுகள் ஈறு நோயை கண்டறிந்து கண்காணிக்க எவ்வாறு உதவுகின்றன என்பதை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/periodontal-probing.png",
    matches: ({ name }) => name.toLowerCase() === "periodontal probing",
  },
  {
    id: "gum-disease-root-planing",
    title: "Gum Disease and Root Planing",
    descriptions: {
      English:
        "Explains gum disease progression and how scaling and root planing help clean above and below the gum line.",
      Malay:
        "Menerangkan perkembangan penyakit gusi dan bagaimana scaling serta root planing membantu membersihkan bahagian atas dan bawah garis gusi.",
      "Simplified Chinese":
        "说明牙周病的发展，以及洗牙和根面平整如何清洁牙龈线上下的牙菌斑和牙石。",
      Tamil:
        "ஈறு நோயின் முன்னேற்றத்தையும், scaling மற்றும் root planing ஈறு வரியின் மேல் மற்றும் கீழ் பகுதியை எவ்வாறு சுத்தம் செய்ய உதவுகின்றன என்பதையும் விளக்குகிறது.",
    },
    imageSrc: "/patient-education/gum-disease-root-planing.png",
    matches: ({ name }) =>
      name.toLowerCase() ===
      "root planing / gum treatment (per quadrant)",
  },
  {
    id: "periodontal-splinting",
    title: "Periodontal Splinting",
    descriptions: {
      English:
        "Explains how splinting can help stabilise mobile teeth affected by gum disease.",
      Malay:
        "Menerangkan bagaimana splinting boleh membantu menstabilkan gigi longgar yang terjejas oleh penyakit gusi.",
      "Simplified Chinese": "说明牙周夹板如何帮助稳定受牙周病影响而松动的牙齿。",
      Tamil:
        "ஈறு நோயால் பாதிக்கப்பட்ட அசையும் பற்களை splinting எவ்வாறு நிலைப்படுத்த உதவுகிறது என்பதை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/periodontal-splinting.png",
    matches: ({ name }) => name.toLowerCase() === "periodontal splinting",
  },
  {
    id: "sinus-lift",
    title: "Sinus Lift for Upper Dental Implants",
    descriptions: {
      English:
        "Explains why and how bone is added beneath the sinus for upper implants.",
      Malay:
        "Menerangkan mengapa dan bagaimana tulang ditambah di bawah sinus untuk implan atas.",
      "Simplified Chinese": "说明为什么以及如何在上颌窦下方加骨以支持上颌种植牙。",
      Tamil:
        "மேல் இம்பிளாண்டுகளுக்காக சைனஸின் கீழ் எலும்பு ஏன் மற்றும் எவ்வாறு சேர்க்கப்படுகிறது என்பதை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/sinus-lift.jpg",
    matches: ({ name }) =>
      /sinus lift/i.test(name) && !/crestal sinus lift/i.test(name),
  },
  {
    id: "crestal-sinus-lift",
    title: "Implant with Crestal Sinus Lift",
    descriptions: {
      English:
        "Explains how a small sinus lift and bone graft may be done during single implant placement in the upper back teeth.",
      Malay:
        "Menerangkan bagaimana sinus lift kecil dan graf tulang boleh dilakukan semasa pemasangan implan tunggal pada gigi belakang atas.",
      "Simplified Chinese":
        "说明在上后牙区植入单颗种植牙时，如何同时进行小范围上颌窦提升和骨移植。",
      Tamil:
        "மேல் பின்புற பற்களில் ஒற்றை இம்பிளாண்ட் வைக்கும் போது சிறிய சைனஸ் லிஃப்ட் மற்றும் எலும்பு graft எவ்வாறு செய்யப்படலாம் என்பதை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/crestal-sinus-lift.jpg",
    matches: ({ name }) => /single implant.*crestal sinus lift/i.test(name),
  },
  {
    id: "pfm-zirconia-crowns",
    title: "PFM Crown and Zirconia Crown",
    descriptions: {
      English:
        "Compares PFM and zirconia crown options, including strength, appearance and material differences.",
      Malay:
        "Membandingkan pilihan korona PFM dan zirkonia, termasuk kekuatan, rupa bentuk dan perbezaan bahan.",
      "Simplified Chinese":
        "比较 PFM 牙冠和氧化锆牙冠的选择，包括强度、外观和材料差异。",
      Tamil:
        "PFM மற்றும் zirconia கிரவுன் விருப்பங்களை, வலிமை, தோற்றம் மற்றும் பொருள் வேறுபாடுகளுடன் ஒப்பிடுகிறது.",
    },
    imageSrc: "/patient-education/pfm-zirconia-crowns.jpg",
    matches: ({ name }) => /pfm|zirconia/i.test(name),
  },
  {
    id: "pterygoid-implants",
    title: "Pterygoid Implants",
    descriptions: {
      English:
        "Explains pterygoid implants for cases with limited bone at the back of the upper jaw.",
      Malay:
        "Menerangkan implan pterygoid untuk keadaan tulang yang terhad di bahagian belakang rahang atas.",
      "Simplified Chinese": "说明翼突种植体如何用于上颌后方骨量不足的情况。",
      Tamil:
        "மேல் தாடையின் பின்புற பகுதியில் எலும்பு குறைவாக இருக்கும் நிலைகளில் pterygoid இம்பிளாண்டுகள் பற்றி விளக்குகிறது.",
    },
    imageSrc: "/patient-education/pterygoid-implants.jpg",
    matches: ({ name }) => /pterygoid/i.test(name),
  },
  {
    id: "zygomatic-implants",
    title: "Zygomatic Implants",
    descriptions: {
      English:
        "Explains zygomatic implants for patients with severe bone loss in the upper jaw.",
      Malay:
        "Menerangkan implan zygomatic untuk pesakit yang mengalami kehilangan tulang yang teruk di rahang atas.",
      "Simplified Chinese": "说明颧骨种植体如何用于上颌骨严重缺损的患者。",
      Tamil:
        "மேல் தாடையில் கடுமையான எலும்பு இழப்பு உள்ள நோயாளிகளுக்கான zygomatic இம்பிளாண்டுகள் பற்றி விளக்குகிறது.",
    },
    imageSrc: "/patient-education/zygomatic-implants.jpg",
    matches: ({ name }) => /zygomatic/i.test(name),
  },
  {
    id: "complete-locator-overdentures",
    title: "Implant-supported Overdenture (Locator System)",
    descriptions: {
      English:
        "Explains how a complete locator overdenture clips onto implant attachments and can be removed for cleaning.",
      Malay:
        "Menerangkan bagaimana overdenture lengkap locator diklip pada sambungan implan dan boleh ditanggalkan untuk pembersihan.",
      "Simplified Chinese": "说明全口 Locator 覆盖义齿如何扣在种植体附件上，并可取下清洁。",
      Tamil:
        "முழு locator overdenture இம்பிளாண்ட் இணைப்புகளில் எவ்வாறு கிளிப் ஆகி, சுத்தம் செய்ய அகற்றப்பட முடியும் என்பதை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/complete-locator-overdentures.jpg",
    matches: ({ name }) => /complete locator overdentures/i.test(name),
  },
  {
    id: "dolder-bar-overdentures",
    title: "Dolder Bar Overdentures",
    descriptions: {
      English:
        "Explains how a Dolder Bar overdenture is supported by implants using a smooth metal bar and sleeve.",
      Malay:
        "Menerangkan bagaimana overdenture Dolder Bar disokong oleh implan menggunakan bar logam licin dan lengan penahan.",
      "Simplified Chinese": "说明 Dolder Bar 覆盖义齿如何通过光滑金属杆和套筒由种植体支撑。",
      Tamil:
        "மென்மையான உலோக bar மற்றும் sleeve மூலம் Dolder Bar overdenture இம்பிளாண்டுகளால் எவ்வாறு ஆதரிக்கப்படுகிறது என்பதை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/dolder-bar-overdentures.jpg",
    matches: ({ name }) => /dolder bar overdentures/i.test(name),
  },
  {
    id: "complete-bar-on-locators-overdentures",
    title: "Bar Overdenture",
    descriptions: {
      English:
        "Explains how a removable bar overdenture clips onto a metal bar attached to implants.",
      Malay:
        "Menerangkan bagaimana overdenture bar boleh tanggal diklip pada bar logam yang dipasang pada implan.",
      "Simplified Chinese": "说明可摘式杆卡覆盖义齿如何扣在连接种植体的金属杆上。",
      Tamil:
        "இம்பிளாண்டுகளில் பொருத்தப்பட்ட உலோக bar மீது அகற்றக்கூடிய bar overdenture எவ்வாறு கிளிப் ஆகிறது என்பதை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/complete-bar-on-locators-overdentures.jpg",
    matches: ({ name }) => /complete bar on locators overdentures/i.test(name),
  },
  {
    id: "all-on-x-implant-treatment",
    title: "All-on-X Implant Treatment",
    descriptions: {
      English:
        "Explains the temporary and final phases for full-arch implant treatment.",
      Malay:
        "Menerangkan fasa sementara dan fasa akhir untuk rawatan implan seluruh lengkung.",
      "Simplified Chinese": "说明全口种植治疗的临时阶段和最终修复阶段。",
      Tamil:
        "முழு வளைவு இம்பிளாண்ட் சிகிச்சையின் தற்காலிக மற்றும் இறுதி கட்டங்களை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/all-on-x-implant-treatment.jpg",
    matches: (treatment) =>
      !isPatientEducationExcluded(treatment) &&
      !/temporary denture|interim denture/i.test(treatment.name) &&
      /all[-\s]?on[-\s]?x|full arch/i.test(treatment.name),
  },
  {
    id: "temporary-dentures",
    title: "Temporary Dentures after Extraction / Implant Treatment",
    descriptions: {
      English:
        "Explains why temporary dentures may feel less fitted while gums heal.",
      Malay:
        "Menerangkan mengapa gigi palsu sementara mungkin terasa kurang sesuai semasa gusi sedang sembuh.",
      "Simplified Chinese": "说明为什么牙龈愈合期间临时假牙可能会感觉不太贴合。",
      Tamil:
        "ஈறு ஆறிக்கொண்டிருக்கும்போது தற்காலிக பற்கள் ஏன் குறைவாக பொருந்தியதாக உணரப்படலாம் என்பதை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/temporary-dentures.jpg",
    matches: ({ name }) => /temporary denture|interim denture/i.test(name),
  },
  {
    id: "socket-preservation",
    title: "Socket Preservation",
    descriptions: {
      English:
        "Explains how bone graft material can help preserve the socket after tooth extraction for future implant placement.",
      Malay:
        "Menerangkan bagaimana bahan graf tulang boleh membantu mengekalkan soket selepas cabutan gigi untuk pemasangan implan pada masa hadapan.",
      "Simplified Chinese": "说明拔牙后如何使用骨粉帮助保存牙槽窝，以便日后进行种植牙。",
      Tamil:
        "பல் எடுக்கப்பட்ட பிறகு எதிர்கால இம்பிளாண்ட் பொருத்துதலுக்காக எலும்பு graft பொருள் socket-ஐ எவ்வாறு பாதுகாக்க உதவுகிறது என்பதை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/socket-preservation.jpg",
    matches: ({ name }) => /socket preservation/i.test(name),
  },
  {
    id: "dental-implant-treatment",
    title: "Dental Implant Treatment",
    descriptions: {
      English:
        "Explains implant insertion, healing, abutment placement and final teeth options.",
      Malay:
        "Menerangkan pemasangan implan, tempoh penyembuhan, pemasangan abutment dan pilihan gigi akhir.",
      "Simplified Chinese": "说明种植体植入、愈合、基台安装和最终牙齿修复选择。",
      Tamil:
        "இம்பிளாண்ட் பொருத்துதல், ஆறுதல், அபட்மெண்ட் பொருத்துதல் மற்றும் இறுதி பல் விருப்பங்களை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/dental-implant-treatment.jpg",
    matches: (treatment) =>
      !isPatientEducationExcluded(treatment) &&
      (/implant/i.test(treatment.category) ||
        /implant|overdenture/i.test(treatment.name)),
  },
  {
    id: "smoking-healing",
    title: "Smoking and Healing",
    descriptions: {
      English:
        "Explains how smoking may slow gum healing and increase implant healing risks.",
      Malay:
        "Menerangkan bagaimana merokok boleh melambatkan penyembuhan gusi dan meningkatkan risiko penyembuhan implan.",
      "Simplified Chinese": "说明吸烟如何减慢牙龈愈合，并增加种植体愈合风险。",
      Tamil:
        "புகைபிடித்தல் ஈறு ஆறுதலை மெதுவாக்கி, இம்பிளாண்ட் ஆறுதல் அபாயங்களை அதிகரிக்கக்கூடும் என்பதை விளக்குகிறது.",
    },
    imageSrc: "/patient-education/smoking-healing.jpg",
    matches: () => false,
  },
];

const patientEducationAnnexDisclaimerHeadings: Record<PreferredLanguage, string> =
  {
    English: "Disclaimer",
    Malay: "Penafian",
    "Simplified Chinese": "免责声明",
    Tamil: "பொறுப்பு துறப்பு",
  };

const patientEducationAnnexDisclaimers: Record<PreferredLanguage, string> = {
  English:
    "Illustrations in this annex are provided for general educational purposes only and may not reflect the patient's actual clinical condition, treatment complexity, or final treatment outcome. Patients should not rely solely on these materials when making treatment decisions. Please discuss any questions or concerns with your treating dentist, review information from reliable sources, and seek a second opinion where appropriate.",
  Malay:
    "Ilustrasi dalam lampiran ini disediakan untuk tujuan pendidikan umum sahaja dan mungkin tidak mencerminkan keadaan klinikal sebenar pesakit, kerumitan rawatan, atau hasil akhir rawatan. Pesakit tidak harus bergantung sepenuhnya pada bahan ini semasa membuat keputusan rawatan. Sila bincangkan sebarang soalan atau kebimbangan dengan doktor gigi yang merawat anda, semak maklumat daripada sumber yang dipercayai, dan dapatkan pendapat kedua jika sesuai.",
  "Simplified Chinese":
    "本附件中的图示仅供一般教育用途，可能无法反映患者的实际临床情况、治疗复杂程度或最终治疗结果。患者在作出治疗决定时，不应仅依赖这些资料。请与您的主治牙医讨论任何疑问或顾虑，参考可靠来源的信息，并在适当情况下寻求第二意见。",
  Tamil:
    "இந்த இணைப்பில் உள்ள விளக்கப்படங்கள் பொதுவான கல்வி நோக்கத்திற்காக மட்டுமே வழங்கப்படுகின்றன; நோயாளியின் உண்மையான மருத்துவ நிலை, சிகிச்சையின் சிக்கல், அல்லது இறுதி சிகிச்சை முடிவை முழுமையாக பிரதிபலிக்காமல் இருக்கலாம். சிகிச்சை முடிவெடுக்கும் போது நோயாளிகள் இந்த தகவல்களை மட்டுமே சார்ந்து இருக்கக் கூடாது. ஏதேனும் கேள்விகள் அல்லது கவலைகள் இருந்தால் சிகிச்சை அளிக்கும் பல் மருத்துவருடன் கலந்துரையாடவும், நம்பகமான தகவல் ஆதாரங்களைப் பார்க்கவும், தேவையான இடங்களில் இரண்டாம் கருத்தைப் பெறவும்.",
};

const languageCopy: Record<PreferredLanguage, LanguageCopy> = {
  English: {
    label: "English",
    documentTitle: "Dental Treatment Plan & Quotation",
    patientInformation: "Patient Information",
    clinicBranch: "Clinic Branch",
    dentist: "Dentist",
    patientName: "Patient Name",
    patientId: "Patient ID",
    quotationDate: "Quotation Date",
    subsidyTier: "Subsidy Tier",
    treatmentPhases: "Treatment Phases",
    treatment: "Treatment",
    quantity: "Quantity",
    claimQty: "Claim Qty",
    unitPrice: "Unit Price",
    gst: "GST (9%)",
    subsidy: "Subsidy",
    deduction: "Deduction",
    medisave: "Medisave",
    cashPayable: "Cash Payable",
    customProcedure: "Custom Procedure",
    remarks: "Remarks",
    howToReadCosts: "How to read each treatment cost",
    howToReadCostsText:
      "Quantity is the number of procedures planned. Claim quantity is the number submitted for CHAS / Merdeka / Pioneer subsidy. Cash payable is calculated as treatment subtotal (unit price x quantity) plus GST, less subsidy and Medisave deductions.",
    phaseCashTotal: "Phase CASH Total",
    financialSummary: "Financial Summary",
    treatmentSubtotal: "Treatment Subtotal",
    totalSubsidiesUsed: "Total Subsidies USED",
    totalMedisaveUsed: "Total Medisave USED",
    cashPortion: "Cash Portion",
    selectedInstallmentPlan: "Selected Instalment Plan",
    months: "months",
    ifApplicable: "(if applicable)",
    upfrontMedisaveGstCash: "Upfront cash payment (GST on Medisave portion)",
    amountUnderInHouse: "Amount under in-house instalments",
    amountUnderInstallments: "Amount under instalments",
    estimatedMonthlyInstallment: "Estimated monthly instalment",
    inHouseInstallmentNote:
      "For in-house instalments, the GST amount linked to the Medisave claim is excluded from the instalment amount and collected in cash.",
    interestFreeInstallments: "Interest-Free Instalments",
    patientSummaryHeading: "Patient Summary",
    patientSummaryIntro:
      "Key figures for each treatment option before reading the detailed procedures.",
    treatmentCostBeforeDeductions: "Treatment cost before deductions",
    lessGovernmentSubsidy: "Less government subsidy",
    lessMedisave: "Less Medisave",
    estimatedCashPayable: "Estimated cash payable",
    patientCostExplanationHeading: "What the patient pays",
    patientCostExplanationText:
      "Cash payable is the estimated amount after GST, subsidy, Medisave and any discount have been applied.",
    patientPaysAfterDeductions: "Patient pays after deductions",
    recommended: "Recommended",
    recommendedByDentist: "Recommended by dentist",
    recommendedOption: "Recommended Option",
    patientSelectedBadge: "Patient Selected",
    treatmentOptionsComparison: "Treatment Options Comparison",
    treatmentOptionsComparisonIntro:
      "Compare the treatment options after reviewing their detailed phases and procedures above.",
    option: "Option",
    descriptionLabel: "Description",
    estimatedDuration: "Est. Duration",
    patientSelectedOption: "Patient Selected Option",
    patientSelectedOptionIntro:
      "Please indicate which treatment option the patient chooses.",
    needMoreTime: "I need more time to decide",
    smokingStatus: "Smoking Status",
    patientSmokes: "Patient is a smoker / smoking discussed",
    smokingHealingHeading: "Smoking and Healing",
    smokingHealingNote:
      "Smoking may slow gum healing and increase the risk of infection, delayed healing and implant failure. Reducing or stopping smoking before and after treatment may improve healing.",
    viewDetailedPhases: "View detailed phases and procedures",
    atomePlan: "Atome: 3 months interest-free",
    grabPayPlan: "GrabPay: 4 months interest-free",
    cardPlan: "UOB / OCBC Credit Card: 12 months interest-free instalment",
    inHouseInstallment: "In-House Instalment",
    inHouseSixTwelve:
      "3/6/9/12 months interest-free - depending on treatment (if applicable)",
    applicantRequirement: "Applicant must be SG / PR",
    guarantorRequirement: "1x guarantor required (SG / PR)",
    debitCardRequirement: "Valid debit card required",
    disclaimer: "Disclaimer",
    disclaimerItems: [
      "All treatment fees stated are inclusive of prevailing 9% GST.",
      "This quotation remains valid provided the patient's oral condition and treatment plan remain unchanged. Fees may be reviewed if there is a change in clinical condition, attending dentist, treatment scope, or if additional or alternative treatment is required.",
      "Additional treatment procedures required due to complications, changes in clinical condition or patient requests may incur additional treatment charges.",
      "CHAS, Merdeka Generation, Pioneer Generation and Medisave claims remain subject to prevailing MOH regulations and patient eligibility.",
    ],
    signatureHeading: "Patient Acknowledgement & Signature",
    dateSigned: "Date Signed",
    scanQrText:
      "Scan QR code to review and digitally sign this treatment quotation on your mobile device.",
    patientSummary:
      "This quotation explains the proposed treatment, estimated fees, subsidies, Medisave claims, and cash portion payable.",
    acknowledgement:
      "I acknowledge that the proposed treatment, estimated fees, subsidies, Medisave claims, risks and alternative options have been explained clearly to me.",
    quotationStatus: "Quotation Status",
    draftStatus: "Draft / For Discussion",
    estimatedStatus: "Goodwill / Revised Plan",
    finalStatus: "Final Quotation",
    draftStatusMessage:
      "DRAFT / FOR DISCUSSION — This quotation is for discussion only and may change after clinical review, patient choices, eligibility checks, or changes in treatment plan.",
    estimatedStatusMessage:
      "GOODWILL / REVISED PLAN — This quotation reflects a revised treatment plan and/or goodwill adjustment for an existing patient. It is prepared based on the current clinical situation, prior treatment history, and agreed adjustments.",
    finalStatusMessage:
      "FINAL QUOTATION — This quotation is prepared for patient review and acknowledgement.",
    draftAcknowledgement:
      "I acknowledge that this draft treatment discussion has been explained to me and may be subject to change.",
    estimatedAcknowledgement:
      "I acknowledge that this revised treatment plan and/or goodwill adjustment has been explained to me, including the updated treatment plan, fees, deductions, and any agreed adjustments.",
    finalAcknowledgement:
      "I acknowledge that the proposed treatment, estimated fees, subsidies, Medisave claims, risks and alternative options have been explained clearly to me.",
    financialSummaryDisplay: "Cost Presentation",
    fullFinancialSummary: "Detailed cost breakdown",
    cashPayableOnly: "Simple cash payable",
    hideFinancialSummary: "Hide cost summary",
    englishClinicalNote:
      "Treatment names and clinical terms may remain in English for clinical accuracy.",
    categoryTranslations: {},
  },
  Malay: {
    label: "Malay",
    documentTitle: "Pelan Rawatan Pergigian & Sebut Harga",
    patientInformation: "Maklumat Pesakit",
    clinicBranch: "Cawangan Klinik",
    dentist: "Doktor Gigi",
    patientName: "Nama Pesakit",
    patientId: "ID Pesakit",
    quotationDate: "Tarikh Sebut Harga",
    subsidyTier: "Kategori Subsidi",
    treatmentPhases: "Fasa Rawatan",
    treatment: "Rawatan",
    quantity: "Kuantiti",
    claimQty: "Kuantiti Tuntutan",
    unitPrice: "Harga Seunit",
    gst: "GST (9%)",
    subsidy: "Subsidi",
    deduction: "Potongan",
    medisave: "Medisave",
    cashPayable: "Tunai Perlu Dibayar",
    customProcedure: "Prosedur Tersuai",
    remarks: "Catatan",
    howToReadCosts: "Cara membaca kos setiap rawatan",
    howToReadCostsText:
      "Kuantiti ialah bilangan prosedur yang dirancang. Kuantiti tuntutan ialah bilangan yang dihantar untuk subsidi CHAS / Merdeka / Perintis. Tunai perlu dibayar dikira sebagai jumlah kecil rawatan (harga seunit x kuantiti) ditambah GST, ditolak subsidi dan potongan Medisave.",
    phaseCashTotal: "Jumlah Tunai Fasa",
    financialSummary: "Ringkasan Kewangan",
    treatmentSubtotal: "Jumlah Kecil Rawatan",
    totalSubsidiesUsed: "Jumlah Subsidi Digunakan",
    totalMedisaveUsed: "Jumlah Medisave Digunakan",
    cashPortion: "Bahagian Tunai",
    selectedInstallmentPlan: "Pelan Ansuran Dipilih",
    months: "bulan",
    ifApplicable: "(jika berkenaan)",
    upfrontMedisaveGstCash:
      "Bayaran tunai awal (GST bagi bahagian Medisave)",
    amountUnderInHouse: "Jumlah di bawah ansuran dalaman",
    amountUnderInstallments: "Jumlah di bawah ansuran",
    estimatedMonthlyInstallment: "Anggaran ansuran bulanan",
    inHouseInstallmentNote:
      "Untuk ansuran dalaman, jumlah GST berkaitan tuntutan Medisave tidak termasuk dalam jumlah ansuran dan perlu dibayar secara tunai.",
    interestFreeInstallments: "Ansuran Tanpa Faedah",
    patientSummaryHeading: "Ringkasan Pesakit",
    patientSummaryIntro:
      "Angka utama bagi setiap pilihan rawatan sebelum membaca prosedur terperinci.",
    treatmentCostBeforeDeductions: "Kos rawatan sebelum potongan",
    lessGovernmentSubsidy: "Tolak subsidi kerajaan",
    lessMedisave: "Tolak Medisave",
    estimatedCashPayable: "Anggaran tunai perlu dibayar",
    patientCostExplanationHeading: "Jumlah yang pesakit bayar",
    patientCostExplanationText:
      "Tunai perlu dibayar ialah anggaran jumlah selepas GST, subsidi, Medisave dan sebarang diskaun digunakan.",
    patientPaysAfterDeductions: "Pesakit bayar selepas potongan",
    recommended: "Disyorkan",
    recommendedByDentist: "Disyorkan oleh doktor gigi",
    recommendedOption: "Pilihan Disyorkan",
    patientSelectedBadge: "Dipilih Pesakit",
    treatmentOptionsComparison: "Perbandingan Pilihan Rawatan",
    treatmentOptionsComparisonIntro:
      "Bandingkan pilihan rawatan selepas menyemak fasa dan prosedur terperinci di atas.",
    option: "Pilihan",
    descriptionLabel: "Penerangan",
    estimatedDuration: "Anggaran Tempoh",
    patientSelectedOption: "Pilihan Pesakit",
    patientSelectedOptionIntro:
      "Sila nyatakan pilihan rawatan yang dipilih oleh pesakit.",
    needMoreTime: "Saya memerlukan lebih masa untuk membuat keputusan",
    smokingStatus: "Status Merokok",
    patientSmokes: "Pesakit merokok / merokok telah dibincangkan",
    smokingHealingHeading: "Merokok dan Penyembuhan",
    smokingHealingNote:
      "Merokok boleh melambatkan penyembuhan gusi dan meningkatkan risiko jangkitan, penyembuhan lewat serta kegagalan implan. Mengurangkan atau berhenti merokok sebelum dan selepas rawatan boleh membantu penyembuhan.",
    viewDetailedPhases: "Lihat fasa dan prosedur terperinci",
    atomePlan: "Atome: 3 bulan tanpa faedah",
    grabPayPlan: "GrabPay: 4 bulan tanpa faedah",
    cardPlan: "Kad Kredit UOB / OCBC: ansuran 12 bulan tanpa faedah",
    inHouseInstallment: "Ansuran Dalaman",
    inHouseSixTwelve:
      "3/6/9/12 bulan tanpa faedah - bergantung pada rawatan (jika berkenaan)",
    applicantRequirement: "Pemohon mestilah Warganegara Singapura / PR",
    guarantorRequirement: "1 penjamin diperlukan (Warganegara Singapura / PR)",
    debitCardRequirement: "Kad debit yang sah diperlukan",
    disclaimer: "Penafian",
    disclaimerItems: [
      "Semua yuran rawatan yang dinyatakan termasuk GST 9% semasa.",
      "Sebut harga ini kekal sah dengan syarat keadaan mulut pesakit dan pelan rawatan tidak berubah. Yuran mungkin disemak jika terdapat perubahan keadaan klinikal, doktor gigi yang merawat, skop rawatan, atau jika rawatan tambahan atau alternatif diperlukan.",
      "Prosedur rawatan tambahan yang diperlukan akibat komplikasi, perubahan keadaan klinikal atau permintaan pesakit mungkin dikenakan caj tambahan.",
      "Tuntutan CHAS, Generasi Merdeka, Generasi Perintis dan Medisave tertakluk kepada peraturan MOH semasa dan kelayakan pesakit.",
    ],
    signatureHeading: "Pengakuan & Tandatangan Pesakit",
    dateSigned: "Tarikh Ditandatangani",
    scanQrText:
      "Imbas kod QR untuk menyemak dan menandatangani sebut harga rawatan ini secara digital melalui telefon bimbit anda.",
    patientSummary:
      "Ringkasan untuk pesakit: Sebut harga ini menerangkan rawatan yang dicadangkan, anggaran bayaran, subsidi, tuntutan Medisave dan jumlah tunai yang perlu dibayar.",
    acknowledgement:
      "Saya mengakui bahawa rawatan yang dicadangkan, anggaran bayaran, subsidi, tuntutan Medisave, risiko dan pilihan rawatan lain telah diterangkan dengan jelas kepada saya.",
    quotationStatus: "Status Sebut Harga",
    draftStatus: "Draf / Untuk Perbincangan",
    estimatedStatus: "Pelan Disemak / Goodwill",
    finalStatus: "Sebut Harga Muktamad",
    draftStatusMessage:
      "DRAF / UNTUK PERBINCANGAN — Sebut harga ini adalah untuk perbincangan sahaja dan mungkin berubah selepas semakan klinikal, pilihan pesakit, semakan kelayakan atau perubahan pelan rawatan.",
    estimatedStatusMessage:
      "PELAN DISEMAK / GOODWILL — Sebut harga ini mencerminkan pelan rawatan yang disemak dan/atau pelarasan goodwill untuk pesakit sedia ada. Ia disediakan berdasarkan keadaan klinikal semasa, sejarah rawatan terdahulu dan pelarasan yang dipersetujui.",
    finalStatusMessage:
      "SEBUT HARGA MUKTAMAD — Sebut harga ini disediakan untuk semakan dan pengakuan pesakit.",
    draftAcknowledgement:
      "Saya mengakui bahawa perbincangan rawatan draf ini telah diterangkan kepada saya dan mungkin tertakluk kepada perubahan.",
    estimatedAcknowledgement:
      "Saya mengakui bahawa pelan rawatan yang disemak dan/atau pelarasan goodwill ini telah diterangkan kepada saya, termasuk pelan rawatan yang dikemas kini, bayaran, potongan dan sebarang pelarasan yang dipersetujui.",
    finalAcknowledgement:
      "Saya mengakui bahawa rawatan yang dicadangkan, anggaran bayaran, subsidi, tuntutan Medisave, risiko dan pilihan rawatan lain telah diterangkan dengan jelas kepada saya.",
    financialSummaryDisplay: "Paparan Kos",
    fullFinancialSummary: "Pecahan kos terperinci",
    cashPayableOnly: "Tunai perlu dibayar sahaja",
    hideFinancialSummary: "Sembunyikan ringkasan kos",
    englishClinicalNote:
      "Nama rawatan dan istilah klinikal mungkin dikekalkan dalam Bahasa Inggeris untuk ketepatan klinikal.",
    categoryTranslations: {
      "General Treatment": "Rawatan Am",
      "Periodontal Treatment": "Rawatan Periodontal",
      "Surgical Treatment": "Rawatan Pembedahan",
      "Implant Treatment": "Rawatan Implan",
      "Orthodontic / Cosmetic Treatment": "Rawatan Ortodontik / Kosmetik",
      "Final prosthesis for Dental implants": "Prostesis Akhir untuk Implan Pergigian",
      "Other Treatment": "Rawatan Lain",
    },
  },
  "Simplified Chinese": {
    label: "Simplified Chinese",
    documentTitle: "牙科治疗计划与报价",
    patientInformation: "患者资料",
    clinicBranch: "诊所分行",
    dentist: "牙医",
    patientName: "患者姓名",
    patientId: "患者编号",
    quotationDate: "报价日期",
    subsidyTier: "补贴类别",
    treatmentPhases: "治疗阶段",
    treatment: "治疗",
    quantity: "数量",
    claimQty: "申报数量",
    unitPrice: "单价",
    gst: "消费税 (9%)",
    subsidy: "补贴",
    deduction: "扣除",
    medisave: "保健储蓄",
    cashPayable: "需付现金",
    customProcedure: "自定义项目",
    remarks: "备注",
    howToReadCosts: "如何阅读每项治疗费用",
    howToReadCostsText:
      "数量是计划进行的程序次数。申报数量是提交用于 CHAS / 建国一代 / 乐龄一代补贴的数量。需付现金按治疗小计（单价 x 数量）加上消费税，再扣除补贴和保健储蓄后计算。",
    phaseCashTotal: "阶段现金总额",
    financialSummary: "费用摘要",
    treatmentSubtotal: "治疗小计",
    totalSubsidiesUsed: "已使用补贴总额",
    totalMedisaveUsed: "已使用保健储蓄总额",
    cashPortion: "现金部分",
    selectedInstallmentPlan: "已选择分期付款计划",
    months: "个月",
    ifApplicable: "（如适用）",
    upfrontMedisaveGstCash: "预付现金（保健储蓄部分的消费税）",
    amountUnderInHouse: "诊所内部分期金额",
    amountUnderInstallments: "分期付款金额",
    estimatedMonthlyInstallment: "预计每月分期付款",
    inHouseInstallmentNote:
      "如选择诊所内部分期付款，与保健储蓄索赔相关的消费税不包括在分期金额内，并需以现金支付。",
    interestFreeInstallments: "免息分期付款",
    patientSummaryHeading: "患者摘要",
    patientSummaryIntro: "在阅读详细程序前，先查看每个治疗选项的主要金额。",
    treatmentCostBeforeDeductions: "扣除前治疗费用",
    lessGovernmentSubsidy: "扣除政府补贴",
    lessMedisave: "扣除保健储蓄",
    estimatedCashPayable: "预计需付现金",
    patientCostExplanationHeading: "患者需支付金额",
    patientCostExplanationText:
      "需付现金是计入消费税，并扣除补贴、保健储蓄及任何折扣后的预计金额。",
    patientPaysAfterDeductions: "扣除后患者需付",
    recommended: "推荐",
    recommendedByDentist: "牙医推荐",
    recommendedOption: "推荐选项",
    patientSelectedBadge: "患者已选择",
    treatmentOptionsComparison: "治疗选项比较",
    treatmentOptionsComparisonIntro: "请先查看以上详细阶段和程序，再比较治疗选项。",
    option: "选项",
    descriptionLabel: "说明",
    estimatedDuration: "预计时长",
    patientSelectedOption: "患者选择的选项",
    patientSelectedOptionIntro: "请注明患者选择的治疗选项。",
    needMoreTime: "我需要更多时间决定",
    smokingStatus: "吸烟状态",
    patientSmokes: "患者吸烟 / 已讨论吸烟影响",
    smokingHealingHeading: "吸烟与愈合",
    smokingHealingNote:
      "吸烟可能减慢牙龈愈合，并增加感染、延迟愈合及种植失败的风险。治疗前后减少或停止吸烟可能有助于愈合。",
    viewDetailedPhases: "查看详细阶段和程序",
    atomePlan: "Atome：3个月免息",
    grabPayPlan: "GrabPay：4个月免息",
    cardPlan: "UOB / OCBC 信用卡：12个月免息分期",
    inHouseInstallment: "诊所内部分期付款",
    inHouseSixTwelve: "3/6/9/12个月免息 - 视治疗而定（如适用）",
    applicantRequirement: "申请人必须是新加坡公民 / 永久居民",
    guarantorRequirement: "需要1名担保人（新加坡公民 / 永久居民）",
    debitCardRequirement: "需要有效的借记卡",
    disclaimer: "免责声明",
    disclaimerItems: [
      "所有列明的治疗费用均包含现行9%消费税。",
      "本报价在患者口腔状况和治疗计划保持不变的情况下有效。如临床状况、主诊牙医、治疗范围发生变化，或需要额外/替代治疗，费用可能会重新审核。",
      "因并发症、临床情况变化或患者要求而需要的额外治疗程序，可能会产生额外费用。",
      "CHAS、建国一代、乐龄一代及保健储蓄索赔须符合卫生部现行规定及患者资格。",
    ],
    signatureHeading: "患者确认与签名",
    dateSigned: "签署日期",
    scanQrText: "请扫描二维码，在手机上查看并以电子方式签署此治疗报价。",
    patientSummary:
      "患者摘要：本报价说明建议的治疗、预计费用、补贴、保健储蓄索赔以及需要以现金支付的金额。",
    acknowledgement:
      "我确认牙医已向我清楚说明建议的治疗、预计费用、补贴、保健储蓄索赔、风险以及其他治疗选择。",
    quotationStatus: "报价状态",
    draftStatus: "草稿 / 讨论用",
    estimatedStatus: "善意调整 / 修订方案",
    finalStatus: "最终报价",
    draftStatusMessage:
      "草稿 / 讨论用 — 此报价仅供讨论，可能会因临床检查、患者选择、资格审核或治疗计划更改而改变。",
    estimatedStatusMessage:
      "善意调整 / 修订方案 — 此报价反映现有患者的修订治疗方案和/或善意调整，并根据当前临床情况、既往治疗记录及双方同意的调整而制定。",
    finalStatusMessage: "最终报价 — 此报价供患者审阅和确认。",
    draftAcknowledgement:
      "我确认牙医已向我说明此治疗讨论草稿，并了解内容可能会更改。",
    estimatedAcknowledgement:
      "我确认牙医已向我说明此修订治疗方案和/或善意调整，包括更新后的治疗方案、费用、扣除项目以及双方同意的任何调整。",
    finalAcknowledgement:
      "我确认牙医已向我清楚说明建议的治疗、预计费用、补贴、保健储蓄索赔、风险以及其他治疗选择。",
    financialSummaryDisplay: "费用显示方式",
    fullFinancialSummary: "详细费用明细",
    cashPayableOnly: "简单显示需付现金",
    hideFinancialSummary: "隐藏费用摘要",
    englishClinicalNote: "为确保临床准确性，治疗名称和临床术语可能保留英文。",
    categoryTranslations: {
      "General Treatment": "一般治疗",
      "Periodontal Treatment": "牙周治疗",
      "Surgical Treatment": "外科治疗",
      "Implant Treatment": "种植牙治疗",
      "Orthodontic / Cosmetic Treatment": "正畸 / 美容治疗",
      "Final prosthesis for Dental implants": "种植牙最终修复体",
      "Other Treatment": "其他治疗",
    },
  },
  Tamil: {
    label: "Tamil",
    documentTitle: "பல் சிகிச்சை திட்டம் & மேற்கோள்",
    patientInformation: "நோயாளர் தகவல்",
    clinicBranch: "கிளினிக் கிளை",
    dentist: "பல் மருத்துவர்",
    patientName: "நோயாளர் பெயர்",
    patientId: "நோயாளர் அடையாள எண்",
    quotationDate: "மேற்கோள் தேதி",
    subsidyTier: "மானிய வகை",
    treatmentPhases: "சிகிச்சை கட்டங்கள்",
    treatment: "சிகிச்சை",
    quantity: "அளவு",
    claimQty: "கோரிக்கை அளவு",
    unitPrice: "அலகு விலை",
    gst: "GST (9%)",
    subsidy: "மானியம்",
    deduction: "கழிவு",
    medisave: "Medisave",
    cashPayable: "செலுத்த வேண்டிய ரொக்கம்",
    customProcedure: "தனிப்பயன் செயல்முறை",
    remarks: "குறிப்புகள்",
    howToReadCosts: "ஒவ்வொரு சிகிச்சை செலவையும் படிப்பது எப்படி",
    howToReadCostsText:
      "அளவு என்பது திட்டமிடப்பட்ட செயல்முறைகளின் எண்ணிக்கை. கோரிக்கை அளவு என்பது CHAS / Merdeka / Pioneer மானியத்திற்கு சமர்ப்பிக்கப்படும் எண்ணிக்கை. செலுத்த வேண்டிய ரொக்கம் சிகிச்சை இடைமொத்தம் (அலகு விலை x அளவு) மற்றும் GST சேர்த்து, மானியம் மற்றும் Medisave கழிவுகளை கழித்துப் கணக்கிடப்படுகிறது.",
    phaseCashTotal: "கட்ட ரொக்க மொத்தம்",
    financialSummary: "நிதி சுருக்கம்",
    treatmentSubtotal: "சிகிச்சை இடைமொத்தம்",
    totalSubsidiesUsed: "பயன்படுத்திய மானிய மொத்தம்",
    totalMedisaveUsed: "பயன்படுத்திய Medisave மொத்தம்",
    cashPortion: "ரொக்க பகுதி",
    selectedInstallmentPlan: "தேர்ந்தெடுத்த தவணை திட்டம்",
    months: "மாதங்கள்",
    ifApplicable: "(பொருந்தினால்)",
    upfrontMedisaveGstCash: "முன்கூட்டிய ரொக்க கட்டணம் (Medisave பகுதியின் GST)",
    amountUnderInHouse: "உள் தவணைத் திட்டத்தின் கீழ் உள்ள தொகை",
    amountUnderInstallments: "தவணைத் தொகை",
    estimatedMonthlyInstallment: "மதிப்பிடப்பட்ட மாத தவணை",
    inHouseInstallmentNote:
      "உள் தவணைகளுக்கு, Medisave கோரிக்கையுடன் தொடர்புடைய GST தொகை தவணைத் தொகையில் சேர்க்கப்படாது; அது ரொக்கமாக வசூலிக்கப்படும்.",
    interestFreeInstallments: "வட்டி இல்லா தவணைகள்",
    patientSummaryHeading: "நோயாளர் சுருக்கம்",
    patientSummaryIntro:
      "விரிவான செயல்முறைகளைப் படிக்கும் முன் ஒவ்வொரு சிகிச்சை விருப்பத்திற்கான முக்கிய தொகைகள்.",
    treatmentCostBeforeDeductions: "கழிவுகளுக்கு முன் சிகிச்சை செலவு",
    lessGovernmentSubsidy: "அரசு மானியம் கழித்து",
    lessMedisave: "Medisave கழித்து",
    estimatedCashPayable: "மதிப்பிடப்பட்ட ரொக்கப் பணம்",
    patientCostExplanationHeading: "நோயாளர் செலுத்த வேண்டிய தொகை",
    patientCostExplanationText:
      "செலுத்த வேண்டிய ரொக்கம் என்பது GST சேர்த்து, மானியம், Medisave மற்றும் ஏதேனும் தள்ளுபடி கழித்த பின் மதிப்பிடப்பட்ட தொகை.",
    patientPaysAfterDeductions:
      "கழிவுகளுக்குப் பிறகு நோயாளர் செலுத்துவது",
    recommended: "பரிந்துரைக்கப்பட்டது",
    recommendedByDentist: "பல் மருத்துவர் பரிந்துரை",
    recommendedOption: "பரிந்துரைக்கப்பட்ட விருப்பம்",
    patientSelectedBadge: "நோயாளர் தேர்வு",
    treatmentOptionsComparison: "சிகிச்சை விருப்ப ஒப்பீடு",
    treatmentOptionsComparisonIntro:
      "மேலுள்ள விரிவான கட்டங்கள் மற்றும் செயல்முறைகளைப் பார்த்த பிறகு சிகிச்சை விருப்பங்களை ஒப்பிடவும்.",
    option: "விருப்பம்",
    descriptionLabel: "விளக்கம்",
    estimatedDuration: "மதிப்பிடப்பட்ட காலம்",
    patientSelectedOption: "நோயாளர் தேர்ந்தெடுத்த விருப்பம்",
    patientSelectedOptionIntro:
      "நோயாளர் தேர்ந்தெடுக்கும் சிகிச்சை விருப்பத்தை குறிப்பிடவும்.",
    needMoreTime: "முடிவு செய்ய எனக்கு மேலும் நேரம் தேவை",
    smokingStatus: "புகைபிடிக்கும் நிலை",
    patientSmokes: "நோயாளர் புகைபிடிப்பவர் / புகைபிடித்தல் பற்றி பேசப்பட்டது",
    smokingHealingHeading: "புகைபிடித்தல் மற்றும் ஆறுதல்",
    smokingHealingNote:
      "புகைபிடித்தல் ஈறு ஆறுதலை மெதுவாக்கி, தொற்று, தாமதமான ஆறுதல் மற்றும் இம்பிளாண்ட் தோல்வி அபாயத்தை அதிகரிக்கலாம். சிகிச்சைக்கு முன் மற்றும் பின் புகைபிடிப்பதை குறைப்பது அல்லது நிறுத்துவது ஆறுதலை மேம்படுத்தலாம்.",
    viewDetailedPhases: "விரிவான கட்டங்கள் மற்றும் செயல்முறைகளைப் பார்க்கவும்",
    atomePlan: "Atome: 3 மாதங்கள் வட்டி இல்லாது",
    grabPayPlan: "GrabPay: 4 மாதங்கள் வட்டி இல்லாது",
    cardPlan: "UOB / OCBC கடன் அட்டை: 12 மாத வட்டி இல்லா தவணை",
    inHouseInstallment: "உள் தவணை",
    inHouseSixTwelve:
      "3/6/9/12 மாதங்கள் வட்டி இல்லாது - சிகிச்சையைப் பொறுத்தது (பொருந்தினால்)",
    applicantRequirement: "விண்ணப்பதாரர் SG / PR ஆக இருக்க வேண்டும்",
    guarantorRequirement: "1 உத்தரவாதம் அளிப்பவர் தேவை (SG / PR)",
    debitCardRequirement: "செல்லுபடியாகும் டெபிட் கார்டு தேவை",
    disclaimer: "பொறுப்புத்துறப்பு",
    disclaimerItems: [
      "குறிப்பிடப்பட்ட அனைத்து சிகிச்சை கட்டணங்களும் நடைமுறையில் உள்ள 9% GST உட்படக் குறிப்பிடப்பட்டுள்ளன.",
      "நோயாளியின் வாய்நிலை மற்றும் சிகிச்சைத் திட்டம் மாறாமல் இருந்தால் இந்த மேற்கோள் செல்லுபடியாகும். மருத்துவ நிலை, சிகிச்சை அளிக்கும் பல் மருத்துவர், சிகிச்சை வரம்பு மாறினால் அல்லது கூடுதல்/மாற்று சிகிச்சை தேவைப்பட்டால் கட்டணங்கள் மறுபரிசீலனை செய்யப்படலாம்.",
      "சிக்கல்கள், மருத்துவ நிலை மாற்றங்கள் அல்லது நோயாளர் கோரிக்கைகள் காரணமாக தேவைப்படும் கூடுதல் சிகிச்சைகளுக்கு கூடுதல் கட்டணம் விதிக்கப்படலாம்.",
      "CHAS, Merdeka Generation, Pioneer Generation மற்றும் Medisave கோரிக்கைகள் MOH விதிமுறைகள் மற்றும் நோயாளர் தகுதிக்கு உட்பட்டவை.",
    ],
    signatureHeading: "நோயாளர் ஒப்புதல் & கையொப்பம்",
    dateSigned: "கையொப்பமிட்ட தேதி",
    scanQrText:
      "இந்த சிகிச்சை மேற்கோளை உங்கள் மொபைலில் மதிப்பாய்வு செய்து டிஜிட்டல் கையொப்பமிட QR குறியீட்டை ஸ்கேன் செய்யவும்.",
    patientSummary:
      "நோயாளர் சுருக்கம்: இந்த மேற்கோள் பரிந்துரைக்கப்பட்ட சிகிச்சை, மதிப்பிடப்பட்ட கட்டணங்கள், மானியங்கள், Medisave கோரிக்கைகள் மற்றும் ரொக்கமாக செலுத்த வேண்டிய தொகையை விளக்குகிறது.",
    acknowledgement:
      "பரிந்துரைக்கப்பட்ட சிகிச்சை, மதிப்பிடப்பட்ட கட்டணங்கள், மானியங்கள், Medisave கோரிக்கைகள், அபாயங்கள் மற்றும் மாற்று சிகிச்சை விருப்பங்கள் எனக்கு தெளிவாக விளக்கப்பட்டுள்ளன என்பதை நான் ஒப்புக்கொள்கிறேன்.",
    quotationStatus: "மேற்கோள் நிலை",
    draftStatus: "வரைவு / கலந்துரையாடலுக்காக",
    estimatedStatus: "Goodwill / திருத்தப்பட்ட திட்டம்",
    finalStatus: "இறுதி மேற்கோள்",
    draftStatusMessage:
      "வரைவு / கலந்துரையாடலுக்காக — இந்த மேற்கோள் கலந்துரையாடலுக்காக மட்டுமே; மருத்துவ மதிப்பாய்வு, நோயாளர் தேர்வு, தகுதி சோதனை அல்லது சிகிச்சைத் திட்ட மாற்றங்களின் பின்னர் மாறலாம்.",
    estimatedStatusMessage:
      "Goodwill / திருத்தப்பட்ட திட்டம் — இந்த மேற்கோள் ஏற்கனவே உள்ள நோயாளிக்கான திருத்தப்பட்ட சிகிச்சைத் திட்டம் மற்றும்/அல்லது goodwill சரிசெய்தலை பிரதிபலிக்கிறது. இது தற்போதைய மருத்துவ நிலை, முந்தைய சிகிச்சை வரலாறு மற்றும் ஒப்புக்கொள்ளப்பட்ட மாற்றங்களை அடிப்படையாகக் கொண்டு தயாரிக்கப்பட்டது.",
    finalStatusMessage:
      "இறுதி மேற்கோள் — இந்த மேற்கோள் நோயாளர் மதிப்பாய்வு மற்றும் ஒப்புதலுக்காக தயாரிக்கப்பட்டுள்ளது.",
    draftAcknowledgement:
      "இந்த வரைவு சிகிச்சை கலந்துரையாடல் எனக்கு விளக்கப்பட்டுள்ளதையும் அது மாறக்கூடும் என்பதையும் நான் ஒப்புக்கொள்கிறேன்.",
    estimatedAcknowledgement:
      "இந்த திருத்தப்பட்ட சிகிச்சைத் திட்டம் மற்றும்/அல்லது goodwill சரிசெய்தல் எனக்கு விளக்கப்பட்டுள்ளதை, புதுப்பிக்கப்பட்ட சிகிச்சைத் திட்டம், கட்டணங்கள், கழிவுகள் மற்றும் ஒப்புக்கொள்ளப்பட்ட மாற்றங்கள் உட்பட, நான் ஒப்புக்கொள்கிறேன்.",
    finalAcknowledgement:
      "பரிந்துரைக்கப்பட்ட சிகிச்சை, மதிப்பிடப்பட்ட கட்டணங்கள், மானியங்கள், Medisave கோரிக்கைகள், அபாயங்கள் மற்றும் மாற்று சிகிச்சை விருப்பங்கள் எனக்கு தெளிவாக விளக்கப்பட்டுள்ளன என்பதை நான் ஒப்புக்கொள்கிறேன்.",
    financialSummaryDisplay: "செலவு காட்சி முறை",
    fullFinancialSummary: "விரிவான செலவு பிரிவு",
    cashPayableOnly: "ரொக்கப் பணம் மட்டும்",
    hideFinancialSummary: "செலவு சுருக்கத்தை மறைக்கவும்",
    englishClinicalNote:
      "மருத்துவத் துல்லியத்திற்காக சிகிச்சை பெயர்கள் மற்றும் மருத்துவ சொற்கள் ஆங்கிலத்தில் இருக்கலாம்.",
    categoryTranslations: {
      "General Treatment": "பொது சிகிச்சை",
      "Periodontal Treatment": "பீரியடாண்டல் சிகிச்சை",
      "Surgical Treatment": "அறுவை சிகிச்சை",
      "Implant Treatment": "இம்பிளாண்ட் சிகிச்சை",
      "Orthodontic / Cosmetic Treatment": "ஆர்த்தோடாண்டிக் / அழகு சிகிச்சை",
      "Final prosthesis for Dental implants": "பல் இம்பிளாண்டுக்கான இறுதி செயற்கை அமைப்பு",
      "Other Treatment": "மற்ற சிகிச்சை",
    },
  },
};

const preferredLanguageOptions = Object.keys(
  languageCopy,
) as PreferredLanguage[];

const languageStringKeys = [
  "label",
  "documentTitle",
  "patientInformation",
  "clinicBranch",
  "dentist",
  "patientName",
  "patientId",
  "quotationDate",
  "subsidyTier",
  "treatmentPhases",
  "treatment",
  "quantity",
  "claimQty",
  "unitPrice",
  "gst",
  "subsidy",
  "deduction",
  "medisave",
  "cashPayable",
  "customProcedure",
  "remarks",
  "howToReadCosts",
  "howToReadCostsText",
  "phaseCashTotal",
  "financialSummary",
  "treatmentSubtotal",
  "totalSubsidiesUsed",
  "totalMedisaveUsed",
  "cashPortion",
  "selectedInstallmentPlan",
  "months",
  "ifApplicable",
  "upfrontMedisaveGstCash",
  "amountUnderInHouse",
  "amountUnderInstallments",
  "estimatedMonthlyInstallment",
  "inHouseInstallmentNote",
  "interestFreeInstallments",
  "patientSummaryHeading",
  "patientSummaryIntro",
  "treatmentCostBeforeDeductions",
  "lessGovernmentSubsidy",
  "lessMedisave",
  "estimatedCashPayable",
  "patientCostExplanationHeading",
  "patientCostExplanationText",
  "patientPaysAfterDeductions",
  "recommended",
  "recommendedByDentist",
  "recommendedOption",
  "patientSelectedBadge",
  "treatmentOptionsComparison",
  "treatmentOptionsComparisonIntro",
  "option",
  "descriptionLabel",
  "estimatedDuration",
  "patientSelectedOption",
  "patientSelectedOptionIntro",
  "needMoreTime",
  "smokingStatus",
  "patientSmokes",
  "smokingHealingHeading",
  "smokingHealingNote",
  "viewDetailedPhases",
  "atomePlan",
  "grabPayPlan",
  "cardPlan",
  "inHouseInstallment",
  "inHouseSixTwelve",
  "applicantRequirement",
  "guarantorRequirement",
  "debitCardRequirement",
  "disclaimer",
  "signatureHeading",
  "dateSigned",
  "scanQrText",
  "patientSummary",
  "acknowledgement",
  "quotationStatus",
  "draftStatus",
  "estimatedStatus",
  "finalStatus",
  "draftStatusMessage",
  "estimatedStatusMessage",
  "finalStatusMessage",
  "draftAcknowledgement",
  "estimatedAcknowledgement",
  "finalAcknowledgement",
  "financialSummaryDisplay",
  "fullFinancialSummary",
  "cashPayableOnly",
  "hideFinancialSummary",
  "englishClinicalNote",
] as const satisfies ReadonlyArray<
  keyof Omit<LanguageCopy, "disclaimerItems" | "categoryTranslations">
>;


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
    category: "Periodontal Treatment",
    name: "Periodontal Probing",
    duration: "1 Visit",
    fee: 150,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Periodontal Treatment",
    name: "Deep Cleaning",
    duration: "1 Visit",
    fee: 150,
    medisave: 0,
    subsidies: {
      chasBlue: 50.5,
      chasOrange: 33.5,
      merdeka: 60.5,
      pioneer: 70.5,
    },
  },
  {
    category: "Periodontal Treatment",
    name: "Root Planing / Gum Treatment (Per Quadrant)",
    duration: "",
    fee: 150,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Periodontal Treatment",
    name: "Periodontal Splinting",
    duration: "",
    fee: 300,
    medisave: 0,
    subsidies: noSubsidy,
  },
  {
    category: "Periodontal Treatment",
    name: "Blank / Custom Procedure",
    duration: "",
    fee: 0,
    medisave: 0,
    subsidies: noSubsidy,
    isCustom: true,
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
    name: "Removable COMPLETE Dolder Bar Overdentures supported by implants (per arch)",
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
    name: "Removable COMPLETE Bar on locators Overdentures supported by implants (per arch)",
    duration: "",
    fee: 5500,
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


function getTreatmentSubsidyAmount(
  treatment: Treatment,
  subsidyTier: SubsidyTier,
) {
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

function createProcedure(
  treatment: Treatment,
  subsidyTier: SubsidyTier,
): Procedure {
  return {
    ...treatment,
    name: treatment.isCustom ? "" : treatment.name,
    quantity: 1,
    subsidyClaimQty: treatment.category === "General Treatment" ? 1 : 0,
    subsidyAmount: getTreatmentSubsidyAmount(treatment, subsidyTier),
    discountPercent: 0,
    medisaveClaim: treatment.medisave,
    description: "",
    gstApplicable: treatment.category !== "Implant Treatment",
  };
}

function getDiscountPercent(procedure: Pick<Procedure, "discountPercent">) {
  return Math.min(Math.max(Number(procedure.discountPercent) || 0, 0), 100);
}

function getRowSubtotal(procedure: Pick<Procedure, "fee" | "quantity">) {
  return procedure.fee * procedure.quantity;
}

function getDiscountAmount(
  procedure: Pick<Procedure, "fee" | "quantity" | "discountPercent">,
) {
  return getRowSubtotal(procedure) * (getDiscountPercent(procedure) / 100);
}

function getDiscountedSubtotal(
  procedure: Pick<Procedure, "fee" | "quantity" | "discountPercent">,
) {
  return Math.max(getRowSubtotal(procedure) - getDiscountAmount(procedure), 0);
}

function getProcedureGst(
  procedure: Pick<
    Procedure,
    "fee" | "quantity" | "discountPercent" | "gstApplicable"
  >,
) {
  return procedure.gstApplicable ? getDiscountedSubtotal(procedure) * GST_RATE : 0;
}

function getProcedureSubsidyTotal(
  procedure: Pick<Procedure, "subsidyAmount" | "subsidyClaimQty">,
) {
  return procedure.subsidyAmount * procedure.subsidyClaimQty;
}

function getProcedurePayable(procedure: Procedure) {
  return (
    getDiscountedSubtotal(procedure) +
    getProcedureGst(procedure) -
    getProcedureSubsidyTotal(procedure) -
    procedure.medisaveClaim
  );
}

function createInitialPhase(): Phase {
  return {
    id: Date.now(),
    title: "Treatment Phase 1",
    duration: "",
    procedures: [],
  };
}

function createTreatmentOption(index: number): TreatmentOption {
  const optionLetter = String.fromCharCode(65 + index);

  return {
    id: Date.now() + index,
    title:
      index === 0
        ? "Option A - Recommended Plan"
        : `Option ${optionLetter}`,
    description: "",
    estimatedDuration: "",
    phases: [createInitialPhase()],
  };
}

function cloneTreatmentOption(
  option: TreatmentOption,
  nextOptionIndex: number,
): TreatmentOption {
  const idSeed = Date.now() + nextOptionIndex * 1000;
  const fallbackTitle = `Option ${String.fromCharCode(65 + nextOptionIndex)}`;
  const sourceTitle = option.title.trim() || fallbackTitle;

  return {
    ...option,
    id: idSeed,
    title: `${sourceTitle} (Copy)`,
    phases: option.phases.map((phase, phaseIndex) => ({
      ...phase,
      id: idSeed + phaseIndex + 1,
      procedures: phase.procedures.map((procedure) => ({
        ...procedure,
        subsidies: { ...procedure.subsidies },
      })),
    })),
  };
}

function calculateTotalsForPhases(phases: Phase[]) {
  let subtotal = 0;
  let gst = 0;
  let subsidy = 0;
  let medisave = 0;

  phases.forEach((phase) => {
    phase.procedures.forEach((procedure) => {
      const rowSubtotal = getDiscountedSubtotal(procedure);
      const rowGst = getProcedureGst(procedure);

      subtotal += rowSubtotal;
      gst += rowGst;
      subsidy += getProcedureSubsidyTotal(procedure);
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
}

function getInstallmentBreakdownForTotals(
  plan: InstallmentPlan | undefined,
  totals: ReturnType<typeof calculateTotalsForPhases>,
) {
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


function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
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

function isSingleImplantCrownTreatment(
  treatment: Pick<Treatment, "category" | "name">,
) {
  return (
    /implant treatment/i.test(treatment.category) &&
    /single implant/i.test(treatment.name) &&
    /pfm|zirconia/i.test(treatment.name) &&
    /crown/i.test(treatment.name)
  );
}

function getPatientEducationTopics(
  treatment: Pick<Treatment, "category" | "name">,
) {
  const topics = patientEducationTopics.filter((topic) =>
    topic.matches(treatment),
  );

  if (!isSingleImplantCrownTreatment(treatment)) {
    return topics.slice(0, 1);
  }

  const implantTopic = topics.find(
    (topic) => topic.id === "dental-implant-treatment",
  );
  const crownTopic = topics.find((topic) => topic.id === "pfm-zirconia-crowns");

  return [implantTopic, crownTopic].filter(
    (topic): topic is PatientEducationTopic => Boolean(topic),
  );
}

function getPatientEducationDescription(
  topic: PatientEducationTopic,
  preferredLanguage: PreferredLanguage,
) {
  return topic.descriptions[preferredLanguage] ?? topic.descriptions.English;
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

function translateCategory(category: string, copy: LanguageCopy) {
  return copy.categoryTranslations[category] ?? category;
}

function combineLanguageText(englishText: string, translatedText: string) {
  return englishText === translatedText
    ? englishText
    : `${englishText} / ${translatedText}`;
}

function getPatientEducationAnnexText(
  copy: Record<PreferredLanguage, string>,
  preferredLanguage: PreferredLanguage,
  printLanguageMode: PrintLanguageMode,
) {
  if (printLanguageMode === "english" || preferredLanguage === "English") {
    return copy.English;
  }

  return combineLanguageText(copy.English, copy[preferredLanguage]);
}

function getPrintLanguageCopy(
  preferredLanguage: PreferredLanguage,
  printLanguageMode: PrintLanguageMode,
) {
  const englishCopy = languageCopy.English;
  const preferredCopy = languageCopy[preferredLanguage];

  if (printLanguageMode === "english" || preferredLanguage === "English") {
    return englishCopy;
  }

  const bilingualCopy: LanguageCopy = {
    ...englishCopy,
    label: `English + ${preferredCopy.label}`,
    disclaimerItems: englishCopy.disclaimerItems.map((item, index) =>
      combineLanguageText(item, preferredCopy.disclaimerItems[index] ?? item),
    ),
    categoryTranslations: {},
  };

  languageStringKeys.forEach((key) => {
    (bilingualCopy as unknown as Record<string, string>)[key] = combineLanguageText(
      englishCopy[key],
      preferredCopy[key],
    );
  });

  const categoryKeys = new Set([
    ...Object.keys(englishCopy.categoryTranslations),
    ...Object.keys(preferredCopy.categoryTranslations),
  ]);

  categoryKeys.forEach((category) => {
    bilingualCopy.categoryTranslations[category] = combineLanguageText(
      englishCopy.categoryTranslations[category] ?? category,
      preferredCopy.categoryTranslations[category] ?? category,
    );
  });

  return bilingualCopy;
}

function translateInstallmentPlan(plan: InstallmentPlan, copy: LanguageCopy) {
  switch (plan.id) {
    case "none":
      return plan.label;
    case "atome-3":
      return copy.atomePlan;
    case "grabpay-4":
      return copy.grabPayPlan;
    case "card-12":
      return copy.cardPlan;
    case "in-house-3":
    case "in-house-6":
    case "in-house-9":
    case "in-house-12":
      return `${copy.inHouseInstallment} - ${plan.months} ${copy.months}`;
  }
}

function getQuotationStatusLabel(status: QuotationStatus, copy: LanguageCopy) {
  if (status === "draft") {
    return copy.draftStatus;
  }

  if (status === "final") {
    return copy.finalStatus;
  }

  return copy.estimatedStatus;
}

function getQuotationStatusMessage(status: QuotationStatus, copy: LanguageCopy) {
  if (status === "draft") {
    return copy.draftStatusMessage;
  }

  if (status === "final") {
    return copy.finalStatusMessage;
  }

  return copy.estimatedStatusMessage;
}

function getQuotationAcknowledgement(status: QuotationStatus, copy: LanguageCopy) {
  if (status === "draft") {
    return copy.draftAcknowledgement;
  }

  if (status === "final") {
    return copy.finalAcknowledgement;
  }

  return copy.estimatedAcknowledgement;
}

function getDefaultFinancialDisplayForStatus(
  status: QuotationStatus,
): FinancialSummaryDisplayMode {
  if (status === "draft") {
    return "hidden";
  }

  if (status === "final") {
    return "full";
  }

  return "cashOnly";
}

function getPrintDocumentTitle(patientName: string) {
  const sanitizedPatientName = patientName
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return sanitizedPatientName
    ? `Nofrills Dental Treatment Plan (${sanitizedPatientName})`
    : "Nofrills Dental Treatment Plan";
}

function isTreatmentOptionArray(value: unknown): value is TreatmentOption[] {
  return Array.isArray(value) && value.length > 0;
}


export default function Home() {
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const signatureContainerRef = useRef<HTMLDivElement | null>(null);
  const liveSignatureLoadedRef = useRef<string | null>(null);
  const signingSessionStartedRef = useRef(false);
  const quotationSnapshotRef = useRef<SigningQuotationSnapshot | null>(null);
  const draftSaveStartedRef = useRef(false);
  const [isFinalized, setIsFinalized] = useState(false);
  const [isDraftReady, setIsDraftReady] = useState(!isFirebaseConfigured);
  const [draftQuotationId, setDraftQuotationId] = useState("");
  const [draftStatusMessage, setDraftStatusMessage] = useState(
    isFirebaseConfigured
      ? "Starting draft autosave..."
      : "Draft autosave is disabled until Firebase environment variables are added.",
  );
  const [draftErrorMessage, setDraftErrorMessage] = useState("");
  const [clinicBranch, setClinicBranch] = useState("");
  const [dentistName, setDentistName] = useState("");
  const [patientName, setPatientName] = useState("");
  const [patientId, setPatientId] = useState("");
  const [quotationDate, setQuotationDate] = useState("");
  const [dateSigned, setDateSigned] = useState("");
  const [printTimestamp, setPrintTimestamp] = useState("");
  const [signatureDataUrl, setSignatureDataUrl] = useState("");
  const [signatureUrl, setSignatureUrl] = useState("#signature");
  const [signingSessionId, setSigningSessionId] = useState("");
  const [signatureStatusMessage, setSignatureStatusMessage] = useState(
    isFirebaseConfigured
      ? ""
      : "Live mobile signing is disabled until Firebase environment variables are added.",
  );
  const [signatureErrorMessage, setSignatureErrorMessage] = useState("");
  const [isSavingSignature, setIsSavingSignature] = useState(false);
  const [hasSignedQuotation, setHasSignedQuotation] = useState(false);
  const [subsidyTier, setSubsidyTier] = useState<SubsidyTier>("Private");
  const [quotationStatus, setQuotationStatus] =
    useState<QuotationStatus>("estimated");
  const [financialSummaryDisplay, setFinancialSummaryDisplay] =
    useState<FinancialSummaryDisplayMode>("full");
  const [showPatientEducationAnnex, setShowPatientEducationAnnex] =
    useState(true);
  const [patientSmokes, setPatientSmokes] = useState(false);
  const [preferredLanguage, setPreferredLanguage] =
    useState<PreferredLanguage>("English");
  const [printLanguageMode, setPrintLanguageMode] =
    useState<PrintLanguageMode>("english");
  const [selectedInstallmentPlan, setSelectedInstallmentPlan] =
    useState<InstallmentPlanId>("none");
  const [selectedCategory, setSelectedCategory] = useState(
    treatmentCategories[0] ?? "",
  );
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [treatmentOptions, setTreatmentOptions] = useState<TreatmentOption[]>(
    () => [createTreatmentOption(0)],
  );
  const [activeOptionId, setActiveOptionId] = useState(
    () => treatmentOptions[0]?.id ?? 0,
  );
  const [recommendedOptionId, setRecommendedOptionId] = useState(
    () => treatmentOptions[0]?.id ?? 0,
  );
  const [patientSelectedOptionId, setPatientSelectedOptionId] = useState<
    number | "discuss" | ""
  >("");


  const filteredTreatments = availableTreatments.filter(
    (item) => item.category === selectedCategory,
  );
  const selectedLanguageCopy = getPrintLanguageCopy(
    preferredLanguage,
    printLanguageMode,
  );
  const showFinancialSummary = financialSummaryDisplay !== "hidden";
  const showFullFinancialSummary = financialSummaryDisplay === "full";
  const activeOption =
    treatmentOptions.find((option) => option.id === activeOptionId) ??
    treatmentOptions[0];
  const phases = activeOption?.phases ?? [];
  const setPhases = (
    nextPhases: Phase[] | ((currentPhases: Phase[]) => Phase[]),
  ) => {
    setTreatmentOptions((currentOptions) =>
      currentOptions.map((option) => {
        if (option.id !== activeOption?.id) {
          return option;
        }

        return {
          ...option,
          phases:
            typeof nextPhases === "function"
              ? nextPhases(option.phases)
              : nextPhases,
        };
      }),
    );
  };


  useEffect(() => {
    const nextSignatureUrl = `${window.location.origin}${window.location.pathname}#signature`;
    const animationFrame = window.requestAnimationFrame(() => {
      setSignatureUrl(nextSignatureUrl);
    });


    return () => window.cancelAnimationFrame(animationFrame);
  }, []);


  const markSignatureComplete = () => {
    liveSignatureLoadedRef.current = null;
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      setSignatureDataUrl(signatureRef.current.toDataURL("image/png"));
    }
    setDateSigned(getDateInputValue(new Date()));
  };


  const clearSignature = () => {
    signatureRef.current?.clear();
    liveSignatureLoadedRef.current = null;
    setSignatureDataUrl("");
    setDateSigned("");
  };


  const saveDesktopSignature = async () => {
    if (!isFirebaseConfigured) {
      setSignatureErrorMessage("Add your Firebase environment variables before saving signed quotations.");
      return;
    }

    if (!signingSessionId) {
      setSignatureErrorMessage("The live signing session is still starting. Please try again shortly.");
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setSignatureErrorMessage("Please collect a signature before saving the quotation.");
      return;
    }

    const signedDate = dateSigned || getDateInputValue(new Date());
    setIsSavingSignature(true);
    setSignatureErrorMessage("");

    try {
      await submitSignedQuotation({
        sessionId: signingSessionId,
        quotation: quotationSnapshot,
        patientName,
        dateSigned: signedDate,
        signatureDataUrl: signatureRef.current.toDataURL("image/png"),
      });
      setSignatureDataUrl(signatureRef.current.toDataURL("image/png"));
      setDateSigned(signedDate);
      setHasSignedQuotation(true);
      setSignatureStatusMessage(
        `Signed quotation saved. Records are marked to expire after ${SIGNED_QUOTATION_RETENTION_DAYS} days.`,
      );
    } catch (error) {
      setSignatureErrorMessage(getErrorMessage(error));
    } finally {
      setIsSavingSignature(false);
    }
  };


  const printQuotation = () => {
    const originalUrl = window.location.href;
    const originalTitle = document.title;
    const sanitizedUrl = `${window.location.origin}${window.location.pathname}${window.location.hash}`;
    const nextPrintTimestamp = new Intl.DateTimeFormat("en-SG", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date());

    const restorePrintState = () => {
      window.history.replaceState(null, "", originalUrl);
      document.title = originalTitle;
      window.removeEventListener("afterprint", restorePrintState);
    };

    setPrintTimestamp(nextPrintTimestamp);
    document.title = getPrintDocumentTitle(patientName);

    if (originalUrl !== sanitizedUrl) {
      window.history.replaceState(null, "", sanitizedUrl);
      window.addEventListener("afterprint", restorePrintState);
    } else {
      window.addEventListener("afterprint", restorePrintState);
    }

    window.setTimeout(() => {
      window.print();
    }, 0);
  };

  const copyDraftLink = async () => {
    if (!draftQuotationId) {
      setDraftErrorMessage("Draft link is still being prepared.");
      return;
    }

    const draftUrl = `${window.location.origin}${window.location.pathname}?quote=${encodeURIComponent(draftQuotationId)}`;

    try {
      await navigator.clipboard.writeText(draftUrl);
      setDraftStatusMessage("Draft link copied.");
      setDraftErrorMessage("");
    } catch {
      setDraftErrorMessage(draftUrl);
    }
  };

  const applyDraftQuotation = (draft: DraftQuotationState) => {
    setClinicBranch(typeof draft.clinicBranch === "string" ? draft.clinicBranch : "");
    setDentistName(typeof draft.dentistName === "string" ? draft.dentistName : "");
    setPatientName(typeof draft.patientName === "string" ? draft.patientName : "");
    setPatientId(typeof draft.patientId === "string" ? draft.patientId : "");
    setQuotationDate(typeof draft.quotationDate === "string" ? draft.quotationDate : "");
    setDateSigned(typeof draft.dateSigned === "string" ? draft.dateSigned : "");
    setSignatureDataUrl(
      typeof draft.signatureDataUrl === "string" ? draft.signatureDataUrl : "",
    );
    setSigningSessionId(
      typeof draft.signingSessionId === "string" ? draft.signingSessionId : "",
    );
    if (typeof draft.signingSessionId === "string" && draft.signingSessionId) {
      setSignatureUrl(`${window.location.origin}/sign/${draft.signingSessionId}`);
      signingSessionStartedRef.current = true;
    }
    setSubsidyTier(
      typeof draft.subsidyTier === "string"
        ? (draft.subsidyTier as SubsidyTier)
        : "Private",
    );
    setQuotationStatus(
      typeof draft.quotationStatus === "string"
        ? (draft.quotationStatus as QuotationStatus)
        : "estimated",
    );
    setFinancialSummaryDisplay(
      typeof draft.financialSummaryDisplay === "string"
        ? (draft.financialSummaryDisplay as FinancialSummaryDisplayMode)
        : "full",
    );
    setShowPatientEducationAnnex(
      typeof draft.showPatientEducationAnnex === "boolean"
        ? draft.showPatientEducationAnnex
        : true,
    );
    setPatientSmokes(
      typeof draft.patientSmokes === "boolean" ? draft.patientSmokes : false,
    );
    setPreferredLanguage(
      typeof draft.preferredLanguage === "string"
        ? (draft.preferredLanguage as PreferredLanguage)
        : "English",
    );
    setPrintLanguageMode(
      typeof draft.printLanguageMode === "string"
        ? (draft.printLanguageMode as PrintLanguageMode)
        : "english",
    );
    setSelectedInstallmentPlan(
      typeof draft.selectedInstallmentPlan === "string"
        ? (draft.selectedInstallmentPlan as InstallmentPlanId)
        : "none",
    );
    setSelectedCategory(
      typeof draft.selectedCategory === "string"
        ? draft.selectedCategory
        : treatmentCategories[0] ?? "",
    );
    setSelectedTreatment(
      typeof draft.selectedTreatment === "string" ? draft.selectedTreatment : "",
    );

    if (isTreatmentOptionArray(draft.treatmentOptions)) {
      setTreatmentOptions(draft.treatmentOptions);
      const nextActiveOptionId =
        typeof draft.activeOptionId === "number"
          ? draft.activeOptionId
          : draft.treatmentOptions[0]?.id ?? 0;
      setActiveOptionId(nextActiveOptionId);
      setRecommendedOptionId(
        typeof draft.recommendedOptionId === "number"
          ? draft.recommendedOptionId
          : draft.treatmentOptions[0]?.id ?? 0,
      );
    }

    if (
      typeof draft.patientSelectedOptionId === "number" ||
      draft.patientSelectedOptionId === "discuss" ||
      draft.patientSelectedOptionId === ""
    ) {
      setPatientSelectedOptionId(draft.patientSelectedOptionId);
    }
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
              procedures: [...phase.procedures, createProcedure(found, subsidyTier)],
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

  const addTreatmentOption = () => {
    const nextOption = createTreatmentOption(treatmentOptions.length);
    setTreatmentOptions((currentOptions) => [...currentOptions, nextOption]);
    setActiveOptionId(nextOption.id);
  };

  const duplicateTreatmentOption = (optionId: number) => {
    const sourceOptionIndex = treatmentOptions.findIndex(
      (option) => option.id === optionId,
    );

    if (sourceOptionIndex === -1) {
      return;
    }

    const duplicateOption = cloneTreatmentOption(
      treatmentOptions[sourceOptionIndex],
      treatmentOptions.length,
    );

    setTreatmentOptions((currentOptions) => [
      ...currentOptions.slice(0, sourceOptionIndex + 1),
      duplicateOption,
      ...currentOptions.slice(sourceOptionIndex + 1),
    ]);
    setActiveOptionId(duplicateOption.id);
  };

  const deleteTreatmentOption = (optionId: number) => {
    if (treatmentOptions.length <= 1) {
      return;
    }

    const nextOptions = treatmentOptions.filter(
      (option) => option.id !== optionId,
    );

    setTreatmentOptions(nextOptions);

    if (activeOptionId === optionId) {
      setActiveOptionId(nextOptions[0]?.id ?? 0);
    }

    if (recommendedOptionId === optionId) {
      setRecommendedOptionId(nextOptions[0]?.id ?? 0);
    }

    if (patientSelectedOptionId === optionId) {
      setPatientSelectedOptionId("");
    }
  };

  const updateTreatmentOption = <K extends keyof TreatmentOption>(
    optionId: number,
    field: K,
    value: TreatmentOption[K],
  ) => {
    setTreatmentOptions((currentOptions) =>
      currentOptions.map((option) =>
        option.id === optionId ? { ...option, [field]: value } : option,
      ),
    );
  };


  const optionTotals = useMemo(
    () =>
      new Map(
        treatmentOptions.map((option) => [
          option.id,
          calculateTotalsForPhases(option.phases),
        ]),
      ),
    [treatmentOptions],
  );
  const totals =
    optionTotals.get(activeOption?.id ?? 0) ??
    calculateTotalsForPhases(phases);


  const installmentBreakdown = useMemo(() => {
    const plan = installmentPlans.find(
      (item) => item.id === selectedInstallmentPlan,
    );

    return getInstallmentBreakdownForTotals(plan, totals);
  }, [selectedInstallmentPlan, totals]);

  const comparisonRows = treatmentOptions.map((option) => ({
    id: String(option.id),
    title: displayValue(option.title),
    description: option.description,
    estimatedDuration: option.estimatedDuration,
    totals:
      optionTotals.get(option.id) ??
      calculateTotalsForPhases(option.phases),
  }));
  const patientEducationAnnexItems = useMemo(() => {
    if (!showPatientEducationAnnex) {
      return [];
    }

    const matchedTopics = new Map<string, PatientEducationTopic>();

    treatmentOptions.forEach((option) => {
      option.phases.forEach((phase) => {
        phase.procedures.forEach((procedure) => {
          const topics = getPatientEducationTopics(procedure);

          topics.forEach((topic) => {
            if (!matchedTopics.has(topic.id)) {
              matchedTopics.set(topic.id, topic);
            }
          });
        });
      });
    });

    if (patientSmokes) {
      const smokingTopic = patientEducationTopics.find(
        (topic) => topic.id === "smoking-healing",
      );

      if (smokingTopic) {
        matchedTopics.set(smokingTopic.id, smokingTopic);
      }
    }

    return Array.from(matchedTopics.values()).map((topic, index) => ({
      ...topic,
      reference: `A${index + 1}`,
    }));
  }, [patientSmokes, showPatientEducationAnnex, treatmentOptions]);
  const patientEducationReferenceByTopicId = useMemo(
    () =>
      new Map(
        patientEducationAnnexItems.map((item) => [item.id, item.reference]),
      ),
    [patientEducationAnnexItems],
  );
  const smokingAnnexReference =
    patientEducationReferenceByTopicId.get("smoking-healing");

  const draftQuotationState: DraftQuotationState = {
    clinicBranch,
    dentistName,
    patientName,
    patientId,
    quotationDate,
    dateSigned,
    signatureDataUrl,
    signingSessionId,
    subsidyTier,
    quotationStatus,
    financialSummaryDisplay,
    showPatientEducationAnnex,
    patientSmokes,
    preferredLanguage,
    printLanguageMode,
    selectedInstallmentPlan,
    selectedCategory,
    selectedTreatment,
    treatmentOptions,
    activeOptionId,
    recommendedOptionId,
    patientSelectedOptionId,
  };
  const draftQuotationStateJson = JSON.stringify(draftQuotationState);


  const selectedSnapshotPlan = installmentPlans.find(
    (item) => item.id === selectedInstallmentPlan,
  );
  const quotationSnapshot: SigningQuotationSnapshot = {
    clinicBranch,
    dentistName,
    patientName,
    patientId,
    quotationDate,
    preferredLanguage,
    subsidyTier,
    quotationStatus,
    financialSummaryDisplay,
    recommendedOptionId,
    patientSelectedOptionId,
    installmentPlan: selectedSnapshotPlan
      ? {
          id: selectedSnapshotPlan.id,
          label: translateInstallmentPlan(
            selectedSnapshotPlan,
            selectedLanguageCopy,
          ),
          months: selectedSnapshotPlan.months,
          isInHouse: selectedSnapshotPlan.isInHouse,
        }
      : null,
    installmentBreakdown: installmentBreakdown
      ? {
          medisaveGstCash: installmentBreakdown.medisaveGstCash,
          installmentAmount: installmentBreakdown.installmentAmount,
          monthlyAmount: installmentBreakdown.monthlyAmount,
        }
      : null,
    totals,
    options: treatmentOptions.map((option) => ({
      id: option.id,
      title: option.title,
      description: option.description,
      estimatedDuration: option.estimatedDuration,
      totals: optionTotals.get(option.id),
      phases: option.phases.map((phase) => ({
        id: phase.id,
        title: phase.title,
        duration: phase.duration,
        procedures: phase.procedures.map((procedure) => {
          const gst = getProcedureGst(procedure);
          const subsidy = getProcedureSubsidyTotal(procedure);
          const discountAmount = getDiscountAmount(procedure);

          return {
            category: procedure.category,
            name: procedure.name,
            quantity: procedure.quantity,
            subsidyClaimQty: procedure.subsidyClaimQty,
            subsidyAmount: procedure.subsidyAmount,
            discountPercent: getDiscountPercent(procedure),
            discountAmount,
            fee: procedure.fee,
            gstApplicable: procedure.gstApplicable,
            gst,
            subsidy,
            medisaveClaim: procedure.medisaveClaim,
            cashPayable: getProcedurePayable(procedure),
            description: procedure.description,
          };
        }),
      })),
    })),
    phases: phases.map((phase) => ({
      id: phase.id,
      title: phase.title,
      duration: phase.duration,
      procedures: phase.procedures.map((procedure) => {
        const gst = getProcedureGst(procedure);
        const subsidy = getProcedureSubsidyTotal(procedure);
        const discountAmount = getDiscountAmount(procedure);

        return {
          category: procedure.category,
          name: procedure.name,
          quantity: procedure.quantity,
          subsidyClaimQty: procedure.subsidyClaimQty,
          subsidyAmount: procedure.subsidyAmount,
          discountPercent: getDiscountPercent(procedure),
          discountAmount,
          fee: procedure.fee,
          gstApplicable: procedure.gstApplicable,
          gst,
          subsidy,
          medisaveClaim: procedure.medisaveClaim,
          cashPayable: getProcedurePayable(procedure),
          description: procedure.description,
        };
      }),
    })),
  };
  const quotationSnapshotJson = JSON.stringify(quotationSnapshot);


  useEffect(() => {
    quotationSnapshotRef.current = JSON.parse(
      quotationSnapshotJson,
    ) as SigningQuotationSnapshot;
  }, [quotationSnapshotJson]);


  useEffect(() => {
    if (!isFirebaseConfigured) {
      return;
    }

    const draftId = new URLSearchParams(window.location.search).get("quote");

    if (!draftId) {
      const animationFrame = window.requestAnimationFrame(() => {
        setIsDraftReady(true);
      });

      return () => window.cancelAnimationFrame(animationFrame);
    }

    const animationFrame = window.requestAnimationFrame(() => {
      setDraftQuotationId(draftId);
      setDraftStatusMessage("Loading saved draft...");
    });

    getDraftQuotation(draftId)
      .then((draftRecord) => {
        if (!draftRecord?.draft) {
          setDraftErrorMessage("Draft quotation was not found.");
          return;
        }

        if (
          draftRecord.expiresAt?.toDate &&
          draftRecord.expiresAt.toDate().getTime() < Date.now()
        ) {
          setDraftErrorMessage("This draft quotation has expired.");
          return;
        }

        applyDraftQuotation(draftRecord.draft);
        setDraftStatusMessage("Draft loaded. Changes save automatically.");
      })
      .catch((error) => {
        setDraftErrorMessage(getErrorMessage(error));
      })
      .finally(() => {
        setIsDraftReady(true);
      });

    return () => window.cancelAnimationFrame(animationFrame);
  }, []);


  useEffect(() => {
    if (
      !isFirebaseConfigured ||
      !isDraftReady ||
      signingSessionStartedRef.current ||
      signingSessionId
    ) {
      return;
    }

    let isMounted = true;
    signingSessionStartedRef.current = true;
    setSignatureStatusMessage("Starting live mobile signing session...");

    createSigningSession(quotationSnapshotRef.current ?? {})
      .then((sessionId) => {
        if (!isMounted) {
          return;
        }

        setSigningSessionId(sessionId);
        setSignatureUrl(`${window.location.origin}/sign/${sessionId}`);
        setSignatureStatusMessage(
          "Live signing is ready. Ask the patient to scan the QR code.",
        );
      })
      .catch((error) => {
        if (!isMounted) {
          return;
        }

        signingSessionStartedRef.current = false;
        setSignatureErrorMessage(getErrorMessage(error));
      });

    return () => {
      isMounted = false;
    };
  }, [isDraftReady, signingSessionId]);


  useEffect(() => {
    if (!isFirebaseConfigured || !isDraftReady) {
      return;
    }

    const saveTimer = window.setTimeout(() => {
      const nextDraft = JSON.parse(draftQuotationStateJson) as DraftQuotationState;

      if (draftQuotationId) {
        updateDraftQuotation(draftQuotationId, nextDraft)
          .then(() => {
            setDraftStatusMessage("Draft saved automatically.");
            setDraftErrorMessage("");
          })
          .catch((error) => {
            setDraftErrorMessage(getErrorMessage(error));
          });
        return;
      }

      if (draftSaveStartedRef.current) {
        return;
      }

      draftSaveStartedRef.current = true;
      createDraftQuotation(nextDraft)
        .then((draftId) => {
          setDraftQuotationId(draftId);
          const nextUrl = new URL(window.location.href);
          nextUrl.searchParams.set("quote", draftId);
          window.history.replaceState(null, "", nextUrl.toString());
          setDraftStatusMessage("Draft link created. Changes save automatically.");
          setDraftErrorMessage("");
        })
        .catch((error) => {
          draftSaveStartedRef.current = false;
          setDraftErrorMessage(getErrorMessage(error));
        });
    }, 1000);

    return () => window.clearTimeout(saveTimer);
  }, [draftQuotationId, draftQuotationStateJson, isDraftReady]);


  useEffect(() => {
    if (!isFirebaseConfigured || !signingSessionId || hasSignedQuotation) {
      return;
    }

    const syncTimer = window.setTimeout(() => {
      const nextQuotationSnapshot = JSON.parse(
        quotationSnapshotJson,
      ) as SigningQuotationSnapshot;

      updateSigningSessionQuotation(
        signingSessionId,
        nextQuotationSnapshot,
      ).catch((error) => {
        setSignatureErrorMessage(getErrorMessage(error));
      });
    }, 600);

    return () => window.clearTimeout(syncTimer);
  }, [hasSignedQuotation, quotationSnapshotJson, signingSessionId]);


  useEffect(() => {
    if (!isFirebaseConfigured || !signingSessionId) {
      return;
    }

    return onSnapshot(
      getSigningSessionRef(signingSessionId),
      (snapshot) => {
        const session = snapshot.data() as SigningSessionRecord | undefined;

        if (!session || session.status !== "signed" || !session.signatureDataUrl) {
          return;
        }

        setHasSignedQuotation(true);

        if (liveSignatureLoadedRef.current !== session.signatureDataUrl) {
          signatureRef.current?.fromDataURL(session.signatureDataUrl);
          liveSignatureLoadedRef.current = session.signatureDataUrl;
        }
        setSignatureDataUrl(session.signatureDataUrl);

        if (session.patientName) {
          setPatientName(session.patientName);
        }

        if (session.dateSigned) {
          setDateSigned(session.dateSigned);
        }

        setSignatureErrorMessage("");
        setSignatureStatusMessage(
          `Signature received. Signed quotation records expire after ${SIGNED_QUOTATION_RETENTION_DAYS} days.`,
        );
      },
      (error) => {
        setSignatureErrorMessage(getErrorMessage(error));
      },
    );
  }, [signingSessionId]);


  useEffect(() => {
    if (!signatureDataUrl) {
      return;
    }

    const animationFrame = window.requestAnimationFrame(() => {
      signatureRef.current?.fromDataURL(signatureDataUrl);
      liveSignatureLoadedRef.current = signatureDataUrl;
    });

    return () => window.cancelAnimationFrame(animationFrame);
  }, [isFinalized, signatureDataUrl]);


  useEffect(() => {
    const container = signatureContainerRef.current;

    if (!container) {
      return;
    }

    const resizeCanvas = () => {
      const canvas = signatureRef.current?.getCanvas();

      if (!canvas) {
        return;
      }

      const existingSignature = signatureRef.current?.isEmpty()
        ? signatureDataUrl
        : signatureRef.current?.toDataURL("image/png") ?? signatureDataUrl;
      const ratio = Math.max(window.devicePixelRatio || 1, 1);
      const width = Math.max(Math.floor(container.clientWidth), 1);
      const height = 224;

      canvas.width = Math.floor(width * ratio);
      canvas.height = Math.floor(height * ratio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      const context = canvas.getContext("2d");
      context?.setTransform(ratio, 0, 0, ratio, 0, 0);
      signatureRef.current?.clear();

      if (existingSignature) {
        signatureRef.current?.fromDataURL(existingSignature);
        liveSignatureLoadedRef.current = existingSignature;
      }
    };

    resizeCanvas();

    const resizeObserver = new ResizeObserver(resizeCanvas);
    resizeObserver.observe(container);
    window.addEventListener("orientationchange", resizeCanvas);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("orientationchange", resizeCanvas);
    };
  }, [isFinalized, signatureDataUrl]);

  const renderInstallmentBreakdown = (
    breakdown: NonNullable<typeof installmentBreakdown>,
  ) => (
    <div className="rounded-xl border bg-white p-3 text-sm sm:p-4">
      <div className="flex flex-col gap-1 font-semibold sm:flex-row sm:justify-between sm:gap-4">
        <span>
          {isFinalized
            ? selectedLanguageCopy.selectedInstallmentPlan
            : "Selected Instalment Plan"}
        </span>
        <span className="sm:text-right">
          {isFinalized
            ? translateInstallmentPlan(breakdown.plan, selectedLanguageCopy)
            : breakdown.plan.label}
        </span>
      </div>

      {breakdown.plan.isInHouse ? (
        <div className="mt-3 space-y-2">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
            <span className="min-w-0 break-words">
              {isFinalized
                ? selectedLanguageCopy.upfrontMedisaveGstCash
                : "Upfront cash payment (GST on Medisave portion)"}
            </span>
            <span className="whitespace-nowrap text-right tabular-nums">
              {formatCurrency(breakdown.medisaveGstCash)}
            </span>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
            <span className="min-w-0 break-words">
              {isFinalized
                ? selectedLanguageCopy.amountUnderInHouse
                : "Amount under in-house instalments"}
            </span>
            <span className="whitespace-nowrap text-right tabular-nums">
              {formatCurrency(breakdown.installmentAmount)}
            </span>
          </div>
          <p className="text-xs leading-relaxed text-gray-600">
            {isFinalized
              ? selectedLanguageCopy.inHouseInstallmentNote
              : "For in-house instalments, the GST amount linked to the Medisave claim is excluded from the instalment amount and collected in cash."}
          </p>
        </div>
      ) : (
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <span className="min-w-0 break-words">
            {isFinalized
              ? selectedLanguageCopy.amountUnderInstallments
              : "Amount under instalments"}
          </span>
          <span className="whitespace-nowrap text-right tabular-nums">
            {formatCurrency(breakdown.installmentAmount)}
          </span>
        </div>
      )}

      <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t pt-3 font-bold">
        <span className="min-w-0 break-words">
          {isFinalized
            ? selectedLanguageCopy.estimatedMonthlyInstallment
            : "Estimated monthly instalment"}{" "}
          ({breakdown.plan.months}{" "}
          {isFinalized ? selectedLanguageCopy.months : "months"})
        </span>
        <span className="whitespace-nowrap text-right tabular-nums">
          {formatCurrency(breakdown.monthlyAmount)}
        </span>
      </div>
    </div>
  );


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
                {isFinalized
                  ? selectedLanguageCopy.documentTitle
                  : "Dental Treatment Plan & Quotation"}
              </p>
            </div>
            </div>

            {isFinalized ? (
              <div className="print-only hidden text-right text-xs leading-relaxed text-gray-700">
                <p className="font-bold uppercase tracking-wide text-black">
                  {getQuotationStatusLabel(quotationStatus, selectedLanguageCopy)}
                </p>
                <p>
                  {selectedLanguageCopy.patientName}:{" "}
                  <span className="font-semibold">
                    {displayValue(patientName)}
                  </span>
                </p>
                <p>
                  {selectedLanguageCopy.quotationDate}:{" "}
                  <span className="font-semibold">
                    {displayValue(quotationDate)}
                  </span>
                </p>
              </div>
            ) : null}


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
              <button
                type="button"
                onClick={copyDraftLink}
                disabled={!draftQuotationId || !isFirebaseConfigured}
                className="w-full rounded-xl border px-5 py-3 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:py-2"
              >
                Copy Draft Link
              </button>
              <div className="max-w-xs text-xs text-gray-500 sm:text-right">
                <p>{draftStatusMessage}</p>
                {draftErrorMessage ? (
                  <p className="mt-1 break-words text-red-600">
                    {draftErrorMessage}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        {printTimestamp ? (
          <div className="print-only hidden border-b px-4 py-2 text-right text-xs text-gray-600">
            Printed on {printTimestamp}
          </div>
        ) : null}


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
                {isFinalized
                  ? selectedLanguageCopy.patientInformation
                  : "Patient Information"}
              </h2>


              {isFinalized ? (
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {selectedLanguageCopy.clinicBranch}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {displayValue(clinicBranch)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {selectedLanguageCopy.dentist}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {formatAttendedBy(dentistName)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {selectedLanguageCopy.patientName}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {displayValue(patientName)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {selectedLanguageCopy.patientId}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {displayValue(patientId)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {selectedLanguageCopy.quotationDate}
                    </dt>
                    <dd className="mt-1 font-medium">
                      {displayValue(quotationDate)}
                    </dd>
                  </div>

                  <div className="rounded-lg bg-gray-50 p-3">
                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {selectedLanguageCopy.subsidyTier}
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
                    value={quotationStatus}
                    onChange={(event) => {
                      const nextStatus = event.target.value as QuotationStatus;
                      setQuotationStatus(nextStatus);
                      setFinancialSummaryDisplay(
                        getDefaultFinancialDisplayForStatus(nextStatus),
                      );
                    }}
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    <option value="draft">
                      {selectedLanguageCopy.quotationStatus}:{" "}
                      {selectedLanguageCopy.draftStatus}
                    </option>
                    <option value="estimated">
                      {selectedLanguageCopy.quotationStatus}:{" "}
                      {selectedLanguageCopy.estimatedStatus}
                    </option>
                    <option value="final">
                      {selectedLanguageCopy.quotationStatus}:{" "}
                      {selectedLanguageCopy.finalStatus}
                    </option>
                  </select>

                  <select
                    value={financialSummaryDisplay}
                    onChange={(event) =>
                      setFinancialSummaryDisplay(
                        event.target.value as FinancialSummaryDisplayMode,
                      )
                    }
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    <option value="full">
                      {selectedLanguageCopy.financialSummaryDisplay}:{" "}
                      {selectedLanguageCopy.fullFinancialSummary}
                    </option>
                    <option value="cashOnly">
                      {selectedLanguageCopy.financialSummaryDisplay}:{" "}
                      {selectedLanguageCopy.cashPayableOnly}
                    </option>
                    <option value="hidden">
                      {selectedLanguageCopy.financialSummaryDisplay}:{" "}
                      {selectedLanguageCopy.hideFinancialSummary}
                    </option>
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

                  <select
                    value={printLanguageMode}
                    onChange={(event) =>
                      setPrintLanguageMode(
                        event.target.value as PrintLanguageMode,
                      )
                    }
                    className="w-full rounded-xl border px-4 py-3"
                  >
                    <option value="english">
                      Print Language: English only
                    </option>
                    <option value="bilingual">
                      Print Language: English + preferred language
                    </option>
                  </select>

                  <label className="flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={showPatientEducationAnnex}
                      onChange={(event) =>
                        setShowPatientEducationAnnex(event.target.checked)
                      }
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      <span className="font-semibold">
                        Show patient education annex in print/PDF
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                        Matching annex images are added once at the end and can
                        be hidden for this quotation.
                      </span>
                    </span>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border bg-white px-4 py-3 text-sm">
                    <input
                      type="checkbox"
                      checked={patientSmokes}
                      onChange={(event) =>
                        setPatientSmokes(event.target.checked)
                      }
                      className="mt-1 h-4 w-4"
                    />
                    <span>
                      <span className="font-semibold">
                        {selectedLanguageCopy.patientSmokes}
                      </span>
                      <span className="mt-1 block text-xs leading-relaxed text-gray-500">
                        Adds a smoking and healing note plus the smoking
                        education annex when finalized.
                      </span>
                    </span>
                  </label>
                </div>
              )}
            </section>

            {isFinalized ? (
              <section className="avoid-break rounded-2xl border-2 border-amber-300 bg-amber-50 p-4 text-amber-950 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {selectedLanguageCopy.quotationStatus}
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {getQuotationStatusLabel(
                    quotationStatus,
                    selectedLanguageCopy,
                  )}
                </h2>
                <p className="mt-2 text-sm leading-relaxed">
                  {getQuotationStatusMessage(
                    quotationStatus,
                    selectedLanguageCopy,
                  )}
                </p>
              </section>
            ) : null}

            {isFinalized && patientSmokes ? (
              <section className="avoid-break rounded-2xl border-2 border-orange-200 bg-orange-50 p-4 text-orange-950 sm:p-6">
                <p className="text-xs font-semibold uppercase tracking-wide">
                  {selectedLanguageCopy.smokingStatus}
                </p>
                <h2 className="mt-1 text-xl font-bold">
                  {selectedLanguageCopy.smokingHealingHeading}
                </h2>
                <p className="mt-2 text-sm leading-relaxed">
                  {selectedLanguageCopy.smokingHealingNote}
                </p>
                {smokingAnnexReference ? (
                  <p className="mt-3 text-sm font-semibold">
                    Patient education: See Annex {smokingAnnexReference}
                  </p>
                ) : null}
              </section>
            ) : null}


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
                      This quotation remains valid provided the patient&apos;s oral
                      condition and treatment plan remain unchanged. Fees may be
                      reviewed if there is a change in clinical condition,
                      attending dentist, treatment scope, or if additional or
                      alternative treatment is required.
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
            {!isFinalized ? (
              <section className="rounded-2xl border bg-white p-4 sm:p-6">
                <h2 className="text-xl font-bold">Guided Workflow</h2>
                <ol className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["1", "Patient Info", "Confirm branch, dentist, patient details, and language."],
                    ["2", "Treatment Options", "Create Option A/B/C and choose the active option to edit."],
                    ["3", "Phases & Procedures", "Add phases, procedures, claims, Medisave, GST, and remarks."],
                    ["4", "Review & Sign", "Finalize, review patient summary, collect signature, then print."],
                  ].map(([step, title, description]) => (
                    <li key={step} className="rounded-xl bg-gray-50 p-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-black text-sm font-bold text-white">
                        {step}
                      </div>
                      <p className="mt-2 font-semibold">{title}</p>
                      <p className="mt-1 text-gray-600">{description}</p>
                    </li>
                  ))}
                </ol>
              </section>
            ) : null}

            {!isFinalized ? (
              <section className="avoid-break rounded-2xl border bg-white p-4 sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold">Treatment Options</h2>
                    <p className="mt-1 text-sm text-gray-500">
                      Select one option below to edit its phases and procedures.
                      The finalized printout will show each option as a separate
                      section, then compare them at the end.
                      Use the editable fields below to rename the selected
                      option and add notes.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addTreatmentOption}
                    className="rounded-xl border px-4 py-2 text-sm transition hover:bg-gray-100"
                  >
                    + Add Treatment Option
                  </button>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {treatmentOptions.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setActiveOptionId(option.id)}
                      className={`rounded-xl border px-4 py-2 text-sm transition ${
                        option.id === activeOption?.id
                          ? "bg-black text-white"
                          : "hover:bg-gray-100"
                      }`}
                    >
                      <span className="font-semibold">
                        {displayValue(option.title)}
                      </span>
                      {option.id === recommendedOptionId ? (
                        <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                          {selectedLanguageCopy.recommended}
                        </span>
                      ) : null}
                    </button>
                  ))}
                </div>

                <div className="mt-4 space-y-4">
                  <div className="rounded-2xl border bg-gray-50 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Treatment option name
                        </span>
                        <input
                          type="text"
                          value={activeOption?.title ?? ""}
                          onChange={(event) =>
                            activeOption
                              ? updateTreatmentOption(
                                  activeOption.id,
                                  "title",
                                  event.target.value,
                                )
                              : undefined
                          }
                          placeholder="e.g. Recommended Plan"
                          className="mt-1 w-full rounded-xl border bg-white px-4 py-3 font-semibold"
                        />
                      </label>
                      <label className="block">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Estimated duration
                        </span>
                        <input
                          type="text"
                          value={activeOption?.estimatedDuration ?? ""}
                          onChange={(event) =>
                            activeOption
                              ? updateTreatmentOption(
                                  activeOption.id,
                                  "estimatedDuration",
                                  event.target.value,
                                )
                              : undefined
                          }
                          placeholder="e.g. 3 to 6 months"
                          className="mt-1 w-full rounded-xl border bg-white px-4 py-3"
                        />
                      </label>
                      <label className="block md:col-span-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                          Option description / notes
                        </span>
                        <textarea
                          value={activeOption?.description ?? ""}
                          onChange={(event) =>
                            activeOption
                              ? updateTreatmentOption(
                                  activeOption.id,
                                  "description",
                                  event.target.value,
                                )
                              : undefined
                          }
                          rows={2}
                          placeholder="Explain how this option differs, e.g. faster, lower cost, more comprehensive, or staged treatment."
                          className="mt-1 min-h-20 w-full resize-y rounded-xl border bg-white px-4 py-3"
                        />
                      </label>
                    </div>
                    <div className="mt-3 flex flex-col gap-3 text-sm text-gray-500 sm:flex-row sm:items-center sm:justify-between">
                      <p>
                        Cash payable for this option is calculated automatically:
                        {" "}
                        {formatCurrency(totals.payable)}.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            activeOption
                              ? duplicateTreatmentOption(activeOption.id)
                              : undefined
                          }
                          className="rounded-xl border px-4 py-2 text-slate-700 transition hover:bg-white"
                        >
                          Duplicate Current Option
                        </button>
                        {treatmentOptions.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              activeOption
                                ? setRecommendedOptionId(activeOption.id)
                                : undefined
                            }
                            className="rounded-xl border px-4 py-2 text-green-700 transition hover:bg-green-50"
                          >
                            Mark Current Option Recommended
                          </button>
                        ) : null}
                        {treatmentOptions.length > 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              activeOption
                                ? deleteTreatmentOption(activeOption.id)
                                : undefined
                            }
                            className="rounded-xl border px-4 py-2 text-red-500 transition hover:bg-red-50"
                          >
                            Delete Current Option
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

            <section
              className={compactClass(
                isFinalized,
                `rounded-2xl border p-4 sm:p-6 ${
                  treatmentOptions.length > 1 ? "print:hidden" : ""
                }`,
                "avoid-break rounded-xl border p-3 sm:p-4 print:p-3",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h2 className={compactClass(isFinalized, "text-2xl font-bold", "text-xl font-bold")}>
                  {isFinalized
                    ? selectedLanguageCopy.treatmentPhases
                    : "Treatment Phases"}
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
              <h3 className="font-bold">
                {isFinalized
                  ? selectedLanguageCopy.howToReadCosts
                  : "How to read each treatment cost"}
              </h3>
              <p className="mt-2 leading-relaxed">
                {isFinalized
                  ? selectedLanguageCopy.howToReadCostsText
                  : "Quantity is the number of procedures planned. Claim quantity is the number submitted for CHAS / Merdeka / Pioneer subsidy. Cash payable is calculated as treatment subtotal (unit price x quantity) plus GST, less subsidy and Medisave deductions."}
              </p>
            </section>

            {isFinalized && treatmentOptions.length > 1 && showFinancialSummary ? (
              <section className="avoid-break rounded-2xl border bg-white p-4 sm:p-6">
                <h2 className="text-xl font-bold">
                  {selectedLanguageCopy.patientSummaryHeading}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedLanguageCopy.patientSummaryIntro}
                </p>
                <div className="mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-relaxed text-blue-950">
                  <p className="font-semibold">
                    {selectedLanguageCopy.patientCostExplanationHeading}
                  </p>
                  <p className="mt-1">
                    {selectedLanguageCopy.patientCostExplanationText}
                  </p>
                </div>
                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  {comparisonRows.map((option) => {
                    const totalBeforeDeductions =
                      option.totals.subtotal + option.totals.gst;

                    return (
                      <div
                        key={option.id}
                        className={`rounded-2xl border p-4 ${
                          Number(option.id) === recommendedOptionId
                            ? "border-green-300 bg-green-50"
                            : "bg-gray-50"
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <h3 className="font-bold">
                            {option.title}
                          </h3>
                          {Number(option.id) === recommendedOptionId ? (
                            <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                              {selectedLanguageCopy.recommendedOption}
                            </span>
                          ) : null}
                          {patientSelectedOptionId === Number(option.id) ? (
                            <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                              {selectedLanguageCopy.patientSelectedBadge}
                            </span>
                          ) : null}
                        </div>
                        {option.estimatedDuration.trim() ? (
                          <p className="mt-1 text-sm text-gray-600">
                            Est. Duration: {option.estimatedDuration}
                          </p>
                        ) : null}
                        <div className="mt-3 space-y-2 text-sm">
                          {showFullFinancialSummary ? (
                            <>
                              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3">
                                <span>
                                  {selectedLanguageCopy.treatmentCostBeforeDeductions}
                                </span>
                                <span className="font-semibold tabular-nums">
                                  {formatCurrency(totalBeforeDeductions)}
                                </span>
                              </div>
                              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-green-700">
                                <span>{selectedLanguageCopy.lessGovernmentSubsidy}</span>
                                <span className="font-semibold tabular-nums">
                                  {formatDeduction(option.totals.subsidy)}
                                </span>
                              </div>
                              <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 text-green-700">
                                <span>{selectedLanguageCopy.lessMedisave}</span>
                                <span className="font-semibold tabular-nums">
                                  {formatDeduction(option.totals.medisave)}
                                </span>
                              </div>
                            </>
                          ) : null}
                          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 rounded-xl bg-white px-3 py-2 text-lg font-bold">
                            <span>
                              {selectedLanguageCopy.patientPaysAfterDeductions}
                            </span>
                            <span className="tabular-nums">
                              {formatCurrency(option.totals.payable)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}


            {(isFinalized
              ? treatmentOptions
              : activeOption
                ? [activeOption]
                : []
            ).map((option) => {
              const optionSummary =
                optionTotals.get(option.id) ??
                calculateTotalsForPhases(option.phases);

              return (
              <div
                key={option.id}
                className={compactClass(
                  isFinalized,
                  "space-y-4 rounded-[2rem] border-2 border-gray-200 bg-white p-3 shadow-sm sm:p-4 print:border-2 print:border-gray-300 print:p-3",
                  "space-y-4",
                )}
              >
                {isFinalized ? (
                  <section className="avoid-break overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                    <div className="print-exact bg-slate-900 px-4 py-4 text-white print:bg-slate-900 print:text-white sm:px-6">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-300 print:text-gray-300">
                            {selectedLanguageCopy.option}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2">
                            <h2 className="text-xl font-bold">
                              {displayValue(option.title)}
                            </h2>
                            {option.id === recommendedOptionId ? (
                              <span className="print-exact rounded-full bg-green-100 px-3 py-1 text-xs font-bold text-green-800">
                                {selectedLanguageCopy.recommendedOption}
                              </span>
                            ) : null}
                            {patientSelectedOptionId === option.id ? (
                              <span className="print-exact rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                                {selectedLanguageCopy.patientSelectedBadge}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        {showFinancialSummary ? (
                          <div className="print-exact rounded-2xl border border-white/40 bg-white px-4 py-3 text-slate-950 shadow-sm sm:min-w-56 sm:text-right print:bg-white print:text-slate-950">
                            <p className="text-[11px] font-black uppercase tracking-wide text-slate-700">
                              {selectedLanguageCopy.patientPaysAfterDeductions}
                            </p>
                            <p className="mt-1 text-3xl font-black tabular-nums">
                              {formatCurrency(optionSummary.payable)}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="p-4 sm:p-6">
                        {option.description.trim() ? (
                          <p className="whitespace-pre-wrap break-words text-sm text-gray-600">
                            {option.description}
                          </p>
                        ) : null}
                        {option.estimatedDuration.trim() ? (
                          <p className="mt-2 text-sm font-medium text-gray-600">
                            Est. Duration: {option.estimatedDuration}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </section>
                ) : null}

                {isFinalized ? (
                  <details className="rounded-2xl border bg-white p-3 lg:hidden print:hidden">
                    <summary className="cursor-pointer font-semibold">
                      {selectedLanguageCopy.viewDetailedPhases}
                    </summary>
                    <div className="mt-3 space-y-3">
                      {option.phases.map((phase) => (
                        <div key={`${option.id}-mobile-detail-${phase.id}`} className="rounded-xl bg-gray-50 p-3">
                          <p className="font-semibold">{phase.title}</p>
                          {phase.duration.trim() ? (
                            <p className="mt-1 text-sm text-gray-600">
                              {phase.duration}
                            </p>
                          ) : null}
                          <ul className="mt-2 space-y-1 text-sm">
                            {phase.procedures.map((procedure, procedureIndex) => {
                              const payable = getProcedurePayable(procedure);

                              return (
                                <li
                                  key={`${option.id}-${phase.id}-mobile-detail-procedure-${procedureIndex}`}
                                  className="flex justify-between gap-3 border-t pt-1"
                                >
                                  <span>{procedure.name || "Custom Procedure"}</span>
                                  <span className="font-semibold tabular-nums">
                                    {formatCurrency(payable)}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </details>
                ) : null}

            <div className={isFinalized ? "hidden lg:block print:block" : ""}>
            {option.phases.map((phase, phaseIndex) => {
              const phaseTotal = phase.procedures.reduce(
                (total, procedure) => {
                  return total + getProcedurePayable(procedure);
                },
                0,
              );
              const phaseHasDiscount = phase.procedures.some(
                (procedure) => getDiscountPercent(procedure) > 0,
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


                      {isFinalized && phase.duration.trim() ? (
                        <div className="w-full whitespace-pre-wrap break-words rounded-lg border border-transparent bg-transparent px-0 py-1 text-sm">
                          {phase.duration}
                        </div>
                      ) : null}

                      {!isFinalized ? (
                        <textarea
                          placeholder="Phase Duration"
                          value={phase.duration}
                          rows={2}
                          onChange={(event) =>
                            updatePhase(
                              phaseIndex,
                              "duration",
                              event.target.value,
                            )
                          }
                          className="min-h-12 w-full resize-y rounded-xl border px-4 py-3"
                        />
                      ) : null}
                    </div>


                    <div className="text-left sm:text-right">
                      <p className="text-sm text-gray-500">
                        {isFinalized
                          ? selectedLanguageCopy.phaseCashTotal
                          : "Phase CASH Total"}
                      </p>
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
                          const gst = getProcedureGst(procedure);
                          const subsidy = getProcedureSubsidyTotal(procedure);
                          const payable = getProcedurePayable(procedure);
                          const discountPercent = getDiscountPercent(procedure);
                          const discountAmount = getDiscountAmount(procedure);
                          const hasRemarks =
                            procedure.description.trim().length > 0;
                          const educationTopics = showPatientEducationAnnex
                            ? getPatientEducationTopics(procedure)
                            : [];
                          const annexReferences = educationTopics
                            .map((topic) =>
                              patientEducationReferenceByTopicId.get(topic.id),
                            )
                            .filter(
                              (reference): reference is string =>
                                Boolean(reference),
                            );

                          return (
                            <article
                              key={`${phase.id}-mobile-${procedureIndex}`}
                              className="avoid-break rounded-xl border bg-gray-50 p-3"
                            >
                              <div>
                                <h3 className="text-base font-bold">
                                  {procedure.name ||
                                    selectedLanguageCopy.customProcedure}
                                </h3>
                                <p className="mt-0.5 text-xs text-gray-500">
                                  {translateCategory(
                                    procedure.category,
                                    selectedLanguageCopy,
                                  )}
                                </p>
                              </div>

                              <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    {selectedLanguageCopy.quantity}
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {procedure.quantity}
                                  </dd>
                                </div>

                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    {selectedLanguageCopy.claimQty}
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {procedure.subsidyClaimQty}
                                  </dd>
                                </div>

                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    {selectedLanguageCopy.unitPrice}
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {formatCurrency(procedure.fee)}
                                  </dd>
                                </div>

                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    {selectedLanguageCopy.gst}
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {procedure.gstApplicable
                                      ? formatCurrency(gst)
                                      : "N/A"}
                                  </dd>
                                </div>

                                {discountPercent > 0 ? (
                                  <div>
                                    <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                      Discount
                                    </dt>
                                    <dd className="text-right tabular-nums">
                                      {discountPercent}% (
                                      {formatDeduction(discountAmount)})
                                    </dd>
                                  </div>
                                ) : null}

                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    {selectedLanguageCopy.subsidy}{" "}
                                    {selectedLanguageCopy.deduction}
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {formatDeduction(subsidy)}
                                  </dd>
                                </div>

                                <div>
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    {selectedLanguageCopy.medisave}{" "}
                                    {selectedLanguageCopy.deduction}
                                  </dt>
                                  <dd className="text-right tabular-nums">
                                    {formatDeduction(procedure.medisaveClaim)}
                                  </dd>
                                </div>

                                <div className="col-span-2 border-t pt-2">
                                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                    {selectedLanguageCopy.cashPayable}
                                  </dt>
                                  <dd className="text-right text-lg font-bold tabular-nums">
                                    {formatCurrency(payable)}
                                  </dd>
                                </div>
                              </dl>

                              {hasRemarks ? (
                                <div className="mt-3 rounded border-l-2 border-blue-300 bg-blue-50 px-2 py-1.5 text-xs leading-snug text-blue-950">
                                  <span className="font-semibold">
                                    {selectedLanguageCopy.remarks}:{" "}
                                  </span>
                                  <span className="whitespace-pre-wrap">
                                    {procedure.description}
                                  </span>
                                </div>
                              ) : null}

                              {annexReferences.length > 0 ? (
                                <div className="mt-3 rounded border-l-2 border-indigo-300 bg-indigo-50 px-2 py-1.5 text-xs leading-snug text-indigo-950">
                                  <span className="font-semibold">
                                    Patient education:{" "}
                                  </span>
                                  See Annex {annexReferences.join(", ")}
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
                              {selectedLanguageCopy.treatment}
                            </th>
                            <th className="w-[7%] px-2 py-2 text-right font-semibold tabular-nums">
                              {selectedLanguageCopy.quantity}
                            </th>
                            <th className="w-[8%] px-2 py-2 text-right font-semibold tabular-nums">
                              {selectedLanguageCopy.claimQty}
                            </th>
                            <th className="w-[11%] px-2 py-2 text-right font-semibold tabular-nums">
                              {selectedLanguageCopy.unitPrice}
                            </th>
                            <th className="w-[10%] px-2 py-2 text-right font-semibold tabular-nums">
                              {selectedLanguageCopy.gst}
                            </th>
                            {phaseHasDiscount ? (
                              <th className="w-[10%] px-2 py-2 text-right font-semibold tabular-nums">
                                Discount
                              </th>
                            ) : null}
                            <th className="w-[12%] px-2 py-2 text-right font-semibold tabular-nums">
                              {selectedLanguageCopy.subsidy}
                              <span className="block text-[9px] font-normal">
                                {selectedLanguageCopy.deduction}
                              </span>
                            </th>
                            <th className="w-[12%] px-2 py-2 text-right font-semibold tabular-nums">
                              {selectedLanguageCopy.medisave}
                              <span className="block text-[9px] font-normal">
                                {selectedLanguageCopy.deduction}
                              </span>
                            </th>
                            <th className="w-[12%] px-2 py-2 text-right font-semibold tabular-nums">
                              {selectedLanguageCopy.cashPayable}
                            </th>
                          </tr>
                        </thead>


                        <tbody>
                          {phase.procedures.map((procedure, procedureIndex) => {
                            const gst = getProcedureGst(procedure);
                            const subsidy = getProcedureSubsidyTotal(procedure);
                            const payable = getProcedurePayable(procedure);
                            const discountPercent = getDiscountPercent(procedure);
                            const discountAmount = getDiscountAmount(procedure);
                            const hasRemarks =
                              procedure.description.trim().length > 0;
                            const educationTopics = showPatientEducationAnnex
                              ? getPatientEducationTopics(procedure)
                              : [];
                            const annexReferences = educationTopics
                              .map((topic) =>
                                patientEducationReferenceByTopicId.get(topic.id),
                              )
                              .filter(
                                (reference): reference is string =>
                                  Boolean(reference),
                              );


                            return (
                                <tr
                                  key={`${phase.id}-table-${procedureIndex}`}
                                  className="border-t align-top"
                                >
                                  <td className="px-2 py-2">
                                    <div className="font-semibold">
                                      {procedure.name ||
                                        selectedLanguageCopy.customProcedure}
                                    </div>
                                    <div className="text-[10px] text-gray-500">
                                      {translateCategory(
                                        procedure.category,
                                        selectedLanguageCopy,
                                      )}
                                    </div>
                                    {hasRemarks ? (
                                      <div className="mt-1.5 rounded border-l-2 border-blue-300 bg-blue-50 px-1.5 py-1 text-[10px] leading-snug text-blue-950">
                                        <span className="font-semibold">
                                          {selectedLanguageCopy.remarks}:{" "}
                                        </span>
                                        <span className="whitespace-pre-wrap">
                                          {procedure.description}
                                        </span>
                                      </div>
                                    ) : null}
                                    {annexReferences.length > 0 ? (
                                      <div className="mt-1.5 rounded border-l-2 border-indigo-300 bg-indigo-50 px-1.5 py-1 text-[10px] leading-snug text-indigo-950">
                                        <span className="font-semibold">
                                          Patient education:{" "}
                                        </span>
                                        See Annex {annexReferences.join(", ")}
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
                                    {procedure.gstApplicable
                                      ? formatCurrency(gst)
                                      : "N/A"}
                                  </td>
                                  {phaseHasDiscount ? (
                                    <td className="px-2 py-2 text-right tabular-nums">
                                      {discountPercent > 0
                                        ? `${discountPercent}% (${formatDeduction(discountAmount)})`
                                        : "—"}
                                    </td>
                                  ) : null}
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
                      const gst = getProcedureGst(procedure);
                      const subsidy = getProcedureSubsidyTotal(procedure);
                      const payable = getProcedurePayable(procedure);
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
                                Discount %
                              </label>
                              {!isFinalized ? (
                                <input
                                  type="number"
                                  min="0"
                                  max="100"
                                  value={procedure.discountPercent}
                                  onChange={(event) =>
                                    updateProcedure(
                                      phaseIndex,
                                      procedureIndex,
                                      "discountPercent",
                                      Number(event.target.value),
                                    )
                                  }
                                  className="mt-2 w-full rounded-xl border px-4 py-3 text-right tabular-nums"
                                />
                              ) : (
                                <div className="mt-1 rounded-lg border border-transparent bg-transparent px-0 py-1 text-right tabular-nums">
                                  {getDiscountPercent(procedure) > 0
                                    ? `${getDiscountPercent(procedure)}%`
                                    : "—"}
                                </div>
                              )}
                            </div>


                            <div>
                              <label className={costLabelClass(isFinalized)}>
                                GST (9%)
                              </label>
                              {!isFinalized ? (
                                <label className="mt-2 flex items-center gap-2 rounded-xl border bg-white px-3 py-3 text-sm">
                                  <input
                                    type="checkbox"
                                    checked={procedure.gstApplicable}
                                    onChange={(event) =>
                                      updateProcedure(
                                        phaseIndex,
                                        procedureIndex,
                                        "gstApplicable",
                                        event.target.checked,
                                      )
                                    }
                                    className="h-4 w-4"
                                  />
                                  Apply GST
                                </label>
                              ) : (
                              <div
                                className={compactClass(
                                  isFinalized,
                                  "mt-2 rounded-xl border bg-white px-4 py-3 text-right tabular-nums",
                                  "mt-1 rounded-lg border border-transparent bg-transparent px-0 py-1 text-right tabular-nums",
                                )}
                              >
                                {procedure.gstApplicable
                                  ? formatCurrency(gst)
                                  : "N/A"}
                              </div>
                              )}
                            </div>


                            <div>
                              <label className={costLabelClass(isFinalized)}>
                                Subsidy Deducted
                              </label>
                              {isFinalized ? (
                                <div className="mt-1 rounded-lg border border-transparent bg-transparent px-0 py-1 text-right tabular-nums">
                                  {formatDeduction(subsidy)}
                                </div>
                              ) : (
                                <input
                                  type="number"
                                  min="0"
                                  value={procedure.subsidyAmount}
                                  onChange={(event) =>
                                    updateProcedure(
                                      phaseIndex,
                                      procedureIndex,
                                      "subsidyAmount",
                                      Number(event.target.value),
                                    )
                                  }
                                  className="mt-2 w-full rounded-xl border bg-white px-4 py-3 text-right tabular-nums"
                                />
                              )}
                              {!isFinalized ? (
                                <p className="mt-1 text-xs text-gray-500">
                                  Per claim unit. Total:{" "}
                                  {formatDeduction(
                                    procedure.subsidyAmount *
                                      procedure.subsidyClaimQty,
                                  )}
                                </p>
                              ) : null}
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
                                    <span className="font-semibold">
                                      {isFinalized
                                        ? selectedLanguageCopy.remarks
                                        : "Remarks"}
                                      :{" "}
                                    </span>
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
            </div>
                {isFinalized && showFinancialSummary ? (
                  <section className="avoid-break rounded-2xl border-2 border-gray-300 bg-white p-4 sm:p-6">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                          {selectedLanguageCopy.financialSummary}
                        </p>
                        <h3 className="text-lg font-bold">
                          {displayValue(option.title)}
                        </h3>
                        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-600">
                          {selectedLanguageCopy.patientCostExplanationText}
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <p className="text-sm text-gray-500">
                          {selectedLanguageCopy.patientPaysAfterDeductions}
                        </p>
                        <p className="text-2xl font-bold tabular-nums">
                          {formatCurrency(optionSummary.payable)}
                        </p>
                      </div>
                    </div>

                    {showFullFinancialSummary ? (
                      <div className="mt-4 grid gap-2 border-t pt-4 text-sm sm:grid-cols-2 lg:grid-cols-5">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {selectedLanguageCopy.treatmentSubtotal}
                          </p>
                          <p className="font-semibold tabular-nums">
                            {formatCurrency(optionSummary.subtotal)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {selectedLanguageCopy.gst}
                          </p>
                          <p className="font-semibold tabular-nums">
                            {formatCurrency(optionSummary.gst)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {selectedLanguageCopy.totalSubsidiesUsed}
                          </p>
                          <p className="font-semibold tabular-nums">
                            {formatDeduction(optionSummary.subsidy)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {selectedLanguageCopy.totalMedisaveUsed}
                          </p>
                          <p className="font-semibold tabular-nums">
                            {formatDeduction(optionSummary.medisave)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                            {selectedLanguageCopy.cashPortion}
                          </p>
                          <p className="text-lg font-bold tabular-nums">
                            {formatCurrency(optionSummary.payable)}
                          </p>
                        </div>
                      </div>
                    ) : null}
                    {selectedInstallmentPlan !== "none"
                      ? (() => {
                          const selectedPlan = installmentPlans.find(
                            (plan) => plan.id === selectedInstallmentPlan,
                          );
                          const optionInstallmentBreakdown =
                            getInstallmentBreakdownForTotals(
                              selectedPlan,
                              optionSummary,
                            );

                          return optionInstallmentBreakdown ? (
                            <div className="mt-4 border-t pt-4">
                              {renderInstallmentBreakdown(optionInstallmentBreakdown)}
                            </div>
                          ) : null;
                        })()
                      : null}
                  </section>
                ) : null}
              </div>
              );
            })}


            {!isFinalized ||
            (showFinancialSummary && treatmentOptions.length <= 1) ? (
            <section
              className={compactClass(
                isFinalized,
                "avoid-break rounded-2xl border bg-gray-50 p-4 sm:p-6",
                "avoid-break rounded-xl border bg-gray-50 p-3 sm:p-4 print:p-3",
              )}
            >
              <h2 className={compactClass(isFinalized, "mb-5 text-2xl font-bold", "mb-3 text-xl font-bold")}>
                {isFinalized
                  ? selectedLanguageCopy.financialSummary
                  : "Financial Summary"}
              </h2>

              {isFinalized ? (
                <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm leading-relaxed text-blue-950">
                  <p className="font-semibold">
                    {selectedLanguageCopy.patientCostExplanationHeading}
                  </p>
                  <p className="mt-1">
                    {selectedLanguageCopy.patientCostExplanationText}
                  </p>
                </div>
              ) : null}


              {isFinalized && treatmentOptions.length > 1 ? (
                <div className="space-y-3">
                  {treatmentOptions.map((option) => {
                    const summary =
                      optionTotals.get(option.id) ??
                      calculateTotalsForPhases(option.phases);

                    return (
                      <div
                        key={option.id}
                        className="rounded-xl border bg-white p-3"
                      >
                        <h3 className="font-semibold">
                          {displayValue(option.title)}
                        </h3>
                        <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-5">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {selectedLanguageCopy.treatmentSubtotal}
                            </p>
                            <p className="font-semibold tabular-nums">
                              {formatCurrency(summary.subtotal)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {selectedLanguageCopy.gst}
                            </p>
                            <p className="font-semibold tabular-nums">
                              {formatCurrency(summary.gst)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {selectedLanguageCopy.totalSubsidiesUsed}
                            </p>
                            <p className="font-semibold tabular-nums">
                              {formatDeduction(summary.subsidy)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {selectedLanguageCopy.totalMedisaveUsed}
                            </p>
                            <p className="font-semibold tabular-nums">
                              {formatDeduction(summary.medisave)}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {selectedLanguageCopy.cashPortion}
                            </p>
                            <p className="text-lg font-bold tabular-nums">
                              {formatCurrency(summary.payable)}
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
              <div className={compactClass(isFinalized, "space-y-4", "space-y-2 text-sm")}>
                {showFullFinancialSummary ? (
                  <>
                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                      <span className="min-w-0 break-words">
                        {isFinalized
                          ? selectedLanguageCopy.treatmentSubtotal
                          : "Treatment Subtotal"}
                      </span>
                      <span className="whitespace-nowrap text-right tabular-nums">
                        ${totals.subtotal.toFixed(2)}
                      </span>
                    </div>


                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                      <span className="min-w-0 break-words">
                        {isFinalized ? selectedLanguageCopy.gst : "GST (9%)"}
                      </span>
                      <span className="whitespace-nowrap text-right tabular-nums">
                        ${totals.gst.toFixed(2)}
                      </span>
                    </div>


                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                      <span className="min-w-0 break-words">
                        {isFinalized
                          ? selectedLanguageCopy.totalSubsidiesUsed
                          : "Total Subsidies USED"}
                      </span>
                      <span className="whitespace-nowrap text-right tabular-nums">
                        ${totals.subsidy.toFixed(2)}
                      </span>
                    </div>


                    <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
                      <span className="min-w-0 break-words">
                        {isFinalized
                          ? selectedLanguageCopy.totalMedisaveUsed
                          : "Total Medisave USED"}
                      </span>
                      <span className="whitespace-nowrap text-right tabular-nums">
                        ${totals.medisave.toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : null}


                <div
                  className={compactClass(
                    isFinalized,
                    "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t pt-5 text-2xl font-bold",
                    "grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3 border-t pt-3 text-xl font-bold",
                  )}
                >
                  <span className="min-w-0 break-words">
                    {isFinalized
                      ? selectedLanguageCopy.patientPaysAfterDeductions
                      : "Cash Portion"}
                  </span>
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
                  renderInstallmentBreakdown(installmentBreakdown)
                ) : null}
              </div>
              )}
            </section>
            ) : null}


            {isFinalized && treatmentOptions.length > 1 ? (
              <section className="avoid-break rounded-2xl border bg-white p-4 sm:p-6">
                <div>
                  <h2 className="text-xl font-bold">
                    {selectedLanguageCopy.treatmentOptionsComparison}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {selectedLanguageCopy.treatmentOptionsComparisonIntro}
                  </p>
                </div>

                <div className="mt-4 overflow-x-auto rounded-lg border">
                  <table className="w-full min-w-[820px] table-fixed border-collapse text-sm print:min-w-0">
                    <thead className="bg-gray-100 text-gray-700">
                      <tr>
                        <th className="w-[18%] px-3 py-2 text-left font-semibold">
                          {selectedLanguageCopy.option}
                        </th>
                        <th className="w-[26%] px-3 py-2 text-left font-semibold">
                          {selectedLanguageCopy.descriptionLabel}
                        </th>
                        <th className="w-[16%] px-3 py-2 text-left font-semibold">
                          {selectedLanguageCopy.estimatedDuration}
                        </th>
                        {showFullFinancialSummary ? (
                          <>
                            <th className="w-[13%] px-3 py-2 text-right font-semibold">
                              {selectedLanguageCopy.totalSubsidiesUsed}
                            </th>
                            <th className="w-[13%] px-3 py-2 text-right font-semibold">
                              {selectedLanguageCopy.totalMedisaveUsed}
                            </th>
                          </>
                        ) : null}
                        {showFinancialSummary ? (
                          <th className="w-[14%] px-3 py-2 text-right font-semibold">
                            {selectedLanguageCopy.cashPayable}
                          </th>
                        ) : null}
                      </tr>
                    </thead>

                    <tbody>
                      {comparisonRows.map((option) => (
                        <tr key={option.id} className="border-t align-top">
                          <td className="px-3 py-2 font-semibold">
                            <div>
                              {option.title}
                            </div>
                            {Number(option.id) === recommendedOptionId ? (
                              <div className="mt-1 inline-flex rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-800">
                                {selectedLanguageCopy.recommendedOption}
                              </div>
                            ) : null}
                            {patientSelectedOptionId === Number(option.id) ? (
                              <div className="mt-1 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                                {selectedLanguageCopy.patientSelectedBadge}
                              </div>
                            ) : null}
                          </td>
                          <td className="whitespace-pre-wrap break-words px-3 py-2">
                            {displayValue(option.description)}
                          </td>
                          <td className="whitespace-pre-wrap break-words px-3 py-2">
                            {displayValue(option.estimatedDuration)}
                          </td>
                          {showFullFinancialSummary ? (
                            <>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {formatDeduction(option.totals.subsidy)}
                              </td>
                              <td className="px-3 py-2 text-right tabular-nums">
                                {formatDeduction(option.totals.medisave)}
                              </td>
                            </>
                          ) : null}
                          {showFinancialSummary ? (
                            <td className="px-3 py-2 text-right font-bold tabular-nums">
                              {formatCurrency(option.totals.payable)}
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}


            {isFinalized ? (
              <section className="avoid-break rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm sm:p-6">
                <h2 className="text-xl font-bold">
                  {selectedLanguageCopy.patientSelectedOption}
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  {selectedLanguageCopy.patientSelectedOptionIntro}
                </p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {treatmentOptions.map((option) => (
                    <label
                      key={option.id}
                      className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                        patientSelectedOptionId === option.id
                          ? "border-blue-300 bg-blue-50"
                          : "border-gray-200 bg-white"
                      }`}
                    >
                      <input
                        type="radio"
                        name="patient-selected-option"
                        checked={patientSelectedOptionId === option.id}
                        onChange={() => setPatientSelectedOptionId(option.id)}
                        className="mt-1"
                      />
                      <span>
                        <span className="font-semibold">
                          {displayValue(option.title)}
                        </span>
                        {option.id === recommendedOptionId ? (
                          <span className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-xs font-semibold text-green-700">
                            {selectedLanguageCopy.recommendedOption}
                          </span>
                        ) : null}
                        {patientSelectedOptionId === option.id ? (
                          <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                            {selectedLanguageCopy.patientSelectedBadge}
                          </span>
                        ) : null}
                      </span>
                    </label>
                  ))}
                  <label
                    className={`flex items-start gap-3 rounded-xl border p-3 transition ${
                      patientSelectedOptionId === "discuss"
                        ? "border-blue-300 bg-blue-50"
                        : "border-gray-200 bg-white"
                    }`}
                  >
                    <input
                      type="radio"
                      name="patient-selected-option"
                      checked={patientSelectedOptionId === "discuss"}
                      onChange={() => setPatientSelectedOptionId("discuss")}
                      className="mt-1"
                    />
                    <span className="font-semibold">
                      {selectedLanguageCopy.needMoreTime}
                    </span>
                  </label>
                </div>
              </section>
            ) : null}


            {isFinalized && preferredLanguage !== "English" ? (
              <section className="avoid-break rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm leading-relaxed text-blue-950 print:p-3">
                <h2 className="mb-2 text-lg font-bold">
                  {selectedLanguageCopy.documentTitle}
                </h2>
                <p>{selectedLanguageCopy.patientSummary}</p>
                <p className="mt-2 text-xs text-blue-800">
                  {selectedLanguageCopy.englishClinicalNote}
                </p>
              </section>
            ) : null}


            {isFinalized ? (
              <div className="grid gap-3 md:grid-cols-2 print:grid-cols-2">
                <section className="avoid-break rounded-xl border bg-gray-50 p-4 text-xs print:p-3">
                  <h2 className="mb-3 text-xl font-bold">
                    {selectedLanguageCopy.interestFreeInstallments}
                  </h2>


                  <div className="space-y-2">
                    <div>
                      <p>{selectedLanguageCopy.atomePlan}</p>
                    </div>


                    <div>
                      <p>{selectedLanguageCopy.grabPayPlan}</p>
                    </div>


                    <div>
                      <p>{selectedLanguageCopy.cardPlan}</p>
                    </div>


                    <div>
                      <p className="font-semibold">
                        {selectedLanguageCopy.inHouseInstallment}
                      </p>
                      <ul className="mt-1 list-disc space-y-1 pl-4">
                        <li>{selectedLanguageCopy.inHouseSixTwelve}</li>
                        <li>{selectedLanguageCopy.applicantRequirement}</li>
                        <li>{selectedLanguageCopy.guarantorRequirement}</li>
                        <li>{selectedLanguageCopy.debitCardRequirement}</li>
                      </ul>
                    </div>
                  </div>
                </section>


                <section className="avoid-break rounded-xl border bg-white p-4 text-xs leading-relaxed text-gray-700 print:p-3">
                  <h2 className="mb-3 text-xl font-bold text-black">
                    {selectedLanguageCopy.disclaimer}
                  </h2>


                  <div className="space-y-2">
                    {selectedLanguageCopy.disclaimerItems.map((item) => (
                      <p key={item}>{item}</p>
                    ))}
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
                {isFinalized
                  ? selectedLanguageCopy.signatureHeading
                  : "Patient Acknowledgement & Signature"}
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
                      {isFinalized
                        ? selectedLanguageCopy.scanQrText
                        : "Scan QR code to review and digitally sign this treatment quotation on your mobile device."}
                    </p>


                    {signatureStatusMessage ? (
                      <p className="mt-3 text-center text-xs leading-relaxed text-gray-500">
                        {signatureStatusMessage}
                      </p>
                    ) : null}


                    {signatureErrorMessage ? (
                      <p className="mt-3 text-center text-xs leading-relaxed text-red-600">
                        {signatureErrorMessage}
                      </p>
                    ) : null}
                  </div>
                ) : null}


                <div className={isFinalized ? "mx-auto w-full max-w-3xl lg:col-span-3" : "lg:col-span-2"}>
                  <div className={compactClass(isFinalized, "rounded-2xl border p-4 text-center sm:p-6", "rounded-xl border p-3 sm:p-4")}>
                    <p
                      className={compactClass(
                        isFinalized,
                        "mx-auto mb-6 max-w-2xl text-sm leading-relaxed text-gray-600",
                        "mb-3 text-xs leading-relaxed text-gray-600",
                      )}
                    >
                      {isFinalized
                        ? getQuotationAcknowledgement(
                            quotationStatus,
                            selectedLanguageCopy,
                          )
                        : "I acknowledge that the proposed treatment, estimated fees, subsidies, Medisave claims, risks and alternative options have been explained clearly to me."}
                    </p>


                    <div
                      ref={signatureContainerRef}
                      className={compactClass(
                        isFinalized,
                        "mx-auto max-w-2xl overflow-hidden rounded-2xl border-2 border-dashed bg-white",
                        "overflow-hidden rounded-xl border border-dashed bg-white",
                      )}
                    >
                      <SignatureCanvas
                        ref={signatureRef}
                        penColor="black"
                        onEnd={markSignatureComplete}
                        clearOnResize={false}
                        canvasProps={{
                          width: 1,
                          height: 224,
                          className: "block bg-white",
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
                        <button
                          type="button"
                          onClick={saveDesktopSignature}
                          disabled={isSavingSignature || !isFirebaseConfigured}
                          className="rounded-xl bg-black px-5 py-3 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300 sm:py-2"
                        >
                          {isSavingSignature
                            ? "Saving..."
                            : "Save Signed Quotation"}
                        </button>
                      </div>
                    ) : null}


                    <div className={compactClass(isFinalized, "mx-auto mt-6 grid max-w-2xl gap-4 text-left sm:mt-8 md:grid-cols-2", "mt-4 grid gap-3 md:grid-cols-2")}>
                      <div>
                        <label className="mb-2 block text-sm text-gray-500">
                          {isFinalized
                            ? selectedLanguageCopy.patientName
                            : "Patient Name"}
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
                          {isFinalized
                            ? selectedLanguageCopy.dateSigned
                            : "Date Signed"}
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

            {isFinalized && patientEducationAnnexItems.length > 0 ? (
              <section className="print-break-before rounded-2xl border bg-white p-4 sm:p-6">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Supporting information
                  </p>
                  <h2 className="mt-1 text-2xl font-bold">
                    Patient Education Annex
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">
                    These diagrams are provided as general patient education
                    references for the procedures listed in this quotation.
                  </p>
                  <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-relaxed text-amber-950">
                    <p className="font-semibold">
                      {getPatientEducationAnnexText(
                        patientEducationAnnexDisclaimerHeadings,
                        preferredLanguage,
                        printLanguageMode,
                      )}
                    </p>
                    <p className="mt-1">
                      {getPatientEducationAnnexText(
                        patientEducationAnnexDisclaimers,
                        preferredLanguage,
                        printLanguageMode,
                      )}
                    </p>
                  </div>
                </div>

                <div className="mt-5 space-y-6">
                  {patientEducationAnnexItems.map((item) => (
                    <article
                      key={item.id}
                      className="avoid-break rounded-2xl border bg-gray-50 p-3 sm:p-4"
                    >
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-bold uppercase tracking-wide text-blue-700">
                            Annex {item.reference}
                          </p>
                          <h3 className="mt-1 text-xl font-bold">
                            {item.title}
                          </h3>
                        </div>
                      </div>
                      <Image
                        src={item.imageSrc}
                        alt={item.title}
                        width={1200}
                        height={675}
                        loading="eager"
                        unoptimized
                        className="h-auto w-full rounded-xl border bg-white object-contain"
                      />
                      <p className="mt-3 text-sm leading-relaxed text-gray-600">
                        {getPatientEducationDescription(
                          item,
                          preferredLanguage,
                        )}
                      </p>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
          </section>
        </div>
      </div>
    </main>
  );
}