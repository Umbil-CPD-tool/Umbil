import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import { CPDEntry } from "@/lib/store";

// --- HELPERS ---

// Deduce Domain
export const getDomain = (tags: string[] | undefined) => {
  const t = (tags || []).join(" ").toLowerCase();
  if (t.includes("safety") || t.includes("quality")) return "Safety & Quality";
  if (t.includes("communication") || t.includes("teamwork")) return "Communication, Partnership & Teamwork";
  if (t.includes("trust")) return "Maintaining Trust";
  return "Knowledge, Skills & Performance";
};

// Parse **Bold** Syntax
const parseBold = (text: string) => {
  if (!text) return "";
  const parts = text.split(/\*\*(.*?)\*\*/g);
  return parts.map((part, index) => {
    if (index % 2 === 1) {
      return <Text key={index} style={{ fontFamily: 'Helvetica-Bold' }}>{part}</Text>;
    }
    return <Text key={index}>{part}</Text>;
  });
};

// Render Table Block with Fix for Bunched Text
const renderTable = (lines: string[]) => {
  const contentRows = lines.filter(line => !/^[|\s-:]+$/.test(line.replace(/\|/g, '').trim()));
  
  return (
    <View style={styles.table}>
      {contentRows.map((row, rowIndex) => {
        const cells = row.split('|').filter((_, idx, arr) => 
            !(idx === 0 && _.trim() === '') && !(idx === arr.length - 1 && _.trim() === '')
        );

        const isHeader = rowIndex === 0;

        return (
          <View 
            key={rowIndex} 
            style={[
              styles.tableRow, 
              isHeader ? styles.tableHeaderRow : {}
            ]}
          >
            {cells.map((cell, cellIndex) => (
              <View key={cellIndex} style={styles.tableCell}>
                <Text 
                  style={[
                    styles.tableCellText, 
                    isHeader ? styles.tableHeaderText : {}
                  ]}
                >
                  {parseBold(cell.trim())}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
    </View>
  );
};

// Main Markdown Parser
const renderMarkdown = (text: string) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let tableBuffer: string[] = [];

  const flushTable = () => {
    if (tableBuffer.length > 0) {
      elements.push(renderTable(tableBuffer));
      tableBuffer = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('|')) {
      tableBuffer.push(trimmed);
      return; 
    } else {
      flushTable();
    }

    if (!trimmed) return;

    if (trimmed.startsWith('### ')) {
      elements.push(<Text key={index} style={styles.h3}>{parseBold(trimmed.replace('### ', ''))}</Text>);
    } else if (trimmed.startsWith('## ')) {
      elements.push(<Text key={index} style={styles.h2}>{parseBold(trimmed.replace('## ', ''))}</Text>);
    } else if (trimmed.startsWith('# ')) {
      elements.push(<Text key={index} style={styles.h1}>{parseBold(trimmed.replace('# ', ''))}</Text>);
    } 
    else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
       elements.push(
         <View key={index} style={{ flexDirection: 'row', marginBottom: 2 }}>
           <Text style={{ width: 10, fontSize: 11 }}>•</Text>
           <Text style={styles.content}>{parseBold(trimmed.substring(2))}</Text>
         </View>
       );
    }
    else {
      elements.push(<Text key={index} style={styles.content}>{parseBold(trimmed)}</Text>);
    }
  });

  flushTable();
  return elements;
};

// --- STYLES ---
const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica', fontSize: 11, lineHeight: 1.5, color: '#334155' },
  header: { marginBottom: 20, borderBottom: '2px solid #0e7490', paddingBottom: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
  brand: { fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 },
  date: { fontSize: 12, fontWeight: 'bold', color: '#0e7490' },
  titleSection: { marginBottom: 20 },
  label: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold', marginBottom: 4 },
  question: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#0f172a', marginBottom: 8 },
  
  metaRow: { flexDirection: 'row', marginBottom: 20, gap: 20, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', paddingVertical: 8 },
  metaItem: { flexDirection: 'column' },
  metaValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a' },

  section: { marginBottom: 15 },
  content: { fontSize: 11, textAlign: 'justify', color: '#334155', marginBottom: 6 },
  h1: { fontSize: 14, fontFamily: 'Helvetica-Bold', marginTop: 10, marginBottom: 6, color: '#0f172a' },
  h2: { fontSize: 13, fontFamily: 'Helvetica-Bold', marginTop: 8, marginBottom: 5, color: '#1e293b' },
  h3: { fontSize: 11, fontFamily: 'Helvetica-Bold', marginTop: 6, marginBottom: 4, textTransform: 'uppercase', color: '#475569' },

  // Table Fix: Using flex-basis: 0 and flex-grow: 1 ensures cells distribute evenly and wrap correctly
  table: { display: 'flex', width: '100%', borderStyle: 'solid', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, marginTop: 10, marginBottom: 10 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', minHeight: 25, alignItems: 'center' },
  tableHeaderRow: { backgroundColor: '#f1f5f9' },
  tableCell: { padding: 8, flexGrow: 1, flexBasis: 0 },
  tableCellText: { fontSize: 9, flexWrap: 'wrap' },
  tableHeaderText: { fontFamily: 'Helvetica-Bold', color: '#334155' },

  reflectionBox: { marginTop: 20, padding: 15, backgroundColor: '#f0fdf4', borderLeft: '3px solid #16a34a', borderRadius: 4 },
  reflectionText: { fontStyle: 'italic', color: '#14532d' },
  
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#cbd5e1', borderTop: '1px solid #f1f5f9', paddingTop: 10 }
});

interface CpdPdfProps {
  entry: CPDEntry;
}

export const CpdPdfDocument = ({ entry }: CpdPdfProps) => {
  const domain = getDomain(entry.tags);
  const duration = entry.duration || 10;
  const credits = (duration / 60).toFixed(2);
  const dateStr = new Date(entry.timestamp).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.date}>{dateStr}</Text>
          <Text style={styles.brand}>Umbil Learning Log</Text>
        </View>

        {/* Title */}
        <View style={styles.titleSection}>
          <Text style={styles.label}>Learning Activity</Text>
          <Text style={styles.question}>{entry.question}</Text>
        </View>

        {/* Meta Data */}
        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Text style={styles.label}>GMC Domain</Text>
            <Text style={styles.metaValue}>{domain}</Text>
          </View>
          <View style={styles.metaItem}>
             <Text style={styles.label}>Credits (Hours)</Text>
             <Text style={styles.metaValue}>{credits} ({duration} mins)</Text>
          </View>
          <View style={styles.metaItem}>
             <Text style={styles.label}>Type</Text>
             <Text style={styles.metaValue}>{(entry.tags || []).join(", ") || "General"}</Text>
          </View>
        </View>

        {/* Content */}
        <View style={styles.section}>
          <Text style={styles.label}>Description & Outcome</Text>
          <View>{renderMarkdown(entry.answer)}</View>
        </View>

        {/* Reflection */}
        {entry.reflection && (
          <View style={styles.reflectionBox}>
            <Text style={{...styles.label, color: '#166534', marginBottom: 5}}>Reflection</Text>
            <View>{renderMarkdown(entry.reflection)}</View>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <Text>Generated by Umbil • Verified Learning Entry • {entry.id}</Text>
        </View>

      </Page>
    </Document>
  );
};