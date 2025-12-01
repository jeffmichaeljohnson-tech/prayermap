#!/usr/bin/env node
/**
 * 🎯 MESSAGE FLOW VALIDATION RUNNER
 * 
 * MISSION: Complete validation runner for the entire message flow system
 * 
 * PURPOSE:
 * ✅ Execute comprehensive message flow validation
 * ✅ Generate detailed test reports and metrics  
 * ✅ Validate system health and performance
 * ✅ Provide actionable feedback for improvements
 * ✅ Support both manual and CI/CD execution
 */

import { execSync } from 'child_process';
import { existsSync, writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

interface TestSuite {
  name: string;
  file: string;
  description: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  estimatedDuration: number; // minutes
}

interface TestResult {
  suite: string;
  status: 'PASSED' | 'FAILED' | 'SKIPPED';
  duration: number;
  tests: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
  details: string[];
  errors: string[];
}

interface ValidationReport {
  timestamp: string;
  totalDuration: number;
  overallStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED';
  testSuites: TestResult[];
  summary: {
    totalTests: number;
    passedTests: number;
    failedTests: number;
    successRate: number;
    systemHealthScore: number;
  };
  recommendations: string[];
}

const TEST_SUITES: TestSuite[] = [
  {
    name: 'Complete Message Flow Validation',
    file: 'complete-message-flow-validation.spec.ts',
    description: 'End-to-end validation of critical user journeys',
    priority: 'CRITICAL',
    estimatedDuration: 15
  },
  {
    name: 'Performance Message Volume',
    file: 'performance-message-volume.spec.ts', 
    description: 'Performance testing under high message volume',
    priority: 'HIGH',
    estimatedDuration: 25
  },
  {
    name: 'Automated Continuous Validation',
    file: 'automated-continuous-validation.spec.ts',
    description: 'Continuous monitoring and health checks',
    priority: 'HIGH',
    estimatedDuration: 10
  }
];

class MessageFlowValidator {
  private results: TestResult[] = [];
  private startTime: number = 0;

  constructor() {
    console.log('🎯 MESSAGE FLOW VALIDATION SYSTEM STARTING...');
    console.log('=' .repeat(80));
  }

  async runValidation(options: {
    suites?: string[];
    priority?: string;
    skipOnFailure?: boolean;
    generateReport?: boolean;
  } = {}): Promise<ValidationReport> {
    this.startTime = Date.now();
    
    const suitesToRun = this.selectTestSuites(options.suites, options.priority);
    
    console.log(`🚀 Executing ${suitesToRun.length} test suites:`);
    suitesToRun.forEach(suite => {
      console.log(`  - ${suite.name} (${suite.priority} priority, ~${suite.estimatedDuration}m)`);
    });
    console.log('');

    for (const suite of suitesToRun) {
      const result = await this.runTestSuite(suite);
      this.results.push(result);
      
      if (result.status === 'FAILED' && options.skipOnFailure) {
        console.log('❌ Stopping execution due to test failure');
        break;
      }
    }

    const report = this.generateReport();
    
    if (options.generateReport) {
      this.saveReport(report);
    }

    this.printSummary(report);
    return report;
  }

  private selectTestSuites(specificSuites?: string[], priority?: string): TestSuite[] {
    let suites = TEST_SUITES;
    
    if (specificSuites && specificSuites.length > 0) {
      suites = suites.filter(suite => 
        specificSuites.some(name => suite.name.toLowerCase().includes(name.toLowerCase()))
      );
    }
    
    if (priority) {
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      const minPriority = priorityOrder[priority.toUpperCase() as keyof typeof priorityOrder] || 1;
      suites = suites.filter(suite => 
        (priorityOrder[suite.priority] || 0) >= minPriority
      );
    }
    
    return suites.sort((a, b) => {
      const priorityOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0);
    });
  }

  private async runTestSuite(suite: TestSuite): Promise<TestResult> {
    console.log(`\n🧪 Running: ${suite.name}`);
    console.log(`📝 ${suite.description}`);
    
    const startTime = Date.now();
    const result: TestResult = {
      suite: suite.name,
      status: 'SKIPPED',
      duration: 0,
      tests: { total: 0, passed: 0, failed: 0, skipped: 0 },
      details: [],
      errors: []
    };

    try {
      const testFile = join(__dirname, suite.file);
      
      if (!existsSync(testFile)) {
        result.status = 'SKIPPED';
        result.errors.push(`Test file not found: ${suite.file}`);
        console.log(`⚠️  Test file not found: ${suite.file}`);
        return result;
      }

      // Run playwright test with timeout and reporter
      const command = `npx playwright test ${suite.file} --reporter=json --timeout=60000`;
      console.log(`⚡ Executing: ${command}`);
      
      try {
        const output = execSync(command, { 
          timeout: 30 * 60 * 1000, // 30 minute timeout
          encoding: 'utf8',
          stdio: 'pipe'
        });
        
        // Parse JSON output if available
        try {
          const jsonOutput = JSON.parse(output);
          result.tests = {
            total: jsonOutput.stats?.total || 0,
            passed: jsonOutput.stats?.passed || 0,
            failed: jsonOutput.stats?.failed || 0,
            skipped: jsonOutput.stats?.skipped || 0
          };
          
          result.status = result.tests.failed === 0 ? 'PASSED' : 'FAILED';
          result.details.push(`Tests: ${result.tests.passed}/${result.tests.total} passed`);
          
        } catch (parseError) {
          // Fallback for non-JSON output
          result.status = 'PASSED';
          result.details.push('Test completed successfully');
        }
        
      } catch (execError: any) {
        result.status = 'FAILED';
        result.errors.push(`Execution failed: ${execError.message}`);
        
        // Try to extract useful info from stderr
        if (execError.stdout) {
          const errorLines = execError.stdout.split('\n')
            .filter((line: string) => line.includes('Error:') || line.includes('failed'))
            .slice(0, 5);
          result.details.push(...errorLines);
        }
      }

    } catch (error: any) {
      result.status = 'FAILED';
      result.errors.push(`Unexpected error: ${error.message}`);
    }

    result.duration = Date.now() - startTime;
    
    // Log result
    const statusEmoji = {
      'PASSED': '✅',
      'FAILED': '❌', 
      'SKIPPED': '⏭️'
    };
    
    console.log(`${statusEmoji[result.status]} ${result.suite}: ${result.status} (${(result.duration / 1000).toFixed(1)}s)`);
    
    if (result.errors.length > 0) {
      console.log(`   Errors: ${result.errors.length}`);
      result.errors.slice(0, 3).forEach(error => console.log(`   - ${error}`));
    }
    
    return result;
  }

  private generateReport(): ValidationReport {
    const totalDuration = Date.now() - this.startTime;
    
    const totalTests = this.results.reduce((sum, r) => sum + r.tests.total, 0);
    const passedTests = this.results.reduce((sum, r) => sum + r.tests.passed, 0);
    const failedTests = this.results.reduce((sum, r) => sum + r.tests.failed, 0);
    
    const successRate = totalTests > 0 ? (passedTests / totalTests) * 100 : 0;
    const systemHealthScore = this.calculateHealthScore();
    
    const overallStatus: ValidationReport['overallStatus'] = 
      successRate >= 90 ? 'SUCCESS' : 
      successRate >= 70 ? 'PARTIAL' : 'FAILED';

    const recommendations = this.generateRecommendations(successRate, systemHealthScore);

    return {
      timestamp: new Date().toISOString(),
      totalDuration,
      overallStatus,
      testSuites: this.results,
      summary: {
        totalTests,
        passedTests, 
        failedTests,
        successRate: Math.round(successRate * 100) / 100,
        systemHealthScore: Math.round(systemHealthScore * 100) / 100
      },
      recommendations
    };
  }

  private calculateHealthScore(): number {
    const passedSuites = this.results.filter(r => r.status === 'PASSED').length;
    const totalSuites = this.results.length;
    
    if (totalSuites === 0) return 0;
    
    const suiteSuccessRate = (passedSuites / totalSuites) * 100;
    const criticalSuites = this.results.filter(r => r.suite.includes('CRITICAL') || r.suite.includes('CORE'));
    const criticalPassed = criticalSuites.filter(r => r.status === 'PASSED').length;
    const criticalWeight = criticalSuites.length > 0 ? (criticalPassed / criticalSuites.length) * 100 : 100;
    
    // Weight critical tests more heavily
    return (suiteSuccessRate * 0.6) + (criticalWeight * 0.4);
  }

  private generateRecommendations(successRate: number, healthScore: number): string[] {
    const recommendations: string[] = [];
    
    if (successRate < 80) {
      recommendations.push('URGENT: Investigate failing tests - success rate below 80%');
    }
    
    if (healthScore < 75) {
      recommendations.push('System health degraded - review infrastructure and performance');
    }
    
    const failedSuites = this.results.filter(r => r.status === 'FAILED');
    if (failedSuites.length > 0) {
      recommendations.push(`Address failures in: ${failedSuites.map(s => s.suite).join(', ')}`);
    }
    
    const criticalFailures = failedSuites.filter(r => r.suite.includes('CRITICAL') || r.suite.includes('CORE'));
    if (criticalFailures.length > 0) {
      recommendations.push('CRITICAL: Core message flow tests failing - immediate attention required');
    }
    
    if (successRate >= 95 && healthScore >= 90) {
      recommendations.push('Excellent: System performing optimally, continue monitoring');
    } else if (successRate >= 85 && healthScore >= 80) {
      recommendations.push('Good: System stable, minor improvements recommended');
    }
    
    return recommendations;
  }

  private saveReport(report: ValidationReport): void {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `message-flow-validation-report-${timestamp}.json`;
    const reportPath = join(__dirname, '..', 'test-results', filename);
    
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Report saved: ${reportPath}`);
  }

  private printSummary(report: ValidationReport): void {
    console.log('\n' + '=' .repeat(80));
    console.log('📊 MESSAGE FLOW VALIDATION SUMMARY');
    console.log('=' .repeat(80));
    
    console.log(`⏰ Total Duration: ${(report.totalDuration / 1000 / 60).toFixed(1)} minutes`);
    console.log(`🎯 Overall Status: ${report.overallStatus}`);
    console.log(`📈 Success Rate: ${report.summary.successRate}%`);
    console.log(`💚 System Health: ${report.summary.systemHealthScore}%`);
    console.log(`🧪 Tests: ${report.summary.passedTests}/${report.summary.totalTests} passed`);
    
    console.log('\n📋 TEST SUITE RESULTS:');
    report.testSuites.forEach(suite => {
      const statusEmoji = { 'PASSED': '✅', 'FAILED': '❌', 'SKIPPED': '⏭️' };
      console.log(`${statusEmoji[suite.status]} ${suite.suite}`);
      console.log(`   Duration: ${(suite.duration / 1000).toFixed(1)}s`);
      console.log(`   Tests: ${suite.tests.passed}/${suite.tests.total} passed`);
      
      if (suite.errors.length > 0) {
        console.log(`   Errors: ${suite.errors.slice(0, 2).join(', ')}`);
      }
    });
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 RECOMMENDATIONS:');
      report.recommendations.forEach((rec, index) => {
        console.log(`${index + 1}. ${rec}`);
      });
    }
    
    console.log('\n🎯 MESSAGE FLOW VALIDATION COMPLETE');
    console.log('=' .repeat(80));
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    suites: args.filter(arg => !arg.startsWith('--')),
    priority: args.find(arg => arg.startsWith('--priority='))?.split('=')[1],
    skipOnFailure: args.includes('--skip-on-failure'),
    generateReport: !args.includes('--no-report')
  };

  console.log('🎯 PRAYERMAP MESSAGE FLOW VALIDATION SYSTEM');
  console.log(`📅 ${new Date().toLocaleString()}`);
  
  if (options.suites.length > 0) {
    console.log(`🎯 Running specific suites: ${options.suites.join(', ')}`);
  }
  
  if (options.priority) {
    console.log(`🎯 Priority filter: ${options.priority.toUpperCase()}`);
  }
  
  const validator = new MessageFlowValidator();
  const report = await validator.runValidation(options);
  
  // Exit with appropriate code
  const exitCode = report.overallStatus === 'SUCCESS' ? 0 : 1;
  process.exit(exitCode);
}

// Export for programmatic use
export { MessageFlowValidator, ValidationReport, TestResult };

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation system error:', error);
    process.exit(1);
  });
}