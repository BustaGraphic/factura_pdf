<div style={{ maxWidth: 900, margin: "40px auto", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: 24, marginBottom: 12 }}>Generar PDF</h1>

      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <input
          type="text"
          value={name}
          placeholder="Escribe tu nombre…"
          onChange={(e) => setName(e.target.value)}
          style={{
            width: 260,
            padding: "10px 12px",
            fontSize: 16,
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            outline: "none",
          }}
        />
        <input type="text" value={name}  />
        <button
          onClick={handlePreview}
          disabled={loadingPreview}
          style={{
            padding: "10px 14px",
            fontSize: 15,
            fontWeight: 600,
            background: loadingPreview ? "#64748b" : "#0ea5e9",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: loadingPreview ? "not-allowed" : "pointer",
          }}
        >
          {loadingPreview ? "Generando preview..." : "Preview PDF"}
        </button>
        <button
          onClick={handleDownload}
          disabled={loadingDownload}
          style={{
            padding: "10px 14px",
            fontSize: 15,
            fontWeight: 600,
            background: loadingDownload ? "#64748b" : "#16a34a",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: loadingDownload ? "not-allowed" : "pointer",
          }}
        >
          {loadingDownload ? "Preparando..." : "Descargar PDF"}
        </button>
      </div>

      {errorMsg && (
        <p style={{ color: "#ef4444", marginTop: 10 }}>{errorMsg}</p>
      )}

      {pdfUrl && (
        <div style={{ marginTop: 20 }}>
          <iframe
            src={pdfUrl}
            title="preview"
            style={{ width: "100%", height: "80vh", border: "1px solid #e2e8f0" }}
          />
        </div>
      )}

     
    </div>