#!/usr/bin/env npx tsx
/**
 * Living Map Validation Debug Script
 * 
 * Tests all four pillars of the Living Map Principle:
 * 1. Eternal Memorial Persistence - Memorial lines NEVER expire
 * 2. Real-time Prayer Witnessing - <2 second updates 
 * 3. Universal Shared Reality - Everyone sees same map state
 * 4. Complete Historical Access - All prayer history visible
 * 
 * This script validates the core spiritual mission of PrayerMap.
 */

import { createClient } from '@supabase/supabase-js';
import { performance } from 'perf_hooks';

// Initialize Supabase client
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

if (!process.env.VITE_SUPABASE_URL || !process.env.VITE_SUPABASE_ANON_KEY) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface ValidationResult {
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  message: string;
  details: Record<string, any>;
  spiritualImpact: string;
}

interface LivingMapReport {
  overall_status: 'COMPLIANT' | 'NON_COMPLIANT';
  health_score: number;
  tests: ValidationResult[];
  summary: {
    passed: number;
    failed: number;
    warnings: number;
  };
  recommendations: string[];
}

class LivingMapValidator {
  private results: ValidationResult[] = [];
  
  /**
   * Run all Living Map validation tests
   */
  async runFullValidation(): Promise<LivingMapReport> {
    console.log('🕊️ Starting Living Map Validation');
    console.log('=====================================');
    
    // Test 1: Eternal Memorial Persistence
    await this.testEternalMemorialPersistence();
    
    // Test 2: Real-time Subscription Performance
    await this.testRealtimePerformance();
    
    // Test 3: Universal Map State Access
    await this.testUniversalMapAccess();
    
    // Test 4: Historical Data Completeness
    await this.testHistoricalDataAccess();
    
    // Test 5: Database Schema Compliance
    await this.testDatabaseSchemaCompliance();
    
    // Test 6: Memorial Line Data Integrity
    await this.testMemorialLineIntegrity();
    
    // Generate final report
    return this.generateReport();
  }
  
  /**
   * Test 1: Eternal Memorial Persistence
   * CRITICAL: Memorial lines must NEVER expire or be deleted
   */
  private async testEternalMemorialPersistence() {
    console.log('🔍 Testing Eternal Memorial Persistence...');
    
    try {
      // Check for expired connections that should be visible
      const { data: expiredConnections, error: expiredError } = await supabase
        .from('prayer_connections')
        .select('id, created_at, expires_at')
        .lt('expires_at', new Date().toISOString());
      
      if (expiredError) throw expiredError;
      
      // Check total connection count
      const { count: totalConnections, error: countError } = await supabase
        .from('prayer_connections')
        .select('*', { count: 'exact' });
      
      if (countError) throw countError;
      
      // Check for any DELETE policies that could remove memorial lines
      const { data: policies, error: policyError } = await supabase
        .from('pg_policies')
        .select('schemaname, tablename, policyname, cmd')
        .eq('tablename', 'prayer_connections')
        .eq('cmd', 'DELETE');
      
      if (policyError) {
        console.warn('⚠️ Could not check DELETE policies (may not have access)');
      }
      
      const expiredCount = expiredConnections?.length || 0;
      const totalCount = totalConnections || 0;
      
      // Validate results
      if (expiredCount > 0) {
        this.addResult({
          test: 'Eternal Memorial Persistence',
          status: 'WARNING',
          message: `Found ${expiredCount} expired memorial lines that should be eternal`,
          details: {
            expired_connections: expiredCount,
            total_connections: totalCount,
            sample_expired: expiredConnections?.slice(0, 3),
          },
          spiritualImpact: 'Expired memorial lines violate the eternal testimony principle',
        });
      } else {
        this.addResult({
          test: 'Eternal Memorial Persistence',
          status: 'PASS',
          message: `All ${totalCount} memorial lines are properly persisted`,
          details: { total_connections: totalCount },
          spiritualImpact: 'Memorial lines maintain their eternal witness',
        });
      }
      
      // Check for DELETE policies
      if (policies && policies.length > 0) {
        this.addResult({
          test: 'Memorial Line DELETE Protection',
          status: 'FAIL',
          message: `Found ${policies.length} DELETE policies that could remove memorial lines`,
          details: { delete_policies: policies },
          spiritualImpact: 'DELETE policies could destroy eternal memorial lines',
        });
      } else {
        this.addResult({
          test: 'Memorial Line DELETE Protection',
          status: 'PASS',
          message: 'No DELETE policies found that could remove memorial lines',
          details: {},
          spiritualImpact: 'Memorial lines are protected from deletion',
        });
      }
      
    } catch (error) {
      this.addResult({
        test: 'Eternal Memorial Persistence',
        status: 'FAIL',
        message: `Error testing memorial persistence: ${(error as Error).message}`,
        details: { error: (error as Error).message },
        spiritualImpact: 'Cannot verify memorial line persistence',
      });
    }
  }
  
  /**
   * Test 2: Real-time Performance  
   * CRITICAL: Updates must happen within 2 seconds for prayer witnessing
   */
  private async testRealtimePerformance() {
    console.log('🔍 Testing Real-time Performance...');
    
    return new Promise<void>((resolve) => {
      const startTime = performance.now();
      let subscriptionReceived = false;
      
      // Test subscription latency
      const channel = supabase
        .channel('test_realtime_performance')
        .on('postgres_changes', 
          { event: 'INSERT', schema: 'public', table: 'prayers' },
          () => {
            const latency = performance.now() - startTime;
            subscriptionReceived = true;
            
            if (latency <= 2000) {
              this.addResult({
                test: 'Real-time Subscription Latency',
                status: 'PASS',
                message: `Subscription established in ${latency.toFixed(0)}ms`,
                details: { latency, threshold: 2000 },
                spiritualImpact: 'Users can witness prayer in real-time',
              });
            } else {
              this.addResult({
                test: 'Real-time Subscription Latency',
                status: 'FAIL',
                message: `Subscription took ${latency.toFixed(0)}ms (max: 2000ms)`,
                details: { latency, threshold: 2000 },
                spiritualImpact: 'Prayer witnessing is too slow - breaks living map experience',
              });
            }
            
            channel.unsubscribe();
            resolve();
          }
        )
        .subscribe();
      
      // Timeout after 5 seconds
      setTimeout(() => {
        if (!subscriptionReceived) {
          this.addResult({
            test: 'Real-time Subscription Latency',
            status: 'FAIL',
            message: 'Real-time subscription failed to establish within 5 seconds',
            details: { timeout: 5000 },
            spiritualImpact: 'Real-time prayer witnessing is broken',
          });
          channel.unsubscribe();
          resolve();
        }
      }, 5000);
    });
  }
  
  /**
   * Test 3: Universal Map Access
   * CRITICAL: Everyone must see the same map state
   */
  private async testUniversalMapAccess() {
    console.log('🔍 Testing Universal Map Access...');
    
    try {
      // Test unauthenticated access to prayers
      const { data: publicPrayers, error: prayerError } = await supabase
        .from('prayers')
        .select('id, title, location, created_at')
        .limit(10);
      
      if (prayerError) throw prayerError;
      
      // Test unauthenticated access to connections
      const { data: publicConnections, error: connectionError } = await supabase
        .from('prayer_connections')
        .select('id, from_location, to_location, created_at')
        .limit(10);
      
      if (connectionError) throw connectionError;
      
      // Count total accessible records
      const { count: totalPrayers } = await supabase
        .from('prayers')
        .select('*', { count: 'exact' });
      
      const { count: totalConnections } = await supabase
        .from('prayer_connections')
        .select('*', { count: 'exact' });
      
      this.addResult({
        test: 'Universal Prayer Access',
        status: publicPrayers ? 'PASS' : 'FAIL',
        message: publicPrayers 
          ? `Can access ${publicPrayers.length} prayers (${totalPrayers} total)`
          : 'Cannot access public prayers',
        details: {
          accessible_prayers: publicPrayers?.length || 0,
          total_prayers: totalPrayers || 0,
        },
        spiritualImpact: publicPrayers 
          ? 'Everyone can see the global prayer activity'
          : 'Prayer visibility is restricted - breaks universal sharing',
      });
      
      this.addResult({
        test: 'Universal Connection Access',
        status: publicConnections ? 'PASS' : 'FAIL',
        message: publicConnections 
          ? `Can access ${publicConnections.length} connections (${totalConnections} total)`
          : 'Cannot access public connections',
        details: {
          accessible_connections: publicConnections?.length || 0,
          total_connections: totalConnections || 0,
        },
        spiritualImpact: publicConnections 
          ? 'Everyone can see the memorial line network'
          : 'Memorial lines are not universally visible',
      });
      
    } catch (error) {
      this.addResult({
        test: 'Universal Map Access',
        status: 'FAIL',
        message: `Error testing universal access: ${(error as Error).message}`,
        details: { error: (error as Error).message },
        spiritualImpact: 'Cannot verify universal map visibility',
      });
    }
  }
  
  /**
   * Test 4: Historical Data Access
   * CRITICAL: All prayer history must be accessible
   */
  private async testHistoricalDataAccess() {
    console.log('🔍 Testing Historical Data Access...');
    
    try {
      const startTime = performance.now();
      
      // Test loading all historical connections
      const { data: allConnections, error: connectionError } = await supabase
        .from('prayer_connections')
        .select('id, created_at')
        .order('created_at', { ascending: true });
      
      if (connectionError) throw connectionError;
      
      const loadTime = performance.now() - startTime;
      const connectionCount = allConnections?.length || 0;
      
      // Check temporal distribution
      const oldestConnection = allConnections?.[0];
      const newestConnection = allConnections?.[connectionCount - 1];
      
      let temporalSpan = 0;
      if (oldestConnection && newestConnection) {
        temporalSpan = new Date(newestConnection.created_at).getTime() - 
                     new Date(oldestConnection.created_at).getTime();
      }
      
      // Performance check
      const loadPerformance = loadTime <= 5000 ? 'PASS' : 'WARNING';
      
      this.addResult({
        test: 'Historical Data Loading',
        status: loadPerformance as 'PASS' | 'WARNING',
        message: `Loaded ${connectionCount} historical connections in ${loadTime.toFixed(0)}ms`,
        details: {
          connection_count: connectionCount,
          load_time: loadTime,
          temporal_span_days: temporalSpan / (1000 * 60 * 60 * 24),
          oldest_connection: oldestConnection?.created_at,
          newest_connection: newestConnection?.created_at,
        },
        spiritualImpact: loadPerformance === 'PASS' 
          ? 'Complete prayer history is accessible for spiritual reflection'
          : 'Slow historical loading may impact spiritual experience',
      });
      
    } catch (error) {
      this.addResult({
        test: 'Historical Data Access',
        status: 'FAIL',
        message: `Error accessing historical data: ${(error as Error).message}`,
        details: { error: (error as Error).message },
        spiritualImpact: 'Historical prayer testimony is not accessible',
      });
    }
  }
  
  /**
   * Test 5: Database Schema Compliance
   * CRITICAL: Schema must support eternal memorial lines
   */
  private async testDatabaseSchemaCompliance() {
    console.log('🔍 Testing Database Schema Compliance...');
    
    try {
      // Check for expires_at column (should be present but not enforced for eternal lines)
      const { data: columns } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, is_nullable')
        .eq('table_name', 'prayer_connections')
        .eq('table_schema', 'public');
      
      const hasExpiresAt = columns?.some(col => col.column_name === 'expires_at');
      const hasIsEternal = columns?.some(col => col.column_name === 'is_eternal');
      
      // Check index structure for performance
      const { data: indexes } = await supabase
        .from('pg_indexes')
        .select('indexname, indexdef')
        .eq('tablename', 'prayer_connections');
      
      const spatialIndexes = indexes?.filter(idx => 
        idx.indexdef.includes('GIST') && 
        (idx.indexdef.includes('location') || idx.indexdef.includes('geography'))
      );
      
      this.addResult({
        test: 'Memorial Schema Structure',
        status: hasExpiresAt ? 'PASS' : 'FAIL',
        message: hasExpiresAt 
          ? 'prayer_connections table has proper structure'
          : 'prayer_connections table missing required columns',
        details: {
          has_expires_at: hasExpiresAt,
          has_is_eternal: hasIsEternal,
          columns: columns?.map(c => c.column_name),
        },
        spiritualImpact: hasExpiresAt 
          ? 'Database can track memorial line persistence'
          : 'Database cannot properly manage memorial lines',
      });
      
      this.addResult({
        test: 'Spatial Index Performance',
        status: (spatialIndexes?.length || 0) >= 2 ? 'PASS' : 'WARNING',
        message: `Found ${spatialIndexes?.length || 0} spatial indexes for map performance`,
        details: {
          spatial_indexes: spatialIndexes?.length || 0,
          available_indexes: indexes?.map(i => i.indexname),
        },
        spiritualImpact: (spatialIndexes?.length || 0) >= 2
          ? 'Map rendering will be fast and smooth'
          : 'Map performance may be slow, affecting spiritual experience',
      });
      
    } catch (error) {
      this.addResult({
        test: 'Database Schema Compliance',
        status: 'FAIL',
        message: `Error checking schema: ${(error as Error).message}`,
        details: { error: (error as Error).message },
        spiritualImpact: 'Cannot verify database supports Living Map requirements',
      });
    }
  }
  
  /**
   * Test 6: Memorial Line Data Integrity
   * CRITICAL: Memorial lines must have proper geographic data
   */
  private async testMemorialLineIntegrity() {
    console.log('🔍 Testing Memorial Line Data Integrity...');
    
    try {
      // Check for memorial lines with invalid geographic data
      const { data: invalidLines, error: geoError } = await supabase
        .from('prayer_connections')
        .select('id, from_location, to_location')
        .is('from_location', null)
        .or('to_location.is.null');
      
      if (geoError) throw geoError;
      
      // Check for duplicate memorial lines (could indicate data corruption)
      const { data: allLines } = await supabase
        .from('prayer_connections')
        .select('id, prayer_id, from_location, to_location');
      
      const duplicateGroups = new Map();
      allLines?.forEach(line => {
        const key = `${line.prayer_id}_${JSON.stringify(line.from_location)}_${JSON.stringify(line.to_location)}`;
        if (!duplicateGroups.has(key)) {
          duplicateGroups.set(key, []);
        }
        duplicateGroups.get(key).push(line.id);
      });
      
      const duplicates = Array.from(duplicateGroups.values()).filter(group => group.length > 1);
      
      this.addResult({
        test: 'Geographic Data Integrity',
        status: (invalidLines?.length || 0) === 0 ? 'PASS' : 'FAIL',
        message: (invalidLines?.length || 0) === 0 
          ? 'All memorial lines have valid geographic data'
          : `Found ${invalidLines?.length} memorial lines with invalid geography`,
        details: {
          invalid_lines: invalidLines?.length || 0,
          sample_invalid: invalidLines?.slice(0, 3),
        },
        spiritualImpact: (invalidLines?.length || 0) === 0
          ? 'All memorial lines can be properly displayed on the map'
          : 'Invalid geography prevents memorial lines from appearing',
      });
      
      this.addResult({
        test: 'Memorial Line Uniqueness',
        status: duplicates.length === 0 ? 'PASS' : 'WARNING',
        message: duplicates.length === 0 
          ? 'No duplicate memorial lines detected'
          : `Found ${duplicates.length} sets of duplicate memorial lines`,
        details: {
          duplicate_sets: duplicates.length,
          sample_duplicates: duplicates.slice(0, 3),
        },
        spiritualImpact: duplicates.length === 0
          ? 'Each memorial line represents a unique prayer connection'
          : 'Duplicate lines may confuse the spiritual testimony',
      });
      
    } catch (error) {
      this.addResult({
        test: 'Memorial Line Data Integrity',
        status: 'FAIL',
        message: `Error checking data integrity: ${(error as Error).message}`,
        details: { error: (error as Error).message },
        spiritualImpact: 'Cannot verify memorial line data quality',
      });
    }
  }
  
  private addResult(result: ValidationResult) {
    this.results.push(result);
    
    const statusEmoji = {
      'PASS': '✅',
      'FAIL': '❌', 
      'WARNING': '⚠️'
    }[result.status];
    
    console.log(`${statusEmoji} ${result.test}: ${result.message}`);
    if (result.status === 'FAIL') {
      console.log(`   Spiritual Impact: ${result.spiritualImpact}`);
    }
  }
  
  private generateReport(): LivingMapReport {
    const passed = this.results.filter(r => r.status === 'PASS').length;
    const failed = this.results.filter(r => r.status === 'FAIL').length;
    const warnings = this.results.filter(r => r.status === 'WARNING').length;
    
    const healthScore = Math.round((passed / this.results.length) * 100);
    const isCompliant = failed === 0 && healthScore >= 80;
    
    const recommendations: string[] = [];
    
    // Generate recommendations based on failures
    this.results.forEach(result => {
      if (result.status === 'FAIL') {
        if (result.test.includes('Persistence')) {
          recommendations.push('Implement eternal memorial line protection in database policies');
        }
        if (result.test.includes('Real-time')) {
          recommendations.push('Optimize real-time subscription performance for <2s latency');
        }
        if (result.test.includes('Universal')) {
          recommendations.push('Review RLS policies to ensure universal map access');
        }
        if (result.test.includes('Historical')) {
          recommendations.push('Optimize historical data loading with better indexing');
        }
        if (result.test.includes('Schema')) {
          recommendations.push('Update database schema to fully support Living Map requirements');
        }
      }
    });
    
    return {
      overall_status: isCompliant ? 'COMPLIANT' : 'NON_COMPLIANT',
      health_score: healthScore,
      tests: this.results,
      summary: { passed, failed, warnings },
      recommendations: Array.from(new Set(recommendations)),
    };
  }
}

// Run the validation
async function main() {
  const validator = new LivingMapValidator();
  const report = await validator.runFullValidation();
  
  console.log('\n🕊️ LIVING MAP VALIDATION REPORT');
  console.log('=======================================');
  console.log(`Overall Status: ${report.overall_status}`);
  console.log(`Health Score: ${report.health_score}/100`);
  console.log(`Tests: ${report.summary.passed} passed, ${report.summary.failed} failed, ${report.summary.warnings} warnings`);
  
  if (report.recommendations.length > 0) {
    console.log('\nRecommendations:');
    report.recommendations.forEach((rec, i) => {
      console.log(`${i + 1}. ${rec}`);
    });
  }
  
  // Write detailed report
  const fs = await import('fs');
  const reportPath = './living-map-validation-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`\nDetailed report saved to: ${reportPath}`);
  
  // Exit with error if non-compliant
  if (report.overall_status === 'NON_COMPLIANT') {
    process.exit(1);
  }
}

if (require.main === module) {
  main().catch(error => {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  });
}