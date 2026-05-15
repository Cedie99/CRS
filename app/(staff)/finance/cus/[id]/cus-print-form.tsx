/**
 * CusPrintForm — shown only during print, hidden on screen.
 * Renders a clean, paper-ready Customer Update Sheet for the CFO to sign.
 * Typography and layout mirror the final CIS form print output.
 */

type PrintRow = { label: string; current: string | null; requested: string | null };
type PrintDoc = { label: string; files: { name: string; url: string; type?: string }[] };

export function CusPrintForm({
  tradeName,
  agentCode,
  submittedAt,
  rows,
  agentNote,
  uploadedDocs = [],
}: {
  tradeName: string;
  agentCode: string | null;
  submittedAt: string;
  rows: PrintRow[];
  agentNote: string | null;
  uploadedDocs?: PrintDoc[];
}) {
  const changedRows = rows.filter((r) => r.requested !== null && r.requested !== r.current);
  const unchangedRows = rows.filter((r) => r.requested === null);

  return (
    <div
      data-print-root
      className="hidden print:block"
      style={{ color: "#000", background: "#fff" }}
    >
      {/* ── Header — matches CIS form print header ── */}
      <div style={{ textAlign: "center", borderBottom: "2px solid #18181b", paddingBottom: "10px", marginBottom: "12px" }}>
        <p style={{
          fontSize: "17px",
          fontWeight: 900,
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          color: "#18181b",
          margin: "0 0 2px",
        }}>
          Oracle Petroleum Corporation
        </p>
        <p style={{ fontSize: "11px", letterSpacing: "0.16em", textTransform: "uppercase", color: "#71717a", margin: 0 }}>
          Toll Blend Division
        </p>
      </div>

      {/* ── Title row ── */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "16px", marginBottom: "16px" }}>
        <div>
          <p style={{ fontSize: "18px", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "#18181b", margin: "0 0 6px" }}>
            Customer Update Sheet
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "16px", fontSize: "12px", color: "#52525b" }}>
            <span><strong style={{ color: "#18181b" }}>Customer:</strong> {tradeName}</span>
            {agentCode && <span><strong style={{ color: "#18181b" }}>Agent Code:</strong> {agentCode}</span>}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: "11px", color: "#a1a1aa", flexShrink: 0 }}>
          <p style={{ margin: "0 0 2px" }}>Date Filed: <strong style={{ color: "#52525b" }}>{submittedAt}</strong></p>
        </div>
      </div>

      <div style={{ borderBottom: "1px solid #d4d4d8", marginBottom: "16px" }} />

      {/* ── Section A: Requested Changes ── */}
      {changedRows.length > 0 && (
        <section style={{ marginBottom: "24px" }}>
          <SectionHeading label="A. Requested Information Changes" />
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f4f4f5" }}>
                <Th width="22%">Field</Th>
                <Th width="39%">Current Value on File</Th>
                <Th width="39%">Requested New Value</Th>
              </tr>
            </thead>
            <tbody>
              {changedRows.map(({ label, current, requested }) => (
                <tr key={label}>
                  <Td><strong style={{ color: "#3f3f46" }}>{label}</strong></Td>
                  <Td style={{ color: "#71717a" }}>{current ?? <em style={{ color: "#a1a1aa" }}>—</em>}</Td>
                  <Td><strong style={{ fontSize: "13px" }}>{requested}</strong></Td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Section B: Unchanged fields (reference) ── */}
      {unchangedRows.length > 0 && (
        <section style={{ marginBottom: "24px" }}>
          <SectionHeading label="B. No Change Requested" />
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
            <thead>
              <tr style={{ background: "#f4f4f5" }}>
                <Th width="30%">Field</Th>
                <Th width="70%">Current Value on File (retained)</Th>
              </tr>
            </thead>
            <tbody>
              {unchangedRows.map(({ label, current }) => (
                <tr key={label}>
                  <Td style={{ color: "#3f3f46" }}>{label}</Td>
                  <Td style={{ fontSize: "13px" }}>{current ?? <em style={{ color: "#a1a1aa" }}>—</em>}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* ── Agent note ── */}
      {agentNote && (
        <section style={{ marginBottom: "24px" }}>
          <SectionHeading label="Agent Note" />
          <div style={{ border: "1px solid #d4d4d8", padding: "10px 14px", fontSize: "13px", background: "#fafafa", lineHeight: "1.6" }}>
            {agentNote}
          </div>
        </section>
      )}

      {/* ── Section C: Submitted Documents ── */}
      {uploadedDocs.length > 0 && (
        <section style={{ marginBottom: "24px" }}>
          <SectionHeading label="C. Submitted Documents" />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "8px" }}>
            {uploadedDocs.map(({ label, files }) => (
              <div key={label} style={{ border: "1px solid #e4e4e7", borderRadius: "6px", overflow: "hidden" }}>
                {/* Slot label */}
                <div style={{ background: "#f4f4f5", padding: "6px 12px", borderBottom: "1px solid #e4e4e7" }}>
                  <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#52525b" }}>
                    {label}
                  </span>
                </div>
                {/* File previews */}
                <div style={{ padding: "10px 12px", display: "flex", flexWrap: "wrap", gap: "10px" }}>
                  {files.map((f, i) => {
                    const isImage = f.type?.startsWith("image/") ?? /\.(jpe?g|png|webp)$/i.test(f.name);
                    return isImage ? (
                      <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={f.url}
                          alt={f.name}
                          style={{ maxWidth: "220px", maxHeight: "160px", objectFit: "contain", border: "1px solid #e4e4e7", borderRadius: "4px", background: "#fafafa" }}
                        />
                        <span style={{ fontSize: "9px", color: "#a1a1aa", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {f.name}
                        </span>
                      </div>
                    ) : (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: "8px", border: "1px solid #e4e4e7", borderRadius: "4px", padding: "8px 12px", background: "#fafafa", minWidth: "180px" }}>
                        <span style={{ fontSize: "18px", lineHeight: 1 }}>📄</span>
                        <div>
                          <div style={{ fontSize: "11px", fontWeight: 600, color: "#3f3f46" }}>PDF Document</div>
                          <div style={{ fontSize: "10px", color: "#71717a", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Section D: Credit Evaluation (CFO fills physically) ── */}
      <section style={{ marginBottom: "36px" }}>
        <SectionHeading label="D. Credit Evaluation  —  To be completed by the Chief Finance Officer" />
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", marginTop: "14px" }}>
          <FillRow label="Credit Terms" hint="e.g. Prepaid / COD · 30 Days · 60 Days" />
          <FillRow label="Credit Limit" hint="e.g. ₱ 500,000.00" />
          <FillRow label="Remarks" />
        </div>
      </section>

      {/* ── Section E: Approval / Signature ── */}
      <section>
        <SectionHeading label="E. Approval" />
        <div style={{ maxWidth: "55%", marginTop: "10px" }}>
          <SignatureBlock title="Reviewed & Approved by (CFO)" />
        </div>
      </section>

      {/* ── Footer ── */}
      <div style={{ marginTop: "36px", borderTop: "1px solid #e4e4e7", paddingTop: "6px", fontSize: "9px", color: "#a1a1aa", textAlign: "center" }}>
        Oracle Petroleum Corporation · Customer Update Sheet · Printed {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
      </div>
    </div>
  );
}

/* ── Small helpers ── */

function SectionHeading({ label }: { label: string }) {
  return (
    <div style={{
      fontSize: "14px",
      fontWeight: 900,
      letterSpacing: "0.14em",
      textTransform: "uppercase",
      color: "#27272a",
      borderBottom: "2px solid #a1a1aa",
      paddingBottom: "4px",
      marginBottom: "10px",
    }}>
      {label}
    </div>
  );
}

function Th({ children, width }: { children: React.ReactNode; width?: string }) {
  return (
    <th style={{
      border: "1px solid #d4d4d8",
      padding: "7px 12px",
      textAlign: "left",
      fontSize: "10px",
      fontWeight: 700,
      letterSpacing: "0.1em",
      textTransform: "uppercase",
      color: "#71717a",
      background: "#f4f4f5",
      width: width ?? "auto",
    }}>
      {children}
    </th>
  );
}

function Td({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <td style={{
      border: "1px solid #d4d4d8",
      padding: "9px 12px",
      fontSize: "12px",
      verticalAlign: "top",
      lineHeight: "1.55",
      ...style,
    }}>
      {children}
    </td>
  );
}

function FillRow({ label, hint }: { label: string; hint?: string }) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#71717a", marginBottom: "8px" }}>
        {label}
      </div>
      <div style={{ borderBottom: "1.5px solid #3f3f46", minHeight: "32px" }} />
      {hint && <div style={{ fontSize: "10px", color: "#a1a1aa", marginTop: "4px" }}>{hint}</div>}
    </div>
  );
}

function SignatureBlock({ title }: { title: string }) {
  return (
    <div>
      <div style={{ fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "#71717a", marginBottom: "28px" }}>
        {title}
      </div>
      <div style={{ borderBottom: "1px solid #71717a", marginBottom: "5px" }} />
      <div style={{ fontSize: "11px", color: "#52525b", marginBottom: "20px" }}>Signature over Printed Name</div>
      <div style={{ display: "flex", gap: "36px" }}>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: "1px solid #71717a", marginBottom: "5px" }} />
          <div style={{ fontSize: "11px", color: "#52525b" }}>Date</div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: "1px solid #71717a", marginBottom: "5px" }} />
          <div style={{ fontSize: "11px", color: "#52525b" }}>Position / Title</div>
        </div>
      </div>
    </div>
  );
}
