import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { 
    padding: 40, 
    fontFamily: 'Helvetica', 
    backgroundColor: '#ffffff' 
  },
  header: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 30, 
    borderBottom: '2px solid #1fb8cd', 
    paddingBottom: 15 
  },
  title: { 
    fontSize: 24, 
    color: '#0f172a', 
    fontWeight: 'bold',
    marginBottom: 4
  },
  subtitle: { 
    fontSize: 12, 
    color: '#64748b' 
  },
  brandText: { 
    fontSize: 14, 
    color: '#1fb8cd', 
    fontWeight: 'bold',
    textAlign: 'right',
    marginBottom: 4
  },
  section: { 
    marginBottom: 24, 
    backgroundColor: '#f8fafc', 
    padding: 16, 
    borderRadius: 8,
    border: '1px solid #e2e8f0'
  },
  sectionTitle: { 
    fontSize: 14, 
    color: '#0f172a', 
    marginBottom: 12, 
    fontWeight: 'bold', 
    borderBottom: '1px solid #cbd5e1', 
    paddingBottom: 6 
  },
  row: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    paddingVertical: 6, 
    borderBottom: '1px solid #e2e8f0' 
  },
  label: { 
    fontSize: 11, 
    color: '#475569' 
  },
  value: { 
    fontSize: 11, 
    color: '#0f172a', 
    fontWeight: 'bold' 
  },
  commentCategory: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#0f172a',
    marginTop: 8,
    marginBottom: 4
  },
  commentBox: { 
    backgroundColor: '#ffffff', 
    padding: 12, 
    borderRadius: 6, 
    marginBottom: 8,
    borderLeft: '3px solid #1fb8cd'
  },
  commentText: { 
    fontSize: 10, 
    color: '#334155', 
    fontStyle: 'italic', 
    lineHeight: 1.5 
  },
  footer: { 
    position: 'absolute', 
    bottom: 30, 
    left: 40, 
    right: 40, 
    textAlign: 'center', 
    fontSize: 9, 
    color: '#94a3b8', 
    borderTop: '1px solid #e2e8f0', 
    paddingTop: 10 
  }
});

export interface MsfData {
  cycleDate: string;
  responseCount: number;
  status: string;
  averages: {
    domain1: number;
    domain2: number;
    domain3: number;
    domain4: number;
  };
  textFeedback: Array<{
    strengths: string;
    example: string;
    improve: string;
    additional: string;
  }>;
}

export const MsfPdfDocument = ({ data }: { data: MsfData }) => {
  const strengths = data.textFeedback.filter(f => f.strengths).map(f => f.strengths);
  const examples = data.textFeedback.filter(f => f.example).map(f => f.example);
  const improves = data.textFeedback.filter(f => f.improve).map(f => f.improve);
  const additionals = data.textFeedback.filter(f => f.additional).map(f => f.additional);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Multi-Source Feedback</Text>
            <Text style={styles.subtitle}>Cycle Report</Text>
          </View>
          <View>
            <Text style={styles.brandText}>Umbil Appraisals</Text>
            <Text style={styles.subtitle}>{data.cycleDate}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Cycle Details</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Date of Generation</Text>
            <Text style={styles.value}>{data.cycleDate}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Responses Gathered</Text>
            <Text style={styles.value}>{data.responseCount} (Anonymity Threshold Met)</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Cycle Status</Text>
            <Text style={{ ...styles.value, color: '#1fb8cd' }}>{data.status}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Aggregated Domain Scores (Out of 5)</Text>
          <View style={styles.row}>
            <Text style={styles.label}>Domain 1: Knowledge, Skills & Performance</Text>
            <Text style={styles.value}>{data.averages.domain1.toFixed(1)} / 5.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Domain 2: Safety & Quality</Text>
            <Text style={styles.value}>{data.averages.domain2.toFixed(1)} / 5.0</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.label}>Domain 3: Communication & Teamwork</Text>
            <Text style={styles.value}>{data.averages.domain3.toFixed(1)} / 5.0</Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 }}>
            <Text style={styles.label}>Domain 4: Maintaining Trust</Text>
            <Text style={styles.value}>{data.averages.domain4.toFixed(1)} / 5.0</Text>
          </View>
        </View>

        {data.textFeedback && data.textFeedback.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Anonymized Colleague Comments</Text>
            
            {strengths.length > 0 && (
              <View>
                <Text style={styles.commentCategory}>Greatest Strengths</Text>
                {strengths.map((text, i) => (
                  <View key={`s-${i}`} style={styles.commentBox}><Text style={styles.commentText}>"{text}"</Text></View>
                ))}
              </View>
            )}

            {examples.length > 0 && (
              <View>
                <Text style={styles.commentCategory}>Examples of Good Practice</Text>
                {examples.map((text, i) => (
                  <View key={`e-${i}`} style={styles.commentBox}><Text style={styles.commentText}>"{text}"</Text></View>
                ))}
              </View>
            )}

            {improves.length > 0 && (
              <View>
                <Text style={styles.commentCategory}>Areas for Development</Text>
                {improves.map((text, i) => (
                  <View key={`i-${i}`} style={styles.commentBox}><Text style={styles.commentText}>"{text}"</Text></View>
                ))}
              </View>
            )}

            {additionals.length > 0 && (
              <View>
                <Text style={styles.commentCategory}>Additional Comments</Text>
                {additionals.map((text, i) => (
                  <View key={`a-${i}`} style={styles.commentBox}><Text style={styles.commentText}>"{text}"</Text></View>
                ))}
              </View>
            )}
          </View>
        )}

        <Text style={styles.footer}>
          This document confirms the completion of an MSF cycle via Umbil. Individual anonymized comments and detailed charts are securely stored in the user's digital dashboard.
        </Text>
      </Page>
    </Document>
  );
};