"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { onSnapshot } from "firebase/firestore";
import { isFirebaseConfigured } from "../../../lib/firebase";
import {
  getSigningSessionRef,
  SIGNED_QUOTATION_RETENTION_DAYS,
  submitSignedQuotation,
  type SigningQuotationSnapshot,
  type SigningSessionRecord,
} from "../../../lib/signingSessions";

function getDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatCurrency(amount?: number) {
  return `$${(amount ?? 0).toFixed(2)}`;
}

function formatDeduction(amount?: number) {
  return (amount ?? 0) === 0 ? formatCurrency(0) : `-${formatCurrency(amount)}`;
}

function getSessionId(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] ?? "" : param ?? "";
}

type SignLanguage = "English" | "Malay" | "Simplified Chinese" | "Tamil";

type SignPageCopy = {
  reviewTitle: string;
  reviewIntro: string;
  loading: string;
  notEntered: string;
  patient: string;
  patientId: string;
  clinic: string;
  dentist: string;
  quotationStatus: string;
  option: string;
  estimatedDuration: string;
  draftStatus: string;
  estimatedStatus: string;
  finalStatus: string;
  treatmentOptions: string;
  treatmentPhases: string;
  quantity: string;
  cashPayable: string;
  noProcedures: string;
  noPhases: string;
  financialSummary: string;
  treatmentSubtotal: string;
  gst: string;
  subsidiesUsed: string;
  medisaveUsed: string;
  cashPortion: string;
  acknowledgementTitle: string;
  draftAcknowledgement: string;
  estimatedAcknowledgement: string;
  finalAcknowledgement: string;
  patientName: string;
  dateSigned: string;
  clear: string;
  submitSignature: string;
  submitting: string;
  signatureReceivedTitle: string;
  signatureReceivedMessage: string;
};

const signPageCopy: Record<SignLanguage, SignPageCopy> = {
  English: {
    reviewTitle: "Review and sign treatment quotation",
    reviewIntro:
      "Please review the quotation details below, then sign to acknowledge that the proposed treatment, estimated fees, subsidies, Medisave claims, risks and alternatives have been explained clearly.",
    loading: "The quotation details are still loading. Please wait a moment before signing.",
    notEntered: "Not entered",
    patient: "Patient",
    patientId: "Patient ID",
    clinic: "Clinic",
    dentist: "Dentist",
    quotationStatus: "Quotation Status",
    option: "Option",
    estimatedDuration: "Est. Duration",
    draftStatus: "Draft / For Discussion",
    estimatedStatus: "Estimated Quotation",
    finalStatus: "Final Quotation",
    treatmentOptions: "Treatment Options",
    treatmentPhases: "Treatment phases",
    quantity: "Qty",
    cashPayable: "Cash payable",
    noProcedures: "No procedures have been added yet.",
    noPhases: "No treatment phases have been added yet.",
    financialSummary: "Financial summary",
    treatmentSubtotal: "Treatment subtotal",
    gst: "GST",
    subsidiesUsed: "Subsidies used",
    medisaveUsed: "Medisave used",
    cashPortion: "Cash portion",
    acknowledgementTitle: "Patient acknowledgement",
    draftAcknowledgement:
      "I acknowledge that this draft treatment discussion has been explained to me and may be subject to change.",
    estimatedAcknowledgement:
      "I acknowledge that this estimated quotation has been explained to me and may be subject to change.",
    finalAcknowledgement:
      "I acknowledge that the proposed treatment, estimated fees, subsidies, Medisave claims, risks and alternative options have been explained clearly to me.",
    patientName: "Patient Name",
    dateSigned: "Date Signed",
    clear: "Clear",
    submitSignature: "Submit Signature",
    submitting: "Submitting...",
    signatureReceivedTitle: "Signature received",
    signatureReceivedMessage:
      "Thank you. The clinic's quotation page will update automatically.",
  },
  Malay: {
    reviewTitle: "Semak dan tandatangani sebut harga rawatan",
    reviewIntro:
      "Sila semak butiran sebut harga di bawah, kemudian tandatangani untuk mengakui bahawa rawatan yang dicadangkan, anggaran bayaran, subsidi, tuntutan Medisave, risiko dan pilihan lain telah diterangkan dengan jelas.",
    loading: "Butiran sebut harga masih dimuatkan. Sila tunggu sebentar sebelum menandatangani.",
    notEntered: "Belum diisi",
    patient: "Pesakit",
    patientId: "ID Pesakit",
    clinic: "Klinik",
    dentist: "Doktor Gigi",
    quotationStatus: "Status Sebut Harga",
    option: "Pilihan",
    estimatedDuration: "Anggaran Tempoh",
    draftStatus: "Draf / Untuk Perbincangan",
    estimatedStatus: "Sebut Harga Anggaran",
    finalStatus: "Sebut Harga Muktamad",
    treatmentOptions: "Pilihan Rawatan",
    treatmentPhases: "Fasa rawatan",
    quantity: "Kuantiti",
    cashPayable: "Tunai perlu dibayar",
    noProcedures: "Tiada prosedur ditambah lagi.",
    noPhases: "Tiada fasa rawatan ditambah lagi.",
    financialSummary: "Ringkasan kewangan",
    treatmentSubtotal: "Jumlah kecil rawatan",
    gst: "GST",
    subsidiesUsed: "Subsidi digunakan",
    medisaveUsed: "Medisave digunakan",
    cashPortion: "Bahagian tunai",
    acknowledgementTitle: "Pengakuan pesakit",
    draftAcknowledgement:
      "Saya mengakui bahawa perbincangan rawatan draf ini telah diterangkan kepada saya dan mungkin tertakluk kepada perubahan.",
    estimatedAcknowledgement:
      "Saya mengakui bahawa sebut harga anggaran ini telah diterangkan kepada saya dan mungkin tertakluk kepada perubahan.",
    finalAcknowledgement:
      "Saya mengakui bahawa rawatan yang dicadangkan, anggaran bayaran, subsidi, tuntutan Medisave, risiko dan pilihan rawatan lain telah diterangkan dengan jelas kepada saya.",
    patientName: "Nama Pesakit",
    dateSigned: "Tarikh Ditandatangani",
    clear: "Padam",
    submitSignature: "Hantar Tandatangan",
    submitting: "Menghantar...",
    signatureReceivedTitle: "Tandatangan diterima",
    signatureReceivedMessage:
      "Terima kasih. Halaman sebut harga klinik akan dikemas kini secara automatik.",
  },
  "Simplified Chinese": {
    reviewTitle: "查看并签署治疗报价",
    reviewIntro:
      "请查看以下报价详情，然后签名确认牙医已清楚说明建议的治疗、预计费用、补贴、保健储蓄索赔、风险及其他选择。",
    loading: "报价详情仍在加载。请稍等片刻再签署。",
    notEntered: "未填写",
    patient: "患者",
    patientId: "患者编号",
    clinic: "诊所",
    dentist: "牙医",
    quotationStatus: "报价状态",
    option: "选项",
    estimatedDuration: "预计时长",
    draftStatus: "草稿 / 讨论用",
    estimatedStatus: "估算报价",
    finalStatus: "最终报价",
    treatmentOptions: "治疗选项",
    treatmentPhases: "治疗阶段",
    quantity: "数量",
    cashPayable: "需付现金",
    noProcedures: "尚未添加治疗程序。",
    noPhases: "尚未添加治疗阶段。",
    financialSummary: "费用摘要",
    treatmentSubtotal: "治疗小计",
    gst: "消费税",
    subsidiesUsed: "已使用补贴",
    medisaveUsed: "已使用保健储蓄",
    cashPortion: "现金部分",
    acknowledgementTitle: "患者确认",
    draftAcknowledgement:
      "我确认牙医已向我说明此治疗讨论草稿，并了解内容可能会更改。",
    estimatedAcknowledgement:
      "我确认牙医已向我说明此估算报价，并了解内容可能会更改。",
    finalAcknowledgement:
      "我确认牙医已向我清楚说明建议的治疗、预计费用、补贴、保健储蓄索赔、风险以及其他治疗选择。",
    patientName: "患者姓名",
    dateSigned: "签署日期",
    clear: "清除",
    submitSignature: "提交签名",
    submitting: "提交中...",
    signatureReceivedTitle: "签名已收到",
    signatureReceivedMessage: "谢谢。诊所的报价页面将自动更新。",
  },
  Tamil: {
    reviewTitle: "சிகிச்சை மேற்கோளை மதிப்பாய்வு செய்து கையொப்பமிடவும்",
    reviewIntro:
      "கீழே உள்ள மேற்கோள் விவரங்களைப் பார்க்கவும். பின்னர் பரிந்துரைக்கப்பட்ட சிகிச்சை, மதிப்பிடப்பட்ட கட்டணங்கள், மானியங்கள், Medisave கோரிக்கைகள், அபாயங்கள் மற்றும் மாற்று விருப்பங்கள் தெளிவாக விளக்கப்பட்டுள்ளன என்பதை ஒப்புக்கொண்டு கையொப்பமிடவும்.",
    loading: "மேற்கோள் விவரங்கள் இன்னும் ஏற்றப்படுகின்றன. கையொப்பமிடுவதற்கு முன் சிறிது நேரம் காத்திருக்கவும்.",
    notEntered: "நிரப்பப்படவில்லை",
    patient: "நோயாளர்",
    patientId: "நோயாளர் அடையாள எண்",
    clinic: "கிளினிக்",
    dentist: "பல் மருத்துவர்",
    quotationStatus: "மேற்கோள் நிலை",
    option: "விருப்பம்",
    estimatedDuration: "மதிப்பிடப்பட்ட காலம்",
    draftStatus: "வரைவு / கலந்துரையாடலுக்காக",
    estimatedStatus: "மதிப்பிடப்பட்ட மேற்கோள்",
    finalStatus: "இறுதி மேற்கோள்",
    treatmentOptions: "சிகிச்சை விருப்பங்கள்",
    treatmentPhases: "சிகிச்சை கட்டங்கள்",
    quantity: "அளவு",
    cashPayable: "செலுத்த வேண்டிய ரொக்கம்",
    noProcedures: "செயல்முறைகள் இன்னும் சேர்க்கப்படவில்லை.",
    noPhases: "சிகிச்சை கட்டங்கள் இன்னும் சேர்க்கப்படவில்லை.",
    financialSummary: "நிதி சுருக்கம்",
    treatmentSubtotal: "சிகிச்சை இடைமொத்தம்",
    gst: "GST",
    subsidiesUsed: "பயன்படுத்திய மானியம்",
    medisaveUsed: "பயன்படுத்திய Medisave",
    cashPortion: "ரொக்க பகுதி",
    acknowledgementTitle: "நோயாளர் ஒப்புதல்",
    draftAcknowledgement:
      "இந்த வரைவு சிகிச்சை கலந்துரையாடல் எனக்கு விளக்கப்பட்டுள்ளதையும் அது மாறக்கூடும் என்பதையும் நான் ஒப்புக்கொள்கிறேன்.",
    estimatedAcknowledgement:
      "இந்த மதிப்பிடப்பட்ட மேற்கோள் எனக்கு விளக்கப்பட்டுள்ளதையும் அது மாறக்கூடும் என்பதையும் நான் ஒப்புக்கொள்கிறேன்.",
    finalAcknowledgement:
      "பரிந்துரைக்கப்பட்ட சிகிச்சை, மதிப்பிடப்பட்ட கட்டணங்கள், மானியங்கள், Medisave கோரிக்கைகள், அபாயங்கள் மற்றும் மாற்று சிகிச்சை விருப்பங்கள் எனக்கு தெளிவாக விளக்கப்பட்டுள்ளன என்பதை நான் ஒப்புக்கொள்கிறேன்.",
    patientName: "நோயாளர் பெயர்",
    dateSigned: "கையொப்பமிட்ட தேதி",
    clear: "அழிக்கவும்",
    submitSignature: "கையொப்பத்தை சமர்ப்பிக்கவும்",
    submitting: "சமர்ப்பிக்கிறது...",
    signatureReceivedTitle: "கையொப்பம் பெறப்பட்டது",
    signatureReceivedMessage:
      "நன்றி. கிளினிக்கின் மேற்கோள் பக்கம் தானாக புதுப்பிக்கப்படும்.",
  },
};

function getPreferredLanguage(value: string | undefined): SignLanguage {
  if (
    value === "Malay" ||
    value === "Simplified Chinese" ||
    value === "Tamil"
  ) {
    return value;
  }

  return "English";
}

function getAcknowledgement(quotation: SigningQuotationSnapshot | null | undefined, copy: SignPageCopy) {
  if (quotation?.quotationStatus === "draft") {
    return copy.draftAcknowledgement;
  }

  if (quotation?.quotationStatus === "final") {
    return copy.finalAcknowledgement;
  }

  return copy.estimatedAcknowledgement;
}

function getStatusLabel(quotation: SigningQuotationSnapshot, copy: SignPageCopy) {
  if (quotation.quotationStatus === "draft") {
    return copy.draftStatus;
  }

  if (quotation.quotationStatus === "final") {
    return copy.finalStatus;
  }

  return copy.estimatedStatus;
}

function QuotationSummary({
  quotation,
}: {
  quotation: SigningQuotationSnapshot | null | undefined;
}) {
  const copy = signPageCopy[getPreferredLanguage(quotation?.preferredLanguage)];

  if (!quotation) {
    return (
      <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
        {copy.loading}
      </p>
    );
  }

  const options = quotation.options?.length
    ? quotation.options
    : [
        {
          id: 1,
          title: copy.treatmentPhases,
          description: "",
          estimatedDuration: "",
          totals: quotation.totals,
          phases: quotation.phases,
        },
      ];
  const showFinancialSummary = quotation.financialSummaryDisplay !== "hidden";
  const showFullFinancialSummary = quotation.financialSummaryDisplay !== "cashOnly";

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
        <div>
          <span className="font-semibold">{copy.patient}:</span>{" "}
          {quotation.patientName || copy.notEntered}
        </div>
        <div>
          <span className="font-semibold">{copy.patientId}:</span>{" "}
          {quotation.patientId || copy.notEntered}
        </div>
        <div>
          <span className="font-semibold">{copy.clinic}:</span>{" "}
          {quotation.clinicBranch || copy.notEntered}
        </div>
        <div>
          <span className="font-semibold">{copy.dentist}:</span>{" "}
          {quotation.dentistName || copy.notEntered}
        </div>
        <div>
          <span className="font-semibold">{copy.quotationStatus}:</span>{" "}
          {getStatusLabel(quotation, copy)}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="text-lg font-bold">{copy.treatmentOptions}</h2>
        <div className="mt-3 space-y-4">
          {options.map((option, optionIndex) => (
            <section
              key={option.id ?? optionIndex}
              className="rounded-xl border bg-gray-50 p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold">
                    {option.title || `${copy.option} ${optionIndex + 1}`}
                  </h3>
                  {option.description ? (
                    <p className="mt-1 whitespace-pre-wrap text-sm text-gray-600">
                      {option.description}
                    </p>
                  ) : null}
                  {option.estimatedDuration ? (
                    <p className="mt-1 text-xs text-gray-500">
                      {copy.estimatedDuration}: {option.estimatedDuration}
                    </p>
                  ) : null}
                </div>
                {showFinancialSummary ? (
                  <div className="text-right text-sm">
                    <p className="text-gray-500">{copy.cashPortion}</p>
                    <p className="font-bold tabular-nums">
                      {formatCurrency(option.totals?.payable)}
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="mt-3 space-y-3">
                {option.phases?.length ? (
                  option.phases.map((phase, phaseIndex) => (
                    <div
                      key={`${option.id ?? optionIndex}-${phase.id ?? phaseIndex}`}
                      className="rounded-lg bg-white p-3"
                    >
                      <p className="font-semibold">
                        {phase.title || `${copy.treatmentPhases} ${phaseIndex + 1}`}
                      </p>
                      {phase.duration ? (
                        <p className="mt-1 text-xs text-gray-500">{phase.duration}</p>
                      ) : null}

                      <div className="mt-3 space-y-2">
                        {phase.procedures?.length ? (
                          phase.procedures.map((procedure, procedureIndex) => (
                            <article
                              key={`${phase.id ?? phaseIndex}-${procedureIndex}`}
                              className="rounded-lg bg-gray-50 p-3 text-sm"
                            >
                              <div className="font-medium">
                                {procedure.name || "Unnamed treatment"}
                              </div>
                              <div className="mt-1 text-xs text-gray-500">
                                {copy.quantity} {procedure.quantity ?? 0}
                                {showFinancialSummary ? (
                                  <>
                                    {" "}
                                    · {copy.cashPayable}{" "}
                                    {formatCurrency(procedure.cashPayable)}
                                  </>
                                ) : null}
                              </div>
                              {procedure.description ? (
                                <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                                  {procedure.description}
                                </p>
                              ) : null}
                            </article>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">
                            {copy.noProcedures}
                          </p>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">{copy.noPhases}</p>
                )}
              </div>

              {showFinancialSummary ? (
                <div className="mt-3 rounded-lg border bg-blue-50 p-3 text-sm text-blue-950">
                  <h4 className="font-bold">{copy.financialSummary}</h4>
                  <dl className="mt-2 space-y-2">
                    {showFullFinancialSummary ? (
                      <>
                        <div className="flex justify-between gap-4">
                          <dt>{copy.treatmentSubtotal}</dt>
                          <dd className="font-medium tabular-nums">
                            {formatCurrency(option.totals?.subtotal)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>{copy.gst}</dt>
                          <dd className="font-medium tabular-nums">
                            {formatCurrency(option.totals?.gst)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>{copy.subsidiesUsed}</dt>
                          <dd className="font-medium tabular-nums">
                            {formatDeduction(option.totals?.subsidy)}
                          </dd>
                        </div>
                        <div className="flex justify-between gap-4">
                          <dt>{copy.medisaveUsed}</dt>
                          <dd className="font-medium tabular-nums">
                            {formatDeduction(option.totals?.medisave)}
                          </dd>
                        </div>
                      </>
                    ) : null}
                    <div className="flex justify-between gap-4 border-t border-blue-200 pt-2 text-base font-bold">
                      <dt>{copy.cashPortion}</dt>
                      <dd className="tabular-nums">
                        {formatCurrency(option.totals?.payable)}
                      </dd>
                    </div>
                  </dl>
                </div>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SignQuotationPage() {
  const params = useParams<{ sessionId?: string | string[] }>();
  const sessionId = getSessionId(params.sessionId);
  const initialLinkError = !isFirebaseConfigured
    ? "Firebase is not configured for this signing page."
    : !sessionId
      ? "This signing link is missing its session ID."
      : "";
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const didPrefillNameRef = useRef(false);
  const [session, setSession] = useState<SigningSessionRecord | null>(null);
  const [patientName, setPatientName] = useState("");
  const [dateSigned, setDateSigned] = useState(getDateInputValue(new Date()));
  const [errorMessage, setErrorMessage] = useState(initialLinkError);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const copy = signPageCopy[
    getPreferredLanguage(session?.quotation?.preferredLanguage)
  ];

  useEffect(() => {
    if (!isFirebaseConfigured || !sessionId) {
      return;
    }

    return onSnapshot(
      getSigningSessionRef(sessionId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setErrorMessage("This signing link is no longer available.");
          return;
        }

        const nextSession = snapshot.data() as SigningSessionRecord;
        setSession(nextSession);

        if (nextSession.status === "signed") {
          setIsSubmitted(true);
        }

        if (!didPrefillNameRef.current && nextSession.quotation?.patientName) {
          setPatientName(nextSession.quotation.patientName);
          didPrefillNameRef.current = true;
        }

        setErrorMessage("");
      },
      (error) => {
        setErrorMessage(getErrorMessage(error));
      },
    );
  }, [sessionId]);

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  const submitSignature = async () => {
    if (!sessionId || !session) {
      setErrorMessage("This signing session is not ready yet.");
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setErrorMessage("Please sign in the signature box before submitting.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await submitSignedQuotation({
        sessionId,
        quotation: session.quotation ?? null,
        patientName,
        dateSigned,
        signatureDataUrl: signatureRef.current.toDataURL("image/png"),
      });
      setIsSubmitted(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted || session?.status === "signed") {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-black">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-2xl font-bold">
            {copy.signatureReceivedTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {copy.signatureReceivedMessage} This signed quotation is marked to
            expire after{" "}
            {SIGNED_QUOTATION_RETENTION_DAYS} days.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black">
      <div className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Nofrills Dental
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            {copy.reviewTitle}
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            {copy.reviewIntro}
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <QuotationSummary quotation={session?.quotation} />

        <section className="rounded-xl border p-4">
          <h2 className="text-lg font-bold">{copy.acknowledgementTitle}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            {getAcknowledgement(session?.quotation, copy)}
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border-2 border-dashed bg-white">
            <SignatureCanvas
              ref={signatureRef}
              penColor="black"
              canvasProps={{
                width: 720,
                height: 260,
                className: "h-56 w-full bg-white",
              }}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-500">
                {copy.patientName}
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-500">
                {copy.dateSigned}
              </label>
              <input
                type="date"
                value={dateSigned}
                onChange={(event) => setDateSigned(event.target.value)}
                className="h-12 w-full rounded-xl border px-4 py-3 leading-normal"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={clearSignature}
              className="rounded-xl border px-5 py-3 transition hover:bg-gray-100"
            >
              {copy.clear}
            </button>
            <button
              type="button"
              onClick={submitSignature}
              disabled={isSubmitting || !session}
              className="rounded-xl bg-black px-5 py-3 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSubmitting ? copy.submitting : copy.submitSignature}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
