// src/app/pdp/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { PDPGoal, getPDP, addPDP, deletePDP, getCPD, CPDEntry } from "@/lib/store"; 
import { useUserEmail } from "@/hooks/useUserEmail";

function PDPInner() {
  const [goals, setGoals] = useState<PDPGoal[]>([]);
  const [cpdEntries, setCpdEntries] = useState<CPDEntry[]>([]);
  const [title, setTitle] = useState("");
  const [timeline, setTimeline] = useState("3 months");
  const [activities, setActivities] = useState("");
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const [pdpData, cpdData] = await Promise.all([getPDP(), getCPD()]);
      setGoals(pdpData);
      setCpdEntries(cpdData);
      setLoading(false);
    };
    fetchData();
  }, []);

  const add = async () => {
    if (!title.trim()) return;
    setSaving(true);
    
    const activitiesList = activities.split("\n").filter(Boolean);
    
    const { data, error } = await addPDP({
        title,
        timeline,
        activities: activitiesList
    });

    if (error) {
        alert("Failed to save goal.");
        console.error(error);
    } else if (data) {
        setGoals([data, ...goals]);
        setTitle(""); 
        setTimeline("3 months"); 
        setActivities("");
    }
    setSaving(false);
  };

  const remove = async (id: string) => {
    if(!confirm("Delete this goal?")) return;
    
    const previousGoals = [...goals];
    setGoals(goals.filter((g) => g.id !== id));

    const { error } = await deletePDP(id);
    if (error) {
        alert("Failed to delete goal.");
        setGoals(previousGoals);
    }
  };

  const suggestedGoals = useMemo(() => {
    const tagCounts = cpdEntries.flatMap(entry => entry.tags || []).reduce((acc, tag) => {
      acc[tag] = (acc[tag] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(tagCounts)
      .filter(([, count]) => count >= 7) 
      .map(([tag]) => `Strengthen knowledge in ${tag}`);
  }, [cpdEntries]);

  if (loading) return (
      <section className="main-content">
        <div className="container"><p>Loading your PDP...</p></div>
      </section>
  );

  return (
    <section className="main-content">
      <div className="container">
        <h1 style={{ marginBottom: 24 }}>Personal Development Plan</h1>

        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card__body">
            <h3 style={{ marginBottom: 16 }}>Add a New Goal</h3>
            <div className="form-group">
              <label className="form-label">Goal title</label>
              <input
                className="form-control"
                value={title}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setTitle(e.target.value)}
                placeholder="e.g., Strengthen COPD management"
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Timeline</label>
              <select
                className="form-control"
                value={timeline}
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setTimeline(e.target.value)}
                disabled={saving}
              >
                <option>1 month</option>
                <option>3 months</option>
                <option>6 months</option>
                <option>12 months</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Planned activities (one per line)</label>
              <textarea
                className="form-control"
                rows={4}
                value={activities}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setActivities(e.target.value)}
                // FIX: Using JS string literal for proper newline rendering
                placeholder={`Attend COPD guideline update webinar\nShadow respiratory clinic\nAudit rescue packs`}
                disabled={saving}
              />
            </div>
            <button className="btn btn--primary" onClick={add} disabled={saving}>
                {saving ? "Saving..." : "➕ Add goal"}
            </button>
          </div>
        </div>

        {suggestedGoals.length > 0 && (
          <div className="card" style={{ marginBottom: 32 }}> 
            <div className="card__body">
              <h3 style={{ marginBottom: 12 }}>Suggested Goals (Based on your CPD)</h3>
              {suggestedGoals.map((sg, idx) => (
                <button
                  key={idx}
                  className="btn btn--outline"
                  style={{ marginRight: 8, marginBottom: 8 }}
                  onClick={() => setTitle(sg)}
                >
                  {sg}
                </button>
              ))}
            </div>
          </div>
        )}

        <h3 style={{ marginBottom: 16 }}>Current Goals</h3> 
        <div style={{ marginBottom: 40 }}> 
          {goals.length === 0 && <div className="card"><div className="card__body">You haven&apos;t added any goals yet.</div></div>}
          {goals.map((g) => (
            <div key={g.id} className="card pdp-goal" style={{ marginBottom: 20 }}> 
              <div className="card__body" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '0.5rem' }}>{g.title}</h3>
                    <div style={{ fontSize: '0.9rem', color: 'var(--umbil-muted)' }}>Target: {g.timeline}</div>
                  </div>
                  <button className="btn btn--outline" onClick={() => remove(g.id)}>Remove</button>
                </div>
                <h4 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem', fontWeight: 600 }}>Planned Activities:</h4>
                <ul style={{ listStyleType: 'disc', paddingLeft: '1.5rem' }}>
                  {g.activities.map((a, i) => <li key={i} style={{ marginBottom: '0.5rem' }}>{a}</li>)}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export default function PDPPage() {
  const { email, loading } = useUserEmail();

  if (loading) return null;
  if (!email) {
    return (
      <section className="main-content">
        <div className="container">
          <div className="card"><div className="card__body">Please <a href="/auth" className="link">sign in</a> to view this page.</div></div>
        </div>
      </section>
    );
  }

  return <PDPInner />;
}