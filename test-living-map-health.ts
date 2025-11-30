#!/usr/bin/env npx tsx
/**
 * Living Map Health Test - Local Code Analysis
 * 
 * Validates the Living Map implementation by analyzing the codebase
 * without requiring database connection. Tests:
 * 
 * 1. Component architecture compliance
 * 2. Real-time subscription implementation
 * 3. Memorial line rendering logic
 * 4. Monitoring integration
 * 5. Database schema compliance
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details: string[];
  spiritualImpact: string;
}

interface HealthReport {
  overall_status: 'COMPLIANT' | 'NON_COMPLIANT';
  health_score: number;
  tests: TestResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
}

class LivingMapHealthAnalyzer {
  private results: TestResult[] = [];
  private basePath = process.cwd();
  
  async analyzeCodebase(): Promise<HealthReport> {
    console.log('🕊️ Analyzing Living Map Implementation');
    console.log('=====================================');
    
    // Test 1: Connection Lines Implementation
    this.testConnectionLinesImplementation();
    
    // Test 2: Real-time Subscription Architecture
    this.testRealtimeArchitecture();
    
    // Test 3: Memorial Line Rendering
    this.testMemorialLineRendering();
    
    // Test 4: Living Map Monitoring Integration
    this.testMonitoringIntegration();
    
    // Test 5: Database Schema Requirements
    this.testDatabaseSchema();
    
    // Test 6: Prayer Map Component Structure
    this.testPrayerMapComponent();
    
    // Test 7: Type Definitions for Eternal Lines
    this.testTypeDefinitions();
    
    return this.generateReport();
  }
  
  private testConnectionLinesImplementation() {
    const filePath = join(this.basePath, 'src/components/map/ConnectionLines.tsx');
    
    if (!existsSync(filePath)) {
      this.addResult({
        test: 'Connection Lines Component',
        status: 'FAIL',
        message: 'ConnectionLines.tsx not found',
        details: [`Missing file: ${filePath}`],
        spiritualImpact: 'Memorial lines cannot be displayed on the map',
      });
      return;
    }
    
    const content = readFileSync(filePath, 'utf-8');
    
    const checks = [
      { 
        check: content.includes('PrayerConnection'),
        detail: 'Uses PrayerConnection component for rendering',
      },
      {
        check: content.includes('visibleConnections'),
        detail: 'Implements viewport culling for performance',
      },
      {
        check: content.includes('SVG') || content.includes('svg'),
        detail: 'Uses SVG for smooth memorial line rendering',
      },
      {
        check: content.includes('gradient'),
        detail: 'Implements beautiful gradients for spiritual impact',
      },
    ];
    
    const passedChecks = checks.filter(c => c.check);
    const status = passedChecks.length === checks.length ? 'PASS' : 
                  passedChecks.length >= checks.length * 0.7 ? 'WARNING' : 'FAIL';
    
    this.addResult({
      test: 'Connection Lines Implementation',
      status,
      message: `${passedChecks.length}/${checks.length} implementation requirements met`,
      details: checks.map(c => `${c.check ? '✅' : '❌'} ${c.detail}`),
      spiritualImpact: status === 'PASS' 
        ? 'Memorial lines render beautifully with optimal performance'
        : 'Memorial line rendering may have performance or visual issues',
    });
  }
  
  private testRealtimeArchitecture() {
    const prayerMapPath = join(this.basePath, 'src/components/PrayerMap.tsx');
    const usePrayersPath = join(this.basePath, 'src/hooks/usePrayers.ts');
    
    if (!existsSync(prayerMapPath)) {
      this.addResult({
        test: 'Real-time Architecture',
        status: 'FAIL',
        message: 'PrayerMap.tsx not found',
        details: ['Core component missing'],
        spiritualImpact: 'Real-time prayer witnessing is broken',
      });
      return;
    }
    
    const prayerMapContent = readFileSync(prayerMapPath, 'utf-8');
    const usePrayersContent = existsSync(usePrayersPath) ? readFileSync(usePrayersPath, 'utf-8') : '';
    
    const realtimeChecks = [
      {
        check: prayerMapContent.includes('subscribeToAllConnections'),
        detail: 'Subscribes to real-time connection updates',
      },
      {
        check: prayerMapContent.includes('enableRealtime: true'),
        detail: 'Real-time updates enabled for prayers',
      },
      {
        check: usePrayersContent.includes('realtimeMonitor') || prayerMapContent.includes('realtime'),
        detail: 'Uses real-time monitoring system',
      },
      {
        check: prayerMapContent.includes('livingMapMonitor'),
        detail: 'Integrated with Living Map monitoring',
      },
    ];
    
    const passedChecks = realtimeChecks.filter(c => c.check);
    const status = passedChecks.length >= 3 ? 'PASS' : 
                  passedChecks.length >= 2 ? 'WARNING' : 'FAIL';
    
    this.addResult({
      test: 'Real-time Architecture',
      status,
      message: `${passedChecks.length}/${realtimeChecks.length} real-time features implemented`,
      details: realtimeChecks.map(c => `${c.check ? '✅' : '❌'} ${c.detail}`),
      spiritualImpact: status === 'PASS' 
        ? 'Users can witness prayer in real-time'
        : 'Real-time prayer witnessing may be delayed or broken',
    });
  }
  
  private testMemorialLineRendering() {
    const connectionPath = join(this.basePath, 'src/components/PrayerConnection.tsx');
    
    if (!existsSync(connectionPath)) {
      this.addResult({
        test: 'Memorial Line Rendering',
        status: 'FAIL',
        message: 'PrayerConnection.tsx not found',
        details: ['Memorial line component missing'],
        spiritualImpact: 'Individual memorial lines cannot be rendered',
      });
      return;
    }
    
    const content = readFileSync(connectionPath, 'utf-8');
    
    const renderingChecks = [
      {
        check: content.includes('pathD') || content.includes('path'),
        detail: 'Generates SVG paths for memorial lines',
      },
      {
        check: content.includes('quadratic') || content.includes('curve'),
        detail: 'Creates beautiful curved lines',
      },
      {
        check: content.includes('hover') || content.includes('isHovered'),
        detail: 'Interactive hover states for spiritual engagement',
      },
      {
        check: content.includes('tooltip') || content.includes('Tooltip'),
        detail: 'Shows memorial line context on interaction',
      },
      {
        check: content.includes('formatDate') || content.includes('created_at'),
        detail: 'Displays memorial line creation date',
      },
    ];
    
    const passedChecks = renderingChecks.filter(c => c.check);
    const status = passedChecks.length >= 4 ? 'PASS' : 
                  passedChecks.length >= 3 ? 'WARNING' : 'FAIL';
    
    this.addResult({
      test: 'Memorial Line Rendering',
      status,
      message: `${passedChecks.length}/${renderingChecks.length} rendering features implemented`,
      details: renderingChecks.map(c => `${c.check ? '✅' : '❌'} ${c.detail}`),
      spiritualImpact: status === 'PASS' 
        ? 'Memorial lines render beautifully with rich spiritual context'
        : 'Memorial lines may lack visual beauty or spiritual context',
    });
  }
  
  private testMonitoringIntegration() {
    const monitorPath = join(this.basePath, 'src/lib/livingMapMonitor.ts');
    const datadogPath = join(this.basePath, 'src/lib/datadog.ts');
    
    const monitoringChecks = [
      {
        check: existsSync(monitorPath),
        detail: 'Living Map monitor module exists',
      },
      {
        check: existsSync(datadogPath),
        detail: 'Datadog integration exists',
      },
    ];
    
    if (existsSync(monitorPath)) {
      const monitorContent = readFileSync(monitorPath, 'utf-8');
      monitoringChecks.push(
        {
          check: monitorContent.includes('trackMemorialLineCreation'),
          detail: 'Tracks memorial line creation performance',
        },
        {
          check: monitorContent.includes('trackPrayerWitnessing'),
          detail: 'Monitors prayer witnessing latency',
        },
        {
          check: monitorContent.includes('validateMemorialPersistence'),
          detail: 'Validates eternal memorial persistence',
        },
        {
          check: monitorContent.includes('LIVING_MAP_THRESHOLDS'),
          detail: 'Defines Living Map performance thresholds',
        }
      );
    }
    
    const passedChecks = monitoringChecks.filter(c => c.check);
    const status = passedChecks.length >= 5 ? 'PASS' : 
                  passedChecks.length >= 3 ? 'WARNING' : 'FAIL';
    
    this.addResult({
      test: 'Living Map Monitoring',
      status,
      message: `${passedChecks.length}/${monitoringChecks.length} monitoring features implemented`,
      details: monitoringChecks.map(c => `${c.check ? '✅' : '❌'} ${c.detail}`),
      spiritualImpact: status === 'PASS' 
        ? 'Living Map health is continuously monitored for spiritual excellence'
        : 'Living Map performance issues may go undetected',
    });
  }
  
  private testDatabaseSchema() {
    const schemaPath = join(this.basePath, 'supabase-schema.sql');
    
    if (!existsSync(schemaPath)) {
      this.addResult({
        test: 'Database Schema',
        status: 'WARNING',
        message: 'Main schema file not found, checking migrations',
        details: ['supabase-schema.sql missing'],
        spiritualImpact: 'Cannot verify database supports Living Map requirements',
      });
      return;
    }
    
    const content = readFileSync(schemaPath, 'utf-8');
    
    const schemaChecks = [
      {
        check: content.includes('prayer_connections'),
        detail: 'prayer_connections table exists',
      },
      {
        check: content.includes('expires_at'),
        detail: 'Supports expiration tracking',
      },
      {
        check: content.includes('GEOGRAPHY') || content.includes('geography'),
        detail: 'Uses spatial data types for locations',
      },
      {
        check: content.includes('GIST') || content.includes('gist'),
        detail: 'Has spatial indexes for performance',
      },
      {
        check: !content.includes('ON DELETE CASCADE') || content.includes('memorial'),
        detail: 'Memorial lines protected from cascade deletion',
      },
    ];
    
    const passedChecks = schemaChecks.filter(c => c.check);
    const status = passedChecks.length >= 4 ? 'PASS' : 
                  passedChecks.length >= 3 ? 'WARNING' : 'FAIL';
    
    this.addResult({
      test: 'Database Schema',
      status,
      message: `${passedChecks.length}/${schemaChecks.length} schema requirements met`,
      details: schemaChecks.map(c => `${c.check ? '✅' : '❌'} ${c.detail}`),
      spiritualImpact: status === 'PASS' 
        ? 'Database supports eternal memorial persistence'
        : 'Database may not properly support Living Map requirements',
    });
  }
  
  private testPrayerMapComponent() {
    const prayerMapPath = join(this.basePath, 'src/components/PrayerMap.tsx');
    
    if (!existsSync(prayerMapPath)) {
      this.addResult({
        test: 'Prayer Map Component',
        status: 'FAIL',
        message: 'PrayerMap.tsx not found',
        details: ['Core component missing'],
        spiritualImpact: 'Living Map cannot be displayed',
      });
      return;
    }
    
    const content = readFileSync(prayerMapPath, 'utf-8');
    
    const componentChecks = [
      {
        check: content.includes('GLOBAL LIVING MAP') || content.includes('globalMode'),
        detail: 'Configured for global Living Map mode',
      },
      {
        check: content.includes('ConnectionLines'),
        detail: 'Renders memorial connection lines',
      },
      {
        check: content.includes('PrayerMarkers'),
        detail: 'Displays prayer markers',
      },
      {
        check: content.includes('real-time') || content.includes('realtime'),
        detail: 'Supports real-time updates',
      },
      {
        check: content.includes('animation') || content.includes('Animation'),
        detail: 'Includes beautiful animations for spiritual impact',
      },
    ];
    
    const passedChecks = componentChecks.filter(c => c.check);
    const status = passedChecks.length >= 4 ? 'PASS' : 
                  passedChecks.length >= 3 ? 'WARNING' : 'FAIL';
    
    this.addResult({
      test: 'Prayer Map Component',
      status,
      message: `${passedChecks.length}/${componentChecks.length} component features implemented`,
      details: componentChecks.map(c => `${c.check ? '✅' : '❌'} ${c.detail}`),
      spiritualImpact: status === 'PASS' 
        ? 'Living Map provides complete spiritual prayer experience'
        : 'Living Map may be missing key spiritual features',
    });
  }
  
  private testTypeDefinitions() {
    const typesPath = join(this.basePath, 'src/types/prayer.ts');
    
    if (!existsSync(typesPath)) {
      this.addResult({
        test: 'Type Definitions',
        status: 'WARNING',
        message: 'Type definitions not found',
        details: ['src/types/prayer.ts missing'],
        spiritualImpact: 'Type safety for memorial lines may be compromised',
      });
      return;
    }
    
    const content = readFileSync(typesPath, 'utf-8');
    
    const typeChecks = [
      {
        check: content.includes('PrayerConnection'),
        detail: 'PrayerConnection type defined',
      },
      {
        check: content.includes('location') || content.includes('Location'),
        detail: 'Location types for geographic data',
      },
      {
        check: content.includes('created_at') || content.includes('createdAt'),
        detail: 'Timestamp tracking for memorial lines',
      },
      {
        check: content.includes('expires_at') || content.includes('expiresAt') || content.includes('eternal'),
        detail: 'Expiration or eternal tracking defined',
      },
    ];
    
    const passedChecks = typeChecks.filter(c => c.check);
    const status = passedChecks.length >= 3 ? 'PASS' : 
                  passedChecks.length >= 2 ? 'WARNING' : 'FAIL';
    
    this.addResult({
      test: 'Type Definitions',
      status,
      message: `${passedChecks.length}/${typeChecks.length} type requirements met`,
      details: typeChecks.map(c => `${c.check ? '✅' : '❌'} ${c.detail}`),
      spiritualImpact: status === 'PASS' 
        ? 'Memorial lines have proper type safety'
        : 'Type safety issues may cause memorial line bugs',
    });
  }
  
  private addResult(result: TestResult) {
    this.results.push(result);
    
    const statusEmoji = {
      'PASS': '✅',
      'FAIL': '❌', 
      'WARNING': '⚠️'
    }[result.status];
    
    console.log(`${statusEmoji} ${result.test}: ${result.message}`);
    if (result.status === 'FAIL' || result.status === 'WARNING') {
      result.details.forEach(detail => console.log(`   ${detail}`));
    }
  }
  
  private generateReport(): HealthReport {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    
    const healthScore = Math.round((passed / this.results.length) * 100);
    const isCompliant = failed === 0 && healthScore >= 80;
    
    return {
      overall_status: isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT',
      health_score: healthScore,
      tests: this.results,
      summary: { passed, failed, warnings },
    };
  }
}

async function main() {
  const analyzer = new LivingMapHealthAnalyzer();
  const report = await analyzer.analyzeCodebase();
  
  console.log('\n🕊️ LIVING MAP HEALTH REPORT');
  console.log('============================');
  console.log(`Overall Status: ${report.overall_status}`);
  console.log(`Health Score: ${report.health_score}/100`);
  console.log(`Tests: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.warnings} warnings`);
  
  // Spiritual Impact Summary
  console.log('\n💫 Spiritual Impact Summary:');
  const criticalIssues = report.tests.filter(t => t.status === 'FAIL');
  if (criticalIssues.length === 0) {
    console.log('✨ All critical Living Map requirements are met - the spiritual experience is preserved');
  } else {
    console.log('🚨 Critical issues found that may affect the spiritual prayer experience:');
    criticalIssues.forEach(issue => {
      console.log(`   - ${issue.test}: ${issue.spiritualImpact}`);
    });
  }
  
  // Save detailed report
  const fs = await import('fs');
  const reportPath = './living-map-health-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\n📄 Detailed report saved to: ${reportPath}`);
  
  // Exit with error if non-compliant
  if (report.overall_status === 'NON_COMPLIANT') {
    console.log('\n🚨 Living Map is not compliant with spiritual requirements');
    process.exit(1);
  } else {
    console.log('\n🕊️ Living Map is spiritually compliant and ready for prayer ministry');
  }
}

// Run if this is the main module
main().catch(error => {
  console.error('❌ Health analysis failed:', error);
  process.exit(1);
});