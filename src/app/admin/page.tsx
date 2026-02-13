// src/app/admin/page.tsx
"use client";

import { useState, useEffect } from "react";

export default function AdminIngestionPage() {
	// Mode: 'ingest' or 'manage'
	const [activeTab, setActiveTab] = useState<"ingest" | "manage">("ingest");

	// --- INGESTION STATE ---
	const [inputMode, setInputMode] = useState<"text" | "url">("url");
	const [text, setText] = useState("");
	const [url, setUrl] = useState("");
	const [source, setSource] = useState("");
	const [password, setPassword] = useState("");
	const [rewrittenDraft, setRewrittenDraft] = useState("");
	
	// --- MANAGEMENT STATE ---
	const [recentSources, setRecentSources] = useState<string[]>([]);
	const [deleteTarget, setDeleteTarget] = useState("");

	// --- SHARED STATE ---
	const [status, setStatus] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);

	// STEP 1: Generate Draft (Scrape + Rewrite)
	const handleGenerateDraft = async () => {
		if (password !== "umbilYedmin#55739") {
			setStatus("❌ Wrong admin password.");
			return;
		}
		if (!source.trim()) {
			setStatus("❌ Source name is required.");
			return;
		}
		if (inputMode === "text" && !text.trim()) {
			setStatus("❌ Please paste text.");
			return;
		}
		if (inputMode === "url" && !url.trim()) {
			setStatus("❌ Please enter a URL.");
			return;
		}

		setLoading(true);
		setStatus("⏳ Scraping & Generating Draft (GPT-4o)...");
		setRewrittenDraft("");

		try {
			const payload = {
				source,
				preview: true, // IMPORTANT: Flag to only return draft
				text: inputMode === "text" ? text : undefined,
				url: inputMode === "url" ? url : undefined,
			};

			const response = await fetch("/api/admin/ingestion", {
				method: "POST",
				headers: { "Content-Type": "application/json"},
				body: JSON.stringify(payload),
			});

			const data = await response.json();

			if (!response.ok) throw new Error(data.error || "Failed to generate draft");
			
			setRewrittenDraft(data.rewrittenContent);
			setStatus("✅ Draft Generated! Please review below before saving.");
		} catch (err: any) {
			console.error(err);
			setStatus(`❌ Error: ${err.message}`);
		} finally {
			setLoading(false);
		}
	};

	// STEP 2: Save to Database
	const handleConfirmSave = async () => {
		if (!rewrittenDraft.trim()) return;

		setLoading(true);
		setStatus("⏳ Chunking, Embedding & Saving to DB...");

		try {
			const response = await fetch("/api/admin/ingestion", {
				method: "POST",
				headers: { "Content-Type": "application/json"},
				body: JSON.stringify({
					source,
					preview: false, // Save mode
					text: rewrittenDraft, // We send the EDITED draft
					url: inputMode === "url" ? url : undefined
				}),
			});

			const data = await response.json();
			if (!response.ok) throw new Error(data.error);

			setStatus(`🎉 Success! Saved ${data.chunksProcessed} chunks to Knowledge Base.`);
			
			// Reset form
			setRewrittenDraft("");
			setText("");
			setUrl("");
			setSource("");
		} catch (err: any) {
			setStatus(`❌ Save Error: ${err.message}`);
		} finally {
			setLoading(false);
		}
	};

	// --- MANAGEMENT FUNCTIONS ---
	const fetchSources = async () => {
		if (password !== "umbilYedmin#55739") {
			setStatus("❌ Enter Admin Password first.");
			return;
		}
		setLoading(true);
		try {
			const res = await fetch("/api/admin/ingestion");
			const data = await res.json();
			if (data.sources) setRecentSources(data.sources);
		} catch (e) {
			console.error(e);
		} finally {
			setLoading(false);
		}
	};

	const handleDelete = async () => {
		if (!deleteTarget.trim()) return;
		if (!confirm(`Are you sure you want to delete ALL chunks for source: "${deleteTarget}"?`)) return;

		setLoading(true);
		setStatus(`⏳ Deleting "${deleteTarget}"...`);

		try {
			const res = await fetch(`/api/admin/ingestion?source=${encodeURIComponent(deleteTarget)}`, {
				method: "DELETE"
			});
			const data = await res.json();
			if (!res.ok) throw new Error(data.error);

			setStatus(`🗑️ Deleted! ${data.message}`);
			setDeleteTarget("");
			fetchSources(); // Refresh list
		} catch (err: any) {
			setStatus(`❌ Delete Error: ${err.message}`);
		} finally {
			setLoading(false);
		}
	};

	return (
    <section className="main-content">
      <div className="container" style={{ maxWidth: "900px", marginTop: "40px", paddingBottom: "100px" }}>
        <h2 style={{ marginBottom: "24px" }}>Admin: Clinical Knowledge Base</h2>

        <div className="card">
          <div className="card__body">
            
            {/* --- AUTH --- */}
            <div className="form-group">
              <label className="form-label">Admin Password</label>
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

			{/* --- TABS --- */}
			<div style={{ display: "flex", gap: "10px", marginBottom: "20px", borderBottom: "1px solid #e5e7eb", paddingBottom: "10px" }}>
				<button 
					className={`btn ${activeTab === 'ingest' ? 'btn--primary' : 'btn--secondary'}`}
					onClick={() => setActiveTab('ingest')}
				>
					➕ Add New Content
				</button>
				<button 
					className={`btn ${activeTab === 'manage' ? 'btn--primary' : 'btn--secondary'}`}
					onClick={() => { setActiveTab('manage'); fetchSources(); }}
				>
					🗑️ Manage / Delete
				</button>
			</div>

			{/* ================= INGESTION TAB ================= */}
			{activeTab === 'ingest' && (
				<>
					{/* --- METADATA --- */}
					<div className="form-group">
					<label className="form-label">Source Name (Citation)</label>
					<input
						className="form-control"
						value={source}
						onChange={(e) => setSource(e.target.value)}
						placeholder="e.g. NICE NG188: Sore Throat (2024)"
					/>
					</div>

					{/* --- INPUT TOGGLE --- */}
					<div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
					<button 
						className={`btn ${inputMode === "url" ? "btn--primary" : "btn--secondary"}`}
						onClick={() => { setInputMode("url"); setRewrittenDraft(""); }}
					>
						🌍 From URL
					</button>
					<button 
						className={`btn ${inputMode === "text" ? "btn--primary" : "btn--secondary"}`}
						onClick={() => { setInputMode("text"); setRewrittenDraft(""); }}
					>
						📝 Paste Text
					</button>
					</div>

					{/* --- INPUT FIELDS --- */}
					{inputMode === "url" ? (
					<div className="form-group">
						<label className="form-label">Guideline URL</label>
						<input
						className="form-control"
						value={url}
						onChange={(e) => setUrl(e.target.value)}
						placeholder="https://bnf.nice.org.uk/drugs/..."
						/>
					</div>
					) : (
					<div className="form-group">
						<label className="form-label">Raw Text / PDF Content</label>
						<textarea
						className="form-control"
						rows={8}
						value={text}
						onChange={(e) => setText(e.target.value)}
						placeholder="Paste text here..."
						/>
					</div>
					)}

					{/* --- ACTION 1: GENERATE DRAFT --- */}
					{!rewrittenDraft && (
					<button
						className="btn btn--primary"
						onClick={handleGenerateDraft}
						disabled={loading}
						style={{ width: "100%", marginTop: "12px" }}
					>
						{loading ? "Processing..." : "✨ 1. Generate Draft Rewrite"}
					</button>
					)}

					{/* --- REVIEW & SAVE AREA --- */}
					{rewrittenDraft && (
					<div style={{ marginTop: "32px", borderTop: "2px solid #e5e7eb", paddingTop: "24px" }}>
						<h3 style={{color: "#dc2626", marginBottom: "8px"}}>⚠️ SAFETY CHECK REQUIRED</h3>
						<p style={{marginBottom: "16px", fontSize: "0.95rem", color: "#4b5563"}}>
						Please verify that the AI-rewritten text matches the clinical facts of the source exactly.
						You can edit the text below before saving.
						</p>

						<textarea
						className="form-control"
						style={{ 
							minHeight: "500px", 
							fontFamily: "system-ui, -apple-system, sans-serif", 
							fontSize: "16px", 
							lineHeight: "1.6",
							padding: "20px",
							border: "2px solid #e5e7eb",
							borderRadius: "8px",
							boxShadow: "inset 0 2px 4px 0 rgba(0, 0, 0, 0.05)"
						}}
						value={rewrittenDraft}
						onChange={(e) => setRewrittenDraft(e.target.value)}
						/>

						<div style={{ display: "flex", gap: "12px", marginTop: "20px" }}>
						<button
							className="btn btn--secondary"
							onClick={() => setRewrittenDraft("")}
							disabled={loading}
						>
							❌ Cancel / Start Over
						</button>
						<button
							className="btn btn--primary"
							onClick={handleConfirmSave}
							disabled={loading}
							style={{ flex: 1, backgroundColor: "#047857" }} 
						>
							{loading ? "Saving..." : "✅ I HAVE VERIFIED & SAVE TO DB"}
						</button>
						</div>
					</div>
					)}
				</>
			)}

			{/* ================= MANAGEMENT TAB ================= */}
			{activeTab === 'manage' && (
				<div style={{ marginTop: "20px" }}>
					<div className="form-group">
						<label className="form-label">Delete Source (Exact Name)</label>
						<div style={{ display: "flex", gap: "10px" }}>
							<input
								className="form-control"
								value={deleteTarget}
								onChange={(e) => setDeleteTarget(e.target.value)}
								placeholder="Paste exact source name here..."
							/>
							<button 
								className="btn" 
								style={{ backgroundColor: "#dc2626", color: "white" }}
								onClick={handleDelete}
								disabled={loading}
							>
								{loading ? "..." : "DELETE"}
							</button>
						</div>
					</div>

					<h3 style={{ marginTop: "30px", fontSize: "1.1rem" }}>Recent Sources in DB</h3>
					<div style={{ 
						background: "#f9fafb", 
						padding: "15px", 
						borderRadius: "8px", 
						border: "1px solid #e5e7eb",
						maxHeight: "300px",
						overflowY: "auto"
					}}>
						{recentSources.length === 0 ? (
							<p style={{ color: "#6b7280" }}>No sources found (or click 'Manage' tab again to refresh).</p>
						) : (
							<ul style={{ paddingLeft: "20px", margin: 0 }}>
								{recentSources.map((s, i) => (
									<li key={i} style={{ marginBottom: "8px" }}>
										<span style={{ fontWeight: 500 }}>{s}</span>
										<button 
											style={{ 
												marginLeft: "10px", 
												fontSize: "0.8rem", 
												color: "#dc2626", 
												background: "none", 
												border: "none", 
												cursor: "pointer", 
												textDecoration: "underline" 
											}}
											onClick={() => setDeleteTarget(s)}
										>
											(Select)
										</button>
									</li>
								))}
							</ul>
						)}
					</div>
				</div>
			)}

            {/* --- STATUS BAR --- */}
            {status && (
              <div style={{ 
                marginTop: "16px", padding: "12px", borderRadius: "8px", 
                backgroundColor: status.startsWith("❌") ? "#fef2f2" : status.startsWith("🗑️") ? "#fff1f2" : "#ecfdf5",
                color: status.startsWith("❌") ? "#dc2626" : status.startsWith("🗑️") ? "#be123c" : "#047857",
                fontWeight: 600, whiteSpace: "pre-wrap"
              }}>
                {status}
              </div>
            )}

          </div>
        </div>
      </div>
    </section>
  );
}