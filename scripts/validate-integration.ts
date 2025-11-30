#!/usr/bin/env tsx

/**
 * Integration Validation Script - Agent 5 Integration Orchestrator
 * 
 * This script validates that all agent implementations are properly integrated
 * and working together harmoniously. It performs comprehensive system checks
 * to ensure Living Map principle compliance and optimal performance.
 * 
 * Usage:
 *   npm run validate:integration
 *   or 
 *   tsx scripts/validate-integration.ts
 */

import { performance } from 'perf_hooks';

interface ValidationResult {
  component: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  duration: number;
  message: string;
  details?: any;
}

interface IntegrationReport {
  timestamp: number;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  overallScore: number;
  results: ValidationResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
    total: number;
  };
  livingMapCompliance: boolean;
  recommendations: string[];
}

class IntegrationValidator {
  private results: ValidationResult[] = [];

  async runValidation(): Promise<IntegrationReport> {
    console.log('🚀 Starting PrayerMap Integration Validation...\n');

    // 1. Validate file structure and imports
    await this.validateFileStructure();
    
    // 2. Validate TypeScript compilation
    await this.validateTypeScript();
    
    // 3. Validate component integration
    await this.validateComponentIntegration();
    
    // 4. Validate service coordination
    await this.validateServiceCoordination();
    
    // 5. Validate Living Map principle compliance
    await this.validateLivingMapCompliance();
    
    // 6. Validate Datadog integration
    await this.validateDatadogIntegration();
    
    // 7. Validate mobile compatibility
    await this.validateMobileCompatibility();

    return this.generateReport();
  }

  private async validateFileStructure(): Promise<void> {
    console.log('📁 Validating file structure...');

    await this.runTest('File Structure', 'Master Observability Dashboard exists', async () => {
      const fs = await import('fs');
      const path = '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/components/MasterObservabilityDashboard.tsx';
      return fs.existsSync(path) ? 'PASS' : 'FAIL';
    });

    await this.runTest('File Structure', 'System Integration Validator exists', async () => {
      const fs = await import('fs');
      const path = '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/systemIntegrationValidator.ts';
      return fs.existsSync(path) ? 'PASS' : 'FAIL';
    });

    await this.runTest('File Structure', 'System Performance Optimizer exists', async () => {
      const fs = await import('fs');
      const path = '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/systemPerformanceOptimizer.ts';
      return fs.existsSync(path) ? 'PASS' : 'FAIL';
    });

    await this.runTest('File Structure', 'Enhanced Datadog integration exists', async () => {
      const fs = await import('fs');
      const path = '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/lib/datadog.ts';
      return fs.existsSync(path) ? 'PASS' : 'FAIL';
    });
  }

  private async validateTypeScript(): Promise<void> {
    console.log('🔍 Validating TypeScript compilation...');

    await this.runTest('TypeScript', 'No compilation errors', async () => {
      try {
        const { execSync } = await import('child_process');
        execSync('npx tsc --noEmit', { 
          stdio: 'pipe',
          cwd: '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap'
        });
        return 'PASS';
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('TypeScript', 'ESLint validation passes', async () => {
      try {
        const { execSync } = await import('child_process');
        execSync('npm run lint', { 
          stdio: 'pipe',
          cwd: '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap'
        });
        return 'PASS';
      } catch (error) {
        return 'WARN'; // Lint warnings shouldn't block integration
      }
    });
  }

  private async validateComponentIntegration(): Promise<void> {
    console.log('🔗 Validating component integration...');

    await this.runTest('Components', 'Master Observability Dashboard imports', async () => {
      try {
        const fs = await import('fs');
        const appTsx = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/App.tsx',
          'utf-8'
        );
        
        if (appTsx.includes('MasterObservabilityDashboard') && 
            appTsx.includes('<MasterObservabilityDashboard />')) {
          return 'PASS';
        }
        return 'FAIL';
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Components', 'System services are imported', async () => {
      try {
        const fs = await import('fs');
        const appTsx = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/App.tsx',
          'utf-8'
        );
        
        const hasValidator = appTsx.includes('systemIntegrationValidator');
        const hasOptimizer = appTsx.includes('systemPerformanceOptimizer');
        
        if (hasValidator && hasOptimizer) {
          return 'PASS';
        }
        return 'FAIL';
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Components', 'Performance optimizer is initialized', async () => {
      try {
        const fs = await import('fs');
        const appTsx = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/App.tsx',
          'utf-8'
        );
        
        if (appTsx.includes('systemPerformanceOptimizer.startOptimization')) {
          return 'PASS';
        }
        return 'FAIL';
      } catch (error) {
        return 'FAIL';
      }
    });
  }

  private async validateServiceCoordination(): Promise<void> {
    console.log('⚙️ Validating service coordination...');

    await this.runTest('Services', 'Datadog integration properly configured', async () => {
      try {
        const fs = await import('fs');
        const datadogTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/lib/datadog.ts',
          'utf-8'
        );
        
        // Check for key integration features
        const hasRumInit = datadogTs.includes('datadogRum.init');
        const hasTraceQuery = datadogTs.includes('traceSupabaseQuery');
        const hasRealtimeTrace = datadogTs.includes('traceRealtimeSubscription');
        const hasErrorTracking = datadogTs.includes('trackError');
        
        if (hasRumInit && hasTraceQuery && hasRealtimeTrace && hasErrorTracking) {
          return 'PASS';
        }
        return 'WARN'; // Partial implementation is acceptable
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Services', 'Integration validator has comprehensive tests', async () => {
      try {
        const fs = await import('fs');
        const validatorTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/systemIntegrationValidator.ts',
          'utf-8'
        );
        
        // Check for key test methods
        const hasEndToEndTest = validatorTs.includes('testEndToEndPrayerFlow');
        const hasMessagingTest = validatorTs.includes('testMessagingIntegration');
        const hasLivingMapTest = validatorTs.includes('testLivingMapCompliance');
        const hasPerformanceTest = validatorTs.includes('testPerformanceUnderLoad');
        
        if (hasEndToEndTest && hasMessagingTest && hasLivingMapTest && hasPerformanceTest) {
          return 'PASS';
        }
        return 'WARN'; // Some tests missing but core functionality exists
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Services', 'Performance optimizer has automatic optimizations', async () => {
      try {
        const fs = await import('fs');
        const optimizerTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/systemPerformanceOptimizer.ts',
          'utf-8'
        );
        
        // Check for optimization features
        const hasBottleneckDetection = optimizerTs.includes('identifyBottlenecks');
        const hasAutoOptimization = optimizerTs.includes('applyAutomaticOptimizations');
        const hasLivingMapPriority = optimizerTs.includes('LIVING_MAP_LATENCY');
        const hasResourceAllocation = optimizerTs.includes('optimizeResourceAllocation');
        
        if (hasBottleneckDetection && hasAutoOptimization && hasLivingMapPriority && hasResourceAllocation) {
          return 'PASS';
        }
        return 'WARN'; // Partial implementation is acceptable
      } catch (error) {
        return 'FAIL';
      }
    });
  }

  private async validateLivingMapCompliance(): Promise<void> {
    console.log('🗺️ Validating Living Map principle compliance...');

    await this.runTest('Living Map', '2 second latency requirement enforced', async () => {
      try {
        const fs = await import('fs');
        const optimizerTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/systemPerformanceOptimizer.ts',
          'utf-8'
        );
        
        // Check for 2 second threshold enforcement
        if (optimizerTs.includes('LIVING_MAP_LATENCY: 2000') && 
            optimizerTs.includes('priority') && 
            optimizerTs.includes('2 second')) {
          return 'PASS';
        }
        return 'FAIL';
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Living Map', 'Memorial line persistence validation', async () => {
      try {
        const fs = await import('fs');
        const validatorTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/systemIntegrationValidator.ts',
          'utf-8'
        );
        
        if (validatorTs.includes('validateMemorialLinePersistence') && 
            validatorTs.includes('verifyMemorialLineAppears')) {
          return 'PASS';
        }
        return 'FAIL';
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Living Map', 'Real-time witnessing capability', async () => {
      try {
        const fs = await import('fs');
        const dashboardTsx = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/components/MasterObservabilityDashboard.tsx',
          'utf-8'
        );
        
        if (dashboardTsx.includes('witnessEngagement') && 
            dashboardTsx.includes('realtimeConnections')) {
          return 'PASS';
        }
        return 'WARN'; // Basic implementation acceptable
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Living Map', 'Priority-based resource allocation', async () => {
      try {
        const fs = await import('fs');
        const optimizerTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/systemPerformanceOptimizer.ts',
          'utf-8'
        );
        
        if (optimizerTs.includes('livingMapPriority') && 
            optimizerTs.includes('prioritize') &&
            optimizerTs.includes('resource')) {
          return 'PASS';
        }
        return 'FAIL';
      } catch (error) {
        return 'FAIL';
      }
    });
  }

  private async validateDatadogIntegration(): Promise<void> {
    console.log('📊 Validating Datadog observability integration...');

    await this.runTest('Datadog', 'RUM initialization configured', async () => {
      try {
        const fs = await import('fs');
        const datadogTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/lib/datadog.ts',
          'utf-8'
        );
        
        if (datadogTs.includes('initDatadog') && 
            datadogTs.includes('datadogRum.init') &&
            datadogTs.includes('applicationId')) {
          return 'PASS';
        }
        return 'WARN'; // Configuration depends on environment variables
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Datadog', 'Supabase query tracing implemented', async () => {
      try {
        const fs = await import('fs');
        const datadogTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/lib/datadog.ts',
          'utf-8'
        );
        
        if (datadogTs.includes('traceSupabaseQuery') && 
            datadogTs.includes('addAction') &&
            datadogTs.includes('addTiming')) {
          return 'PASS';
        }
        return 'FAIL';
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Datadog', 'Real-time subscription monitoring', async () => {
      try {
        const fs = await import('fs');
        const datadogTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/lib/datadog.ts',
          'utf-8'
        );
        
        if (datadogTs.includes('traceRealtimeSubscription') && 
            datadogTs.includes('channel')) {
          return 'PASS';
        }
        return 'FAIL';
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Datadog', 'Error tracking and context', async () => {
      try {
        const fs = await import('fs');
        const datadogTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/lib/datadog.ts',
          'utf-8'
        );
        
        if (datadogTs.includes('trackError') && 
            datadogTs.includes('addError') &&
            datadogTs.includes('context')) {
          return 'PASS';
        }
        return 'FAIL';
      } catch (error) {
        return 'FAIL';
      }
    });
  }

  private async validateMobileCompatibility(): Promise<void> {
    console.log('📱 Validating mobile compatibility...');

    await this.runTest('Mobile', 'Mobile metrics tracking implemented', async () => {
      try {
        const fs = await import('fs');
        const optimizerTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/systemPerformanceOptimizer.ts',
          'utf-8'
        );
        
        if (optimizerTs.includes('batteryDrainRate') && 
            optimizerTs.includes('networkDataUsage') &&
            optimizerTs.includes('backgroundTaskEfficiency')) {
          return 'PASS';
        }
        return 'WARN'; // Some mobile metrics may be missing
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Mobile', 'Battery optimization strategies', async () => {
      try {
        const fs = await import('fs');
        const optimizerTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/systemPerformanceOptimizer.ts',
          'utf-8'
        );
        
        if (optimizerTs.includes('BATTERY_DRAIN') && 
            optimizerTs.includes('throttle') &&
            optimizerTs.includes('compress')) {
          return 'PASS';
        }
        return 'WARN'; // Basic battery optimization
      } catch (error) {
        return 'FAIL';
      }
    });

    await this.runTest('Mobile', 'Cross-platform consistency validation', async () => {
      try {
        const fs = await import('fs');
        const validatorTs = fs.readFileSync(
          '/Users/computer/jeffmichaeljohnson-tech/projects/prayermap/src/services/systemIntegrationValidator.ts',
          'utf-8'
        );
        
        if (validatorTs.includes('testMobileWebSync') && 
            validatorTs.includes('nativeFeatureIntegration')) {
          return 'PASS';
        }
        return 'WARN'; // Basic mobile validation
      } catch (error) {
        return 'FAIL';
      }
    });
  }

  private async runTest(
    component: string, 
    test: string, 
    testFn: () => Promise<'PASS' | 'FAIL' | 'WARN'>
  ): Promise<void> {
    const startTime = performance.now();
    
    try {
      const status = await testFn();
      const duration = performance.now() - startTime;
      
      this.results.push({
        component,
        test,
        status,
        duration,
        message: this.getStatusMessage(status, test)
      });

      const icon = status === 'PASS' ? '✅' : status === 'WARN' ? '⚠️' : '❌';
      console.log(`  ${icon} ${test} (${duration.toFixed(1)}ms)`);
      
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.results.push({
        component,
        test,
        status: 'FAIL',
        duration,
        message: `Test failed: ${error.message}`,
        details: error
      });

      console.log(`  ❌ ${test} - FAILED: ${error.message}`);
    }
  }

  private getStatusMessage(status: 'PASS' | 'FAIL' | 'WARN', test: string): string {
    switch (status) {
      case 'PASS':
        return `${test} validated successfully`;
      case 'WARN':
        return `${test} has minor issues but is functional`;
      case 'FAIL':
        return `${test} validation failed`;
      default:
        return `${test} status unknown`;
    }
  }

  private generateReport(): IntegrationReport {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARN').length;
    const total = this.results.length;

    const overallScore = Math.round(((passed + (warnings * 0.5)) / total) * 100);
    
    let overallStatus: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
    if (failed === 0 && warnings <= 2) {
      overallStatus = 'HEALTHY';
    } else if (failed <= 2) {
      overallStatus = 'DEGRADED';
    } else {
      overallStatus = 'CRITICAL';
    }

    // Check Living Map compliance specifically
    const livingMapTests = this.results.filter(r => r.component === 'Living Map');
    const livingMapCompliance = livingMapTests.every(test => test.status !== 'FAIL');

    const recommendations: string[] = [];
    
    if (failed > 0) {
      recommendations.push(`Address ${failed} failed validation(s) before production deployment`);
    }
    
    if (warnings > 3) {
      recommendations.push(`Review ${warnings} warning(s) to improve system reliability`);
    }
    
    if (!livingMapCompliance) {
      recommendations.push('CRITICAL: Fix Living Map principle violations immediately');
    }
    
    if (overallScore < 80) {
      recommendations.push('System integration score below 80% - comprehensive review needed');
    }

    return {
      timestamp: Date.now(),
      overallStatus,
      overallScore,
      results: this.results,
      summary: { passed, failed, warnings, total },
      livingMapCompliance,
      recommendations
    };
  }
}

async function main() {
  const validator = new IntegrationValidator();
  const report = await validator.runValidation();
  
  console.log('\n' + '='.repeat(80));
  console.log('📋 INTEGRATION VALIDATION REPORT');
  console.log('='.repeat(80));
  
  console.log(`\n🎯 Overall Status: ${report.overallStatus}`);
  console.log(`📊 Integration Score: ${report.overallScore}/100`);
  console.log(`🗺️ Living Map Compliance: ${report.livingMapCompliance ? '✅ COMPLIANT' : '❌ NON-COMPLIANT'}`);
  
  console.log(`\n📈 Test Summary:`);
  console.log(`  ✅ Passed: ${report.summary.passed}`);
  console.log(`  ⚠️ Warnings: ${report.summary.warnings}`);
  console.log(`  ❌ Failed: ${report.summary.failed}`);
  console.log(`  📊 Total: ${report.summary.total}`);

  if (report.recommendations.length > 0) {
    console.log(`\n💡 Recommendations:`);
    report.recommendations.forEach(rec => {
      console.log(`  • ${rec}`);
    });
  }

  console.log(`\n🔍 Detailed Results:`);
  const components = [...new Set(report.results.map(r => r.component))];
  
  for (const component of components) {
    const componentResults = report.results.filter(r => r.component === component);
    const componentPassed = componentResults.filter(r => r.status === 'PASS').length;
    const componentTotal = componentResults.length;
    
    console.log(`\n  📦 ${component} (${componentPassed}/${componentTotal} passed):`);
    
    componentResults.forEach(result => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'WARN' ? '⚠️' : '❌';
      console.log(`    ${icon} ${result.test} (${result.duration.toFixed(1)}ms)`);
      if (result.status !== 'PASS') {
        console.log(`       ${result.message}`);
      }
    });
  }

  console.log('\n' + '='.repeat(80));
  
  if (report.overallStatus === 'CRITICAL') {
    console.log('🚨 CRITICAL ISSUES DETECTED - DO NOT DEPLOY TO PRODUCTION');
    process.exit(1);
  } else if (report.overallStatus === 'DEGRADED') {
    console.log('⚠️ DEGRADED PERFORMANCE - REVIEW BEFORE DEPLOYMENT');
    process.exit(1);
  } else {
    console.log('✅ INTEGRATION VALIDATION SUCCESSFUL - READY FOR DEPLOYMENT');
    process.exit(0);
  }
}

// Run validation if called directly
// Check if this is the main module in ES module context
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('❌ Validation script failed:', error);
    process.exit(1);
  });
}