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
    clinicalAssessment: number;
    communication: number;
    teamwork: number;
    professionalism: number;
  };
  comments: string[];
}

export const MsfPdfDocument = ({ data }: { data: MsfData }) => (
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
          <Text style={styles.label}>Clinical Assessment</Text>
          <Text style={styles.value}>{data.averages.clinicalAssessment.toFixed(1)} / 5.0</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Communication</Text>
          <Text style={styles.value}>{data.averages.communication.toFixed(1)} / 5.0</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Teamwork</Text>
          <Text style={styles.value}>{data.averages.teamwork.toFixed(1)} / 5.0</Text>
        </View>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 6 }}>
          <Text style={styles.label}>Professionalism</Text>
          <Text style={styles.value}>{data.averages.professionalism.toFixed(1)} / 5.0</Text>
        </View>
      </View>

      {data.comments && data.comments.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Anonymized Colleague Comments</Text>
          {data.comments.map((comment, index) => (
            <View key={index} style={styles.commentBox}>
              <Text style={styles.commentText}>"{comment}"</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.footer}>
        This document confirms the completion of an MSF cycle via Umbil. Individual anonymized comments and detailed radar charts are securely stored in the user's digital dashboard.
      </Text>
    </Page>
  </Document>
);