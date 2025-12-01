#!/usr/bin/env ts-node

/**
 * NOTIFICATION SYSTEM TEST RUNNER
 * 
 * PURPOSE: Execute comprehensive notification tests and generate detailed reports
 * USAGE: npm run test:notifications or npx ts-node e2e/run-notification-tests.ts
 * 
 * FEATURES:
 * - Systematic test execution with proper sequencing
 * - Detailed failure analysis and debugging information
 * - Performance metrics and timing analysis
 * - Reproducible test scenarios with cleanup
 * - Comprehensive reporting with actionable insights
 */

import { execSync } from 'child_process';
import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface TestResult {
  name: string;
  status: 'passed' | 'failed' | 'skipped';
  duration: number;
  error?: string;
  details?: string[];
  screenshots?: string[];
}

interface TestReport {
  timestamp: string;
  environment: {
    nodeVersion: string;
    playwrightVersion: string;
    browsers: string[];
  };
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    duration: number;
  };
  tests: TestResult[];
  failureAnalysis: {
    commonFailures: string[];
    suspectedIssues: string[];
    recommendations: string[];
  };
  systemDiagnostics: {
    databaseConnectivity: boolean;
    realtimeSubscriptions: boolean;
    authenticationFlow: boolean;
    notificationDelivery: boolean;
  };
}

class NotificationTestRunner {
  private startTime: number = Date.now();
  private reportDir: string = join(process.cwd(), 'test-results', 'notification-system');
  
  constructor() {
    // Ensure report directory exists
    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }
  }
  
  /**
   * Execute all notification system tests
   */
  async runAllTests(): Promise<TestReport> {
    console.log('🧪 Starting Comprehensive Notification System Tests\n');
    console.log('=' .repeat(70));
    console.log('MISSION: Identify notification system failures with surgical precision');
    console.log('SCOPE: End-to-end prayer interaction and notification delivery');
    console.log('=' .repeat(70) + '\n');
    
    const report: TestReport = {
      timestamp: new Date().toISOString(),
      environment: await this.detectEnvironment(),
      summary: { total: 0, passed: 0, failed: 0, skipped: 0, duration: 0 },
      tests: [],
      failureAnalysis: {
        commonFailures: [],
        suspectedIssues: [],
        recommendations: []
      },
      systemDiagnostics: {
        databaseConnectivity: false,
        realtimeSubscriptions: false,
        authenticationFlow: false,
        notificationDelivery: false
      }
    };
    
    // Test sequence - order matters for proper isolation
    const testSuites = [
      { name: 'Environment Setup', command: 'npx playwright test e2e/notification-system.spec.ts --grep "Database Integration"' },
      { name: 'Basic Authentication', command: 'npx playwright test e2e/auth.spec.ts' },
      { name: 'Single User Flow', command: 'npx playwright test e2e/notification-system.spec.ts --grep "Basic Single User"' },
      { name: 'Multi-User Flow', command: 'npx playwright test e2e/notification-system.spec.ts --grep "Multiple Prayer Supporters"' },
      { name: 'Real-Time Delivery', command: 'npx playwright test e2e/notification-system.spec.ts --grep "Real-Time Notification"' },
      { name: 'Cross-Device Sync', command: 'npx playwright test e2e/notification-system.spec.ts --grep "Cross-Device"' },
      { name: 'Persistence Test', command: 'npx playwright test e2e/notification-system.spec.ts --grep "Persistence"' },
      { name: 'System Diagnostics', command: 'npx playwright test e2e/notification-system.spec.ts --grep "Failure Analysis"' },
      { name: 'Real-time Subscriptions', command: 'npx playwright test e2e/notification-system.spec.ts --grep "Real-time Subscription"' }
    ];
    
    // Execute tests sequentially to avoid interference
    for (const suite of testSuites) {
      console.log(`\n🔍 Executing: ${suite.name}`);\n      console.log('-' .repeat(50));
      
      const result = await this.executeTestSuite(suite.name, suite.command);
      report.tests.push(result);
      
      // Update summary
      report.summary.total++;
      if (result.status === 'passed') report.summary.passed++;
      else if (result.status === 'failed') report.summary.failed++;
      else report.summary.skipped++;
      
      console.log(`Status: ${result.status.toUpperCase()} (${result.duration}ms)`);
      
      if (result.error) {
        console.log(`Error: ${result.error}`);
      }
      
      // Add diagnostic delay between tests
      await this.sleep(2000);
    }
    
    // Generate failure analysis
    report.failureAnalysis = this.analyzeFailures(report.tests);
    report.systemDiagnostics = await this.runSystemDiagnostics();
    report.summary.duration = Date.now() - this.startTime;
    
    // Write comprehensive report
    await this.generateReport(report);
    
    // Print summary
    this.printSummary(report);
    
    return report;
  }
  
  /**
   * Execute a single test suite
   */
  private async executeTestSuite(name: string, command: string): Promise<TestResult> {
    const startTime = Date.now();
    const result: TestResult = {
      name,
      status: 'failed',
      duration: 0,
      details: []
    };
    
    try {
      console.log(`Running: ${command}`);
      
      const output = execSync(command, {
        encoding: 'utf8',
        timeout: 300000, // 5 minutes max per test
        stdio: 'pipe'
      });
      
      result.status = 'passed';
      result.details = this.parseTestOutput(output);
      
    } catch (error: any) {
      result.status = 'failed';
      result.error = error.message;
      
      // Try to extract useful info from stderr
      if (error.stderr) {
        result.details = this.parseTestOutput(error.stderr);
      }
      
      // Capture screenshots if available
      result.screenshots = this.findTestScreenshots(name);
    }
    
    result.duration = Date.now() - startTime;
    return result;
  }
  
  /**
   * Parse Playwright test output for insights
   */
  private parseTestOutput(output: string): string[] {
    const lines = output.split('\n');
    const insights: string[] = [];
    
    // Look for specific patterns
    const patterns = [
      { regex: /✅.*/, type: 'success' },
      { regex: /❌.*/, type: 'error' },
      { regex: /Expected.*but received.*/, type: 'assertion' },
      { regex: /Error:.*/, type: 'error' },
      { regex: /timeout.*waiting for.*/, type: 'timeout' },
      { regex: /element.*not found/, type: 'selector' },
      { regex: /Authentication.*/, type: 'auth' },
      { regex: /Notification.*/, type: 'notification' },
      { regex: /Database.*/, type: 'database' }
    ];
    
    for (const line of lines) {
      for (const pattern of patterns) {
        if (pattern.regex.test(line)) {
          insights.push(`[${pattern.type}] ${line.trim()}`);
          break;
        }
      }
    }
    
    return insights;
  }
  
  /**
   * Find test screenshots for failed tests
   */
  private findTestScreenshots(testName: string): string[] {
    const screenshotDir = join(process.cwd(), 'test-results');
    const screenshots: string[] = [];
    
    try {
      const files = require('fs').readdirSync(screenshotDir, { recursive: true });
      for (const file of files) {
        if (file.includes(testName.toLowerCase().replace(/\s+/g, '-')) && file.endsWith('.png')) {
          screenshots.push(join(screenshotDir, file));
        }
      }
    } catch (error) {
      // Directory might not exist
    }
    
    return screenshots;
  }
  
  /**
   * Analyze failure patterns and generate insights
   */
  private analyzeFailures(tests: TestResult[]): TestReport['failureAnalysis'] {
    const failedTests = tests.filter(t => t.status === 'failed');
    const commonFailures: string[] = [];
    const suspectedIssues: string[] = [];
    const recommendations: string[] = [];
    
    // Analyze common failure patterns
    const errorPatterns = failedTests.flatMap(t => t.details || []);
    
    // Authentication issues
    if (errorPatterns.some(e => e.includes('auth') || e.includes('login'))) {
      commonFailures.push('Authentication failures detected');
      suspectedIssues.push('Supabase auth configuration or test credentials');
      recommendations.push('Verify test user accounts exist and credentials are correct');
    }
    
    // Database connectivity
    if (errorPatterns.some(e => e.includes('database') || e.includes('supabase'))) {
      commonFailures.push('Database connectivity issues');
      suspectedIssues.push('Supabase connection or RLS policies');
      recommendations.push('Check Supabase project status and database migrations');
    }
    
    // UI element issues
    if (errorPatterns.some(e => e.includes('not found') || e.includes('selector'))) {
      commonFailures.push('UI element detection failures');
      suspectedIssues.push('Frontend component changes or test selectors outdated');
      recommendations.push('Update test selectors to match current UI implementation');
    }
    
    // Notification specific
    if (errorPatterns.some(e => e.includes('notification') || e.includes('inbox'))) {
      commonFailures.push('Notification system failures');
      suspectedIssues.push('Notification triggers, real-time subscriptions, or inbox rendering');
      recommendations.push('Check database triggers and Supabase real-time configuration');
    }
    
    // Timing issues
    if (errorPatterns.some(e => e.includes('timeout'))) {
      commonFailures.push('Timeout issues detected');
      suspectedIssues.push('Slow database queries or network issues');
      recommendations.push('Increase test timeouts or optimize query performance');
    }
    
    return { commonFailures, suspectedIssues, recommendations };
  }
  
  /**
   * Run system diagnostics to identify infrastructure issues
   */
  private async runSystemDiagnostics(): Promise<TestReport['systemDiagnostics']> {
    const diagnostics = {
      databaseConnectivity: false,
      realtimeSubscriptions: false,
      authenticationFlow: false,
      notificationDelivery: false
    };
    
    try {
      // Test basic app loading
      const loadTest = execSync('npx playwright test --grep "should display prayers on map" --timeout=30000', {
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
      });
      
      if (loadTest.includes('passed') || !loadTest.includes('failed')) {
        diagnostics.databaseConnectivity = true;
      }
    } catch (error) {
      console.log('Database connectivity test failed');
    }
    
    try {
      // Test auth flow
      const authTest = execSync('npx playwright test e2e/auth.spec.ts --timeout=30000', {
        encoding: 'utf8',
        timeout: 30000,
        stdio: 'pipe'
      });
      
      if (authTest.includes('passed') || !authTest.includes('failed')) {
        diagnostics.authenticationFlow = true;
      }
    } catch (error) {
      console.log('Authentication test failed');
    }
    
    // Additional diagnostic tests would go here...
    
    return diagnostics;
  }
  
  /**
   * Generate comprehensive test report
   */
  private async generateReport(report: TestReport): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // JSON report for programmatic analysis
    const jsonFile = join(this.reportDir, `notification-test-report-${timestamp}.json`);
    writeFileSync(jsonFile, JSON.stringify(report, null, 2));
    
    // Human-readable HTML report
    const htmlFile = join(this.reportDir, `notification-test-report-${timestamp}.html`);
    const htmlContent = this.generateHtmlReport(report);
    writeFileSync(htmlFile, htmlContent);
    
    // Summary markdown report
    const markdownFile = join(this.reportDir, `notification-test-summary-${timestamp}.md`);
    const markdownContent = this.generateMarkdownSummary(report);
    writeFileSync(markdownFile, markdownContent);
    
    console.log(`\n📄 Reports generated:`);
    console.log(`- JSON: ${jsonFile}`);
    console.log(`- HTML: ${htmlFile}`);
    console.log(`- Markdown: ${markdownFile}`);
  }
  
  /**
   * Generate HTML report with detailed visualization
   */
  private generateHtmlReport(report: TestReport): string {
    const passRate = ((report.summary.passed / report.summary.total) * 100).toFixed(1);
    const statusColor = report.summary.failed > 0 ? '#e74c3c' : '#2ecc71';
    
    return `
<!DOCTYPE html>
<html>
<head>
    <title>PrayerMap Notification System Test Report</title>
    <style>
        body { font-family: -apple-system, system-ui, sans-serif; margin: 40px; background: #f8f9fa; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 10px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .metric { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; color: ${statusColor}; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; }
        .test-card { background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); overflow: hidden; }
        .test-header { padding: 20px; background: #f8f9fa; border-bottom: 1px solid #e9ecef; }
        .test-content { padding: 20px; }
        .status-passed { color: #28a745; font-weight: bold; }
        .status-failed { color: #dc3545; font-weight: bold; }
        .status-skipped { color: #6c757d; font-weight: bold; }
        .details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin-top: 15px; font-family: monospace; font-size: 0.9em; }
        .analysis { background: #fff3cd; border: 1px solid #ffeaa7; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .recommendations { background: #d1ecf1; border: 1px solid #bee5eb; padding: 20px; border-radius: 8px; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h1>🧪 PrayerMap Notification System Test Report</h1>
        <p>Comprehensive analysis of prayer interaction and notification delivery</p>
        <p><strong>Generated:</strong> ${new Date(report.timestamp).toLocaleString()}</p>
    </div>
    
    <div class="summary">
        <div class="metric">
            <div class="metric-value">${passRate}%</div>
            <div>Pass Rate</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.summary.passed}</div>
            <div>Passed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${report.summary.failed}</div>
            <div>Failed</div>
        </div>
        <div class="metric">
            <div class="metric-value">${(report.summary.duration / 1000).toFixed(1)}s</div>
            <div>Duration</div>
        </div>
    </div>
    
    ${report.failureAnalysis.commonFailures.length > 0 ? `
    <div class="analysis">
        <h3>🔍 Failure Analysis</h3>
        <h4>Common Failures:</h4>
        <ul>${report.failureAnalysis.commonFailures.map(f => `<li>${f}</li>`).join('')}</ul>
        <h4>Suspected Issues:</h4>
        <ul>${report.failureAnalysis.suspectedIssues.map(i => `<li>${i}</li>`).join('')}</ul>
    </div>
    ` : ''}
    
    ${report.failureAnalysis.recommendations.length > 0 ? `
    <div class="recommendations">
        <h3>💡 Recommendations</h3>
        <ul>${report.failureAnalysis.recommendations.map(r => `<li>${r}</li>`).join('')}</ul>
    </div>
    ` : ''}
    
    <h3>📋 Test Results</h3>
    <div class="test-grid">
        ${report.tests.map(test => `
        <div class="test-card">
            <div class="test-header">
                <h4>${test.name}</h4>
                <span class="status-${test.status}">${test.status.toUpperCase()}</span>
                <span style="float: right;">${test.duration}ms</span>
            </div>
            <div class="test-content">
                ${test.error ? `<p><strong>Error:</strong> ${test.error}</p>` : ''}
                ${test.details && test.details.length > 0 ? `
                <div class="details">
                    ${test.details.map(d => `<div>${d}</div>`).join('')}
                </div>
                ` : ''}
                ${test.screenshots && test.screenshots.length > 0 ? `
                <p><strong>Screenshots:</strong> ${test.screenshots.length} captured</p>
                ` : ''}
            </div>
        </div>
        `).join('')}
    </div>
    
    <div style="margin-top: 40px; padding: 20px; background: white; border-radius: 8px;">
        <h3>🔧 System Diagnostics</h3>
        <ul>
            <li>Database Connectivity: ${report.systemDiagnostics.databaseConnectivity ? '✅ Working' : '❌ Failed'}</li>
            <li>Authentication Flow: ${report.systemDiagnostics.authenticationFlow ? '✅ Working' : '❌ Failed'}</li>
            <li>Real-time Subscriptions: ${report.systemDiagnostics.realtimeSubscriptions ? '✅ Working' : '❌ Failed'}</li>
            <li>Notification Delivery: ${report.systemDiagnostics.notificationDelivery ? '✅ Working' : '❌ Failed'}</li>
        </ul>
    </div>
</body>
</html>
    `;
  }
  
  /**
   * Generate markdown summary
   */
  private generateMarkdownSummary(report: TestReport): string {
    const passRate = ((report.summary.passed / report.summary.total) * 100).toFixed(1);
    
    return `
# PrayerMap Notification System Test Report

**Generated:** ${new Date(report.timestamp).toLocaleString()}
**Duration:** ${(report.summary.duration / 1000).toFixed(1)}s
**Pass Rate:** ${passRate}% (${report.summary.passed}/${report.summary.total})

## 📊 Summary

- ✅ **Passed:** ${report.summary.passed}
- ❌ **Failed:** ${report.summary.failed}
- ⏭️ **Skipped:** ${report.summary.skipped}

## 🔍 Failure Analysis

${report.failureAnalysis.commonFailures.length > 0 ? `
### Common Failures
${report.failureAnalysis.commonFailures.map(f => `- ${f}`).join('\n')}

### Suspected Issues
${report.failureAnalysis.suspectedIssues.map(i => `- ${i}`).join('\n')}
` : 'No failures detected ✅'}

${report.failureAnalysis.recommendations.length > 0 ? `
## 💡 Recommendations

${report.failureAnalysis.recommendations.map(r => `- ${r}`).join('\n')}
` : ''}

## 📋 Test Results

${report.tests.map(test => `
### ${test.name}
- **Status:** ${test.status.toUpperCase()}
- **Duration:** ${test.duration}ms
${test.error ? `- **Error:** ${test.error}` : ''}
${test.details && test.details.length > 0 ? `\n**Details:**\n${test.details.map(d => `  - ${d}`).join('\n')}` : ''}
`).join('\n')}

## 🔧 System Diagnostics

- Database Connectivity: ${report.systemDiagnostics.databaseConnectivity ? '✅' : '❌'}
- Authentication Flow: ${report.systemDiagnostics.authenticationFlow ? '✅' : '❌'}
- Real-time Subscriptions: ${report.systemDiagnostics.realtimeSubscriptions ? '✅' : '❌'}
- Notification Delivery: ${report.systemDiagnostics.notificationDelivery ? '✅' : '❌'}

---

*Generated by PrayerMap Notification System Test Runner*
    `;
  }
  
  /**
   * Print test summary to console
   */
  private printSummary(report: TestReport): void {
    const duration = (report.summary.duration / 1000).toFixed(1);
    const passRate = ((report.summary.passed / report.summary.total) * 100).toFixed(1);
    
    console.log('\n' + '='.repeat(70));
    console.log('🎯 NOTIFICATION SYSTEM TEST SUMMARY');
    console.log('='.repeat(70));
    console.log(`Duration: ${duration}s | Pass Rate: ${passRate}% | Tests: ${report.summary.total}`);
    console.log(`✅ Passed: ${report.summary.passed} | ❌ Failed: ${report.summary.failed} | ⏭️ Skipped: ${report.summary.skipped}`);
    console.log('='.repeat(70));
    
    if (report.summary.failed > 0) {
      console.log('\n🚨 CRITICAL ISSUES DETECTED:');
      report.failureAnalysis.commonFailures.forEach(failure => {
        console.log(`  ❌ ${failure}`);
      });
      
      if (report.failureAnalysis.recommendations.length > 0) {
        console.log('\n💡 IMMEDIATE ACTIONS REQUIRED:');
        report.failureAnalysis.recommendations.slice(0, 3).forEach(rec => {
          console.log(`  🔧 ${rec}`);
        });
      }
    } else {
      console.log('\n🎉 ALL NOTIFICATION TESTS PASSED!');
      console.log('✅ Prayer interaction and notification system is working correctly');
    }
    
    console.log(`\n📄 Detailed reports available in: ${this.reportDir}`);
    console.log('='.repeat(70) + '\n');
  }
  
  /**
   * Detect test environment info
   */
  private async detectEnvironment(): Promise<TestReport['environment']> {
    try {
      const nodeVersion = execSync('node --version', { encoding: 'utf8' }).trim();
      const playwrightVersion = execSync('npx playwright --version', { encoding: 'utf8' }).trim();
      
      return {
        nodeVersion,
        playwrightVersion,
        browsers: ['chromium', 'firefox', 'webkit'] // Default from config
      };
    } catch (error) {
      return {
        nodeVersion: 'unknown',
        playwrightVersion: 'unknown',
        browsers: []
      };
    }
  }
  
  /**
   * Utility sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Main execution
if (require.main === module) {
  const runner = new NotificationTestRunner();
  
  runner.runAllTests()
    .then(report => {
      const exitCode = report.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

export default NotificationTestRunner;